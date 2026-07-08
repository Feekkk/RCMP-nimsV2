import { useCallback, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Camera, Keyboard, ScanBarcode } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getKindForAssetId } from '@/hooks/assetid-generator';
import { getAssetDetailFn } from '@/server/assets.functions';
import { AssetBarcodeScanner } from '@/technician/asset-barcode-scanner';

/** Strips dashes/spaces (e.g. "12-25-001" or scanned "12 25 001") down to the raw numeric asset ID. */
function parseScannedAssetId(raw: string): number | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  const assetId = Number(digits);
  return Number.isFinite(assetId) && assetId > 0 ? assetId : null;
}

export function AssetLookupButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'camera' | 'manual'>('camera');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const resolvingRef = useRef(false);

  const resolveAndGo = useCallback(
    async (raw: string) => {
      if (resolvingRef.current) return;
      const assetId = parseScannedAssetId(raw);
      if (!assetId) {
        toast.error('Scan or type a valid asset ID');
        return;
      }

      const kind = getKindForAssetId(assetId);
      if (!kind) {
        toast.error(`Asset ID ${assetId} does not match a known asset prefix`);
        return;
      }

      resolvingRef.current = true;
      setLoading(true);
      try {
        const result = await getAssetDetailFn({ data: { kind, assetId } });
        if (!result) {
          toast.error(`Asset ${assetId} was not found`);
          return;
        }
        setOpen(false);
        setValue('');
        void navigate({ to: '/technician/asset/$kind/$assetId', params: { kind, assetId } });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to look up asset');
      } finally {
        resolvingRef.current = false;
        setLoading(false);
      }
    },
    [navigate],
  );

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    void resolveAndGo(value);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setTab('camera');
        else setValue('');
      }}
    >
      <button
        type="button"
        title="Find asset by barcode"
        aria-label="Find asset by barcode"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <ScanBarcode className="h-6 w-6" />
      </button>

      <DialogContent className="max-w-sm rounded-[14px]">
        <DialogHeader>
          <DialogTitle>Find asset</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'camera' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera" className="gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1.5">
              <Keyboard className="h-3.5 w-3.5" />
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-2">
            <AssetBarcodeScanner active={open && tab === 'camera'} onDetected={(text) => void resolveAndGo(text)} />
            <p className="text-[11px] text-muted-foreground">
              Point the camera at the asset's barcode. It will jump to the asset's details automatically once
              recognized.
            </p>
          </TabsContent>

          <TabsContent value="manual" className="space-y-2">
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <Input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Scan or enter asset ID…"
                disabled={loading}
                className="h-10 rounded-[8px]"
                autoComplete="off"
                inputMode="numeric"
              />
              <p className="text-[11px] text-muted-foreground">
                Use a handheld barcode scanner or type the asset ID, then press Enter.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
