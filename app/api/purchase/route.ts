import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { addPurchase, hasPurchased } from '@/lib/db';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_MOCK_PURCHASE) {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  const session = await getUserFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { bookId } = await req.json();
  if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 });

  await addPurchase(session.userId, bookId);
  return NextResponse.json({ ok: true, bookId });
}

export async function GET(req: NextRequest) {
  const session = await getUserFromRequest(req);
  if (!session) return NextResponse.json({ purchased: false });
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get('bookId') ?? 'koltey-golai';
  const { isVipEmail } = await import('@/lib/config');
  const purchased = isVipEmail(session.email) || await hasPurchased(session.userId, bookId);
  return NextResponse.json({ purchased });
}
