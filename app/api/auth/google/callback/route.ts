import { NextRequest, NextResponse } from 'next/server';
import { createToken, authCookieHeader } from '@/lib/auth';
import { findUserByEmail, createUser } from '@/lib/db';

const STATE_COOKIE = 'bp_oauth_state';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  const expectedState = req.cookies.get(STATE_COOKIE)?.value;

  if (error || !code) {
    const params = new URLSearchParams({ error: 'google', reason: error ?? 'no_code' });
    return NextResponse.redirect(new URL(`/login?${params}`, req.url));
  }

  if (!state || !expectedState || state !== expectedState) {
    const params = new URLSearchParams({ error: 'google', reason: 'state_mismatch' });
    return NextResponse.redirect(new URL(`/login?${params}`, req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=config', req.url));
  }

  try {
    // Exchange authorisation code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.json().catch(() => ({}));
      const reason = (body as { error?: string }).error ?? 'token_failed';
      console.error('[google-oauth] token exchange failed:', reason, 'redirect_uri:', redirectUri);
      const params = new URLSearchParams({ error: 'google', reason });
      return NextResponse.redirect(new URL(`/login?${params}`, req.url));
    }
    const tokenData = await tokenRes.json();

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) throw new Error('userinfo fetch failed');
    const googleUser = await userRes.json();

    const email: string = googleUser.email;
    const name: string = googleUser.name ?? email.split('@')[0];

    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser({ name, email, password: null });
    }

    const token = await createToken({ userId: user.id, email: user.email, name: user.name });

    const response = NextResponse.redirect(new URL('/', req.url));
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.headers.append('Set-Cookie', authCookieHeader(token));
    response.headers.append(
      'Set-Cookie',
      `${STATE_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`,
    );
    return response;
  } catch (err) {
    console.error('[google-oauth] unexpected error:', err);
    return NextResponse.redirect(new URL('/login?error=google&reason=unexpected', req.url));
  }
}
