import { useCallback, useSyncExternalStore } from 'react';

export type StockStatus = 'in_stock' | 'out_of_stock';
export type AssetKind = 'laptop' | 'av' | 'network';

export type LaptopFormFactor = 'laptop' | 'desktop';
export type AvCategory = 'display' | 'projector' | 'audio' | 'camera';
export type NetworkCategory = 'switch' | 'router' | 'firewall' | 'access_point';

export type LaptopAsset = {
  id: string;
  kind: 'laptop';
  formFactor: LaptopFormFactor;
  model: string;
  assetTag: string;
  serial: string;
  location: string;
  status: StockStatus;
  cpu: string;
  ramGb: number;
  storageGb: number;
  os: string;
};

export type AvAsset = {
  id: string;
  kind: 'av';
  category: AvCategory;
  model: string;
  assetTag: string;
  serial: string;
  location: string;
  status: StockStatus;
  resolution: string;
  hdmiPorts: number;
  wattage?: number;
};

export type NetworkAsset = {
  id: string;
  kind: 'network';
  category: NetworkCategory;
  model: string;
  assetTag: string;
  serial: string;
  location: string;
  status: StockStatus;
  portCount: number;
  firmware: string;
  ipAddress: string;
};

export type CreateLaptopInput = Omit<LaptopAsset, 'id' | 'kind'>;
export type CreateAvInput = Omit<AvAsset, 'id' | 'kind'>;
export type CreateNetworkInput = Omit<NetworkAsset, 'id' | 'kind'>;

type AssetStore = {
  laptop: LaptopAsset[];
  av: AvAsset[];
  network: NetworkAsset[];
};

const INITIAL_STORE: AssetStore = {
  laptop: [
    {
      id: 'c1',
      kind: 'laptop',
      formFactor: 'laptop',
      model: 'Lenovo ThinkPad T14 Gen 3',
      assetTag: 'AST-10432',
      serial: 'PF4Z9DL2',
      location: 'HQ — Equipment stores',
      status: 'in_stock',
      cpu: 'Intel i7-1365U',
      ramGb: 16,
      storageGb: 512,
      os: 'Windows 11',
    },
    {
      id: 'c2',
      kind: 'laptop',
      formFactor: 'laptop',
      model: 'Dell Latitude 5440',
      assetTag: 'AST-10411',
      serial: 'DL-883104',
      location: 'Records — Floor 2',
      status: 'out_of_stock',
      cpu: 'Intel i5-1345U',
      ramGb: 16,
      storageGb: 256,
      os: 'Windows 11',
    },
    {
      id: 'c3',
      kind: 'laptop',
      formFactor: 'desktop',
      model: 'Dell OptiPlex 7010 SFF',
      assetTag: 'AST-09102',
      serial: 'OPX-22109',
      location: 'Comms room A',
      status: 'in_stock',
      cpu: 'Intel i5-13500',
      ramGb: 32,
      storageGb: 1024,
      os: 'Windows 11',
    },
    {
      id: 'c4',
      kind: 'laptop',
      formFactor: 'desktop',
      model: 'HP Elite Mini 800 G9',
      assetTag: 'AST-09077',
      serial: 'HP-77X12',
      location: 'Visitor services',
      status: 'in_stock',
      cpu: 'Intel i7-13700',
      ramGb: 16,
      storageGb: 512,
      os: 'Windows 11',
    },
    {
      id: 'c5',
      kind: 'laptop',
      formFactor: 'laptop',
      model: 'Panasonic Toughbook FZ-55',
      assetTag: 'AST-10455',
      serial: 'TB-55102',
      location: 'Mobile unit — Bay 3',
      status: 'out_of_stock',
      cpu: 'Intel i5-8365U',
      ramGb: 16,
      storageGb: 512,
      os: 'Windows 11',
    },
    {
      id: 'c6',
      kind: 'laptop',
      formFactor: 'laptop',
      model: 'Microsoft Surface Laptop 5',
      assetTag: 'AST-10402',
      serial: 'MSL-50022',
      location: 'HQ — Equipment stores',
      status: 'in_stock',
      cpu: 'Intel i7-1265U',
      ramGb: 16,
      storageGb: 512,
      os: 'Windows 11',
    },
  ],
  av: [
    {
      id: 'a1',
      kind: 'av',
      category: 'display',
      model: 'Samsung QM85C 85" UHD signage',
      assetTag: 'AV-20041',
      serial: 'SM-QM85-9012',
      location: 'Briefing hall A',
      status: 'in_stock',
      resolution: '3840×2160',
      hdmiPorts: 3,
    },
    {
      id: 'a2',
      kind: 'av',
      category: 'projector',
      model: 'Epson PowerLite L735U',
      assetTag: 'AV-20018',
      serial: 'EPS-L735U-4401',
      location: 'Training room — East',
      status: 'in_stock',
      resolution: '1920×1200',
      hdmiPorts: 2,
      wattage: 3700,
    },
    {
      id: 'a3',
      kind: 'av',
      category: 'audio',
      model: 'Shure MXA920 ceiling array',
      assetTag: 'AV-20055',
      serial: 'SHR-MXA920-12',
      location: 'Boardroom HQ',
      status: 'out_of_stock',
      resolution: '—',
      hdmiPorts: 0,
    },
    {
      id: 'a4',
      kind: 'av',
      category: 'camera',
      model: 'Logitech Rally Bar',
      assetTag: 'AV-20003',
      serial: 'LG-RB-8831',
      location: 'Visitor VC suite',
      status: 'in_stock',
      resolution: '4K',
      hdmiPorts: 2,
    },
    {
      id: 'a5',
      kind: 'av',
      category: 'display',
      model: 'LG 43" UL3J series',
      assetTag: 'AV-20022',
      serial: 'LG-UL3J-2210',
      location: 'Records — reception',
      status: 'out_of_stock',
      resolution: '3840×2160',
      hdmiPorts: 2,
    },
    {
      id: 'a6',
      kind: 'av',
      category: 'projector',
      model: 'BenQ LU935ST short throw',
      assetTag: 'AV-20009',
      serial: 'BQ-LU935-774',
      location: 'Mobile pod — Kit 2',
      status: 'in_stock',
      resolution: '1920×1080',
      hdmiPorts: 2,
      wattage: 3200,
    },
  ],
  network: [
    {
      id: 'n1',
      kind: 'network',
      category: 'switch',
      model: 'Cisco Catalyst 9200L-24T-4G',
      assetTag: 'NET-30001',
      serial: 'CS-9200-2412',
      location: 'Comms rack 1',
      status: 'in_stock',
      portCount: 24,
      firmware: '17.9.4',
      ipAddress: '10.10.1.12',
    },
    {
      id: 'n2',
      kind: 'network',
      category: 'router',
      model: 'Juniper SRX320',
      assetTag: 'NET-30012',
      serial: 'JR-SRX-320-88',
      location: 'Edge closet',
      status: 'in_stock',
      portCount: 8,
      firmware: '22.4R1',
      ipAddress: '10.10.0.1',
    },
    {
      id: 'n3',
      kind: 'network',
      category: 'firewall',
      model: 'FortiGate 60F',
      assetTag: 'NET-30021',
      serial: 'FG-60F-5512',
      location: 'Security rack',
      status: 'out_of_stock',
      portCount: 10,
      firmware: '7.4.2',
      ipAddress: '10.10.0.254',
    },
    {
      id: 'n4',
      kind: 'network',
      category: 'access_point',
      model: 'Aruba AP-515',
      assetTag: 'NET-30033',
      serial: 'AP-515-778',
      location: 'HQ — Lobby',
      status: 'in_stock',
      portCount: 2,
      firmware: '8.12.0',
      ipAddress: '10.10.2.45',
    },
    {
      id: 'n5',
      kind: 'network',
      category: 'access_point',
      model: 'Ubiquiti U6-LR',
      assetTag: 'NET-30045',
      serial: 'UB-6LR-221',
      location: 'Records — Floor 2',
      status: 'out_of_stock',
      portCount: 1,
      firmware: '6.6.65',
      ipAddress: '10.10.2.52',
    },
  ],
};

let store: AssetStore = structuredClone(INITIAL_STORE);
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getAssetsSnapshot(): AssetStore {
  return store;
}

export function resetAssetsStore() {
  store = structuredClone(INITIAL_STORE);
  emit();
}

export function createLaptopAsset(input: CreateLaptopInput): LaptopAsset {
  const asset: LaptopAsset = { id: nextId('c'), kind: 'laptop', ...input };
  store = { ...store, laptop: [...store.laptop, asset] };
  emit();
  return asset;
}

export function createAvAsset(input: CreateAvInput): AvAsset {
  const asset: AvAsset = { id: nextId('a'), kind: 'av', ...input };
  store = { ...store, av: [...store.av, asset] };
  emit();
  return asset;
}

export function createNetworkAsset(input: CreateNetworkInput): NetworkAsset {
  const asset: NetworkAsset = { id: nextId('n'), kind: 'network', ...input };
  store = { ...store, network: [...store.network, asset] };
  emit();
  return asset;
}

export function updateLaptopAsset(id: string, patch: Partial<CreateLaptopInput>): LaptopAsset | null {
  const idx = store.laptop.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const updated = { ...store.laptop[idx], ...patch };
  const laptop = [...store.laptop];
  laptop[idx] = updated;
  store = { ...store, laptop };
  emit();
  return updated;
}

export function updateAvAsset(id: string, patch: Partial<CreateAvInput>): AvAsset | null {
  const idx = store.av.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const updated = { ...store.av[idx], ...patch };
  const av = [...store.av];
  av[idx] = updated;
  store = { ...store, av };
  emit();
  return updated;
}

export function updateNetworkAsset(id: string, patch: Partial<CreateNetworkInput>): NetworkAsset | null {
  const idx = store.network.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const updated = { ...store.network[idx], ...patch };
  const network = [...store.network];
  network[idx] = updated;
  store = { ...store, network };
  emit();
  return updated;
}

export function deleteAsset(kind: AssetKind, id: string): boolean {
  const key = kind;
  const list = store[key].filter((a) => a.id !== id);
  if (list.length === store[key].length) return false;
  store = { ...store, [key]: list };
  emit();
  return true;
}

export const AV_CATEGORY_LABEL: Record<AvCategory, string> = {
  display: 'Display',
  projector: 'Projector',
  audio: 'Audio',
  camera: 'Camera',
};

export const NETWORK_CATEGORY_LABEL: Record<NetworkCategory, string> = {
  switch: 'Switch',
  router: 'Router',
  firewall: 'Firewall',
  access_point: 'Access point',
};

export const ASSET_KIND_LABEL: Record<AssetKind, string> = {
  laptop: 'Laptop / Desktop',
  av: 'AV equipment',
  network: 'Network equipment',
};

export const ASSET_LIST_PATH: Record<AssetKind, string> = {
  laptop: '/technician/laptop',
  av: '/technician/av',
  network: '/technician/network',
};

export function useAssets<K extends AssetKind>(kind: K) {
  const snapshot = useSyncExternalStore(subscribe, getAssetsSnapshot, getAssetsSnapshot);

  const items = snapshot[kind] as AssetStore[K];

  const create = useCallback(
    (input: K extends 'laptop' ? CreateLaptopInput : K extends 'av' ? CreateAvInput : CreateNetworkInput) => {
      if (kind === 'laptop') return createLaptopAsset(input as CreateLaptopInput);
      if (kind === 'av') return createAvAsset(input as CreateAvInput);
      return createNetworkAsset(input as CreateNetworkInput);
    },
    [kind],
  );

  const update = useCallback(
    (id: string, patch: Partial<CreateLaptopInput | CreateAvInput | CreateNetworkInput>) => {
      if (kind === 'laptop') return updateLaptopAsset(id, patch as Partial<CreateLaptopInput>);
      if (kind === 'av') return updateAvAsset(id, patch as Partial<CreateAvInput>);
      return updateNetworkAsset(id, patch as Partial<CreateNetworkInput>);
    },
    [kind],
  );

  const remove = useCallback((id: string) => deleteAsset(kind, id), [kind]);

  return { items, create, update, remove, isLoading: false };
}

export function filterBySearch<T extends { model: string; assetTag: string; serial: string; location: string }>(
  items: T[],
  query: string,
  extra?: (item: T) => string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const haystack = [item.model, item.assetTag, item.serial, item.location, extra?.(item) ?? '']
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function countStock<T extends { status: StockStatus }>(items: T[]) {
  return {
    inStock: items.filter((i) => i.status === 'in_stock').length,
    outStock: items.filter((i) => i.status === 'out_of_stock').length,
  };
}
