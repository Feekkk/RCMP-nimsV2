import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HandoverEmailData } from '@/lib/handover-email-types';
import { HANDOVER_IT_CC } from '@/lib/handover-email-types';
import type { SendHandoverEmailResult } from '@/lib/handover-email-types';
import { sendNotificationEmail } from '@/server/email.server';
import { isEmailConfigured } from '@/lib/microsoft-email-config';

const LOGO_CID = 'unikl-logo';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;color:#5c6b7a;font-size:13px;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;color:#1a2332;font-size:13px;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;
}

function buildHandoverEmailHtml(data: HandoverEmailData): string {
  const rows = [
    detailRow('Recipient', data.recipientName),
    detailRow('Staff / employee no.', data.employeeNo),
    detailRow('Designation', data.employeeDesignation),
    detailRow('Handover date', data.handoverDate),
    detailRow('Asset ID', String(data.assetId)),
    detailRow('Item', data.itemName),
    detailRow('Brand', data.brandName),
    detailRow('Model', data.modelName),
    detailRow('Serial number', data.serialNumber),
    detailRow('Remarks', data.remark),
    detailRow('Handed over by', `${data.handoverByName} (${data.handoverByDesignation})`),
  ].join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef1f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;">
    <tr><td align="center" style="padding:28px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(26,35,50,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#003d7a 0%,#0056a8 100%);padding:28px 24px;text-align:center;">
            <img src="cid:${LOGO_CID}" alt="UNIKL RCMP" width="72" height="66" style="display:block;margin:0 auto 14px;" />
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#b8d4f0;">UNIKL Royal College of Medicine Perak</p>
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">Equipment Handover Notification</h1>
            <p style="margin:10px 0 0;font-size:13px;color:#d4e8ff;">NIMS · Information Technology Department</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 8px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#1a2332;">
              Dear <strong>${escapeHtml(data.recipientName)}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3d4f5f;">
              A company notebook/desktop has been handed over to you. Please review the summary below and complete the attached
              <strong>handover form</strong> (software compliance, equipment acknowledgment, and liability statement).
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d4dce6;border-radius:8px;overflow:hidden;">
              <tr>
                <td colspan="2" style="background:#f0f5fa;padding:12px 12px;font-size:12px;font-weight:700;color:#003d7a;text-transform:uppercase;letter-spacing:0.04em;">
                  Handover details
                </td>
              </tr>
              ${rows}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-left:4px solid #0056a8;border-radius:0 6px 6px 0;">
              <tr>
                <td style="padding:14px 16px;font-size:13px;line-height:1.55;color:#3d4f5f;">
                  <strong style="color:#003d7a;">Attached:</strong> Handover form PDF. Keep a copy for your records.
                  If you have questions, contact IT at <a href="mailto:${HANDOVER_IT_CC}" style="color:#0056a8;">${HANDOVER_IT_CC}</a>.
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px 24px;border-top:1px solid #e8ecf0;background:#fafbfc;">
            <p style="margin:0;font-size:11px;line-height:1.5;color:#8a96a3;text-align:center;">
              This message was sent automatically by the system. Please do not reply directly to this email unless instructed by ITD staff.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPlainText(data: HandoverEmailData): string {
  return [
    `Dear ${data.recipientName},`,
    '',
    'A company notebook/desktop has been handed over to you. Summary:',
    '',
    `Recipient: ${data.recipientName}`,
    `Staff no.: ${data.employeeNo}`,
    `Designation: ${data.employeeDesignation}`,
    `Handover date: ${data.handoverDate}`,
    `Asset ID: ${data.assetId}`,
    `Item: ${data.itemName}`,
    `Brand: ${data.brandName}`,
    `Model: ${data.modelName}`,
    `Serial: ${data.serialNumber}`,
    `Remarks: ${data.remark}`,
    `Handed over by: ${data.handoverByName} (${data.handoverByDesignation})`,
    '',
    'The 3-page handover form is attached as a PDF.',
    `Questions: ${HANDOVER_IT_CC}`,
  ].join('\n');
}

function loadLogoAttachment() {
  const path = join(process.cwd(), 'src', 'assets', 'unikl-logo.png');
  return {
    filename: 'unikl-logo.png',
    content: readFileSync(path),
    contentType: 'image/png',
    cid: LOGO_CID,
  };
}

export async function sendHandoverEmail(handoverId: number): Promise<SendHandoverEmailResult> {
  if (!isEmailConfigured()) {
    throw new Error(
      'Email is not configured. Add SMTP_MAILPIT=true (and SMTP_HOST=127.0.0.1, SMTP_PORT=1025) to .env, run npm run mailpit, then restart npm run dev.',
    );
  }

  const { getHandoverEmailData } = await import('@/server/handover-email-repo.server');
  const { generateHandoverPdfBuffer } = await import('@/server/handover-pdf.server');

  const data = await getHandoverEmailData(handoverId);
  if (!data) throw new Error('Handover record not found');

  const pdfBuffer = await generateHandoverPdfBuffer(handoverId);
  const filename = `handover-${handoverId}-asset-${data.assetId}.pdf`;
  const subject = `UNIKL RCMP — Notebook/Desktop Handover (Asset ${data.assetId})`;

  const result = await sendNotificationEmail({
    to: data.recipientEmail,
    cc: HANDOVER_IT_CC,
    subject,
    text: buildPlainText(data),
    html: buildHandoverEmailHtml(data),
    attachments: [
      loadLogoAttachment(),
      {
        filename,
        content: Buffer.from(pdfBuffer),
        contentType: 'application/pdf',
      },
    ],
  });

  return {
    messageId: result.messageId,
    to: data.recipientEmail,
    cc: HANDOVER_IT_CC,
  };
}
