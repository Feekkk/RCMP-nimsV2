import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OverdueReturnEmailData } from '@/lib/overdue-return-email-types';
import { REQUEST_IT_EMAIL } from '@/lib/overdue-return-email-types';
import type { SendOverdueReturnEmailResult } from '@/lib/overdue-return-email-types';
import { EMAIL_NOT_CONFIGURED_MESSAGE } from '@/lib/email-notification';
import { isEmailConfigured } from '@/lib/microsoft-email-config';
import { escapeHtml } from '@/server/email.server';
import {
  getOverdueReturnEmailData,
  logOverdueEmailSent,
  resolveOverdueEmailRunDate,
} from '@/server/overdue-return-email-repo.server';

const LOGO_CID = 'unikl-logo';

function loadLogoBuffer(): Buffer {
  const path = join(process.cwd(), 'src', 'assets', 'unikl-logo.png');
  return readFileSync(path);
}

function detailRow(label: string, value: unknown): string {
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;color:#5c6b7a;font-size:13px;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;color:#1a2b3c;font-size:13px;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;
}

function overdueLabel(days: number): string {
  return `${days} day${days === 1 ? '' : 's'}`;
}

function buildRequestedItemsHtml(items: OverdueReturnEmailData['requestedItems']): string {
  if (items.length === 0) {
    return `<p style="margin:0;font-size:13px;color:#64748b;">No equipment categories on file.</p>`;
  }
  const rows = items
    .map(
      (i) => `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#1a2b3c;">${escapeHtml(i.assetType)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;font-size:13px;font-weight:600;color:#1a2b3c;text-align:center;width:64px;">${i.quantity}</td>
    </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d4e8f7;border-radius:8px;overflow:hidden;">
    <tr>
      <td style="background:#e8f4fc;padding:10px 12px;font-size:12px;font-weight:700;color:#003366;">Category</td>
      <td style="background:#e8f4fc;padding:10px 12px;font-size:12px;font-weight:700;color:#003366;text-align:center;width:64px;">Qty</td>
    </tr>
    ${rows}
  </table>`;
}

function buildOutstandingAssetsHtml(assets: OverdueReturnEmailData['assets']): string {
  const rows = assets
    .map(
      (a) => `<tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#1a2b3c;"><strong>${a.assetId}</strong></td>
      <td style="padding:10px 8px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#1a2b3c;">${escapeHtml(a.assetType)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#1a2b3c;">${escapeHtml(a.kind === 'laptop' ? 'Laptop' : 'AV')}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#1a2b3c;">${escapeHtml(a.model)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e8ecf0;font-size:12px;color:#64748b;white-space:nowrap;">${escapeHtml(a.checkoutAt)}</td>
    </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:8px;overflow:hidden;">
    <tr>
      <td style="background:#fef2f2;padding:10px 8px;font-size:11px;font-weight:700;color:#991b1b;">Asset ID</td>
      <td style="background:#fef2f2;padding:10px 8px;font-size:11px;font-weight:700;color:#991b1b;">Category</td>
      <td style="background:#fef2f2;padding:10px 8px;font-size:11px;font-weight:700;color:#991b1b;">Pool</td>
      <td style="background:#fef2f2;padding:10px 8px;font-size:11px;font-weight:700;color:#991b1b;">Model</td>
      <td style="background:#fef2f2;padding:10px 8px;font-size:11px;font-weight:700;color:#991b1b;">Checked out</td>
    </tr>
    ${rows}
  </table>`;
}

export function buildOverdueReturnEmailHtml(data: OverdueReturnEmailData): string {
  const requesterRows = [
    detailRow('Name', data.requesterName),
    detailRow('Staff ID', data.requestedBy),
    detailRow('Email', data.requesterEmail),
    detailRow('Phone', data.requesterPhone ?? '—'),
  ].join('');

  const requestRows = [
    detailRow('Request ID', `#${data.requestId}`),
    detailRow('Originally submitted', data.submittedAt),
    detailRow('Borrow date', data.borrowDate),
    detailRow('Return date (due)', data.returnDate),
    detailRow('Days overdue', overdueLabel(data.daysOverdue)),
    detailRow('Outstanding assets', String(data.outstandingCount)),
    detailRow('Program type', data.programType),
    detailRow('Usage location', data.usageLocation),
    detailRow('Remarks', data.remarks ?? '—'),
  ].join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f6;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(180,83,9,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#9a3412 0%,#ea580c 100%);padding:28px 24px;text-align:center;">
            <img src="cid:${LOGO_CID}" alt="UNIKL RCMP" width="72" height="72" style="display:block;margin:0 auto 14px;border-radius:50%;background:#fff;padding:6px;" />
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#fed7aa;">UNIKL Royal College of Medicine Perak</p>
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">Overdue Equipment Return Reminder</h1>
            <p style="margin:10px 0 0;font-size:13px;color:#fed7aa;">Information Technology Department</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 8px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155;">
              Dear <strong>${escapeHtml(data.requesterName)}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#475569;">
              Equipment from request <strong>#${data.requestId}</strong> is still checked out and
              <strong style="color:#c2410c;">${overdueLabel(data.daysOverdue)} overdue</strong>.
              Please return the outstanding item${data.outstandingCount === 1 ? '' : 's'} to IT as soon as possible.
            </p>
            <div style="margin:0 0 20px;padding:14px 16px;border-radius:8px;border:1px solid #fed7aa;background:#fff7ed;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#9a3412;">Action required</p>
              <p style="margin:0;font-size:14px;line-height:1.55;color:#7c2d12;">
                Return date was <strong>${escapeHtml(data.returnDate)}</strong>.
                ${data.outstandingCount} asset${data.outstandingCount === 1 ? ' remains' : 's remain'} outstanding.
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d4e8f7;border-radius:8px;overflow:hidden;margin-bottom:16px;">
              <tr>
                <td colspan="2" style="background:#e8f4fc;padding:12px;font-size:12px;font-weight:700;color:#003366;text-transform:uppercase;letter-spacing:0.04em;">Requester</td>
              </tr>
              ${requesterRows}
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d4e8f7;border-radius:8px;overflow:hidden;margin-bottom:16px;">
              <tr>
                <td colspan="2" style="background:#e8f4fc;padding:12px;font-size:12px;font-weight:700;color:#003366;text-transform:uppercase;letter-spacing:0.04em;">Request details</td>
              </tr>
              ${requestRows}
            </table>
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#991b1b;">Outstanding checked-out assets</p>
            ${buildOutstandingAssetsHtml(data.assets)}
            <p style="margin:16px 0 0;font-size:13px;line-height:1.55;color:#64748b;">Requested categories (for reference):</p>
            <div style="margin-top:8px;">${buildRequestedItemsHtml(data.requestedItems)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px;">
            <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">
              Contact IT at
              <a href="mailto:${escapeHtml(REQUEST_IT_EMAIL)}" style="color:#003366;font-weight:600;">${escapeHtml(REQUEST_IT_EMAIL)}</a>
              if you need assistance or an extension.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">UNIVERSITI KUALA LUMPUR · ROYAL COLLEGE OF MEDICINE PERAK</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildOverdueReturnEmailText(data: OverdueReturnEmailData): string {
  const itemsBlock = data.requestedItems.map((i) => `  - ${i.assetType}: ${i.quantity}`).join('\n');
  const assetsBlock = data.assets
    .map(
      (a) =>
        `  - #${a.assetId} ${a.assetType} (${a.kind}) — ${a.model}, checked out ${a.checkoutAt}`,
    )
    .join('\n');

  return [
    'UNIKL RCMP — Overdue Equipment Return Reminder',
    '',
    `Request #${data.requestId} is ${overdueLabel(data.daysOverdue)} overdue.`,
    '',
    'Action required',
    `  Return date was ${data.returnDate}.`,
    `  ${data.outstandingCount} asset(s) still checked out.`,
    '',
    'Requester',
    `  Name: ${data.requesterName}`,
    `  Staff ID: ${data.requestedBy}`,
    `  Email: ${data.requesterEmail}`,
    `  Phone: ${data.requesterPhone ?? '—'}`,
    '',
    'Outstanding assets',
    assetsBlock || '  (none)',
    '',
    'Requested categories',
    itemsBlock || '  (none)',
    '',
    `IT contact: ${REQUEST_IT_EMAIL}`,
    '',
    '— NIMS (automated notification)',
  ].join('\n');
}

export async function sendOverdueReturnEmail(
  requestId: number,
  runDateIso?: string,
): Promise<SendOverdueReturnEmailResult> {
  if (!isEmailConfigured()) {
    throw new Error(EMAIL_NOT_CONFIGURED_MESSAGE);
  }

  const runDate = resolveOverdueEmailRunDate(runDateIso);
  const data = await getOverdueReturnEmailData(requestId, runDate);
  if (!data) {
    throw new Error(
      'The overdue reminder could not be sent because this request is not overdue or has no outstanding checkouts. Verify the return date and checkout status.',
    );
  }

  const logo = loadLogoBuffer();
  const { sendNotificationEmail } = await import('@/server/email.server');
  const result = await sendNotificationEmail({
    to: data.requesterEmail,
    cc: REQUEST_IT_EMAIL,
    subject: `UNIKL RCMP — Overdue Return Reminder (Request #${data.requestId} — ${overdueLabel(data.daysOverdue)})`,
    text: buildOverdueReturnEmailText(data),
    html: buildOverdueReturnEmailHtml(data),
    attachments: [
      {
        filename: 'unikl-logo.png',
        content: logo,
        contentType: 'image/png',
        cid: LOGO_CID,
      },
    ],
  });

  await logOverdueEmailSent(data.requestId, runDate, data.daysOverdue);

  return {
    messageId: result.messageId,
    to: data.requesterEmail,
    cc: REQUEST_IT_EMAIL,
  };
}
