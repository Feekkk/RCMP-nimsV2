import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { StaffRecipient } from '@/lib/deploy-return-schema';
import { searchStaffFn } from '@/server/deploy-return.functions';

export function StaffRecipientSearch({
  value,
  onSelect,
}: {
  value: StaffRecipient | null;
  onSelect: (staff: StaffRecipient | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StaffRecipient[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      void searchStaffFn({ data: query })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-[8px] border border-border bg-muted/40 px-3 py-2 text-sm">
        <div>
          <p className="font-medium">{value.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {value.employeeNo}
            {value.email ? ` · ${value.email}` : ' · no email'}
            {value.department ? ` · ${value.department}` : ''}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="rounded-[6px]" onClick={() => onSelect(null)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search staff by name or employee no."
          className="rounded-[8px] pl-9"
        />
      </div>
      {searching && <p className="text-xs text-muted-foreground">Searching…</p>}
      {results.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded-[8px] border border-border">
          {results.map((s) => (
            <li key={s.employeeNo}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted/60"
                onClick={() => {
                  onSelect(s);
                  setQuery('');
                  setResults([]);
                }}
              >
                <span className="font-medium">{s.fullName}</span>
                <span className="text-xs text-muted-foreground">
                  {s.employeeNo}
                  {s.department ? ` · ${s.department}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
