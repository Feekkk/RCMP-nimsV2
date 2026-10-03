const NATIONAL_NUMBER = /^[1-9]\d{7,9}$/;

export function malaysiaWhatsappNumber(phone: string | null | undefined): string | null {
  const raw = phone?.trim();
  if (!raw) return null;

  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);

  let national = digits;
  if (national.startsWith('60')) {
    national = national.slice(2);
    if (national.startsWith('0')) national = national.slice(1);
  } else if (national.startsWith('0')) {
    national = national.slice(1);
  }

  if (!NATIONAL_NUMBER.test(national)) return null;
  return `60${national}`;
}

export function malaysiaWhatsappHref(phone: string | null | undefined): string | null {
  const number = malaysiaWhatsappNumber(phone);
  return number ? `https://wa.me/${number}` : null;
}
