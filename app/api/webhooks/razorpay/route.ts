import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { addPurchase } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body);
  if (event.event === 'payment.captured') {
    const notes = event.payload?.payment?.entity?.notes ?? {};
    const userId = notes.userId as string | undefined;
    const bookId = notes.bookId as string | undefined;
    if (userId && bookId) {
      await addPurchase(userId, bookId);
    }
  }

  return NextResponse.json({ ok: true });
}
