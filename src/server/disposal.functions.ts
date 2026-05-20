import { createServerFn } from '@tanstack/react-start';
import type { CreateDisposalInput } from '@/lib/disposal-schema';

export const createDisposalFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CreateDisposalInput) => input)
  .handler(async ({ data: input }) => {
    const { createDisposal } = await import('@/server/disposal-repo.server');
    return createDisposal(input);
  });
