import { createServerFn } from '@tanstack/react-start';
import type { CreateDisposalInput } from '@/lib/disposal-schema';
import { staffMiddleware } from '@/server/auth-middleware';

export const createDisposalFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: CreateDisposalInput) => input)
  .handler(async ({ data: input }) => {
    const { createDisposal } = await import('@/server/disposal-repo.server');
    return createDisposal(input);
  });
