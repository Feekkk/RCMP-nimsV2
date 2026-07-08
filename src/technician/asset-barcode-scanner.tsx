import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { CameraOff } from 'lucide-react';

export function AssetBarcodeScanner({
  active,
  onDetected,
}: {
  active: boolean;
  onDetected: (text: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setError(null);

    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (result) onDetectedRef.current(result.getText());
      })
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Camera access failed');
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-black">
      {error ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <CameraOff className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      ) : (
        <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
      )}
    </div>
  );
}
