import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RequestReadyEmailData } from '@shared/lib/request-ready-email-types';
import { REQUEST_COLLECTION_LOCATION, REQUEST_IT_EMAIL } from '@shared/lib/request-ready-email-types';
import type { SendRequestReadyEmailResult } from '@shared/lib/request-ready-email-types';
import { EMAIL_NOT_CONFIGURED_MESSAGE } from '@shared/lib/email-notification';
import { isEmailConfigured } from '@backend/lib/microsoft-email-config';
import { escapeHtml } from '@backend/server/email/email.server';
import { getRequestReadyEmailData } from '@backend/server/email/request-ready-email-repo.server';

const LOGO_CID = 'unikl-logo';

function loadLogoBuffer(): Buffer {
  const path = join(process.cwd(), 'src', 'assets', 'unikl-logo.png');
  return readFileSync(path);
}

export function buildRequestReadyEmailHtml(data: RequestReadyEmailData): string {
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
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">Equipment Ready for Collection</h1>
            <p style="margin:10px 0 0;font-size:13px;color:#d4e8ff;">NIMS · Information Technology Department</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 8px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#334155;">
              Dear <strong>${escapeHtml(data.requesterName)}</strong>,
            </p>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#475569;">
              Your equipment borrow request <strong>#${data.requestId}</strong> is ready. Please collect the requested items at the IT Department.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #bbf7d0;border-radius:8px;overflow:hidden;margin-bottom:20px;background:#f0fdf4;">
              <tr>
                <td style="padding:16px 18px;">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#166534;">Collection point</p>
                  <p style="margin:0;font-size:16px;font-weight:700;line-height:1.45;color:#14532d;">${escapeHtml(REQUEST_COLLECTION_LOCATION)}</p>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d4e8f7;border-radius:8px;overflow:hidden;margin-bottom:8px;">
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;color:#5c6b7a;font-size:13px;width:38%;">Borrow date</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e8ecf0;color:#1a2b3c;font-size:13px;font-weight:600;">${escapeHtml(data.borrowDate)}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;color:#5c6b7a;font-size:13px;">Return date</td>
                <td style="padding:10px 12px;color:#1a2b3c;font-size:13px;font-weight:600;">${escapeHtml(data.returnDate)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 24px 24px;">
            <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#64748b;">
             Contact IT staff at
              <a href="mailto:${REQUEST_IT_EMAIL}" style="color:#0055a4;">${REQUEST_IT_EMAIL}</a>.
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              This message was generated automatically by NIMS. Please do not reply directly unless instructed.
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

export function buildRequestReadyEmailText(data: RequestReadyEmailData): string {
  return [
    'UNIKL RCMP — Equipment Ready for Collection',
    '',
    `Dear ${data.requesterName},`,
    '',
    `Request #${data.requestId} is ready. Please collect the requested items at the IT Department.`,
    '',
    `Collection point: ${REQUEST_COLLECTION_LOCATION}`,
    `Borrow date: ${data.borrowDate}`,
    `Return date: ${data.returnDate}`,
    '',
    'Please bring your staff or student identification when collecting.',
    `IT contact: ${REQUEST_IT_EMAIL}`,
    '',
    '— NIMS (automated notification)',
  ].join('\n');
}

export async function sendRequestReadyEmail(
  requestId: number,
): Promise<SendRequestReadyEmailResult> {
  if (!isEmailConfigured()) {
    throw new Error(EMAIL_NOT_CONFIGURED_MESSAGE);
  }

  const data = await getRequestReadyEmailData(requestId);
  if (!data) {
    throw new Error(
      'The collection email could not be sent because the request could not be found. Refresh the page and try again.',
    );
  }

  const logo = loadLogoBuffer();
  const { sendNotificationEmail } = await import('@backend/server/email/email.server');
  const result = await sendNotificationEmail({
    to: data.requesterEmail,
    cc: REQUEST_IT_EMAIL,
    subject: `UNIKL RCMP — Request #${data.requestId} Ready for Collection`,
    text: buildRequestReadyEmailText(data),
    html: buildRequestReadyEmailHtml(data),
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

export async function trySendRequestReadyEmail(
  requestId: number,
): Promise<{ emailSent: boolean; emailError?: string }> {
  try {
    await sendRequestReadyEmail(requestId);
    return { emailSent: true };
  } catch (err) {
    console.error('[request-ready-email] send failed', requestId, err);
    return {
      emailSent: false,
      emailError:
        err instanceof Error ? err.message : 'The collection email could not be sent.',
    };
  }
}
