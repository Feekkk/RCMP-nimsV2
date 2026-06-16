import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReturnEmailData } from '@/lib/return-email-types';
import { RETURN_IT_CC } from '@/lib/return-email-types';
import type { SendReturnEmailResult } from '@/lib/return-email-types';
import { isEmailConfigured } from '@/lib/microsoft-email-config';
import { escapeHtml, sendNotificationEmail } from '@/server/email.server';

const LOGO_CID = 'unikl-logo';

function detailRow(label: string, value: unknown): string {
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;color:#5c6b7a;font-size:13px;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;color:#1a2332;font-size:13px;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;
}

function buildReturnEmailHtml(data: ReturnEmailData): string {
  const rows = [
    detailRow('Recipient', data.recipientName),
    detailRow('Staff ID', data.employeeNo),
    detailRow('Designation', data.designation),
    detailRow('Department', data.department),
    detailRow('Return date', data.returnDate),
    detailRow('Asset ID', String(data.assetId)),
    detailRow('Item', data.itemName),
    detailRow('Brand', data.brandName),
    detailRow('Model', data.modelName),
    detailRow('Serial number', data.serialNumber),
    detailRow('Condition', data.conditionDisplay),
    detailRow('Status', 'RETURN'),
    detailRow('Return remarks', data.returnRemarks),
    detailRow('Processed by', `${data.handoverByName} (${data.handoverByDesignation})`),
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
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">Equipment Return Notification</h1>
            <p style="margin:10px 0 0;font-size:13px;color:#d4e8ff;">NIMS · Information Technology Department</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 8px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#1a2332;">
              Dear <strong>${escapeHtml(data.recipientName)}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3d4f5f;">
              Your company notebook/desktop return has been recorded in NIMS. Please review the summary below and keep the attached
              <strong>return form</strong> for your records.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d4dce6;border-radius:8px;overflow:hidden;">
              <tr>
                <td colspan="2" style="background:#f0f5fa;padding:12px 12px;font-size:12px;font-weight:700;color:#003d7a;text-transform:uppercase;letter-spacing:0.04em;">
                  Return details
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
                  <strong style="color:#003d7a;">Attached:</strong> Return form PDF. If you have questions, contact IT at
                  <a href="mailto:${RETURN_IT_CC}" style="color:#0056a8;">${RETURN_IT_CC}</a>.
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px 24px;border-top:1px solid #e8ecf0;background:#fafbfc;">
            <p style="margin:0;font-size:11px;line-height:1.5;color:#8a96a3;text-align:center;">
              This message was sent automatically by the system. Please do not reply directly to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildPlainText(data: ReturnEmailData): string {
  return [
    `Dear ${data.recipientName},`,
    '',
    'Your company notebook/desktop return has been recorded. Summary:',
    '',
    `Recipient: ${data.recipientName}`,
    `Staff ID: ${data.employeeNo}`,
    `Designation: ${data.designation}`,
    `Department: ${data.department}`,
    `Return date: ${data.returnDate}`,
    `Asset ID: ${data.assetId}`,
    `Item: ${data.itemName}`,
    `Brand: ${data.brandName}`,
    `Model: ${data.modelName}`,
    `Serial: ${data.serialNumber}`,
    `Condition: ${data.conditionDisplay}`,
    `Status: RETURN`,
    `Remarks: ${data.returnRemarks}`,
    `Processed by: ${data.handoverByName} (${data.handoverByDesignation})`,
    '',
    'The return form is attached as a PDF.',
    `Questions: ${RETURN_IT_CC}`,
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

export async function sendReturnEmail(returnId: number): Promise<SendReturnEmailResult> {
  if (!isEmailConfigured()) {
    throw new Error(
      'Email is not configured. Add SMTP_MAILPIT=true (and SMTP_HOST=127.0.0.1, SMTP_PORT=1025) to .env, run npm run mailpit, then restart npm run dev.',
    );
  }

  const { getReturnEmailData } = await import('@/server/return-email-repo.server');
  const { generateReturnPdfBuffer } = await import('@/server/return-pdf.server');

  const data = await getReturnEmailData(returnId);
  if (!data) {
    throw new Error(
      'Return email requires a staff handover recipient. Place-only returns cannot send notification email.',
    );
  }

  const pdfBuffer = await generateReturnPdfBuffer(returnId);
  const filename = `return-${returnId}-asset-${data.assetId}.pdf`;
  const subject = `UNIKL RCMP — Notebook/Desktop Return (Asset ${data.assetId})`;

  const result = await sendNotificationEmail({
    to: data.recipientEmail,
    cc: RETURN_IT_CC,
    subject,
    text: buildPlainText(data),
    html: buildReturnEmailHtml(data),
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
    cc: RETURN_IT_CC,
  };
}
