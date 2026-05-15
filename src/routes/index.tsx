import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useInventory } from '@/hooks/use-inventory';
import { Header } from '@/components/inventory/Header';
import { FilterBar } from '@/components/inventory/FilterBar';
import { InventoryCard } from '@/components/inventory/InventoryCard';
import { ItemFormModal } from '@/components/inventory/ItemFormModal';
import { EmptyState } from '@/components/inventory/EmptyState';
import { LandingPage } from '@/components/landing/LandingPage';
import { Toaster } from '@/components/ui/sonner';
import { Loader2, Boxes, AlertTriangle, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { InventoryItem } from '@/hooks/use-inventory';
import type { ItemStatus } from '@/lib/constants';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const { user, isLoading: authLoading, isAdmin, profile, signOut } = useAuth();

  const [statusFilter, setStatusFilter] = useState<ItemStatus | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'date'>('name');
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  const { items, isLoading } = useInventory({ statusFilter, categoryFilter, searchQuery, sortBy });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage />
        <Toaster />
      </>
    );
  }

  const hasFilters = Boolean(statusFilter || categoryFilter || searchQuery);

  const totalItems = items.length;
  const lowStock = items.filter(i => i.status === 'low_stock').length;
  const outOfStock = items.filter(i => i.status === 'out_of_stock').length;

  const handleAdd = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    toast.success('Item deleted');
    setDeletingItem(null);
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <Header
          userName={profile?.name ?? null}
          isAdmin={isAdmin}
          onAddClick={handleAdd}
          onSignOut={signOut}
        />

        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-6">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Inventory</h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              {isAdmin ? 'Track stock, suppliers, and locations across your team.' : 'Browse your team’s inventory.'}
            </p>
          </div>

          {/* Stats */}
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard icon={Boxes} label="Total items" value={totalItems} tint="bg-lavender/15 text-[oklch(0.45_0.12_290)]" />
            <StatCard icon={AlertTriangle} label="Low stock" value={lowStock} tint="bg-amber-100 text-amber-700" />
            <StatCard icon={XCircle} label="Out of stock" value={outOfStock} tint="bg-rose-100 text-rose-700" />
          </div>

          <FilterBar
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                hasFilters={hasFilters}
                isAdmin={isAdmin}
                onClearFilters={() => {
                  setStatusFilter(null);
                  setCategoryFilter(null);
                  setSearchQuery('');
                }}
                onAdd={handleAdd}
              />
            ) : (
              items.map(item => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  onEdit={handleEdit}
                  onDelete={setDeletingItem}
                />
              ))
            )}
          </div>
        </main>

        <ItemFormModal
          open={formOpen}
          onOpenChange={setFormOpen}
          userId={user.id}
          item={editingItem}
        />

        <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this item?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove "{deletingItem?.name}" from your inventory. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <Toaster />
    </>
  );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: React.ElementType; label: string; value: number; tint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${tint}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  );
}
