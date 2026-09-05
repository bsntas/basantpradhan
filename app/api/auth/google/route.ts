import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const STATE_COOKIE = 'bp_oauth_state';

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Google login not configured' }, { status: 503 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });

  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  );
  response.headers.set(
    'Set-Cookie',
    `${STATE_COOKIE}=${state}; HttpOnly; Path=/; Max-Age=300; SameSite=Lax${secure}`,
  );
  return response;
}
