import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { addPurchase } from '@/lib/db';
import { BOOK_ID } from '@/lib/config';

export async function POST(req: NextRequest) {
  const session = await getUserFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
  }

  const valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
  }

  await addPurchase(session.userId, BOOK_ID);
  return NextResponse.json({ ok: true });
}
