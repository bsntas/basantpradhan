import { NextRequest, NextResponse } from 'next/server';
import { createUser, toPublicUser } from '@/lib/db';
import { createToken, authCookieHeader } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const user = await createUser(email, password, name);
  if (!user) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const token = await createToken({ userId: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  res.headers.append('Set-Cookie', authCookieHeader(token));
  return res;
}
