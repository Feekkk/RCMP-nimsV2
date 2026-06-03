import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  FileText,
  ListChecks,
  Package,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toaster } from '@/components/ui/sonner';
import { clearAllSessions, readUserSession } from '@/lib/auth-session';
import {
  REQUEST_PROGRAM_TYPES,
  type UserRequestItemDraft,
} from '@/lib/request-schema';
import {
  USER_REQUEST_ASSET_TYPES,
  USER_REQUEST_AV_TYPES,
  USER_REQUEST_LAPTOP_TYPES,
  requestItemKindFromAssetType,
} from '@/lib/request-asset-types';
import { sendRequestEmailFn } from '@/server/request-email.functions';
import { submitUserRequestFn } from '@/server/request.functions';
import { DatePickerField, FormField } from '@/technician/deploy-return-fields';
import { UserPageChrome } from '@/user/user-chrome';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'sla', label: 'Terms', icon: FileText },
  { id: 'details', label: 'Details', icon: ClipboardCheck },
  { id: 'items', label: 'Equipment', icon: Package },
  { id: 'preview', label: 'Review', icon: ListChecks },
] as const;

function newItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function UserRequestFormPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(readUserSession);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  const [slaAccepted, setSlaAccepted] = useState(false);
  const [borrowDate, setBorrowDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [programType, setProgramType] = useState('');
  const [usageLocation, setUsageLocation] = useState('');
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<UserRequestItemDraft[]>([]);

  useEffect(() => {
    const user = readUserSession();
    if (!user) {
      void navigate({ to: '/login' });
      return;
    }
    setSession(user);
  }, [navigate]);

  const progress = ((step + 1) / STEPS.length) * 100;

  const canContinue = useMemo(() => {
    if (step === 0) return slaAccepted;
    if (step === 1) {
      return (
        borrowDate &&
        returnDate &&
        returnDate >= borrowDate &&
        programType &&
        usageLocation.trim().length > 0
      );
    }
    if (step === 2) {
      return items.length > 0 && items.every((i) => i.assetType && i.quantity >= 1);
    }
    return true;
  }, [step, slaAccepted, borrowDate, returnDate, programType, usageLocation, items]);

  const handleSignOut = () => {
    clearAllSessions();
    void navigate({ to: '/login' });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: newItemId(), assetType: USER_REQUEST_ASSET_TYPES[0], quantity: 1 },
    ]);
  };

  const updateItem = (id: string, patch: Partial<UserRequestItemDraft>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleNext = () => {
    if (!canContinue) {
      if (step === 0) toast.error('Please accept the terms to continue');
      else if (step === 1) toast.error('Complete all required request details');
      else if (step === 2) toast.error('Add at least one equipment category');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!session?.staffId) {
      toast.error('Session expired. Please sign in again.');
      void navigate({ to: '/login' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitUserRequestFn({
        data: {
          requestedBy: session.staffId,
          borrowDate,
          returnDate,
          programType,
          usageLocation: usageLocation.trim(),
          reason: reason.trim() || null,
          termsAcceptedAt: new Date().toISOString(),
          items: items.map((i) => ({ assetType: i.assetType, quantity: i.quantity })),
        },
      });
      setSubmittedId(result.requestId);
      try {
        await sendRequestEmailFn({ data: result.requestId });
        toast.success(`Request #${result.requestId} submitted — confirmation sent to you and IT`);
      } catch (emailErr) {
        toast.success(`Request #${result.requestId} submitted`);
        toast.warning(
          emailErr instanceof Error
            ? emailErr.message
            : 'Request saved but notification email could not be sent',
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (submittedId != null) {
    return (
      <div className="relative min-h-screen bg-background">
        <UserPageChrome session={session} onSignOut={handleSignOut} active="request" />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Request submitted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your request <strong>#{submittedId}</strong> has been sent for technician review. A confirmation
            email was sent to you and ITD when notifications are enabled.
          </p>
          <Button
            className="mt-8 rounded-[8px]"
            onClick={() => {
              setSubmittedId(null);
              setStep(0);
              setSlaAccepted(false);
              setBorrowDate('');
              setReturnDate('');
              setProgramType('');
              setUsageLocation('');
              setReason('');
              setItems([]);
            }}
          >
            Submit another request
          </Button>
        </div>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[180px] right-[5%] h-[480px] w-[480px] rounded-full bg-lavender/[0.1] blur-[90px]" />
      </div>

      <UserPageChrome session={session} onSignOut={handleSignOut} active="request" />

      <main className="relative mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Equipment request</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete each step to submit a borrow request for review.
          </p>
        </div>

        <StepIndicator currentStep={step} />

        <Progress value={progress} className="mb-6 h-1.5" />

        <Card className="rounded-[16px] border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{STEPS[step].label}</CardTitle>
            <CardDescription>
              Step {step + 1} of {STEPS.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <SlaStep accepted={slaAccepted} onAcceptedChange={setSlaAccepted} />
            )}
            {step === 1 && (
              <DetailsStep
                borrowDate={borrowDate}
                returnDate={returnDate}
                programType={programType}
                usageLocation={usageLocation}
                reason={reason}
                onBorrowDateChange={setBorrowDate}
                onReturnDateChange={setReturnDate}
                onProgramTypeChange={setProgramType}
                onUsageLocationChange={setUsageLocation}
                onReasonChange={setReason}
              />
            )}
            {step === 2 && (
              <ItemsStep
                items={items}
                onAdd={addItem}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            )}
            {step === 3 && (
              <PreviewStep
                borrowDate={borrowDate}
                returnDate={returnDate}
                programType={programType}
                usageLocation={usageLocation}
                reason={reason}
                items={items}
                requesterName={session.fullName}
              />
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-[8px]"
            disabled={step === 0 || submitting}
            onClick={handleBack}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              className="rounded-[8px]"
              disabled={!canContinue}
              onClick={handleNext}
            >
              Continue
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="gap-1.5 rounded-[8px]"
              disabled={submitting || !canContinue}
              onClick={() => void handleSubmit()}
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Submitting…' : 'Submit request'}
            </Button>
          )}
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <ol className="mb-4 grid grid-cols-4 gap-1 sm:gap-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <li
            key={s.id}
            className={cn(
              'flex flex-col items-center gap-1 rounded-[10px] border px-1 py-2 text-center sm:px-2',
              active && 'border-[oklch(0.45_0.12_290)] bg-lavender/10',
              done && !active && 'border-emerald-200 bg-emerald-50/80',
              !active && !done && 'border-border bg-card',
            )}
          >
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                active && 'bg-[oklch(0.45_0.12_290)] text-white',
                done && !active && 'bg-emerald-600 text-white',
                !active && !done && 'bg-muted text-muted-foreground',
              )}
            >
              {done && !active ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="hidden text-[10px] font-medium sm:block">{s.label}</span>
            <Icon className="h-3.5 w-3.5 text-muted-foreground sm:hidden" aria-hidden />
          </li>
        );
      })}
    </ol>
  );
}

function SlaStep({
  accepted,
  onAcceptedChange,
}: {
  accepted: boolean;
  onAcceptedChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <Alert className="rounded-[10px] border-border bg-muted/40">
        <AlertDescription className="text-sm leading-relaxed text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Eligibility</p>
          <p>All equipment is available for reservation only to registered students and staff of UniKL with a valid ID.
          </p><br />
          <p className="mb-2 font-medium text-foreground">Reservation Duration</p>
          <p>The duration of the reservation is as specified in your request.
          </p><br />
          <p className="mb-2 font-medium text-foreground">Eligibility</p>
          <p>All equipment is available for reservation only to registered students and staff of UniKL with a valid ID.
          </p><br />
          <p className="mb-2 font-medium text-foreground">Responsibility</p>
          <p>The party making the reservation is fully responsible for the reserved equipment from the moment of collection until they are returned and checked in by a technician.
          </p><br />
          <p className="mb-2 font-medium text-foreground">Condition of Items</p>
          <p>The reserving party must inspect the item(s) at the time of collection. Any existing damage must be reported immediately, or the reserving party may be held responsible.
          </p><br />
          <p className="mb-2 font-medium text-foreground">Damage or loss</p>
          <p>All equipment is available for reservation only to registered students and staff of UniKL with a valid ID.
          </p><br />
          <p className="mb-2 font-bold text-foreground text-red-500">Damage or loss</p>
          <p className="font-bold text-red-500">The reserving party will be held financially responsible for the full replacement cost of any lost, stolen, or damaged items.
          </p><br />
          <p className="mb-2 font-medium text-foreground">Late Returns</p>
          <p>Failure to return items by the specified return date will result in a fine and a temporary suspension of reservation privileges.
          </p><br />
          <p className="mb-2 font-medium text-foreground">Purpose of use</p>
          <p> Items are to be used for academic or official university purposes only.
          </p><br />
          <p className="mb-2 font-medium text-foreground">Collection</p>
          <p>Approved items must be collected within 24 hours of the "Approved" status, or the reservation may be cancelled.
          </p><br />
        </AlertDescription>
      </Alert>
      <div className="flex items-start gap-3 rounded-[10px] border border-border p-4">
        <Checkbox
          id="sla-accept"
          checked={accepted}
          onCheckedChange={(v) => onAcceptedChange(v === true)}
        />
        <Label htmlFor="sla-accept" className="cursor-pointer text-sm leading-snug font-normal">
          I have read and agree to the terms and conditions for equipment borrowing.
        </Label>
      </div>
    </div>
  );
}

function DetailsStep({
  borrowDate,
  returnDate,
  programType,
  usageLocation,
  reason,
  onBorrowDateChange,
  onReturnDateChange,
  onProgramTypeChange,
  onUsageLocationChange,
  onReasonChange,
}: {
  borrowDate: string;
  returnDate: string;
  programType: string;
  usageLocation: string;
  reason: string;
  onBorrowDateChange: (v: string) => void;
  onReturnDateChange: (v: string) => void;
  onProgramTypeChange: (v: string) => void;
  onUsageLocationChange: (v: string) => void;
  onReasonChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <DatePickerField
          label="Borrow date"
          value={borrowDate}
          onChange={onBorrowDateChange}
          required
        />
        <DatePickerField
          label="Return date"
          value={returnDate}
          onChange={onReturnDateChange}
          required
        />
      </div>
      <FormField label="Program type" required>
        <Select value={programType || undefined} onValueChange={onProgramTypeChange}>
          <SelectTrigger className="rounded-[8px]">
            <SelectValue placeholder="Select program type" />
          </SelectTrigger>
          <SelectContent>
            {REQUEST_PROGRAM_TYPES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Usage location" required>
        <Input
          value={usageLocation}
          onChange={(e) => onUsageLocationChange(e.target.value)}
          placeholder="Building, room, or venue"
          className="rounded-[8px]"
        />
      </FormField>
      <FormField label="Reason (optional)">
        <Textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Brief description of how the equipment will be used"
          className="min-h-[88px] rounded-[8px]"
        />
      </FormField>
    </div>
  );
}

function ItemsStep({
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: UserRequestItemDraft[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<UserRequestItemDraft>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose what you need (laptop or AV equipment). Quantities are per item; technicians assign
        from the laptop or AV pool — you will not see specific asset numbers.
      </p>
      {items.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
          <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">No categories added yet.</p>
          <Button type="button" variant="outline" size="sm" className="mt-4 rounded-[8px]" onClick={onAdd}>
            Add category
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-[12px] border border-border bg-card/50 p-3 sm:flex-row sm:items-end"
            >
              <FormField label={`Category ${index + 1}`} required>
                <Select
                  value={item.assetType}
                  onValueChange={(v) => onUpdate(item.id, { assetType: v })}
                >
                  <SelectTrigger className="rounded-[8px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_REQUEST_LAPTOP_TYPES.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Laptop</SelectLabel>
                        {USER_REQUEST_LAPTOP_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {USER_REQUEST_AV_TYPES.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>AV equipment</SelectLabel>
                        {USER_REQUEST_AV_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Quantity" required>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    onUpdate(item.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="w-full rounded-[8px] sm:w-24"
                />
              </FormField>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive sm:mb-0.5"
                onClick={() => onRemove(item.id)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="rounded-[8px]" onClick={onAdd}>
            Add another category
          </Button>
        </div>
      )}
    </div>
  );
}

function PreviewStep({
  requesterName,
  borrowDate,
  returnDate,
  programType,
  usageLocation,
  reason,
  items,
}: {
  requesterName: string;
  borrowDate: string;
  returnDate: string;
  programType: string;
  usageLocation: string;
  reason: string;
  items: UserRequestItemDraft[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review your request before submitting.</p>
      <dl className="space-y-3 rounded-[12px] border border-border bg-muted/20 p-4 text-sm">
        <PreviewRow label="Requester" value={requesterName} />
        <PreviewRow label="Borrow date" value={borrowDate || '—'} />
        <PreviewRow label="Return date" value={returnDate || '—'} />
        <PreviewRow label="Program type" value={programType || '—'} />
        <PreviewRow label="Usage location" value={usageLocation || '—'} />
        {reason.trim() && <PreviewRow label="Reason" value={reason.trim()} />}
      </dl>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Equipment
        </p>
        <ul className="space-y-2">
          {items.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-2 rounded-[10px] border border-border px-3 py-2 text-sm"
            >
              <span>
                {i.assetType}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({requestItemKindFromAssetType(i.assetType) === 'laptop' ? 'Laptop' : 'AV'})
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">× {i.quantity}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium sm:text-right">{value}</dd>
    </div>
  );
}

