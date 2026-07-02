import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePagination } from '@/hooks/use-pagination';
import type { StaffDirectoryRow, StaffDivision } from '@/lib/staff-schema';
import { STAFF_DIVISIONS } from '@/lib/staff-schema';
import { AssetTablePagination } from '@/technician/asset-table-pagination';
import { FormField } from '@/technician/deploy-return-fields';
import { TechnicianShell } from '@/technician/technician-shell';
import { createStaffFn, listStaffDirectoryFn, updateStaffFn } from '@/server/staff.functions';

type StaffFormState = {
  employeeNo: string;
  fullName: string;
  division: string;
  department: string;
  email: string;
  phone: string;
  remarks: string;
};

const EMPTY_STAFF_FORM: StaffFormState = {
  employeeNo: '',
  fullName: '',
  division: '',
  department: '',
  email: '',
  phone: '',
  remarks: '',
};

function staffToForm(row: StaffDirectoryRow): StaffFormState {
  return {
    employeeNo: row.employeeNo,
    fullName: row.fullName,
    division: row.division ?? '',
    department: row.department ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    remarks: row.remarks ?? '',
  };
}

function matchesSearch(row: StaffDirectoryRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.employeeNo,
    row.fullName,
    row.department,
    row.division,
    row.email,
    row.phone,
    row.remarks,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function TechnicianHandoverStaffPage() {
  const [rows, setRows] = useState<StaffDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffDirectoryRow | null>(null);
  const [form, setForm] = useState<StaffFormState>(EMPTY_STAFF_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listStaffDirectoryFn());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load staff directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => rows.filter((row) => matchesSearch(row, search)),
    [rows, search],
  );

  const pagination = usePagination(filtered, { resetKey: search });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_STAFF_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: StaffDirectoryRow) => {
    setEditing(row);
    setForm(staffToForm(row));
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditing(null);
  };

  const handleSave = async () => {
    const employeeNo = form.employeeNo.trim();
    const fullName = form.fullName.trim();
    const division = form.division.trim();

    if (!employeeNo || !fullName || !division) {
      toast.error('Employee number, full name, and division are required.');
      return;
    }
    if (!STAFF_DIVISIONS.includes(division as StaffDivision)) {
      toast.error('Select a division: Services or Academic.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        employeeNo,
        fullName,
        division: division as StaffDivision,
        department: form.department.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        remarks: form.remarks.trim() || null,
      };

      if (editing) {
        await updateStaffFn({ data: payload });
        toast.success('Staff updated');
      } else {
        await createStaffFn({ data: payload });
        toast.success('Staff added');
      }

      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : editing ? 'Failed to update staff' : 'Failed to add staff');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TechnicianShell>
      <div className="mb-5 flex flex-col gap-1 sm:mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Handover staff</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Staff directory for laptop handover recipients
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, employee no., department, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-[10px] pl-9"
          />
        </div>
        <Button type="button" size="sm" className="shrink-0 rounded-[8px]" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add staff</span>
        </Button>
      </div>

      <Card className="overflow-hidden rounded-[14px] border-border shadow-sm">
        <CardContent className="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent [&>th]:text-muted-foreground">
                  <TableHead className="whitespace-nowrap font-semibold">Employee no.</TableHead>
                  <TableHead className="min-w-[180px] font-semibold">Full name</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">Department</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">Division</TableHead>
                  <TableHead className="min-w-[160px] font-semibold">Email</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold">Phone</TableHead>
                  <TableHead className="min-w-[140px] font-semibold">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      {rows.length === 0 ? 'No staff records in the directory.' : 'No staff match your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.paginatedItems.map((row) => (
                    <TableRow
                      key={row.employeeNo}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEdit(row)}
                    >
                      <TableCell>
                        <code className="text-xs">{row.employeeNo}</code>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {row.fullName}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.department ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{row.division ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{row.phone ?? '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" title={row.remarks ?? undefined}>
                        {row.remarks ?? '—'}
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
            totalLoaded={rows.length}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-md rounded-[14px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit staff' : 'Add staff'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update staff details in the handover directory. Employee number, full name, and division are required.'
                : 'Add a staff member to the handover directory. Employee number, full name, and division are required.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <FormField label="Employee no." required>
              <Input
                value={form.employeeNo}
                onChange={(e) => setForm((f) => ({ ...f, employeeNo: e.target.value }))}
                className="rounded-[8px]"
                maxLength={32}
                disabled={editing != null}
              />
            </FormField>
            <FormField label="Full name" required>
              <Input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className="rounded-[8px]"
                maxLength={128}
              />
            </FormField>
            <FormField label="Division" required>
              <Select
                value={form.division || undefined}
                onValueChange={(value) => setForm((f) => ({ ...f, division: value }))}
              >
                <SelectTrigger className="rounded-[8px]">
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_DIVISIONS.map((division) => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Department">
              <Input
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className="rounded-[8px]"
                maxLength={128}
              />
            </FormField>
            <FormField label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="rounded-[8px]"
                maxLength={128}
              />
            </FormField>
            <FormField label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="rounded-[8px]"
                maxLength={64}
              />
            </FormField>
            <FormField label="Remarks">
              <Textarea
                value={form.remarks}
                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                className="min-h-[80px] rounded-[8px]"
              />
            </FormField>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-[8px]" onClick={() => handleDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-[8px]" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TechnicianShell>
  );
}
