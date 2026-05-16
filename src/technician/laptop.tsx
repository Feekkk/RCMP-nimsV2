import { useMemo, useState, type ElementType } from 'react';
import { Laptop as LaptopIcon, Monitor, PackageCheck, PackageX, Search, Warehouse } from 'lucide-react';
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
import { RegisterAssetActions } from '@/technician/register-asset-actions';
import { countStock, filterBySearch, type StockStatus, useAssets } from '@/hooks/assets';

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
	const { items } = useAssets('laptop');

	const { inStockCount, outStockCount, filtered } = useMemo(() => {
		const filteredList = filterBySearch(items, search, (c) => c.formFactor);
		const { inStock, outStock } = countStock(items);
		return { inStockCount: inStock, outStockCount: outStock, filtered: filteredList };
	}, [items, search]);

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

						<RegisterAssetActions kind="laptop" />
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
						Showing {filtered.length} of {items.length} demo records
					</p>
				</CardContent>
			</Card>
		</TechnicianShell>
	);
}
