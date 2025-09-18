import { createHmac, timingSafeEqual } from 'node:crypto';

export function signHmacSHA256(rawBody: string, secret: string) {
  const sig = createHmac('sha256', secret).update(rawBody).digest('hex');
  return `sha256=${sig}`;
}

export function verifyHmacSHA256(rawBody: string, header: string | null | undefined, secret: string) {
  if (!secret) return true; // dev
  if (!header) return false;
  const expected = signHmacSHA256(rawBody, secret);
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}
