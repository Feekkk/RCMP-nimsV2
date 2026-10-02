const PHOTO_PATH =
  /^\/upload\/picture\/(laptop|av|network)\/[A-Za-z0-9._-]{1,64}\/(whole|serial)\.(jpe?g|png|webp)$/i;

export const DISPOSAL_PHOTO_MAX_BYTES = 4 * 1024 * 1024;

export const DISPOSAL_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function disposalPhotoPath(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.includes('\\') || trimmed.includes('..')) return null;

  let path = trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    if (!/^https?:\/\//i.test(trimmed)) return null;
    try {
      path = new URL(trimmed).pathname;
    } catch {
      return null;
    }
  }

  const query = path.indexOf('?');
  if (query >= 0) path = path.slice(0, query);
  const hash = path.indexOf('#');
  if (hash >= 0) path = path.slice(0, hash);
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.includes('//') || !PHOTO_PATH.test(path)) return null;
  return path;
}

export function disposalDownloadStem(value: string): string {
  const cleaned = value.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 80) || 'disposal';
}
