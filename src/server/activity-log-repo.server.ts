import type { RowDataPacket } from 'mysql2';
import type { AssetKind } from '@/lib/inventory-schema';
import type { ActivityLogCategory, ActivityLogEntry } from '@/lib/activity-log-schema';
import { getDbPool } from '@/server/db';

const MAX_EVENTS = 600;

function trailSortKey(val: Date | string | null | undefined): number {
  if (val == null) return 0;
  const d = val instanceof Date ? val : new Date(val);
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

function trailAt(val: Date | string | null | undefined): string {
  if (val == null) return '';
  return val instanceof Date ? val.toISOString() : String(val);
}

function formatDate(val: Date | string | null | undefined): string {
  if (val == null) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function atFromDateAndTime(
  dateVal: Date | string | null | undefined,
  timeVal: string | null | undefined,
  fallback?: Date | string | null,
): string {
  if (dateVal != null && timeVal?.trim()) {
    return `${formatDate(dateVal)}T${timeVal.trim()}`;
  }
  return trailAt(dateVal) || trailAt(fallback) || '';
}

function push(
  events: ActivityLogEntry[],
  partial: Omit<ActivityLogEntry, 'sortKey'> & { sortKey?: number },
) {
  const at = partial.at || new Date().toISOString();
  const sortKey = partial.sortKey ?? trailSortKey(at);
  events.push({ ...partial, at, sortKey });
}

function parseKind(raw: string | null | undefined): AssetKind | null {
  if (raw === 'laptop' || raw === 'av' || raw === 'network') return raw;
  return null;
}

async function loadRequestEvents(events: ActivityLogEntry[]) {
  const pool = getDbPool();

  const [created] = await pool.query<
    (RowDataPacket & {
      request_id: number;
      created_at: Date | string;
      requester_name: string;
      program_type: string;
    })[]
  >(
    `SELECT r.request_id, r.created_at, u.full_name AS requester_name, r.program_type
     FROM request r
     INNER JOIN users u ON u.staff_id = r.requested_by
     ORDER BY r.request_id DESC
     LIMIT 200`,
  );

  for (const row of created) {
    push(events, {
      id: `req-created-${row.request_id}`,
      category: 'request',
      title: 'Request submitted',
      detail: `${row.requester_name} · ${row.program_type}`,
      actor: row.requester_name,
      assetKind: null,
      assetId: null,
      requestId: row.request_id,
      disposalId: null,
      at: trailAt(row.created_at),
    });
  }

  const [rejected] = await pool.query<
    (RowDataPacket & {
      request_id: number;
      rejected_at: Date | string;
      requester_name: string;
      rejection_reason: string | null;
    })[]
  >(
    `SELECT r.request_id, r.rejected_at, u.full_name AS requester_name, r.rejection_reason
     FROM request r
     INNER JOIN users u ON u.staff_id = r.requested_by
     WHERE r.rejected_at IS NOT NULL
     ORDER BY r.rejected_at DESC
     LIMIT 200`,
  );

  for (const row of rejected) {
    push(events, {
      id: `req-rejected-${row.request_id}`,
      category: 'request',
      title: 'Request rejected',
      detail: row.rejection_reason?.trim() || `Request #${row.request_id}`,
      actor: row.requester_name,
      assetKind: null,
      assetId: null,
      requestId: row.request_id,
      disposalId: null,
      at: trailAt(row.rejected_at),
    });
  }

  const [assignments] = await pool.query<
    (RowDataPacket & {
      assignment_id: number;
      request_id: number;
      asset_id: number | null;
      assigned_at: Date | string | null;
      checkout_at: Date | string | null;
      returned_at: Date | string | null;
      unavailable_at: Date | string | null;
      return_condition: string | null;
      requester_name: string;
      booked_by: string | null;
      asset_type: string | null;
      model: string | null;
      brand: string | null;
      kind: string;
    })[]
  >(
    `SELECT ra.assignment_id, ra.request_id, ra.asset_id, ra.assigned_at, ra.checkout_at,
            ra.returned_at, ra.unavailable_at, ra.return_condition,
            u.full_name AS requester_name, ub.full_name AS booked_by, ri.asset_type,
            COALESCE(l.model, av.model) AS model, COALESCE(l.brand, av.brand) AS brand,
            IF(l.asset_id IS NOT NULL, 'laptop', IF(av.asset_id IS NOT NULL, 'av', 'laptop')) AS kind
     FROM request_assignment ra
     INNER JOIN request r ON r.request_id = ra.request_id
     INNER JOIN users u ON u.staff_id = r.requested_by
     LEFT JOIN users ub ON ub.staff_id = ra.assigned_by
     LEFT JOIN request_item ri ON ri.request_item_id = ra.request_item_id
     LEFT JOIN laptop l ON l.asset_id = ra.asset_id
     LEFT JOIN av av ON av.asset_id = ra.asset_id
     ORDER BY ra.assignment_id DESC
     LIMIT 400`,
  );

  for (const row of assignments) {
    const kind = parseKind(row.kind);
    const assetBit =
      row.asset_id != null
        ? `${kind ?? 'asset'} #${row.asset_id}${row.model ? ` · ${row.model}` : ''}`
        : row.asset_type ?? 'slot';
    const base = `Request #${row.request_id} · ${row.requester_name} · ${assetBit}`;

    if (row.unavailable_at) {
      push(events, {
        id: `req-unavail-${row.assignment_id}`,
        category: 'request',
        title: 'Slot unavailable',
        detail: [base, row.booked_by ? `by ${row.booked_by}` : null].filter(Boolean).join(' · '),
        actor: row.booked_by,
        assetKind: kind,
        assetId: row.asset_id,
        requestId: row.request_id,
        disposalId: null,
        at: trailAt(row.unavailable_at),
      });
    } else if (row.assigned_at && row.asset_id != null) {
      push(events, {
        id: `req-book-${row.assignment_id}`,
        category: 'request',
        title: 'Asset booked',
        detail: [base, row.booked_by ? `by ${row.booked_by}` : null].filter(Boolean).join(' · '),
        actor: row.booked_by,
        assetKind: kind,
        assetId: row.asset_id,
        requestId: row.request_id,
        disposalId: null,
        at: trailAt(row.assigned_at),
      });
    }
    if (row.checkout_at && row.asset_id != null) {
      push(events, {
        id: `req-checkout-${row.assignment_id}`,
        category: 'request',
        title: 'Checked out',
        detail: base,
        actor: row.booked_by,
        assetKind: kind,
        assetId: row.asset_id,
        requestId: row.request_id,
        disposalId: null,
        at: trailAt(row.checkout_at),
      });
    }
    if (row.returned_at && row.asset_id != null) {
      push(events, {
        id: `req-return-${row.assignment_id}`,
        category: 'request',
        title: 'Borrow returned',
        detail: [base, row.return_condition].filter(Boolean).join(' · '),
        actor: null,
        assetKind: kind,
        assetId: row.asset_id,
        requestId: row.request_id,
        disposalId: null,
        at: trailAt(row.returned_at),
      });
    }
  }
}

async function loadHandoverEvents(events: ActivityLogEntry[]) {
  const pool = getDbPool();

  const [handovers] = await pool.query<
    (RowDataPacket & {
      handover_id: number;
      asset_id: number;
      handover_date: Date | string;
      created_at: Date | string;
      technician_name: string;
      recipients: string | null;
      handover_remarks: string | null;
      model: string | null;
    })[]
  >(
    `SELECT h.handover_id, h.asset_id, h.handover_date, h.created_at, h.handover_remarks,
            tech.full_name AS technician_name,
            GROUP_CONCAT(DISTINCT s.full_name ORDER BY s.full_name SEPARATOR ', ') AS recipients,
            l.model
     FROM handover h
     INNER JOIN users tech ON tech.staff_id = h.staff_id
     INNER JOIN laptop l ON l.asset_id = h.asset_id
     LEFT JOIN handover_staff hs ON hs.handover_id = h.handover_id
     LEFT JOIN staff s ON s.employee_no = hs.employee_no
     GROUP BY h.handover_id, h.asset_id, h.handover_date, h.created_at, h.handover_remarks, tech.full_name, l.model
     ORDER BY h.handover_id DESC
     LIMIT 200`,
  );

  for (const h of handovers) {
    const to = h.recipients?.trim() ? `To ${h.recipients}` : 'Place / room handover';
    push(events, {
      id: `ho-${h.handover_id}`,
      category: 'handover',
      title: 'Laptop handed over',
      detail: [to, h.model ? `· ${h.model}` : null, h.handover_remarks].filter(Boolean).join(' '),
      actor: h.technician_name,
      assetKind: 'laptop',
      assetId: h.asset_id,
      requestId: null,
      disposalId: null,
      at: trailAt(h.handover_date) || trailAt(h.created_at),
    });
  }

  const [returns] = await pool.query<
    (RowDataPacket & {
      return_id: number;
      asset_id: number;
      return_date: Date | string;
      return_time: string | null;
      created_at: Date | string;
      returned_by: string;
      recipient_label: string | null;
      return_place: string | null;
      condition: string | null;
      model: string | null;
    })[]
  >(
    `SELECT hr.return_id, h.asset_id, hr.return_date, hr.return_time, hr.created_at,
            ub.full_name AS returned_by,
            COALESCE(s.full_name, 'Place handover') AS recipient_label,
            hr.return_place, hr.\`condition\`, l.model
     FROM handover_return hr
     INNER JOIN users ub ON ub.staff_id = hr.returned_by
     LEFT JOIN handover_staff hs ON hs.handover_staff_id = hr.handover_staff_id
     LEFT JOIN handover h ON h.handover_id = COALESCE(hs.handover_id, hr.handover_id)
     LEFT JOIN staff s ON s.employee_no = hs.employee_no
     LEFT JOIN laptop l ON l.asset_id = h.asset_id
     WHERE h.asset_id IS NOT NULL
     ORDER BY hr.return_id DESC
     LIMIT 200`,
  );

  for (const r of returns) {
    push(events, {
      id: `ho-ret-${r.return_id}`,
      category: 'return',
      title: 'Handover returned',
      detail: [r.recipient_label, r.model, r.return_place, r.condition].filter(Boolean).join(' · '),
      actor: r.returned_by,
      assetKind: 'laptop',
      assetId: r.asset_id,
      requestId: null,
      disposalId: null,
      at: atFromDateAndTime(r.return_date, r.return_time, r.created_at),
    });
  }
}

async function loadDeployEvents(
  events: ActivityLogEntry[],
  kind: 'av' | 'network',
  categoryDeploy: ActivityLogCategory,
) {
  const pool = getDbPool();
  const deployTable = kind === 'av' ? 'av_deployment' : 'network_deployment';
  const returnTable = kind === 'av' ? 'av_return' : 'network_return';
  const assetTable = kind === 'av' ? 'av' : 'network';

  const [deployments] = await pool.query<
    (RowDataPacket & {
      deployment_id: number;
      asset_id: number;
      building: string;
      level: string;
      zone: string;
      deployment_date: Date | string;
      created_at: Date | string;
      staff_name: string;
      model: string | null;
    })[]
  >(
    `SELECT d.deployment_id, d.asset_id, d.building, d.level, d.zone, d.deployment_date,
            d.created_at, u.full_name AS staff_name, a.model
     FROM \`${deployTable}\` d
     INNER JOIN users u ON u.staff_id = d.staff_id
     INNER JOIN \`${assetTable}\` a ON a.asset_id = d.asset_id
     ORDER BY d.deployment_id DESC
     LIMIT 150`,
  );

  for (const d of deployments) {
    push(events, {
      id: `${kind}-dep-${d.deployment_id}`,
      category: categoryDeploy,
      title: kind === 'av' ? 'AV deployed' : 'Network deployed',
      detail: `${d.building} · L${d.level} · Z${d.zone}${d.model ? ` · ${d.model}` : ''}`,
      actor: d.staff_name,
      assetKind: kind,
      assetId: d.asset_id,
      requestId: null,
      disposalId: null,
      at: trailAt(d.deployment_date) || trailAt(d.created_at),
    });
  }

  const [returns] = await pool.query<
    (RowDataPacket & {
      return_id: number;
      asset_id: number;
      return_date: Date | string;
      return_time: string | null;
      created_at: Date | string;
      returned_by: string;
      return_place: string | null;
      condition: string | null;
      model: string | null;
    })[]
  >(
    `SELECT r.return_id, d.asset_id, r.return_date, r.return_time, r.created_at,
            u.full_name AS returned_by, r.return_place, r.\`condition\`, a.model
     FROM \`${returnTable}\` r
     INNER JOIN \`${deployTable}\` d ON d.deployment_id = r.deployment_id
     INNER JOIN \`${assetTable}\` a ON a.asset_id = d.asset_id
     INNER JOIN users u ON u.staff_id = r.returned_by
     ORDER BY r.return_id DESC
     LIMIT 150`,
  );

  for (const r of returns) {
    push(events, {
      id: `${kind}-ret-${r.return_id}`,
      category: 'return',
      title: kind === 'av' ? 'AV deployment returned' : 'Network deployment returned',
      detail: [r.model, r.return_place, r.condition].filter(Boolean).join(' · '),
      actor: r.returned_by,
      assetKind: kind,
      assetId: r.asset_id,
      requestId: null,
      disposalId: null,
      at: atFromDateAndTime(r.return_date, r.return_time, r.created_at),
    });
  }
}

async function loadDisposalEvents(events: ActivityLogEntry[]) {
  const pool = getDbPool();

  const [rows] = await pool.query<
    (RowDataPacket & {
      disposal_item_id: number;
      disposal_id: number;
      asset_id: number;
      asset_type: string;
      disposal_date: Date | string;
      disposal_time: string | null;
      disposal_remarks: string | null;
      item_remarks: string | null;
      requested_by: string;
      model: string | null;
    })[]
  >(
    `SELECT di.disposal_item_id, di.disposal_id, di.asset_id, di.asset_type,
            d.disposal_date, d.disposal_time, d.disposal_remarks, di.item_remarks,
            u.full_name AS requested_by,
            COALESCE(l.model, av.model, n.model) AS model
     FROM disposal_item di
     INNER JOIN disposal d ON d.disposal_id = di.disposal_id
     INNER JOIN users u ON u.staff_id = d.requested_by
     LEFT JOIN laptop l ON di.asset_type = 'laptop' AND l.asset_id = di.asset_id
     LEFT JOIN av av ON di.asset_type = 'av' AND av.asset_id = di.asset_id
     LEFT JOIN network n ON di.asset_type = 'network' AND n.asset_id = di.asset_id
     ORDER BY di.disposal_item_id DESC
     LIMIT 200`,
  );

  for (const row of rows) {
    const kind = parseKind(row.asset_type);
    push(events, {
      id: `disp-${row.disposal_item_id}`,
      category: 'disposal',
      title: 'Marked for disposal',
      detail: [
        kind ? `${kind} #${row.asset_id}` : `#${row.asset_id}`,
        row.model,
        row.disposal_remarks,
        row.item_remarks,
      ]
        .filter(Boolean)
        .join(' · '),
      actor: row.requested_by,
      assetKind: kind,
      assetId: row.asset_id,
      requestId: null,
      disposalId: row.disposal_id,
      at: atFromDateAndTime(row.disposal_date, row.disposal_time),
    });
  }
}

async function loadMaintenanceEvents(events: ActivityLogEntry[]) {
  const pool = getDbPool();

  const [repairs] = await pool.query<
    (RowDataPacket & {
      repair_id: number;
      asset_id: number;
      asset_type: string;
      repair_date: Date | string;
      completed_date: Date | string | null;
      issue_summary: string;
      staff_name: string;
    })[]
  >(
    `SELECT r.repair_id, r.asset_id, r.asset_type, r.repair_date, r.completed_date,
            r.issue_summary, u.full_name AS staff_name
     FROM repair r
     INNER JOIN users u ON u.staff_id = r.staff_id
     ORDER BY r.repair_id DESC
     LIMIT 150`,
  );

  for (const row of repairs) {
    const kind = parseKind(row.asset_type);
    push(events, {
      id: `repair-${row.repair_id}`,
      category: 'repair',
      title: 'Repair logged',
      detail: row.issue_summary,
      actor: row.staff_name,
      assetKind: kind,
      assetId: row.asset_id,
      requestId: null,
      disposalId: null,
      at: trailAt(row.repair_date),
    });
    if (row.completed_date) {
      push(events, {
        id: `repair-done-${row.repair_id}`,
        category: 'repair',
        title: 'Repair completed',
        detail: row.issue_summary,
        actor: row.staff_name,
        assetKind: kind,
        assetId: row.asset_id,
        requestId: null,
        disposalId: null,
        at: trailAt(row.completed_date),
      });
    }
  }

  const [warranties] = await pool.query<
    (RowDataPacket & {
      warranty_id: number;
      asset_id: number;
      asset_type: string;
      warranty_start_date: Date | string;
      warranty_end_date: Date | string;
      warranty_remarks: string | null;
    })[]
  >(
    `SELECT warranty_id, asset_id, asset_type, warranty_start_date, warranty_end_date, warranty_remarks
     FROM warranty
     ORDER BY warranty_id DESC
     LIMIT 100`,
  );

  for (const w of warranties) {
    const kind = parseKind(w.asset_type);
    push(events, {
      id: `warr-${w.warranty_id}`,
      category: 'warranty',
      title: 'Warranty registered',
      detail: `${formatDate(w.warranty_start_date)} → ${formatDate(w.warranty_end_date)}${w.warranty_remarks ? ` · ${w.warranty_remarks}` : ''}`,
      actor: null,
      assetKind: kind,
      assetId: w.asset_id,
      requestId: null,
      disposalId: null,
      at: trailAt(w.warranty_start_date),
    });
  }

  const [claims] = await pool.query<
    (RowDataPacket & {
      claim_id: number;
      asset_id: number;
      asset_type: string;
      claim_date: Date | string;
      claim_time: string | null;
      issue_summary: string;
      claimed_by: string;
    })[]
  >(
    `SELECT c.claim_id, c.asset_id, c.asset_type, c.claim_date, c.claim_time,
            c.issue_summary, u.full_name AS claimed_by
     FROM warranty_claim c
     INNER JOIN users u ON u.staff_id = c.claimed_by
     ORDER BY c.claim_id DESC
     LIMIT 100`,
  );

  for (const c of claims) {
    const kind = parseKind(c.asset_type);
    push(events, {
      id: `claim-${c.claim_id}`,
      category: 'warranty',
      title: 'Warranty claim',
      detail: c.issue_summary,
      actor: c.claimed_by,
      assetKind: kind,
      assetId: c.asset_id,
      requestId: null,
      disposalId: null,
      at: atFromDateAndTime(c.claim_date, c.claim_time),
    });
  }
}

async function loadInventoryEvents(events: ActivityLogEntry[]) {
  const pool = getDbPool();

  const tables: { kind: AssetKind; table: string; label: string }[] = [
    { kind: 'laptop', table: 'laptop', label: 'Laptop registered' },
    { kind: 'av', table: 'av', label: 'AV registered' },
    { kind: 'network', table: 'network', label: 'Network registered' },
  ];

  for (const { kind, table, label } of tables) {
    const [rows] = await pool.query<
      (RowDataPacket & { asset_id: number; created_at: Date | string; model: string | null; brand: string | null })[]
    >(
      `SELECT asset_id, created_at, model, brand FROM \`${table}\` ORDER BY asset_id DESC LIMIT 80`,
    );
    for (const row of rows) {
      push(events, {
        id: `inv-${kind}-${row.asset_id}`,
        category: 'inventory',
        title: label,
        detail: [row.brand, row.model].filter(Boolean).join(' · ') || null,
        actor: null,
        assetKind: kind,
        assetId: row.asset_id,
        requestId: null,
        disposalId: null,
        at: trailAt(row.created_at),
      });
    }
  }
}

export async function listActivityLog(): Promise<ActivityLogEntry[]> {
  const events: ActivityLogEntry[] = [];

  await Promise.all([
    loadRequestEvents(events),
    loadHandoverEvents(events),
    loadDeployEvents(events, 'av', 'deployment'),
    loadDeployEvents(events, 'network', 'deployment'),
    loadDisposalEvents(events),
    loadMaintenanceEvents(events),
    loadInventoryEvents(events),
  ]);

  return events
    .filter((e) => e.sortKey > 0)
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, MAX_EVENTS);
}
