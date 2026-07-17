import type { RowDataPacket } from 'mysql2';
import {
  DASHBOARD_REQUEST_WORKFLOW_LABEL,
  type TechnicianDashboardStats,
} from '@/lib/dashboard-schema';
import type { AdminRequestInsights } from '@/lib/admin-request-insights-schema';
import { ROLE_USER } from '@/lib/auth-session';
import {
  extractAssetIdCandidates,
  extractMacCandidates,
  extractRequestIdCandidates,
  extractSerialCandidates,
} from '@/lib/admin-prompt-context';
import {
  ASSET_KIND_LABEL,
  formatStatusLabel,
  INVENTORY_STATUSES,
  type AssetDetailResponse,
  type AssetKind,
} from '@/lib/inventory-schema';
import { attachDisplayNames } from '@/server/azure-directory.server';
import { getDbPool } from '@/server/db';

function formatDate(val: Date | string | null | undefined): string {
  if (val == null) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function summarizeInventory(stats: TechnicianDashboardStats) {
  const kinds = ['laptop', 'av', 'network'] as const;
  return Object.fromEntries(
    kinds.map((kind) => {
      const row = stats[kind];
      return [
        ASSET_KIND_LABEL[kind],
        {
          inStore: row.store,
          deployed: row.deploy,
          total: row.total,
          registeredTotal: row.registeredTotal,
          byStatus: row.byStatus.map((status) => ({
            status: formatStatusLabel(status.statusId),
            count: status.count,
          })),
        },
      ];
    }),
  );
}

async function loadOverdueReturns() {
  const pool = getDbPool();
  const today = formatDate(new Date());
  const [rows] = await pool.query<
    (RowDataPacket & {
      request_id: number;
      return_date: Date | string;
      requester_oid: string | null;
      requester_name: string;
      assets_out: number;
    })[]
  >(
    `SELECT r.request_id, r.return_date, u.oid AS requester_oid, COUNT(*) AS assets_out
     FROM request r
     INNER JOIN request_assignment ra ON ra.request_id = r.request_id
     INNER JOIN users u ON u.id = r.requested_by
     WHERE r.rejected_at IS NULL
       AND r.return_date < ?
       AND ra.checkout_at IS NOT NULL
       AND ra.returned_at IS NULL
       AND ra.asset_id IS NOT NULL
     GROUP BY r.request_id, r.return_date, u.oid
     ORDER BY r.return_date ASC
     LIMIT 15`,
    [today],
  );
  await attachDisplayNames(rows, 'requester_oid', 'requester_name');

  return rows.map((row) => ({
    requestId: row.request_id,
    requesterName: row.requester_name,
    returnDate: formatDate(row.return_date),
    assetsOut: Number(row.assets_out),
    daysOverdue: Math.max(
      0,
      Math.round(
        (new Date(today).getTime() - new Date(formatDate(row.return_date)).getTime()) /
          86_400_000,
      ),
    ),
  }));
}

async function loadUserCounts() {
  const pool = getDbPool();
  const [rows] = await pool.query<(RowDataPacket & { role_name: string; cnt: number })[]>(
    `SELECT r.name AS role_name, COUNT(*) AS cnt
     FROM users u
     INNER JOIN role r ON r.id = u.role_id
     GROUP BY r.name
     ORDER BY r.name`,
  );
  return rows.map((row) => ({
    role: row.role_name,
    count: Number(row.cnt),
  }));
}

async function loadCheckedOutCount() {
  const pool = getDbPool();
  const [rows] = await pool.query<(RowDataPacket & { cnt: number })[]>(
    `SELECT COUNT(*) AS cnt
     FROM request_assignment ra
     INNER JOIN request r ON r.request_id = ra.request_id
     WHERE ra.checkout_at IS NOT NULL
       AND ra.returned_at IS NULL
       AND ra.asset_id IS NOT NULL
       AND r.rejected_at IS NULL`,
  );
  return Number(rows[0]?.cnt ?? 0);
}

function summarizeAssetForPrompt(detail: AssetDetailResponse) {
  const { asset, trails } = detail;
  const base = {
    assetId: asset.assetId,
    kind: ASSET_KIND_LABEL[asset.kind],
    status: asset.statusName,
    brand: asset.brand,
    model: asset.model,
    serialNum: asset.serialNum,
    remarks: asset.remarks,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    recentActivity: trails.slice(0, 12).map((trail) => ({
      at: trail.at,
      category: trail.category,
      title: trail.title,
      detail: trail.detail,
    })),
  };

  if (asset.kind === 'laptop') {
    return {
      ...base,
      category: asset.category,
      processor: asset.processor,
      memory: asset.memory,
      os: asset.os,
      storage: asset.storage,
      currentAssignee: asset.recipientDivision,
    };
  }

  if (asset.kind === 'av') {
    return {
      ...base,
      assetIdOld: asset.assetIdOld,
      category: asset.category,
      currentLocation: [asset.building, asset.level, asset.zone].filter(Boolean).join(' · ') || null,
    };
  }

  return {
    ...base,
    macAddress: asset.macAddress,
    ipAddress: asset.ipAddress,
    currentLocation: [asset.building, asset.level, asset.zone].filter(Boolean).join(' · ') || null,
  };
}

async function findAssetIdsBySerial(serial: string): Promise<{ kind: AssetKind; assetId: number }[]> {
  const pool = getDbPool();
  const pattern = `%${serial.trim()}%`;
  const [rows] = await pool.query<(RowDataPacket & { kind: AssetKind; asset_id: number })[]>(
    `SELECT 'laptop' AS kind, asset_id FROM laptop WHERE serial_num LIKE ? LIMIT 3
     UNION ALL
     SELECT 'av' AS kind, asset_id FROM av WHERE serial_num LIKE ? LIMIT 3
     UNION ALL
     SELECT 'network' AS kind, asset_id FROM network WHERE serial_num LIKE ? LIMIT 3`,
    [pattern, pattern, pattern],
  );
  return rows.map((row) => ({ kind: row.kind, assetId: Number(row.asset_id) }));
}

async function findAssetIdsByMac(mac: string): Promise<{ kind: AssetKind; assetId: number }[]> {
  const pool = getDbPool();
  const normalized = mac.replace(/[^0-9A-Fa-f]/g, '').toLowerCase();
  if (normalized.length < 8) return [];

  const [rows] = await pool.query<(RowDataPacket & { kind: AssetKind; asset_id: number })[]>(
    `SELECT 'network' AS kind, asset_id
     FROM network
     WHERE REPLACE(REPLACE(REPLACE(LOWER(mac_address), ':', ''), '-', ''), '.', '') LIKE ?
     LIMIT 3`,
    [`%${normalized}%`],
  );
  return rows.map((row) => ({ kind: row.kind, assetId: Number(row.asset_id) }));
}

async function loadAssetLookup(lookupText: string) {
  const { findAssetByAnyId } = await import('@/server/assets-repo.server');
  const assetsById: ReturnType<typeof summarizeAssetForPrompt>[] = [];
  const seen = new Set<string>();
  const notFoundIds: number[] = [];
  const queriedIds: number[] = [];

  const addDetail = (detail: AssetDetailResponse | null, key: string) => {
    if (!detail || seen.has(key)) return;
    seen.add(key);
    assetsById.push(summarizeAssetForPrompt(detail));
  };

  for (const assetId of extractAssetIdCandidates(lookupText)) {
    queriedIds.push(assetId);
    const detail = await findAssetByAnyId(assetId);
    if (detail) {
      addDetail(detail, `${detail.asset.kind}:${detail.asset.assetId}`);
    } else {
      notFoundIds.push(assetId);
    }
  }

  for (const serial of extractSerialCandidates(lookupText)) {
    const matches = await findAssetIdsBySerial(serial);
    if (matches.length === 0) continue;
    for (const match of matches) {
      const detail = await findAssetByAnyId(match.assetId);
      addDetail(detail, `${match.kind}:${match.assetId}`);
    }
  }

  for (const mac of extractMacCandidates(lookupText)) {
    const matches = await findAssetIdsByMac(mac);
    for (const match of matches) {
      const detail = await findAssetByAnyId(match.assetId);
      addDetail(detail, `${match.kind}:${match.assetId}`);
    }
  }

  return {
    queriedIds,
    assetsById,
    notFoundIds,
  };
}

async function summarizeRequestForPrompt(requestId: number) {
  const pool = getDbPool();
  const [headers] = await pool.query<
    (RowDataPacket & {
      request_id: number;
      requester_oid: string | null;
      requester_name: string;
      borrow_date: Date | string;
      return_date: Date | string;
      program_type: string;
      usage_location: string;
      remarks: string | null;
      created_at: Date | string;
      rejected_at: Date | string | null;
    })[]
  >(
    `SELECT r.request_id, u.oid AS requester_oid, r.borrow_date, r.return_date,
            r.program_type, r.usage_location, r.remarks, r.created_at, r.rejected_at
     FROM request r
     INNER JOIN users u ON u.id = r.requested_by
     WHERE r.request_id = ?`,
    [requestId],
  );
  const header = headers[0];
  if (!header) return null;

  await attachDisplayNames([header], 'requester_oid', 'requester_name');

  const [items] = await pool.query<(RowDataPacket & { asset_type: string; quantity: number })[]>(
    `SELECT asset_type, quantity FROM request_item WHERE request_id = ?`,
    [requestId],
  );

  const [assignments] = await pool.query<
    (RowDataPacket & {
      asset_id: number | null;
      asset_type: string | null;
      assigned_at: Date | string | null;
      checkout_at: Date | string | null;
      returned_at: Date | string | null;
      return_condition: string | null;
      brand: string | null;
      model: string | null;
      kind: AssetKind | null;
    })[]
  >(
    `SELECT ra.asset_id, ri.asset_type, ra.assigned_at, ra.checkout_at, ra.returned_at,
            ra.return_condition,
            COALESCE(l.brand, av.brand, n.brand) AS brand,
            COALESCE(l.model, av.model, n.model) AS model,
            CASE
              WHEN l.asset_id IS NOT NULL THEN 'laptop'
              WHEN av.asset_id IS NOT NULL THEN 'av'
              WHEN n.asset_id IS NOT NULL THEN 'network'
              ELSE NULL
            END AS kind
     FROM request_assignment ra
     LEFT JOIN request_item ri ON ri.request_item_id = ra.request_item_id
     LEFT JOIN laptop l ON l.asset_id = ra.asset_id
     LEFT JOIN av ON av.asset_id = ra.asset_id
     LEFT JOIN network n ON n.asset_id = ra.asset_id
     WHERE ra.request_id = ?
     ORDER BY ra.assignment_id`,
    [requestId],
  );

  const today = formatDate(new Date());
  const returnDate = formatDate(header.return_date);
  let workflowStatus = 'preparing';
  if (header.rejected_at) {
    workflowStatus = 'rejected';
  } else if (assignments.some((row) => row.returned_at)) {
    workflowStatus = assignments.every((row) => row.returned_at || !row.asset_id)
      ? 'completed'
      : 'in_use';
  } else if (assignments.some((row) => row.checkout_at)) {
    workflowStatus = returnDate < today ? 'due_return' : 'in_use';
  } else if (assignments.some((row) => row.assigned_at)) {
    workflowStatus = 'checkout';
  }

  return {
    requestId: header.request_id,
    requesterName: header.requester_name,
    programType: header.program_type,
    usageLocation: header.usage_location,
    borrowDate: formatDate(header.borrow_date),
    returnDate,
    remarks: header.remarks,
    createdAt: formatDate(header.created_at),
    workflowStatus,
    items: items.map((row) => ({
      assetType: row.asset_type,
      quantity: Number(row.quantity),
    })),
    assignments: assignments.map((row) => ({
      assetId: row.asset_id,
      kind: row.kind ? ASSET_KIND_LABEL[row.kind] : row.asset_type,
      brand: row.brand,
      model: row.model,
      bookedAt: row.assigned_at ? formatDate(row.assigned_at) : null,
      checkoutAt: row.checkout_at ? formatDate(row.checkout_at) : null,
      returnedAt: row.returned_at ? formatDate(row.returned_at) : null,
      returnCondition: row.return_condition,
    })),
  };
}

async function loadRequestLookup(lookupText: string) {
  const requestIds = extractRequestIdCandidates(lookupText);
  const requestsById = [];
  const notFoundIds: number[] = [];

  for (const requestId of requestIds) {
    const summary = await summarizeRequestForPrompt(requestId);
    if (summary) {
      requestsById.push(summary);
    } else {
      notFoundIds.push(requestId);
    }
  }

  return {
    queriedIds: requestIds,
    requestsById,
    notFoundIds,
  };
}

async function loadOpenRepairs() {
  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & {
      asset_id: number;
      asset_type: AssetKind;
      repair_date: Date | string;
      issue_summary: string;
      brand: string | null;
      model: string | null;
    })[]
  >(
    `SELECT r.asset_id, r.asset_type, r.repair_date, r.issue_summary,
            COALESCE(l.brand, av.brand, n.brand) AS brand,
            COALESCE(l.model, av.model, n.model) AS model
     FROM repair r
     LEFT JOIN laptop l ON l.asset_id = r.asset_id AND r.asset_type = 'laptop'
     LEFT JOIN av ON av.asset_id = r.asset_id AND r.asset_type = 'av'
     LEFT JOIN network n ON n.asset_id = r.asset_id AND r.asset_type = 'network'
     WHERE r.completed_date IS NULL
     ORDER BY r.repair_date ASC
     LIMIT 10`,
  );

  return rows.map((row) => ({
    assetId: row.asset_id,
    kind: ASSET_KIND_LABEL[row.asset_type],
    brand: row.brand,
    model: row.model,
    repairDate: formatDate(row.repair_date),
    issueSummary: row.issue_summary,
  }));
}

async function loadExpiringWarranties() {
  const pool = getDbPool();
  const today = formatDate(new Date());
  const horizon = formatDate(new Date(Date.now() + 90 * 86_400_000));
  const [rows] = await pool.query<
    (RowDataPacket & {
      asset_id: number;
      asset_type: AssetKind;
      warranty_end_date: Date | string;
      brand: string | null;
      model: string | null;
    })[]
  >(
    `SELECT w.asset_id, w.asset_type, w.warranty_end_date,
            COALESCE(l.brand, av.brand, n.brand) AS brand,
            COALESCE(l.model, av.model, n.model) AS model
     FROM warranty w
     LEFT JOIN laptop l ON l.asset_id = w.asset_id AND w.asset_type = 'laptop'
     LEFT JOIN av ON av.asset_id = w.asset_id AND w.asset_type = 'av'
     LEFT JOIN network n ON n.asset_id = w.asset_id AND w.asset_type = 'network'
     WHERE w.warranty_end_date >= ? AND w.warranty_end_date <= ?
     ORDER BY w.warranty_end_date ASC
     LIMIT 10`,
    [today, horizon],
  );

  return rows.map((row) => ({
    assetId: row.asset_id,
    kind: ASSET_KIND_LABEL[row.asset_type],
    brand: row.brand,
    model: row.model,
    warrantyEnds: formatDate(row.warranty_end_date),
  }));
}

async function loadRecentDisposals() {
  const pool = getDbPool();
  const [rows] = await pool.query<
    (RowDataPacket & {
      disposal_id: number;
      disposal_date: Date | string;
      item_count: number;
      disposal_remarks: string | null;
    })[]
  >(
    `SELECT d.disposal_id, d.disposal_date, d.disposal_remarks, COUNT(di.disposal_item_id) AS item_count
     FROM disposal d
     INNER JOIN disposal_item di ON di.disposal_id = d.disposal_id
     GROUP BY d.disposal_id, d.disposal_date, d.disposal_remarks
     ORDER BY d.disposal_date DESC
     LIMIT 5`,
  );

  return rows.map((row) => ({
    disposalId: row.disposal_id,
    disposalDate: formatDate(row.disposal_date),
    itemCount: Number(row.item_count),
    remarks: row.disposal_remarks,
  }));
}

async function loadActiveHandoverCount() {
  const pool = getDbPool();
  const [rows] = await pool.query<(RowDataPacket & { cnt: number })[]>(
    `SELECT COUNT(*) AS cnt FROM laptop WHERE status_id = 4`,
  );
  return Number(rows[0]?.cnt ?? 0);
}

export async function buildAdminPromptDbContext(
  dashboardStats: TechnicianDashboardStats,
  requestInsights: AdminRequestInsights,
  lookupText = '',
) {
  const [
    overdueReturns,
    usersByRole,
    checkedOutAssets,
    assetLookup,
    requestLookup,
    openRepairs,
    expiringWarranties,
    recentDisposals,
    activeHandovers,
  ] = await Promise.all([
    loadOverdueReturns(),
    loadUserCounts(),
    loadCheckedOutCount(),
    loadAssetLookup(lookupText),
    loadRequestLookup(lookupText),
    loadOpenRepairs(),
    loadExpiringWarranties(),
    loadRecentDisposals(),
    loadActiveHandoverCount(),
  ]);

  const registeredUsers =
    usersByRole.find((row) => row.role.toLowerCase() === 'user')?.count ??
    usersByRole.reduce((sum, row) => sum + row.count, 0);

  return {
    generatedAt: new Date().toISOString(),
    statusReference: INVENTORY_STATUSES.map((status) => ({
      statusId: status.statusId,
      meaning: status.name,
    })),
    inventory: summarizeInventory(dashboardStats),
    operations: {
      openRepairs,
      expiringWarranties,
      recentDisposals,
      activeHandovers,
    },
    requests: {
      activeTotal: dashboardStats.totalRequest.total,
      byWorkflow: dashboardStats.totalRequest.byWorkflow.map((row) => ({
        status: DASHBOARD_REQUEST_WORKFLOW_LABEL[row.key],
        count: row.count,
      })),
      poolAvailableByKind: dashboardStats.totalRequest.poolByKind.map((row) => ({
        kind: ASSET_KIND_LABEL[row.kind],
        count: row.count,
      })),
      requestPoolTotal: dashboardStats.requestPoolCount,
      checkedOutAssets,
      overdueReturns,
      recentRequests: requestInsights.recentRequests,
      topRequestersThisMonth: requestInsights.topRequesters,
      programTypesThisMonth: requestInsights.programTypes,
      monthLabel: requestInsights.monthLabel,
    },
    users: {
      registeredUsers,
      byRole: usersByRole,
      staffAndAdminNote: `Only users with role_id ${ROLE_USER} are end-user requesters.`,
    },
    assetsById: assetLookup.assetsById,
    assetLookup: {
      queriedIds: assetLookup.queriedIds,
      notFoundIds: assetLookup.notFoundIds,
    },
    requestsById: requestLookup.requestsById,
    requestLookup: {
      queriedIds: requestLookup.queriedIds,
      notFoundIds: requestLookup.notFoundIds,
    },
  };
}
