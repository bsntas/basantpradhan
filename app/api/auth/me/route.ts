import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { findUserById, toPublicUser } from '@/lib/db';
import { isVipEmail, BOOK_ID } from '@/lib/config';

export async function GET(req: NextRequest) {
  const session = await getUserFromRequest(req);
  if (!session) return NextResponse.json({ user: null });
  const user = await findUserById(session.userId);
  if (!user) return NextResponse.json({ user: null });

  const pub = toPublicUser(user);

  // VIP users always have full access — inject the book into purchases for the
  // front-end without writing anything to the database.
  if (isVipEmail(pub.email) && !pub.purchases.includes(BOOK_ID)) {
    pub.purchases = [...pub.purchases, BOOK_ID];
  }

  return NextResponse.json({ user: pub });
}
