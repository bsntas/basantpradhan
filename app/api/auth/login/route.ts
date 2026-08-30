import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, verifyPassword, toPublicUser } from '@/lib/db';
import { createToken, authCookieHeader } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const token = await createToken({ userId: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ user: toPublicUser(user) });
  res.headers.append('Set-Cookie', authCookieHeader(token));
  return res;
}
