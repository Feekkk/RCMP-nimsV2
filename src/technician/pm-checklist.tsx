import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AssetKind } from '@/lib/inventory-schema';
import { ASSET_KIND_LABEL } from '@/lib/inventory-schema';
import type { PmChecklistDetail, PmChecklistSummary } from '@/lib/pm-schema';
import { cn } from '@/lib/utils';
import {
  addPmChecklistItemFn,
  createPmChecklistFn,
  deletePmChecklistFn,
  deletePmChecklistItemFn,
  getPmChecklistDetailFn,
  listPmAssetCategoriesFn,
  listPmChecklistsFn,
  updatePmChecklistFn,
  updatePmChecklistItemFn,
} from '@/server/pm.functions';
import { FormField } from '@/technician/deploy-return-fields';
import { TechnicianShell } from '@/technician/technician-shell';

export function PmChecklistPage() {
  const [summaries, setSummaries] = useState<PmChecklistSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PmChecklistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newAssetType, setNewAssetType] = useState<AssetKind>('av');
  const [newCategory, setNewCategory] = useState('');
  const [newName, setNewName] = useState('');
  const [newItemsText, setNewItemsText] = useState('');
  const [assetCategories, setAssetCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameCategory, setRenameCategory] = useState('');
  const [renameName, setRenameName] = useState('');
  const [renameCategories, setRenameCategories] = useState<string[]>([]);

  const loadSummaries = useCallback(async (preferId?: number | null) => {
    setLoading(true);
    try {
      const rows = await listPmChecklistsFn();
      setSummaries(rows);
      setSelectedId((prev) => {
        if (preferId != null && rows.some((r) => r.checklistId === preferId)) return preferId;
        if (prev != null && rows.some((r) => r.checklistId === prev)) return prev;
        return rows[0]?.checklistId ?? null;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load checklists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void getPmChecklistDetailFn({ data: selectedId })
      .then((row) => {
        if (!cancelled) setDetail(row);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Failed to load checklist');
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const loadAssetCategories = useCallback(async (assetType: AssetKind) => {
    setCategoriesLoading(true);
    try {
      const cats = await listPmAssetCategoriesFn({ data: assetType });
      setAssetCategories(cats);
      return cats;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load asset categories');
      setAssetCategories([]);
      return [] as string[];
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const openAdd = () => {
    setNewAssetType('av');
    setNewCategory('');
    setNewName('');
    setNewItemsText('');
    setAddOpen(true);
    void loadAssetCategories('av').then((cats) => {
      if (cats[0]) setNewCategory(cats[0]);
    });
  };

  const onNewAssetTypeChange = (assetType: AssetKind) => {
    setNewAssetType(assetType);
    setNewCategory('');
    void loadAssetCategories(assetType).then((cats) => {
      if (cats[0]) setNewCategory(cats[0]);
    });
  };

  const saveNewCategory = async () => {
    setSaving(true);
    try {
      const created = await createPmChecklistFn({
        data: {
          assetType: newAssetType,
          assetCategory: newCategory,
          checklistName: newName || `${newCategory} PM Checklist`,
          items: newItemsText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        },
      });
      setAddOpen(false);
      toast.success('Category checklist added');
      await loadSummaries(created.checklistId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add checklist');
    } finally {
      setSaving(false);
    }
  };

  const openRename = () => {
    if (!detail) return;
    setRenameCategory(detail.assetCategory);
    setRenameName(detail.checklistName);
    setRenameOpen(true);
    void listPmAssetCategoriesFn({ data: detail.assetType })
      .then((cats) => {
        const merged = cats.includes(detail.assetCategory)
          ? cats
          : [detail.assetCategory, ...cats];
        setRenameCategories(merged);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Failed to load asset categories');
        setRenameCategories([detail.assetCategory]);
      });
  };

  const saveRename = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await updatePmChecklistFn({
        data: {
          checklistId: detail.checklistId,
          assetCategory: renameCategory,
          checklistName: renameName,
        },
      });
      setRenameOpen(false);
      toast.success('Checklist updated');
      await loadSummaries(detail.checklistId);
      const refreshed = await getPmChecklistDetailFn({ data: detail.checklistId });
      setDetail(refreshed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update checklist');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await deletePmChecklistFn({ data: detail.checklistId });
      toast.success('Checklist deleted');
      setDetail(null);
      await loadSummaries(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete checklist');
    } finally {
      setSaving(false);
    }
  };

  const addItem = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await addPmChecklistItemFn({
        data: { checklistId: detail.checklistId, itemDescription: newItem },
      });
      setNewItem('');
      toast.success('Item added');
      const refreshed = await getPmChecklistDetailFn({ data: detail.checklistId });
      setDetail(refreshed);
      await loadSummaries(detail.checklistId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add item');
    } finally {
      setSaving(false);
    }
  };

  const saveEditItem = async () => {
    if (editingItemId == null || !detail) return;
    setSaving(true);
    try {
      await updatePmChecklistItemFn({
        data: { itemId: editingItemId, itemDescription: editingValue },
      });
      setEditingItemId(null);
      setEditingValue('');
      toast.success('Item updated');
      const refreshed = await getPmChecklistDetailFn({ data: detail.checklistId });
      setDetail(refreshed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update item');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId: number) => {
    if (!detail) return;
    setSaving(true);
    try {
      await deletePmChecklistItemFn({ data: itemId });
      toast.success('Item removed');
      const refreshed = await getPmChecklistDetailFn({ data: detail.checklistId });
      setDetail(refreshed);
      await loadSummaries(detail.checklistId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TechnicianShell>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" type="button" className="-ml-2 mb-2 gap-1.5" asChild>
            <Link to="/technician/preventive-maintenance">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Manage checklists
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add categories and edit checklist items used during maintenance
          </p>
        </div>
        <Button type="button" className="shrink-0 gap-1.5 rounded-[8px]" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add category
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="rounded-[14px] border-border shadow-sm lg:self-start">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Categories</CardTitle>
            <CardDescription>
              {loading ? 'Loading…' : `${summaries.length} total`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 p-2 pt-0">
            {summaries.map((cat) => {
              const active = cat.checklistId === selectedId;
              return (
                <button
                  key={cat.checklistId}
                  type="button"
                  onClick={() => {
                    setSelectedId(cat.checklistId);
                    setEditingItemId(null);
                    setNewItem('');
                  }}
                  className={cn(
                    'flex w-full flex-col gap-0.5 rounded-[10px] px-3 py-2.5 text-left transition-colors',
                    active
                      ? 'bg-lavender/15 text-[oklch(0.45_0.12_290)]'
                      : 'text-foreground hover:bg-muted/60',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium">{cat.assetCategory}</span>
                    <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                      {cat.itemCount}
                    </span>
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {ASSET_KIND_LABEL[cat.assetType]} · {cat.checklistName}
                  </span>
                </button>
              );
            })}
            {!loading && summaries.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                No checklists yet. Add a category to start.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[14px] border-border shadow-sm">
          {detailLoading ? (
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Loading…
            </CardContent>
          ) : !detail ? (
            <CardContent className="flex flex-col items-center py-16 text-center">
              <ClipboardList className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Select or add a category to edit its checklist.
              </p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base">{detail.assetCategory}</CardTitle>
                    <CardDescription>
                      {ASSET_KIND_LABEL[detail.assetType]} · {detail.checklistName} ·{' '}
                      {detail.items.length} item{detail.items.length === 1 ? '' : 's'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-[8px] gap-1.5"
                      disabled={saving}
                      onClick={openRename}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-[8px] gap-1.5 text-destructive hover:text-destructive"
                      disabled={saving}
                      onClick={() => void deleteCategory()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="divide-y divide-border rounded-[12px] border border-border">
                  {detail.items.length === 0 ? (
                    <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No items yet. Add the first checklist item below.
                    </li>
                  ) : (
                    detail.items.map((item, index) => (
                      <li
                        key={item.itemId}
                        className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center"
                      >
                        <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                        {editingItemId === item.itemId ? (
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="h-9 flex-1 rounded-[8px]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void saveEditItem();
                              }
                              if (e.key === 'Escape') {
                                setEditingItemId(null);
                                setEditingValue('');
                              }
                            }}
                          />
                        ) : (
                          <p className="min-w-0 flex-1 text-sm">{item.itemDescription}</p>
                        )}
                        <div className="flex shrink-0 gap-1 sm:ml-auto">
                          {editingItemId === item.itemId ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 rounded-[8px]"
                                disabled={saving}
                                onClick={() => void saveEditItem()}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-[8px]"
                                onClick={() => {
                                  setEditingItemId(null);
                                  setEditingValue('');
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-[8px] px-2"
                                onClick={() => {
                                  setEditingItemId(item.itemId);
                                  setEditingValue(item.itemDescription);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-[8px] px-2 text-destructive hover:text-destructive"
                                disabled={saving}
                                onClick={() => void deleteItem(item.itemId)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    ))
                  )}
                </ul>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="New checklist item…"
                    className="h-10 rounded-[8px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void addItem();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    className="shrink-0 rounded-[8px] gap-1.5"
                    disabled={saving}
                    onClick={() => void addItem()}
                  >
                    <Plus className="h-4 w-4" />
                    Add item
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-[14px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>
              Pick an inventory category for this asset type. Checklist items are optional (one per
              line).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <FormField label="Asset type" required>
              <Select value={newAssetType} onValueChange={(v) => onNewAssetTypeChange(v as AssetKind)}>
                <SelectTrigger className="rounded-[8px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="laptop">{ASSET_KIND_LABEL.laptop}</SelectItem>
                  <SelectItem value="av">{ASSET_KIND_LABEL.av}</SelectItem>
                  <SelectItem value="network">{ASSET_KIND_LABEL.network}</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Asset category" required>
              <Select
                value={newCategory || undefined}
                onValueChange={setNewCategory}
                disabled={categoriesLoading || assetCategories.length === 0}
              >
                <SelectTrigger className="rounded-[8px]">
                  <SelectValue
                    placeholder={
                      categoriesLoading
                        ? 'Loading categories…'
                        : assetCategories.length === 0
                          ? 'No categories in inventory'
                          : 'Select category'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {assetCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Checklist Title">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter checklist title"
                className="rounded-[8px]"
              />
            </FormField>
            <FormField label="Checklist items">
              <textarea
                value={newItemsText}
                onChange={(e) => setNewItemsText(e.target.value)}
                placeholder={'Power on\nPhysical condition\nCable check'}
                rows={6}
                className="flex w-full rounded-[8px] border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-[8px]"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-[8px]"
              disabled={saving || !newCategory.trim()}
              onClick={() => void saveNewCategory()}
            >
              Add category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="rounded-[14px] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit checklist</DialogTitle>
            <DialogDescription>Update the category label and checklist title.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <FormField label="Asset category" required>
              <Select value={renameCategory || undefined} onValueChange={setRenameCategory}>
                <SelectTrigger className="rounded-[8px]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {renameCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Checklist Title" required>
              <Input
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                className="rounded-[8px]"
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-[8px]"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-[8px]"
              disabled={saving}
              onClick={() => void saveRename()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TechnicianShell>
  );
}
