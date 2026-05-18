import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DATE_FORMAT_DDMMYY,
  formatDateLabel,
  formatIsoToDdMmYy,
  isoToLocalDate,
  localDateToIso,
} from '@/lib/date-format';
import { RETURN_CONDITIONS } from '@/lib/deploy-return-schema';
import { cn } from '@/lib/utils';

export function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

/** Calendar picker; stores ISO date (YYYY-MM-DD). Shows DDMMYY hint for records. */
export function DatePickerField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? isoToLocalDate(value) : undefined;
  const ddmmyy = value ? formatIsoToDdMmYy(value) : null;

  return (
    <FormField label={label} required={required}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-10 w-full justify-start rounded-[8px] px-3 font-normal',
              !selected && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            {selected ? (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-left">
                <span>{formatDateLabel(value)}</span>
                {ddmmyy && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    ({DATE_FORMAT_DDMMYY}: {ddmmyy})
                  </span>
                )}
              </span>
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) {
                onChange(localDateToIso(date));
                setOpen(false);
              }
            }}
            defaultMonth={selected}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <input
        type="hidden"
        name={label.replace(/\s+/g, '_').toLowerCase()}
        value={value}
        required={required}
      />
    </FormField>
  );
}

/** @deprecated Use DatePickerField */
export const DateDdMmYyField = DatePickerField;

export function ReturnDetailsFields({
  returnDate,
  setReturnDate,
  returnTime,
  setReturnTime,
  returnPlace,
  setReturnPlace,
  condition,
  setCondition,
  returnRemarks,
  setReturnRemarks,
}: {
  returnDate: string;
  setReturnDate: (v: string) => void;
  returnTime: string;
  setReturnTime: (v: string) => void;
  returnPlace: string;
  setReturnPlace: (v: string) => void;
  condition: string;
  setCondition: (v: string) => void;
  returnRemarks: string;
  setReturnRemarks: (v: string) => void;
}) {
  return (
    <>
      <DatePickerField label="Return date" value={returnDate} onChange={setReturnDate} required />
      <FormField label="Return time">
        <Input
          type="time"
          value={returnTime}
          onChange={(e) => setReturnTime(e.target.value)}
          className="rounded-[8px]"
        />
      </FormField>
      <FormField label="Return place">
        <Input
          value={returnPlace}
          onChange={(e) => setReturnPlace(e.target.value)}
          placeholder="e.g. IT store, Building A"
          className="rounded-[8px]"
        />
      </FormField>
      <FormField label="Condition" required>
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger className="rounded-[8px]">
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            {RETURN_CONDITIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Return remarks">
        <Textarea
          value={returnRemarks}
          onChange={(e) => setReturnRemarks(e.target.value)}
          className="min-h-[80px] rounded-[8px]"
        />
      </FormField>
    </>
  );
}
