const STRICT_EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const SAFE_LOCAL_PHOTO_REGEX = /^\.\/photos\/[a-z0-9-]+\.(?:jpe?g|png|webp)$/;

export function isSafeExternalUrl(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('//')) return false;
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function getSafeMailto(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim();
  if (!trimmed || !STRICT_EMAIL_REGEX.test(trimmed)) return null;
  return `mailto:${trimmed}`;
}

export function isSafeLocalPhotoPath(photo: string | null | undefined): boolean {
  if (!photo || typeof photo !== 'string') return false;
  return SAFE_LOCAL_PHOTO_REGEX.test(photo.trim());
}
