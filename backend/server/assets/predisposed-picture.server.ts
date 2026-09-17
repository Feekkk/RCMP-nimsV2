import { mkdir, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AssetKind } from '@shared/lib/inventory-schema';
import type {
  PreDisposedAsset,
  PredisposedPictureSlot,
  RemovePredisposedPicturesInput,
  UploadPredisposedPictureInput,
  UploadPredisposedPictureResult,
} from '@shared/lib/disposal-schema';
import { getSessionUser } from '@backend/server/auth/session.server';
import { isDisposalUnitRole, isStaffRole } from '@shared/lib/auth-session';

const UPLOAD_ROOT = path.join(process.cwd(), 'upload', 'picture');
const KIND_RE = /^(laptop|av|network)$/;
const ASSET_RE = /^[A-Za-z0-9._-]{1,64}$/;
const FILE_RE = /^(whole|serial)\.(jpg|jpeg|png|webp)$/i;
const MAX_BYTES = 4 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

async function assertStaffSession() {
  const session = await getSessionUser();
  if (!session || !isStaffRole(session.roleId)) {
    throw new Error('Technician access is required.');
  }
}

async function assertCanViewPictures() {
  const session = await getSessionUser();
  if (!session || (!isStaffRole(session.roleId) && !isDisposalUnitRole(session.roleId))) {
    throw new Error('Technician access is required.');
  }
}

function safeAssetId(assetId: string): string {
  const cleaned = assetId.trim().replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  if (!cleaned) throw new Error('This asset ID cannot be used for an image file name.');
  return cleaned.slice(0, 64);
}

function assertKind(kind: string): AssetKind {
  if (kind !== 'laptop' && kind !== 'av' && kind !== 'network') {
    throw new Error('Unknown asset type.');
  }
  return kind;
}

function publicUrl(kind: AssetKind, assetId: string, fileName: string): string {
  return `/upload/picture/${kind}/${assetId}/${fileName}`;
}

function assetDir(kind: AssetKind, assetId: string): string {
  return path.join(UPLOAD_ROOT, kind, assetId);
}

async function findSlotFile(dir: string, slot: PredisposedPictureSlot): Promise<string | null> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }
  const match = names.find((name) => name.toLowerCase().startsWith(`${slot}.`));
  return match ?? null;
}

export async function readPredisposedPictures(
  kind: AssetKind,
  assetId: string | number,
): Promise<{ imageWholeAsset: string | null; imageSerialNumber: string | null }> {
  const id = safeAssetId(String(assetId));
  const dir = assetDir(kind, id);
  const [whole, serial] = await Promise.all([findSlotFile(dir, 'whole'), findSlotFile(dir, 'serial')]);
  return {
    imageWholeAsset: whole ? publicUrl(kind, id, whole) : null,
    imageSerialNumber: serial ? publicUrl(kind, id, serial) : null,
  };
}

export async function attachPredisposedPictures(rows: PreDisposedAsset[]): Promise<PreDisposedAsset[]> {
  return Promise.all(
    rows.map(async (row) => {
      const pictures = await readPredisposedPictures(row.kind, row.assetId);
      return { ...row, ...pictures };
    }),
  );
}

export async function savePredisposedPicture(
  input: UploadPredisposedPictureInput,
): Promise<UploadPredisposedPictureResult> {
  await assertStaffSession();
  const kind = assertKind(input.kind);
  if (input.slot !== 'whole' && input.slot !== 'serial') {
    throw new Error('Choose a whole-asset or serial-number photo.');
  }
  const ext = MIME_EXT[input.mimeType];
  if (!ext) {
    throw new Error('Use a JPEG, PNG, or WebP image.');
  }
  const raw = input.dataBase64.replace(/\s/g, '');
  let buffer: Buffer;
  try {
    buffer = Buffer.from(raw, 'base64');
  } catch {
    throw new Error('This image could not be read.');
  }
  if (!buffer.length) {
    throw new Error('This image is empty.');
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error('This image is too large. Use a photo under 4 MB.');
  }
  const id = safeAssetId(String(input.assetId));
  const dir = assetDir(kind, id);
  await mkdir(dir, { recursive: true });
  const existing = await findSlotFile(dir, input.slot);
  if (existing) {
    await unlink(path.join(dir, existing)).catch(() => {});
  }
  const fileName = `${input.slot}.${ext}`;
  await writeFile(path.join(dir, fileName), buffer);
  return {
    url: publicUrl(kind, id, fileName),
    path: `upload/picture/${kind}/${id}/${fileName}`,
  };
}

export async function removePredisposedPictures(input: RemovePredisposedPicturesInput): Promise<void> {
  await assertStaffSession();
  const kind = assertKind(input.kind);
  const id = safeAssetId(String(input.assetId));
  await rm(assetDir(kind, id), { recursive: true, force: true });
}

export async function removePredisposedPictureSlot(
  kind: AssetKind,
  assetId: string | number,
  slot: PredisposedPictureSlot,
): Promise<void> {
  await assertStaffSession();
  const id = safeAssetId(String(assetId));
  const dir = assetDir(kind, id);
  const existing = await findSlotFile(dir, slot);
  if (existing) {
    await unlink(path.join(dir, existing)).catch(() => {});
  }
}

export async function servePredisposedPicture(
  kind: string,
  assetId: string,
  fileName: string,
): Promise<Response> {
  try {
    await assertCanViewPictures();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
  const safeKind = path.basename(kind);
  const safeId = path.basename(assetId);
  const safeFile = path.basename(fileName);
  if (!KIND_RE.test(safeKind) || !ASSET_RE.test(safeId) || !FILE_RE.test(safeFile)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const filePath = path.join(UPLOAD_ROOT, safeKind, safeId, safeFile);
    const data = await readFile(filePath);
    const ext = path.extname(safeFile).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
