import { createServerFn } from '@tanstack/react-start';
import type {
  AddPmChecklistItemInput,
  CreatePmChecklistInput,
  CreatePmLogInput,
  PmLogListFilters,
  UpdatePmChecklistInput,
  UpdatePmChecklistItemInput,
} from '@/lib/pm-schema';
import type { AssetKind } from '@/lib/inventory-schema';
import { staffMiddleware } from '@/server/auth-middleware';

export const listPmChecklistsFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const { listPmChecklists } = await import('@/server/pm-repo.server');
    return listPmChecklists();
  });

export const listPmAssetCategoriesFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((assetType: AssetKind) => assetType)
  .handler(async ({ data: assetType }) => {
    const { listPmAssetCategories } = await import('@/server/pm-repo.server');
    return listPmAssetCategories(assetType);
  });

export const getPmChecklistDetailFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((checklistId: number) => checklistId)
  .handler(async ({ data: checklistId }) => {
    const { getPmChecklistDetail } = await import('@/server/pm-repo.server');
    return getPmChecklistDetail(checklistId);
  });

export const getPmChecklistForAssetFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: { assetType: AssetKind; assetCategory: string }) => input)
  .handler(async ({ data: input }) => {
    const { getPmChecklistForAsset } = await import('@/server/pm-repo.server');
    return getPmChecklistForAsset(input.assetType, input.assetCategory);
  });

export const createPmChecklistFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((data: CreatePmChecklistInput) => data)
  .handler(async ({ data }) => {
    const { createPmChecklist } = await import('@/server/pm-repo.server');
    return createPmChecklist(data);
  });

export const updatePmChecklistFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((data: UpdatePmChecklistInput) => data)
  .handler(async ({ data }) => {
    const { updatePmChecklist } = await import('@/server/pm-repo.server');
    return updatePmChecklist(data);
  });

export const deletePmChecklistFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((checklistId: number) => checklistId)
  .handler(async ({ data: checklistId }) => {
    const { deletePmChecklist } = await import('@/server/pm-repo.server');
    return deletePmChecklist(checklistId);
  });

export const addPmChecklistItemFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((data: AddPmChecklistItemInput) => data)
  .handler(async ({ data }) => {
    const { addPmChecklistItem } = await import('@/server/pm-repo.server');
    return addPmChecklistItem(data);
  });

export const updatePmChecklistItemFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((data: UpdatePmChecklistItemInput) => data)
  .handler(async ({ data }) => {
    const { updatePmChecklistItem } = await import('@/server/pm-repo.server');
    return updatePmChecklistItem(data);
  });

export const deletePmChecklistItemFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((itemId: number) => itemId)
  .handler(async ({ data: itemId }) => {
    const { deletePmChecklistItem } = await import('@/server/pm-repo.server');
    return deletePmChecklistItem(itemId);
  });

export const getPmLocationTreeFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const { getPmLocationTree } = await import('@/server/pm-repo.server');
    return getPmLocationTree();
  });

export const listPmAssetsAtPlaceFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((input: { building: string; level: string; zone: string }) => input)
  .handler(async ({ data: input }) => {
    const { listPmAssetsAtPlace } = await import('@/server/pm-repo.server');
    return listPmAssetsAtPlace(input);
  });

export const createPmLogFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((data: CreatePmLogInput) => data)
  .handler(async ({ data, context }) => {
    const { createPmLog } = await import('@/server/pm-repo.server');
    return createPmLog({ ...data, performedBy: context.staffId });
  });

export const listPmLogsFn = createServerFn({ method: 'POST' })
  .middleware([staffMiddleware])
  .inputValidator((data: PmLogListFilters) => data)
  .handler(async ({ data }) => {
    const { listPmLogs } = await import('@/server/pm-repo.server');
    return listPmLogs(data);
  });

export const getPmStatsFn = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const { getPmStats } = await import('@/server/pm-repo.server');
    return getPmStats();
  });
