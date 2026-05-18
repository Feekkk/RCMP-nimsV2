import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DATE_FORMAT_DDMMYY } from '@/lib/date-format';
import type { PurchaseFormState } from '@/lib/purchase-field-utils';

const DATE_PLACEHOLDER = 'DDMMYY';
const DATE_HINT = `${DATE_FORMAT_DDMMYY} (e.g. 150126)`;

export function PurchaseFieldsSection({
  values,
  onChange,
}: {
  values: PurchaseFormState;
  onChange: (patch: Partial<PurchaseFormState>) => void;
}) {
  return (
    <section className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Procurement (PO / DO / invoice)</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`PO date (PO_DATE) — ${DATE_HINT}`}>
          <Input
            value={values.poDate}
            onChange={(e) => onChange({ poDate: e.target.value })}
            placeholder={DATE_PLACEHOLDER}
            inputMode="numeric"
            maxLength={6}
            className="rounded-[8px] font-mono"
          />
        </Field>
        <Field label="PO number (PO_NUM)">
          <Input value={values.poNum} onChange={(e) => onChange({ poNum: e.target.value })} className="rounded-[8px]" />
        </Field>
        <Field label={`DO date (DO_DATE) — ${DATE_HINT}`}>
          <Input
            value={values.doDate}
            onChange={(e) => onChange({ doDate: e.target.value })}
            placeholder={DATE_PLACEHOLDER}
            inputMode="numeric"
            maxLength={6}
            className="rounded-[8px] font-mono"
          />
        </Field>
        <Field label="DO number (DO_NUM)">
          <Input value={values.doNum} onChange={(e) => onChange({ doNum: e.target.value })} className="rounded-[8px]" />
        </Field>
        <Field label={`Invoice date (INVOICE_DATE) — ${DATE_HINT}`}>
          <Input
            value={values.invoiceDate}
            onChange={(e) => onChange({ invoiceDate: e.target.value })}
            placeholder={DATE_PLACEHOLDER}
            inputMode="numeric"
            maxLength={6}
            className="rounded-[8px] font-mono"
          />
        </Field>
        <Field label="Invoice number (INVOICE_NUM)">
          <Input value={values.invoiceNum} onChange={(e) => onChange({ invoiceNum: e.target.value })} className="rounded-[8px]" />
        </Field>
        <Field label="Purchase cost (PURCHASE_COST)">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={values.purchaseCost}
            onChange={(e) => onChange({ purchaseCost: e.target.value })}
            placeholder="0.00"
            className="rounded-[8px]"
          />
        </Field>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
