import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) {
    console.error(
      '[auth] JWT_SECRET is not set. Using insecure fallback — ' +
      'set JWT_SECRET in your Vercel environment variables immediately.',
    );
  }
  return new TextEncoder().encode(s ?? 'basant-pradhan-koltey-golai-secret-key-2024');
}

export const COOKIE_NAME = 'bp_auth';
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getServerUser(): Promise<TokenPayload | null> {
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getUserFromRequest(req: NextRequest): Promise<TokenPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

const SECURE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

export function authCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${SECURE}`;
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${SECURE}`;
}
