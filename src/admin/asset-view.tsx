import { AdminShell } from '@/admin/admin-shell';
import type { AssetKind } from '@/lib/inventory-schema';
import { AssetViewContent } from '@/technician/asset-view';

const ADMIN_ASSET_LIST_PATH: Record<AssetKind, string> = {
  laptop: '/admin/laptop',
  av: '/admin/av',
  network: '/admin/network',
};

export function AdminAssetViewPage({ kind, assetId }: { kind: AssetKind; assetId: number }) {
  return (
    <AdminShell>
      <AssetViewContent
        kind={kind}
        assetId={assetId}
        readOnly
        backTo={ADMIN_ASSET_LIST_PATH[kind]}
        backLabel="Back to overview"
      />
    </AdminShell>
  );
}
