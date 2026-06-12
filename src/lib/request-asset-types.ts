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

export type UserRequestAssetCatalogEntry = {
  assetType: UserRequestAssetType;
  kind: RequestAssignableKind;
  description: string;
  includes: string;
};

/** Reference info shown on the user request equipment step. */
export const USER_REQUEST_ASSET_CATALOG: UserRequestAssetCatalogEntry[] = [
  {
    assetType: 'Laptop',
    kind: 'laptop',
    description: 'General purpose laptop.',
    includes: 'Laptop unit and charger',
  },
  {
    assetType: 'Portable Speaker',
    kind: 'av',
    description: 'Portable speaker for events, rehearsals, and etc.',
    includes: 'Speaker unit, 2x Wireless Microphone and stand',
  },
  {
    assetType: 'Microphone',
    kind: 'av',
    description: 'Handheld microphone for Seminar Room and Lecture Theatre only',
    includes: 'Microphone unit and battery separated',
  },
  {
    assetType: 'Pocket Mic',
    kind: 'av',
    description: 'Only use for Seminar Room',
    includes: 'Pocket mic and receiver',
  },
  {
    assetType: 'Projector',
    kind: 'av',
    description: 'Portable projector for classrooms, briefings, and events.',
    includes: 'Projector unit, HDMI cable and power cable',
  },
  {
    assetType: 'Video Camera',
    kind: 'av',
    description: 'Handheld video camera for lectures, events, and field recording.',
    includes: 'Camera unit, adapter cable and tripod (upon request)',
  },
  {
    assetType: 'Webcam',
    kind: 'av',
    description: 'USB webcam for online classes, meetings, and streaming.',
    includes: 'Webcam unit',
  },
];

export function getUserRequestAssetCatalogEntry(
  assetType: string,
): UserRequestAssetCatalogEntry | undefined {
  return USER_REQUEST_ASSET_CATALOG.find((e) => e.assetType === assetType);
}

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
