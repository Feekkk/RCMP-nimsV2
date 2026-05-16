import { useMemo, useState, type ElementType } from 'react';
import { Monitor, PackageCheck, PackageX, Projector, Search, Speaker, Video, Warehouse, Filter, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TechnicianShell } from '@/technician/technician-shell';

type AvCategory = 'display' | 'projector' | 'audio' | 'camera';
type StockStatus = 'in_stock' | 'out_of_stock';

type AvAsset = {
  id: string;
  category: AvCategory;
  model: string;
  assetTag: string;
  serial: string;
  location: string;
  status: StockStatus;
};

const CATEGORY_ICONS: Record<AvCategory, ElementType> = {
  display: Monitor,
  projector: Projector,
  audio: Speaker,
  camera: Video,
};

const CATEGORY_LABEL: Record<AvCategory, string> = {
  display: 'Display',
  projector: 'Projector',
  audio: 'Audio',
  camera: 'Camera',
};

const MOCK_AV: AvAsset[] = [
  {
    id: 'a1',
    category: 'display',
    model: 'Samsung QM85C 85" UHD signage',
    assetTag: 'AV-20041',
    serial: 'SM-QM85-9012',
    location: 'Briefing hall A',
    status: 'in_stock',
  },
  {
    id: 'a2',
    category: 'projector',
    model: 'Epson PowerLite L735U',
    assetTag: 'AV-20018',
    serial: 'EPS-L735U-4401',
    location: 'Training room — East',
    status: 'in_stock',
  },
  {
    id: 'a3',
    category: 'audio',
    model: 'Shure MXA920 ceiling array',
    assetTag: 'AV-20055',
    serial: 'SHR-MXA920-12',
    location: 'Boardroom HQ',
    status: 'out_of_stock',
  },
  {
    id: 'a4',
    category: 'camera',
    model: 'Logitech Rally Bar',
    assetTag: 'AV-20003',
    serial: 'LG-RB-8831',
    location: 'Visitor VC suite',
    status: 'in_stock',
  },
  {
    id: 'a5',
    category: 'display',
    model: 'LG 43" UL3J series',
    assetTag: 'AV-20022',
    serial: 'LG-UL3J-2210',
    location: 'Records — reception',
    status: 'out_of_stock',
  },
  {
    id: 'a6',
    category: 'projector',
    model: 'BenQ LU935ST short throw',
    assetTag: 'AV-20009',
    serial: 'BQ-LU935-774',
    location: 'Mobile pod — Kit 2',
    status: 'in_stock',
  },
];

function StockCountCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: ElementType;
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  );
}

function stockBadgeVariant(status: StockStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  return status === 'in_stock' ? 'default' : 'destructive';
}

function stockLabel(status: StockStatus) {
  return status === 'in_stock' ? 'In stock' : 'Out of stock';
}

export function TechnicianAvPage() {
  const [search, setSearch] = useState('');

  const { inStockCount, outStockCount, filtered } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? MOCK_AV.filter(
          (item) =>
            item.model.toLowerCase().includes(q) ||
            item.assetTag.toLowerCase().includes(q) ||
            item.serial.toLowerCase().includes(q) ||
            item.location.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            CATEGORY_LABEL[item.category].toLowerCase().includes(q),
        )
      : MOCK_AV;

    const inStock = MOCK_AV.filter((c) => c.status === 'in_stock').length;
    const outStock = MOCK_AV.filter((c) => c.status === 'out_of_stock').length;
    return { inStockCount: inStock, outStockCount: outStock, filtered: list };
  }, [search]);

  return (
    <TechnicianShell>
      <div className="mb-5 flex flex-col gap-1 sm:mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">AV equipment</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Technician inventory — displays, projectors, audio, and conference cameras
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:mb-6">
        <StockCountCard
          icon={PackageCheck}
          label="In stock"
          value={inStockCount}
          tint="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        />
        <StockCountCard
          icon={PackageX}
          label="Out of stock"
          value={outStockCount}
          tint="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search model, asset tag, serial, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-[10px] pl-9"
          />
        </div>

        <div className="ml-3 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {}}>
            <Filter className="h-4 w-4" />
            <span>Filter asset</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <PlusSquare className="h-4 w-4" />
                <span>Register asset</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => {}}>Single asset</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => {}}>Import bulk</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[14px] border-border shadow-sm">
        <CardContent className="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent [&>th]:text-muted-foreground">
                  <TableHead className="whitespace-nowrap font-semibold">Type</TableHead>
                  <TableHead className="min-w-[180px] font-semibold">Model</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">Asset tag</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">Serial</TableHead>
                  <TableHead className="min-w-[160px] font-semibold">Location</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No assets match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const Icon = CATEGORY_ICONS[item.category];
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <Icon className="h-4 w-4 text-[oklch(0.45_0.12_290)]" />
                            <span>{CATEGORY_LABEL[item.category]}</span>
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{item.model}</TableCell>
                        <TableCell>
                          <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono">{item.assetTag}</code>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.serial}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <Warehouse className="h-3.5 w-3.5 shrink-0" />
                            {item.location}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={stockBadgeVariant(item.status)}
                            className="rounded-[8px] text-[10px] font-semibold"
                          >
                            {stockLabel(item.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <p className="flex items-center gap-1.5 border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <PackageCheck className="h-3.5 w-3.5" />
            Showing {filtered.length} of {MOCK_AV.length} demo records
          </p>
        </CardContent>
      </Card>
    </TechnicianShell>
  );
}
