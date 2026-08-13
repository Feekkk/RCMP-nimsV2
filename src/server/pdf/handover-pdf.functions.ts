import { createServerFn } from '@tanstack/react-start';
import { staffMiddleware } from '@/server/core/auth-middleware';

export const generateHandoverPdfFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((handoverId: number) => handoverId)
  .handler(async ({ data: handoverId }) => {
    const { generateHandoverPdfBase64 } = await import('@/server/pdf/handover-pdf.server');
    const base64 = await generateHandoverPdfBase64(handoverId);
    return { base64, filename: `handover-${handoverId}.pdf` };
  });
