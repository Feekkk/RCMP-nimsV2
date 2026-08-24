import { createServerFn } from '@tanstack/react-start';
import { staffMiddleware } from '@backend/server/core/auth-middleware';

export const generateReturnPdfFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((returnId: number) => returnId)
  .handler(async ({ data: returnId }) => {
    const { generateReturnPdfBase64 } = await import('@backend/server/pdf/return-pdf.server');
    const base64 = await generateReturnPdfBase64(returnId);
    return { base64, filename: `return-${returnId}.pdf` };
  });
