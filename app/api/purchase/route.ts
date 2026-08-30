import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { addPurchase, hasPurchased } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getUserFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { bookId } = await req.json();
  if (!bookId) return NextResponse.json({ error: 'bookId required' }, { status: 400 });

  addPurchase(session.userId, bookId);
  return NextResponse.json({ ok: true, bookId });
}

export async function GET(req: NextRequest) {
  const session = await getUserFromRequest(req);
  if (!session) return NextResponse.json({ purchased: false });
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get('bookId') ?? 'koltey-golai';
  return NextResponse.json({ purchased: hasPurchased(session.userId, bookId) });
}
