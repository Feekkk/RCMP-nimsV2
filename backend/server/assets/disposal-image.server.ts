import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isDisposalUnitRole } from '@shared/lib/auth-session';
import { malaysiaTodayIso } from '@shared/lib/disposal-schema';
import type {
  DisposalUploadBatch,
  UploadDisposalImageInput,
  UploadDisposalImageResult,
} from '@shared/lib/disposal-schema';
import { getSessionUser } from '@backend/server/auth/session.server';

const UPLOAD_ROOT = path.join(process.cwd(), 'upload', 'dispose');
const YEAR_RE = /^\d{4}$/;
const BATCH_RE = /^batch-\d+$/;
const FILE_RE = /^(whole|serial)-[A-Za-z0-9._-]{1,64}\.(jpg|jpeg|png|webp)$/i;
const MAX_BYTES = 4 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function assertDisposalUnitSession() {
  return getSessionUser().then((session) => {
    if (!session || !isDisposalUnitRole(session.roleId)) {
      throw new Error('Disposal unit access is required.');
    }
  });
}

function safeAssetId(assetId: string): string {
  const cleaned = assetId.trim().replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  if (!cleaned) throw new Error('This asset ID cannot be used for an image file name.');
  return cleaned.slice(0, 64);
}

function publicUrl(year: string, batch: string, fileName: string): string {
  return `/upload/dispose/${year}/${batch}/${fileName}`;
}

function storedPath(year: string, batch: string, fileName: string): string {
  return `upload/dispose/${year}/${batch}/${fileName}`;
}

export async function createDisposalUploadBatch(): Promise<DisposalUploadBatch> {
  await assertDisposalUnitSession();
  const year = malaysiaTodayIso().slice(0, 4);
  const yearDir = path.join(UPLOAD_ROOT, year);
  await mkdir(yearDir, { recursive: true });
  for (let n = 1; n <= 10000; n += 1) {
    const batch = `batch-${n}`;
    try {
      await mkdir(path.join(yearDir, batch));
      return { year, batch, path: `upload/dispose/${year}/${batch}` };
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code !== 'EEXIST') throw error;
    }
  }
  throw new Error('Could not allocate a disposal upload folder.');
}

export async function saveDisposalImage(input: UploadDisposalImageInput): Promise<UploadDisposalImageResult> {
  await assertDisposalUnitSession();
  if (!YEAR_RE.test(input.year) || !BATCH_RE.test(input.batch)) {
    throw new Error('Invalid disposal upload folder.');
  }
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
  const fileName = `${input.slot}-${safeAssetId(input.assetId)}.${ext}`;
  const dir = path.join(UPLOAD_ROOT, input.year, input.batch);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), buffer);
  return {
    url: publicUrl(input.year, input.batch, fileName),
    path: storedPath(input.year, input.batch, fileName),
  };
}

export async function serveDisposalImage(year: string, batch: string, fileName: string): Promise<Response> {
  try {
    await assertDisposalUnitSession();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
  const safeYear = path.basename(year);
  const safeBatch = path.basename(batch);
  const safeFile = path.basename(fileName);
  if (!YEAR_RE.test(safeYear) || !BATCH_RE.test(safeBatch) || !FILE_RE.test(safeFile)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const filePath = path.join(UPLOAD_ROOT, safeYear, safeBatch, safeFile);
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
