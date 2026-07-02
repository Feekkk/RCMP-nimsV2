import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Laptop as LaptopIcon, Monitor, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { AssetStatusActions } from '@/technician/asset-status-actions';
import { AssetStatusBadge } from '@/technician/asset-status-badge';
import { RegisterAssetActions } from '@/technician/register-asset-actions';
import { filterBySearch, filterByStatus, useAssets } from '@/hooks/assets';
import {
	LAPTOP_CATEGORY_OPTIONS,
	normalizeCategory,
} from '@/hooks/assetid-generator';
import { usePagination } from '@/hooks/use-pagination';
import { AssetStockSummary } from '@/technician/asset-stock-summary';
import { AssetTablePagination } from '@/technician/asset-table-pagination';

type LaptopCategoryView = 'all' | (typeof LAPTOP_CATEGORY_OPTIONS)[number];

const LAPTOP_CATEGORY_VIEWS: LaptopCategoryView[] = ['all', ...LAPTOP_CATEGORY_OPTIONS];

function laptopCategoryHeaderLabel(view: LaptopCategoryView): string {
	return view === 'all' ? 'Category' : view;
}

function nextLaptopCategoryView(view: LaptopCategoryView): LaptopCategoryView {
	const index = LAPTOP_CATEGORY_VIEWS.indexOf(view);
	return LAPTOP_CATEGORY_VIEWS[(index + 1) % LAPTOP_CATEGORY_VIEWS.length];
}

function matchesLaptopCategory(category: string | null, view: LaptopCategoryView): boolean {
	if (view === 'all') return true;
	return normalizeCategory(category ?? '') === normalizeCategory(view);
}

export function TechnicianLaptopPage() {
	const navigate = useNavigate();
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<number | null>(null);
	const [categoryView, setCategoryView] = useState<LaptopCategoryView>('all');
	const { items, isLoading, error, updateStatus } = useAssets('laptop');

	const filtered = useMemo(() => {
		const byCategory = items.filter((item) => matchesLaptopCategory(item.category, categoryView));
		const bySearch = filterBySearch(byCategory, search, (c) => c.category ?? '');
		return filterByStatus(bySearch, statusFilter);
	}, [items, search, statusFilter, categoryView]);

	const pagination = usePagination(filtered, {
		resetKey: `${search}|${statusFilter ?? ''}|${categoryView}`,
	});

	const nextCategoryView = nextLaptopCategoryView(categoryView);

	return (
		<TechnicianShell>
			<div className="mb-5 flex flex-col gap-1 sm:mb-6">
				<h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Laptop &amp; desktop</h1>
				<p className="text-xs text-muted-foreground sm:text-sm">List of laptops and desktops in the system</p>
			</div>

			<AssetStockSummary items={items} />

			<div className="mb-4 flex items-center justify-between">
				<div className="relative w-full sm:max-w-sm">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search asset ID, model, brand, serial…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="h-10 rounded-[10px] pl-9"
					/>
				</div>
				<RegisterAssetActions
					kind="laptop"
					statusFilter={statusFilter}
					onStatusFilterChange={setStatusFilter}
					leading={
						<Button size="sm" variant="outline" asChild>
							<Link to="/technician/handover-staff">
								<Users className="h-4 w-4" />
								<span className="hidden sm:inline">Handover Directory</span>
							</Link>
						</Button>
					}
				/>
			</div>

			{error && (
				<p className="mb-4 text-sm text-destructive">
					{error} — check system database is running and `.env` matches database/schema.sql
				</p>
			)}

			<Card className="overflow-hidden rounded-[14px] border-border shadow-sm">
				<CardContent className="p-0 sm:p-0">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent [&>th]:text-muted-foreground">
									<TableHead className="whitespace-nowrap font-semibold">ID</TableHead>
									<TableHead className="whitespace-nowrap font-semibold">
										<button
											type="button"
											className="inline-flex items-center gap-1 rounded-[6px] px-1 -mx-1 text-left hover:text-foreground hover:underline underline-offset-2"
											title={
												nextCategoryView === 'all'
													? 'Show all categories'
													: `Show ${laptopCategoryHeaderLabel(nextCategoryView).toLowerCase()} only`
											}
											onClick={() => setCategoryView(nextCategoryView)}
										>
											{laptopCategoryHeaderLabel(categoryView)}
										</button>
									</TableHead>
									<TableHead className="min-w-[180px] font-semibold">Model</TableHead>
									<TableHead className="whitespace-nowrap font-semibold">Brand</TableHead>
									<TableHead className="whitespace-nowrap font-semibold">Serial</TableHead>
									<TableHead className="whitespace-nowrap font-semibold">Status</TableHead>
									<TableHead className="min-w-[140px] font-semibold">Action</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading ? (
									<TableRow>
										<TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
											Loading…
										</TableCell>
									</TableRow>
								) : filtered.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
											No assets match your search, status, or category filter.
										</TableCell>
									</TableRow>
								) : (
									pagination.paginatedItems.map((c) => (
										<TableRow
											key={c.assetId}
											className="cursor-pointer hover:bg-muted/50"
											onClick={() =>
												void navigate({
													to: '/technician/asset/$kind/$assetId',
													params: { kind: 'laptop', assetId: c.assetId },
												})
											}
										>
											<TableCell>
												<Link
													to="/technician/asset/$kind/$assetId"
													params={{ kind: 'laptop', assetId: c.assetId }}
													className="text-primary underline-offset-2 hover:underline"
													onClick={(e) => e.stopPropagation()}
												>
													<code className="text-xs">{c.assetId}</code>
												</Link>
											</TableCell>
											<TableCell>
												{(c.category ?? '').toLowerCase() === 'desktop' ? (
													<span className="inline-flex items-center gap-1.5 text-sm">
														<Monitor className="h-4 w-4 text-[oklch(0.45_0.12_290)]" />
														Desktop
													</span>
												) : (
													<span className="inline-flex items-center gap-1.5 text-sm">
														<LaptopIcon className="h-4 w-4 text-[oklch(0.45_0.12_290)]" />
														{c.category ?? 'Laptop'}
													</span>
												)}
											</TableCell>
											<TableCell className="font-medium text-foreground">{c.model}</TableCell>
											<TableCell className="text-muted-foreground">{c.brand ?? '—'}</TableCell>
											<TableCell className="text-muted-foreground">{c.serialNum ?? '—'}</TableCell>
											<TableCell>
												<AssetStatusBadge statusId={c.statusId} />
											</TableCell>
											<TableCell onClick={(e) => e.stopPropagation()}>
												<AssetStatusActions
													kind="laptop"
													assetId={c.assetId}
													statusId={c.statusId}
													onStatusChange={updateStatus}
													disabled={isLoading}
												/>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
					<AssetTablePagination
						page={pagination.page}
						totalPages={pagination.totalPages}
						pageSize={pagination.pageSize}
						rangeStart={pagination.rangeStart}
						rangeEnd={pagination.rangeEnd}
						totalItems={pagination.totalItems}
						totalLoaded={items.length}
						onPageChange={pagination.setPage}
						onPageSizeChange={pagination.setPageSize}
					/>
				</CardContent>
			</Card>
		</TechnicianShell>
	);
}
