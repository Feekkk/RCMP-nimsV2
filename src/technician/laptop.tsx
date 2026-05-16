import { useMemo, useState, type ElementType } from 'react';
import { Laptop as LaptopIcon, Monitor, PackageCheck, PackageX, Search, Warehouse, Filter, PlusSquare } from 'lucide-react';
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

type FormFactor = 'laptop' | 'desktop';
type StockStatus = 'in_stock' | 'out_of_stock';

type ComputerAsset = {
	id: string;
	formFactor: FormFactor;
	model: string;
	assetTag: string;
	serial: string;
	location: string;
	status: StockStatus;
};

const MOCK_COMPUTERS: ComputerAsset[] = [
	{
		id: 'c1',
		formFactor: 'laptop',
		model: 'Lenovo ThinkPad T14 Gen 3',
		assetTag: 'AST-10432',
		serial: 'PF4Z9DL2',
		location: 'HQ — Equipment stores',
		status: 'in_stock',
	},
	{
		id: 'c2',
		formFactor: 'laptop',
		model: 'Dell Latitude 5440',
		assetTag: 'AST-10411',
		serial: 'DL-883104',
		location: 'Records — Floor 2',
		status: 'out_of_stock',
	},
	{
		id: 'c3',
		formFactor: 'desktop',
		model: 'Dell OptiPlex 7010 SFF',
		assetTag: 'AST-09102',
		serial: 'OPX-22109',
		location: 'Comms room A',
		status: 'in_stock',
	},
	{
		id: 'c4',
		formFactor: 'desktop',
		model: 'HP Elite Mini 800 G9',
		assetTag: 'AST-09077',
		serial: 'HP-77X12',
		location: 'Visitor services',
		status: 'in_stock',
	},
	{
		id: 'c5',
		formFactor: 'laptop',
		model: 'Panasonic Toughbook FZ-55',
		assetTag: 'AST-10455',
		serial: 'TB-55102',
		location: 'Mobile unit — Bay 3',
		status: 'out_of_stock',
	},
	{
		id: 'c6',
		formFactor: 'laptop',
		model: 'Microsoft Surface Laptop 5',
		assetTag: 'AST-10402',
		serial: 'MSL-50022',
		location: 'HQ — Equipment stores',
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

export function TechnicianLaptopPage() {
	const [search, setSearch] = useState('');

	const { inStockCount, outStockCount, filtered } = useMemo(() => {
		const q = search.trim().toLowerCase();
		const list = q
			? MOCK_COMPUTERS.filter(
					(c) =>
						c.model.toLowerCase().includes(q) ||
						c.assetTag.toLowerCase().includes(q) ||
						c.serial.toLowerCase().includes(q) ||
						c.location.toLowerCase().includes(q) ||
						c.formFactor.toLowerCase().includes(q),
				)
			: MOCK_COMPUTERS;

		const inStock = MOCK_COMPUTERS.filter((c) => c.status === 'in_stock').length;
		const outStock = MOCK_COMPUTERS.filter((c) => c.status === 'out_of_stock').length;
		return { inStockCount: inStock, outStockCount: outStock, filtered: list };
	}, [search]);

	return (
		<TechnicianShell>
			<div className="mb-5 flex flex-col gap-1 sm:mb-6">
				<h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Laptop &amp; desktop</h1>
				<p className="text-xs text-muted-foreground sm:text-sm">
					Technician inventory — portable and workstation-class machines
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
									filtered.map((c) => (
										<TableRow key={c.id} className="hover:bg-muted/50">
											<TableCell>
												{c.formFactor === 'laptop' ? (
													<span className="inline-flex items-center gap-1.5 text-sm">
														<LaptopIcon className="h-4 w-4 text-[oklch(0.45_0.12_290)]" />
														<span className="capitalize">Laptop</span>
													</span>
												) : (
													<span className="inline-flex items-center gap-1.5 text-sm">
														<Monitor className="h-4 w-4 text-[oklch(0.45_0.12_290)]" />
														<span className="capitalize">Desktop</span>
													</span>
												)}
											</TableCell>
											<TableCell className="font-medium text-foreground">{c.model}</TableCell>
											<TableCell>
												<code className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono">{c.assetTag}</code>
											</TableCell>
											<TableCell className="text-muted-foreground">{c.serial}</TableCell>
											<TableCell>
												<span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
													<Warehouse className="h-3.5 w-3.5 shrink-0" />
													{c.location}
												</span>
											</TableCell>
											<TableCell>
												<Badge variant={stockBadgeVariant(c.status)} className="rounded-[8px] text-[10px] font-semibold">
													{stockLabel(c.status)}
												</Badge>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
					<p className="flex items-center gap-1.5 border-t border-border px-4 py-3 text-xs text-muted-foreground">
						<PackageCheck className="h-3.5 w-3.5" />
						Showing {filtered.length} of {MOCK_COMPUTERS.length} demo records
					</p>
				</CardContent>
			</Card>
		</TechnicianShell>
	);
}
