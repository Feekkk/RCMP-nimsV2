import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CheckoutEmailData } from '@/lib/checkout-email-types';
import { REQUEST_IT_EMAIL } from '@/lib/checkout-email-types';
import type { SendCheckoutEmailInput, SendCheckoutEmailResult } from '@/lib/checkout-email-types';
import { isEmailConfigured } from '@/lib/microsoft-email-config';
import { getCheckoutEmailData } from '@/server/checkout-email-repo.server';

const LOGO_CID = 'unikl-logo';

function loadLogoBuffer(): Buffer {
  const path = join(process.cwd(), 'src', 'assets', 'unikl-logo.png');
  return readFileSync(path);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;color:#5c6b7a;font-size:13px;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;color:#1a2b3c;font-size:13px;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;
}

function buildRequestedItemsHtml(items: CheckoutEmailData['requestedItems']): string {
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

function buildCheckedOutAssetsHtml(assets: CheckoutEmailData['assets']): string {
  const rows = assets
    .map(
      (a) => `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#1a2b3c;"><strong>${a.assetId}</strong></td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#1a2b3c;">${escapeHtml(a.assetType)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#1a2b3c;">${escapeHtml(a.kind === 'laptop' ? 'Laptop' : 'AV')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#1a2b3c;">${escapeHtml(a.model)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#1a2b3c;">${escapeHtml(a.brand)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#1a2b3c;">${escapeHtml(a.serialNum)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;font-size:12px;color:#64748b;white-space:nowrap;">${escapeHtml(a.checkoutAt)}</td>
    </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d4e8f7;border-radius:8px;overflow:hidden;">
    <tr>
      <td style="background:#e8f4fc;padding:10px 8px;font-size:11px;font-weight:700;color:#003366;">Asset ID</td>
      <td style="background:#e8f4fc;padding:10px 8px;font-size:11px;font-weight:700;color:#003366;">Category</td>
      <td style="background:#e8f4fc;padding:10px 8px;font-size:11px;font-weight:700;color:#003366;">Pool</td>
      <td style="background:#e8f4fc;padding:10px 8px;font-size:11px;font-weight:700;color:#003366;">Model</td>
      <td style="background:#e8f4fc;padding:10px 8px;font-size:11px;font-weight:700;color:#003366;">Brand</td>
      <td style="background:#e8f4fc;padding:10px 8px;font-size:11px;font-weight:700;color:#003366;">Serial</td>
      <td style="background:#e8f4fc;padding:10px 8px;font-size:11px;font-weight:700;color:#003366;">Checked out</td>
    </tr>
    ${rows}
  </table>`;
}

export function buildCheckoutEmailHtml(data: CheckoutEmailData): string {
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
    detailRow('Return date', data.returnDate),
    detailRow('Program type', data.programType),
    detailRow('Usage location', data.usageLocation),
    detailRow('Reason / remarks', data.reason ?? '—'),
    detailRow('Checked out by', `${data.checkedOutByName} (${data.checkedOutByStaffId})`),
    detailRow('Checkout time', data.checkedOutAt),
    detailRow('Status', 'In use — equipment checked out'),
  ].join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f6;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,51,102,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#003366 0%,#0055a4 100%);padding:28px 24px;text-align:center;">
            <img src="cid:${LOGO_CID}" alt="UNIKL RCMP" width="72" height="72" style="display:block;margin:0 auto 14px;border-radius:50%;background:#fff;padding:6px;" />
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#b8d4f0;">UNIKL Royal College of Medicine Perak</p>
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">Equipment Checkout Confirmation</h1>
            <p style="margin:10px 0 0;font-size:13px;color:#d4e8ff;">NIMS · Information Technology Department</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 8px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155;">
              Dear <strong>${escapeHtml(data.requesterName)}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#475569;">
              Your equipment borrow request <strong>#${data.requestId}</strong> has been checked out by IT. Please review the assigned assets below and return them by <strong>${escapeHtml(data.returnDate)}</strong>.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d4e8f7;border-radius:8px;overflow:hidden;margin-bottom:20px;">
              <tr>
                <td colspan="2" style="background:#e8f4fc;padding:12px;font-size:12px;font-weight:700;color:#003366;text-transform:uppercase;letter-spacing:0.04em;">Requester</td>
              </tr>
              ${requesterRows}
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d4e8f7;border-radius:8px;overflow:hidden;margin-bottom:20px;">
              <tr>
                <td colspan="2" style="background:#e8f4fc;padding:12px;font-size:12px;font-weight:700;color:#003366;text-transform:uppercase;letter-spacing:0.04em;">Request details</td>
              </tr>
              ${requestRows}
            </table>
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#003366;text-transform:uppercase;letter-spacing:0.04em;">Equipment requested</p>
            <div style="margin-bottom:20px;">${buildRequestedItemsHtml(data.requestedItems)}</div>
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#003366;text-transform:uppercase;letter-spacing:0.04em;">Assets checked out (${data.assets.length})</p>
            ${buildCheckedOutAssetsHtml(data.assets)}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 24px 24px;">
            <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#64748b;">
              Please care for college equipment and return it on time. Questions: contact IT at
              <a href="mailto:${REQUEST_IT_EMAIL}" style="color:#0055a4;">${REQUEST_IT_EMAIL}</a>.
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              This message was generated automatically by NIMS. Please do not reply directly unless instructed by IT.
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

export function buildCheckoutEmailText(data: CheckoutEmailData): string {
  const requestedBlock = data.requestedItems.map((i) => `  - ${i.assetType}: ${i.quantity}`).join('\n');
  const assetsBlock = data.assets
    .map(
      (a) =>
        `  - Asset ${a.assetId} (${a.kind}): ${a.assetType}, ${a.brand} ${a.model}, serial ${a.serialNum}, checked out ${a.checkoutAt}`,
    )
    .join('\n');

  return [
    'UNIKL RCMP — Equipment Checkout Confirmation',
    '',
    `Dear ${data.requesterName},`,
    '',
    `Request #${data.requestId} — equipment has been checked out to you.`,
    '',
    'Requester',
    `  Name: ${data.requesterName}`,
    `  Staff ID: ${data.requestedBy}`,
    `  Email: ${data.requesterEmail}`,
    '',
    'Request details',
    `  Borrow: ${data.borrowDate}`,
    `  Return by: ${data.returnDate}`,
    `  Program: ${data.programType}`,
    `  Location: ${data.usageLocation}`,
    `  Reason: ${data.reason ?? '—'}`,
    `  Checked out by: ${data.checkedOutByName} (${data.checkedOutByStaffId})`,
    `  Checkout time: ${data.checkedOutAt}`,
    '',
    'Equipment requested',
    requestedBlock || '  (none)',
    '',
    `Assets checked out (${data.assets.length})`,
    assetsBlock,
    '',
    `IT contact: ${REQUEST_IT_EMAIL}`,
    '',
    '— NIMS (automated notification)',
  ].join('\n');
}

export async function sendCheckoutEmail(input: SendCheckoutEmailInput): Promise<SendCheckoutEmailResult> {
  if (!isEmailConfigured()) {
    throw new Error(
      'Email is not configured. Set SMTP_USER/SMTP_PASSWORD or SMTP_MAILPIT=true for local testing.',
    );
  }

  const data = await getCheckoutEmailData(input.requestId, input.checkedOutBy, input.assignmentIds);
  if (!data) {
    throw new Error('Cannot send checkout email: request or checked-out assets not found.');
  }

  const logo = loadLogoBuffer();
  const { sendNotificationEmail } = await import('@/server/email.server');
  const result = await sendNotificationEmail({
    to: data.requesterEmail,
    cc: REQUEST_IT_EMAIL,
    subject: `UNIKL RCMP — Request #${data.requestId} Equipment Checked Out`,
    text: buildCheckoutEmailText(data),
    html: buildCheckoutEmailHtml(data),
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
