import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getRazorpay, isConfigured } from '@/lib/razorpay';
import { PRICES, BOOK_ID } from '@/lib/config';

export async function POST(req: NextRequest) {
  const session = await getUserFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (!isConfigured()) {
    return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 });
  }

  const body = await req.json();
  const currency = body.currency ?? 'INR';

  if (currency !== 'INR') {
    return NextResponse.json({ error: 'Only INR supported via Razorpay' }, { status: 400 });
  }

  const price = PRICES.INR;
  const amountPaise = Math.round(price.amount * 100);

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `${session.userId}-${BOOK_ID}-${Date.now()}`,
    notes: {
      userId: session.userId,
      bookId: BOOK_ID,
      userEmail: session.email,
    },
  });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
