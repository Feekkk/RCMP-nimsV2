import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RequestRejectEmailData } from '@/lib/request-reject-email-types';
import { REQUEST_IT_EMAIL } from '@/lib/request-reject-email-types';
import type { SendRequestRejectEmailResult } from '@/lib/request-reject-email-types';
import { isEmailConfigured } from '@/lib/microsoft-email-config';
import { escapeHtml } from '@/server/email.server';
import { getRequestRejectEmailData } from '@/server/request-reject-email-repo.server';

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

function buildItemsTableHtml(items: RequestRejectEmailData['items']): string {
  if (items.length === 0) {
    return `<p style="margin:0;font-size:13px;color:#64748b;">No equipment lines recorded.</p>`;
  }
  const rows = items
    .map(
      (i) => `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#1a2b3c;">${escapeHtml(i.assetType)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;font-size:13px;font-weight:600;color:#1a2b3c;text-align:center;width:80px;">${i.quantity}</td>
    </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:8px;overflow:hidden;">
    <tr>
      <td style="background:#fef2f2;padding:10px 12px;font-size:12px;font-weight:700;color:#991b1b;">Equipment requested</td>
      <td style="background:#fef2f2;padding:10px 12px;font-size:12px;font-weight:700;color:#991b1b;text-align:center;width:80px;">Qty</td>
    </tr>
    ${rows}
  </table>`;
}

export function buildRequestRejectEmailHtml(data: RequestRejectEmailData): string {
  const requesterRows = [
    detailRow('Name', data.requesterName),
    detailRow('Staff ID', data.requestedBy),
    detailRow('Email', data.requesterEmail),
    detailRow('Phone', data.requesterPhone ?? '—'),
  ].join('');

  const requestRows = [
    detailRow('Request ID', `#${data.requestId}`),
    detailRow('Submitted', data.submittedAt),
    detailRow('Borrow date', data.borrowDate),
    detailRow('Return date', data.returnDate),
    detailRow('Program type', data.programType),
    detailRow('Usage location', data.usageLocation),
    detailRow('Your remarks', data.remarks ?? '—'),
    detailRow('Rejected at', data.rejectedAt),
    detailRow('Rejected by', `${data.rejectedByName} (${data.rejectedBy})`),
    detailRow('Status', 'Rejected'),
  ].join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f6;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(153,27,27,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#7f1d1d 0%,#b91c1c 100%);padding:28px 24px;text-align:center;">
            <img src="cid:${LOGO_CID}" alt="UNIKL RCMP" width="72" height="72" style="display:block;margin:0 auto 14px;border-radius:50%;background:#fff;padding:6px;" />
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#fecaca;">UNIKL Royal College of Medicine Perak</p>
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">Equipment Request Rejected</h1>
            <p style="margin:10px 0 0;font-size:13px;color:#fecaca;">Information Technology Department</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 8px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155;">
              Dear <strong>${escapeHtml(data.requesterName)}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#475569;">
              Your equipment borrow request <strong>#${data.requestId}</strong> has been reviewed and
              <strong style="color:#b91c1c;">rejected</strong>. Any booked assets have been released back to the inventory pool.
            </p>
            <div style="margin:0 0 20px;padding:14px 16px;border-radius:8px;border:1px solid #fecaca;background:#fef2f2;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#991b1b;">Rejection reason</p>
              <p style="margin:0;font-size:14px;line-height:1.55;color:#7f1d1d;">${escapeHtml(data.rejectionReason)}</p>
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
            ${buildItemsTableHtml(data.items)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px;">
            <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">
              If you believe this was in error or need assistance, contact IT at
              <a href="mailto:${escapeHtml(REQUEST_IT_EMAIL)}" style="color:#003366;font-weight:600;">${escapeHtml(REQUEST_IT_EMAIL)}</a>.
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

export function buildRequestRejectEmailText(data: RequestRejectEmailData): string {
  const itemsBlock = data.items.map((i) => `  - ${i.assetType}: ${i.quantity}`).join('\n');

  return [
    'UNIKL RCMP — Equipment Request Rejected',
    '',
    `Request #${data.requestId} was rejected.`,
    '',
    'Rejection reason',
    data.rejectionReason,
    '',
    'Requester',
    `  Name: ${data.requesterName}`,
    `  Staff ID: ${data.requestedBy}`,
    `  Email: ${data.requesterEmail}`,
    `  Phone: ${data.requesterPhone ?? '—'}`,
    '',
    'Request details',
    `  Submitted: ${data.submittedAt}`,
    `  Borrow date: ${data.borrowDate}`,
    `  Return date: ${data.returnDate}`,
    `  Program type: ${data.programType}`,
    `  Usage location: ${data.usageLocation}`,
    `  Your remarks: ${data.remarks ?? '—'}`,
    `  Rejected at: ${data.rejectedAt}`,
    `  Rejected by: ${data.rejectedByName} (${data.rejectedBy})`,
    '',
    'Equipment requested',
    itemsBlock || '  (none)',
    '',
    `IT contact: ${REQUEST_IT_EMAIL}`,
    '',
    '— NIMS (automated notification)',
  ].join('\n');
}

export async function sendRequestRejectEmail(
  requestId: number,
): Promise<SendRequestRejectEmailResult> {
  if (!isEmailConfigured()) {
    throw new Error(
      'Email is not configured. Set SMTP_USER/SMTP_PASSWORD or SMTP_MAILPIT=true for local testing.',
    );
  }

  const data = await getRequestRejectEmailData(requestId);
  if (!data) {
    throw new Error('Cannot send rejection email: request not found or not rejected.');
  }

  const logo = loadLogoBuffer();
  const { sendNotificationEmail } = await import('@/server/email.server');
  const result = await sendNotificationEmail({
    to: data.requesterEmail,
    cc: REQUEST_IT_EMAIL,
    subject: `UNIKL RCMP — Equipment Request #${data.requestId} Rejected`,
    text: buildRequestRejectEmailText(data),
    html: buildRequestRejectEmailHtml(data),
    attachments: [
      {
        filename: 'unikl-logo.png',
        content: logo,
        contentType: 'image/png',
        cid: LOGO_CID,
      },
    ],
  });

  return {
    messageId: result.messageId,
    to: data.requesterEmail,
    cc: REQUEST_IT_EMAIL,
  };
}
