const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const GUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const MY_PHONE = /(?:\+60|60|0)[\s.-]*1[\s.-]*\d(?:[\s.-]*\d){7,8}\b/g;

export function redactActivityPersonalData(value: string | null): string | null {
  if (value == null) return null;
  const redacted = value.replace(EMAIL, 'redacted').replace(GUID, 'redacted').replace(MY_PHONE, 'redacted');
  const trimmed = redacted.trim();
  if (!trimmed || trimmed === 'redacted') return 'Staff member';
  return redacted;
}
