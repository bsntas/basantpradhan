import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { hasPurchased } from '@/lib/db';
import { isVipEmail, BOOK_ID } from '@/lib/config';
import fs from 'fs';
import path from 'path';

// Give the function enough time to read and stream the PDF
export const maxDuration = 30;

const BOOK_PATH = path.join(process.cwd(), 'private', 'book.pdf');

export async function GET(req: NextRequest) {
  const session = await getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const purchased = isVipEmail(session.email) || await hasPurchased(session.userId, BOOK_ID);

  if (!fs.existsSync(BOOK_PATH)) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(BOOK_PATH);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'private, max-age=1800, immutable',
      'X-Preview-Only': purchased ? 'false' : '10',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}
