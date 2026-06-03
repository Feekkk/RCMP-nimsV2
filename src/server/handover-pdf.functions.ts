import { createServerFn } from '@tanstack/react-start';

export const generateHandoverPdfFn = createServerFn({ method: 'POST' })
  .inputValidator((handoverId: number) => handoverId)
  .handler(async ({ data: handoverId }) => {
    const { generateHandoverPdfBase64 } = await import('@/server/handover-pdf.server');
    const base64 = await generateHandoverPdfBase64(handoverId);
    return { base64, filename: `handover-${handoverId}.pdf` };
  });
