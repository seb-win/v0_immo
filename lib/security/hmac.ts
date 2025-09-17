import crypto from 'crypto';


export function signHmacSHA256(rawBody: string, secret: string) {
const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
return `sha256=${sig}`;
}


export function verifyHmacSHA256(rawBody: string, header: string | null | undefined, secret: string) {
if (!secret) return true; // allow no-secret in dev
if (!header) return false;
const expected = signHmacSHA256(rawBody, secret);
try {
return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
} catch {
return false;
}
}
