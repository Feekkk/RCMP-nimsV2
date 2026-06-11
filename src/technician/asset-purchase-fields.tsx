import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PurchaseFormState } from '@/lib/purchase-field-utils';
import { DatePickerField } from '@/technician/deploy-return-fields';

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
        <DatePickerField
          label="PO date (PO_DATE)"
          value={values.poDate}
          onChange={(v) => onChange({ poDate: v })}
        />
        <Field label="PO number (PO_NUM)">
          <Input value={values.poNum} onChange={(e) => onChange({ poNum: e.target.value })} className="rounded-[8px]" />
        </Field>
        <DatePickerField
          label="DO date (DO_DATE)"
          value={values.doDate}
          onChange={(v) => onChange({ doDate: v })}
        />
        <Field label="DO number (DO_NUM)">
          <Input value={values.doNum} onChange={(e) => onChange({ doNum: e.target.value })} className="rounded-[8px]" />
        </Field>
        <DatePickerField
          label="Invoice date (INVOICE_DATE)"
          value={values.invoiceDate}
          onChange={(v) => onChange({ invoiceDate: v })}
        />
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
