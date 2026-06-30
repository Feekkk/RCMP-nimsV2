import { TableHead } from '@/components/ui/table';
import type { PlaceFields } from '@/lib/inventory-schema';

export type PlaceColumnView = 'place' | 'building' | 'level' | 'zone';

const PLACE_VIEW_LABEL: Record<PlaceColumnView, string> = {
  place: 'Place',
  building: 'Building',
  level: 'Level',
  zone: 'Zone',
};

const PLACE_VIEW_NEXT: Record<PlaceColumnView, PlaceColumnView> = {
  place: 'building',
  building: 'level',
  level: 'zone',
  zone: 'place',
};

export function PlaceTableHead({
  view,
  onViewChange,
}: {
  view: PlaceColumnView;
  onViewChange: (view: PlaceColumnView) => void;
}) {
  const next = PLACE_VIEW_NEXT[view];

  return (
    <TableHead className="whitespace-nowrap font-semibold">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-[6px] px-1 -mx-1 text-left hover:text-foreground hover:underline underline-offset-2"
        title={`Show ${PLACE_VIEW_LABEL[next].toLowerCase()}`}
        onClick={() => onViewChange(next)}
      >
        {PLACE_VIEW_LABEL[view]}
      </button>
    </TableHead>
  );
}

export function formatPlaceCell(view: PlaceColumnView, place: PlaceFields): string {
  if (view === 'building') return place.building ?? '—';
  if (view === 'level') return place.level ?? '—';
  if (view === 'zone') return place.zone ?? '—';
  const parts = [place.building, place.level, place.zone].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}
