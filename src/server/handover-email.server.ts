import type { HandoverEmailData } from '@/lib/handover-email-types';
import type { SendHandoverEmailResult } from '@/lib/handover-email-types';
import { EMAIL_NOT_CONFIGURED_MESSAGE } from '@/lib/email-notification';
import { isEmailConfigured } from '@/lib/microsoft-email-config';
import { escapeHtml } from '@/server/email.server';
import { markHandoverEmailStatus } from '@/server/handover-email-repo.server';
import { buildHandoverPdfFromData } from '@/server/handover-pdf.server';
import { getHandoverNotificationData } from '@/server/handover-pdf-repo.server';
import { loadLogoBuffer } from '@/server/pdf-form-common.server';

const HANDOVER_CC = 'it.rcmp@unikl.edu.my';
const LOGO_CID = 'unikl-logo';

function detailRow(label: string, value: unknown): string {
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;color:#5c6b7a;font-size:13px;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;color:#1a2b3c;font-size:13px;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;
}

export function buildHandoverEmailHtml(data: HandoverEmailData): string {
  const rows = [
    detailRow('Recipient', data.recipientName),
    detailRow('Staff / IC no.', data.employeeNo),
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
<body style="margin:0;padding:0;background:#eef2f6;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,51,102,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#003366 0%,#0055a4 100%);padding:28px 24px;text-align:center;">
            <img src="cid:${LOGO_CID}" alt="UNIKL RCMP" width="72" height="72" style="display:block;margin:0 auto 14px;border-radius:50%;background:#fff;padding:6px;" />
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#b8d4f0;">UNIKL Royal College of Medicine Perak</p>
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">Equipment Handover Notification</h1>
            <p style="margin:10px 0 0;font-size:13px;color:#d4e8ff;">Information Technology Department</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 8px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155;">
              Dear <strong>${escapeHtml(data.recipientName)}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#475569;">
              A company notebook/desktop has been handed over to you through NIMS. Please review the summary below and complete the attached
              <strong>3-page handover form</strong> (software compliance, equipment handover, and liability acknowledgment).
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d4e8f7;border-radius:8px;overflow:hidden;">
              <tr>
                <td colspan="2" style="background:#e8f4fc;padding:12px 12px;font-size:12px;font-weight:700;color:#003366;text-transform:uppercase;letter-spacing:0.04em;">
                  Handover details
                </td>
              </tr>
              ${rows}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 24px 24px;">
            <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#64748b;">
              The signed handover PDF is attached to this email. If you have questions, contact IT at
              <a href="mailto:${HANDOVER_CC}" style="color:#0055a4;">${HANDOVER_CC}</a>.
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              This message was generated automatically by NIMS. Please do not reply directly to this email.
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

export function buildHandoverEmailText(data: HandoverEmailData): string {
  return [
    'UNIKL RCMP — Equipment Handover Notification',
    '',
    `Dear ${data.recipientName},`,
    '',
    'A company notebook/desktop has been handed over to you. The 3-page handover form is attached.',
    '',
    'Handover details',
    `  Recipient: ${data.recipientName}`,
    `  Staff / IC no.: ${data.employeeNo}`,
    `  Designation: ${data.employeeDesignation}`,
    `  Handover date: ${data.handoverDate}`,
    `  Asset ID: ${data.assetId}`,
    `  Item: ${data.itemName}`,
    `  Brand: ${data.brandName}`,
    `  Model: ${data.modelName}`,
    `  Serial number: ${data.serialNumber}`,
    `  Remarks: ${data.remark}`,
    `  Handed over by: ${data.handoverByName} (${data.handoverByDesignation})`,
    '',
    `Questions: ${HANDOVER_CC}`,
    '',
    '— NIMS (automated notification)',
  ].join('\n');
}

export async function sendHandoverEmail(handoverId: number): Promise<SendHandoverEmailResult> {
  if (!isEmailConfigured()) {
    throw new Error(EMAIL_NOT_CONFIGURED_MESSAGE);
  }

  await markHandoverEmailStatus(handoverId, 'sending').catch(() => {});

  try {
    const data = await getHandoverNotificationData(handoverId);
    if (!data) {
      throw new Error('This handover record could not be found. Refresh the page and try again.');
    }

    const email = data.recipientEmail?.trim();
    if (!email || !email.includes('@')) {
      throw new Error(
        `Staff recipient "${data.recipientName}" has no email in the directory. Add an email address in staff records before sending.`,
      );
    }

    const emailData: HandoverEmailData = { ...data, recipientEmail: email };
    const pdfBytes = await buildHandoverPdfFromData(data);
    const logo = loadLogoBuffer();
    const pdfFilename = `handover-${handoverId}-asset-${data.assetId}.pdf`;

    const { sendNotificationEmail } = await import('@/server/email.server');
    const result = await sendNotificationEmail({
      to: email,
      cc: HANDOVER_CC,
      subject: `UNIKL RCMP — Laptop/Desktop Handover (Asset ${data.assetId})`,
      text: buildHandoverEmailText(emailData),
      html: buildHandoverEmailHtml(emailData),
      attachments: [
        {
          filename: 'unikl-logo.png',
          content: logo,
          contentType: 'image/png',
          cid: LOGO_CID,
        },
        {
          filename: pdfFilename,
          content: pdfBytes,
          contentType: 'application/pdf',
        },
      ],
    });

    await markHandoverEmailStatus(handoverId, 'sent').catch(() => {});

    return {
      messageId: result.messageId,
      to: email,
      cc: HANDOVER_CC,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'The handover email failed to send.';
    await markHandoverEmailStatus(handoverId, 'failed', message).catch(() => {});
    throw err;
  }
}

/** Fire-and-forget: lets the caller respond immediately while the PDF/email work continues in the background. */
export function queueHandoverEmail(handoverId: number): void {
  void sendHandoverEmail(handoverId).catch((err) => {
    console.error(`[handover-email] background send failed for handover ${handoverId}:`, err);
  });
}
