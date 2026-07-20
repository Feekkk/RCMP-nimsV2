import type { RowDataPacket } from 'mysql2';
import type { LandingSampleAsset, LandingStatusRow, LandingSystemStatus } from '@/lib/landing-status-types';
import { isEmailConfigured, isMailpitMode } from '@/lib/microsoft-email-config';
import { getDbPool, formatDatabaseError } from '@/server/db';

type SampleRow = RowDataPacket & {
  kind: string;
  asset_id: number;
  brand: string | null;
  model: string | null;
  serial_num: string | null;
  category: string | null;
  status_id: number;
  status_name: string;
};

function formatFetchedAt(): string {
  return new Date().toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function pingDatabase(): Promise<{ ok: boolean; message: string }> {
  try {
    const pool = getDbPool();
    await pool.query('SELECT 1');
    const db = process.env.MYSQL_DATABASE ?? 'nimsV2';
    return { ok: true, message: `Connected · ${db}` };
  } catch (e) {
    return { ok: false, message: formatDatabaseError(e) };
  }
}

async function loadCounts(): Promise<{
  laptop: number;
  av: number;
  network: number;
  staff: number;
  openRequests: number;
}> {
  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & {
      laptop: number;
      av: number;
      network: number;
      staff: number;
      open_requests: number;
    })[]
  >(
    `SELECT
      (SELECT COUNT(*) FROM laptop) AS laptop,
      (SELECT COUNT(*) FROM av) AS av,
      (SELECT COUNT(*) FROM network) AS network,
      (SELECT COUNT(*) FROM staff) AS staff,
      (SELECT COUNT(*) FROM request WHERE rejected_at IS NULL) AS open_requests`,
  );
  const r = rows[0];
  return {
    laptop: Number(r?.laptop ?? 0),
    av: Number(r?.av ?? 0),
    network: Number(r?.network ?? 0),
    staff: Number(r?.staff ?? 0),
    openRequests: Number(r?.open_requests ?? 0),
  };
}

async function loadSampleAssets(): Promise<LandingSampleAsset[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<SampleRow[]>(
    `(SELECT 'laptop' AS kind, l.asset_id, l.brand, l.model, l.serial_num, l.category, l.status_id, s.name AS status_name
      FROM laptop l INNER JOIN status s ON s.status_id = l.status_id
      ORDER BY l.asset_id DESC LIMIT 2)
     UNION ALL
     (SELECT 'av' AS kind, a.asset_id, a.brand, a.model, a.serial_num, a.category, a.status_id, s.name AS status_name
      FROM av a INNER JOIN status s ON s.status_id = a.status_id
      ORDER BY a.asset_id DESC LIMIT 1)
     UNION ALL
     (SELECT 'network' AS kind, n.asset_id, n.brand, n.model, n.serial_num, n.category, n.status_id, s.name AS status_name
      FROM network n INNER JOIN status s ON s.status_id = n.status_id
      ORDER BY n.asset_id DESC LIMIT 1)`,
  );

  return rows.map((r) => {
    const kind = r.kind === 'laptop' || r.kind === 'av' || r.kind === 'network' ? r.kind : 'laptop';
    const model = r.model?.trim() || '—';
    const brand = r.brand?.trim();
    const label =
      kind === 'laptop'
        ? [brand, model].filter(Boolean).join(' ') || model
        : kind === 'av'
          ? r.category?.trim() || model
          : r.category?.trim() || model;
    const detail =
      kind === 'network'
        ? `Asset #${r.asset_id}`
        : r.serial_num?.trim() || `Asset #${r.asset_id}`;

    return {
      kind,
      assetId: r.asset_id,
      label,
      detail,
      statusId: r.status_id,
      statusName: r.status_name,
    };
  });
}

function buildStatusRows(
  db: { ok: boolean; message: string },
  counts: Awaited<ReturnType<typeof loadCounts>>,
): LandingStatusRow[] {
  const totalAssets = counts.laptop + counts.av + counts.network;
  const emailConfigured = isEmailConfigured();

  return [
    {
      key: 'database',
      label: 'Database',
      value: db.ok ? db.message : 'Offline',
      level: db.ok ? 'ok' : 'error',
    },
    {
      key: 'email',
      label: 'Email notifications',
      value: emailConfigured
        ? isMailpitMode()
          ? 'Configured · local test mail'
          : 'Configured · ready to send'
        : 'Not configured — contact IT to enable',
      level: emailConfigured ? 'ok' : 'warn',
    },
    {
      key: 'assets',
      label: 'Assets registered',
      value: `${totalAssets} total · ${counts.laptop} laptop · ${counts.av} AV · ${counts.network} network`,
      level: totalAssets > 0 ? 'ok' : 'neutral',
    },
    {
      key: 'staff',
      label: 'Staff directory',
      value: `${counts.staff} records`,
      level: counts.staff > 0 ? 'ok' : 'neutral',
    },
    {
      key: 'requests',
      label: 'Borrow requests',
      value: `${counts.openRequests} active (not rejected)`,
      level: 'neutral',
    },
  ];
}

export async function getLandingSystemStatus(): Promise<LandingSystemStatus> {
  const db = await pingDatabase();
  let counts = { laptop: 0, av: 0, network: 0, staff: 0, openRequests: 0 };
  let sampleAssets: LandingSampleAsset[] = [];

  if (db.ok) {
    try {
      counts = await loadCounts();
      sampleAssets = await loadSampleAssets();
    } catch {
      sampleAssets = [];
    }
  }

  return {
    fetchedAt: formatFetchedAt(),
    rows: buildStatusRows(db, counts),
    sampleAssets,
  };
}
