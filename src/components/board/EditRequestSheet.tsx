import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STATUS_OPTIONS, CATEGORY_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';

interface EditRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: {
    id: string;
    title: string;
    description: string;
    category: string | null;
    status: string;
  };
}

export function EditRequestSheet({ open, onOpenChange, request }: EditRequestSheetProps) {
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description);
  const [category, setCategory] = useState(request.category ?? '');
  const [status, setStatus] = useState(request.status);
  const [saving, setSaving] = useState(false);

  // Sync state when request changes or sheet opens
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setTitle(request.title);
      setDescription(request.description);
      setCategory(request.category ?? '');
      setStatus(request.status);
    }
    onOpenChange(val);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('feature_requests')
      .update({
        title: title.trim(),
        description: description.trim(),
        category: category || null,
        status,
      })
      .eq('id', request.id);
    setSaving(false);

    if (error) {
      toast.error('Failed to update request');
    } else {
      toast.success('Request updated');
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Edit request</SheetTitle>
          <SheetDescription>Update any field for this feature request.</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Feature title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the feature..."
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="edit-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="edit-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="pt-4 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
