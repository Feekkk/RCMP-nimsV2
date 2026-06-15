import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AdminShell } from '@/admin/admin-shell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminUserRow } from '@/lib/admin-users-schema';
import { ROLE_ADMIN, ROLE_TECHNICIAN, ROLE_USER, readAdminSession } from '@/lib/auth-session';
import { createAdminUserFn, listAdminUsersFn, updateAdminUserFn } from '@/server/admin-users.functions';

type UserFormState = {
  email: string;
  roleId: string;
  phone: string;
};

const EMPTY_FORM: UserFormState = {
  email: '',
  roleId: String(ROLE_USER),
  phone: '',
};

function userToForm(u: AdminUserRow): UserFormState {
  return {
    email: u.email,
    roleId: String(u.roleId),
    phone: u.phone ?? '',
  };
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const admin = readAdminSession();
    if (!admin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setUsers(await listAdminUsersFn({ data: { callerRoleId: admin.roleId } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (u: AdminUserRow) => {
    setEditing(u);
    setForm(userToForm(u));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const admin = readAdminSession();
    if (!admin) return;
    setSaving(true);
    try {
      const roleId = Number(form.roleId);
      const phone = form.phone.trim() || null;
      if (editing) {
        await updateAdminUserFn({
          data: {
            callerRoleId: admin.roleId,
            staffId: editing.staffId,
            email: form.email.trim(),
            roleId,
            phone,
          },
        });
        toast.success('User updated');
      } else {
        await createAdminUserFn({
          data: {
            callerRoleId: admin.roleId,
            email: form.email.trim(),
            roleId,
            phone: form.phone.trim() || undefined,
          },
        });
        toast.success('User created');
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Manage user</h1>
          <p className="text-sm text-muted-foreground">Provision and update NIMS accounts</p>
        </div>
        <Button type="button" className="rounded-lg" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add user
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.staffId}>
                    <TableCell className="font-mono text-sm">{u.staffId}</TableCell>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{u.roleName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {u.lastLoginAt ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(u)}
                        aria-label={`Edit ${u.fullName}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit user' : 'Add user'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update role, email, and phone. Name is managed by Microsoft.'
                : 'Pre-provision an account by email and role. The name is fetched from Microsoft after first sign-in.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="rounded-lg"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={form.roleId} onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}>
                <SelectTrigger id="role" className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(ROLE_USER)}>user</SelectItem>
                  <SelectItem value={String(ROLE_TECHNICIAN)}>technician</SelectItem>
                  <SelectItem value={String(ROLE_ADMIN)}>admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-lg" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-lg" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
