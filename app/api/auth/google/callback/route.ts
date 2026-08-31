import { NextRequest, NextResponse } from 'next/server';
import { createToken, authCookieHeader } from '@/lib/auth';
import { findUserByEmail, createUser } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=google', req.url));
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

    if (!tokenRes.ok) throw new Error('token exchange failed');
    const tokenData = await tokenRes.json();

    // Fetch user profile from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) throw new Error('userinfo fetch failed');
    const googleUser = await userRes.json();

    const email: string = googleUser.email;
    const name: string = googleUser.name ?? email.split('@')[0];

    // Find or create user in our database
    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser({ name, email, password: null });
    }

    // Issue our own JWT
    const token = await createToken({ userId: user.id, email: user.email, name: user.name });

    const response = NextResponse.redirect(new URL('/', req.url));
    response.headers.set('Set-Cookie', authCookieHeader(token));
    return response;
  } catch {
    return NextResponse.redirect(new URL('/login?error=google', req.url));
  }
}
