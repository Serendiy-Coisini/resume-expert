import { DEFAULT_AVATAR_PLACEHOLDER } from '@/components/legoDesigner/schema/widgetConfig';

export const MAX_LEGO_IMAGE_BYTES = 8 * 1024 * 1024;
const approvedExternalImages = new Set<string>();

export function validateLocalLegoImage(file: Pick<File, 'type' | 'size'>): string | null {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return '请选择 PNG、JPG 或 WebP 图片';
  }
  if (file.size > MAX_LEGO_IMAGE_BYTES) return '图片大小不能超过 8MB';
  return null;
}

export function isExternalLegoImageSource(source: unknown): source is string {
  return typeof source === 'string' && /^https?:\/\//i.test(source.trim());
}

/** Approval is kept in memory so imported JSON cannot grant itself network access. */
export function approveExternalLegoImageSource(source: string): boolean {
  const url = source.trim();
  if (/\s/.test(url)) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) return false;
  } catch {
    return false;
  }
  approvedExternalImages.add(url);
  return true;
}

export function safeLegoImageSource(source: unknown): string {
  if (typeof source !== 'string') return '';
  const value = source.trim();
  if (!value) return '';
  if (value === DEFAULT_AVATAR_PLACEHOLDER) return value;
  if (value.startsWith('/') && !value.startsWith('//') && !/[\x00-\x1f\\]/.test(value)) return value;
  if (/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(value) &&
      value.length <= Math.ceil(MAX_LEGO_IMAGE_BYTES * 4 / 3) + 128) return value;
  if (typeof window !== 'undefined' && value.startsWith(`blob:${window.location.origin}/`)) return value;
  return approvedExternalImages.has(value) ? value : '';
}
