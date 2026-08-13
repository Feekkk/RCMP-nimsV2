import { createServerFn } from '@tanstack/react-start';
import type { AssetKind } from '@/lib/inventory-schema';
import type {
  DeployLaptopPlaceInput,
  DeployLaptopStaffInput,
  DeployPlaceInput,
  ReturnLaptopPlaceInput,
  ReturnLaptopStaffInput,
  ReturnPlaceInput,
} from '@/lib/deploy-return-schema';
import { staffMiddleware } from '@/server/core/auth-middleware';

export const searchStaffFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }) => {
    const { searchStaffRecipients } = await import('@/server/requests/deploy-return-repo.server');
    return searchStaffRecipients(query);
  });

export const getOpenReturnContextFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: { kind: AssetKind; assetId: number }) => input)
  .handler(async ({ data: input }) => {
    const { getOpenReturnContext } = await import('@/server/requests/deploy-return-repo.server');
    return getOpenReturnContext(input.kind, input.assetId);
  });

export const deployLaptopStaffFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: DeployLaptopStaffInput) => input)
  .handler(async ({ data: input }) => {
    const { deployLaptopToStaff } = await import('@/server/requests/deploy-return-repo.server');
    return deployLaptopToStaff(input);
  });

export const deployLaptopPlaceFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: DeployLaptopPlaceInput) => input)
  .handler(async ({ data: input }) => {
    const { deployLaptopToPlace } = await import('@/server/requests/deploy-return-repo.server');
    return deployLaptopToPlace(input);
  });

export const deployPlaceFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: DeployPlaceInput) => input)
  .handler(async ({ data: input }) => {
    const { deployToPlace } = await import('@/server/requests/deploy-return-repo.server');
    return deployToPlace(input);
  });

export const returnLaptopStaffFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: ReturnLaptopStaffInput) => input)
  .handler(async ({ data: input }) => {
    const { returnLaptopStaff } = await import('@/server/requests/deploy-return-repo.server');
    return returnLaptopStaff(input);
  });

export const returnLaptopPlaceFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: ReturnLaptopPlaceInput) => input)
  .handler(async ({ data: input }) => {
    const { returnLaptopPlace } = await import('@/server/requests/deploy-return-repo.server');
    return returnLaptopPlace(input);
  });

export const returnPlaceFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: ReturnPlaceInput) => input)
  .handler(async ({ data: input }) => {
    const { returnPlaceAsset } = await import('@/server/requests/deploy-return-repo.server');
    return returnPlaceAsset(input);
  });
