import { createServerFn } from '@tanstack/react-start';

export const generateReturnPdfFn = createServerFn({ method: 'POST' })
  .inputValidator((returnId: number) => returnId)
  .handler(async ({ data: returnId }) => {
    const { generateReturnPdfBase64 } = await import('@/server/return-pdf.server');
    const base64 = await generateReturnPdfBase64(returnId);
    return { base64, filename: `return-${returnId}.pdf` };
  });
