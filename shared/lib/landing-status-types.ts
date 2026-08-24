export type LandingStatusLevel = 'ok' | 'warn' | 'error' | 'neutral';

export type LandingStatusRow = {
  key: string;
  label: string;
  value: string;
  level: LandingStatusLevel;
};

export type LandingSampleAsset = {
  kind: 'laptop' | 'av' | 'network';
  assetId: number;
  label: string;
  detail: string;
  statusId: number;
  statusName: string;
};

export type LandingSystemStatus = {
  fetchedAt: string;
  rows: LandingStatusRow[];
  sampleAssets: LandingSampleAsset[];
};
