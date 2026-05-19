import type { RequestAssignableKind } from '@/lib/request-schema';

/** Equipment categories users can add to a borrow request */
export const USER_REQUEST_ASSET_TYPES = [
  'Laptop',
  'Portable Speaker',
  'Microphone',
  'Pocket Mic',
  'Tripod',
  'Projector',
  'Video Camera',
  'Webcam',
] as const;

export type UserRequestAssetType = (typeof USER_REQUEST_ASSET_TYPES)[number];

/** Maps a requested category label to pool kind (laptop vs av). */
export function requestItemKindFromAssetType(assetType: string): RequestAssignableKind {
  const t = assetType.trim().toLowerCase();
  if (t.includes('laptop') || t.includes('desktop') || t.includes('computer')) {
    return 'laptop';
  }
  return 'av';
}

export const USER_REQUEST_LAPTOP_TYPES = USER_REQUEST_ASSET_TYPES.filter(
  (t) => requestItemKindFromAssetType(t) === 'laptop',
);

export const USER_REQUEST_AV_TYPES = USER_REQUEST_ASSET_TYPES.filter(
  (t) => requestItemKindFromAssetType(t) === 'av',
);

export function kindGroupLabel(kind: RequestAssignableKind): string {
  return kind === 'laptop' ? 'Laptop' : 'AV';
}
