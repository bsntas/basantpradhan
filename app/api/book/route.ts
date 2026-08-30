import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { hasPurchased } from '@/lib/db';
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

  const purchased = await hasPurchased(session.userId, 'koltey-golai');

  if (!fs.existsSync(BOOK_PATH)) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(BOOK_PATH);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Preview-Only': purchased ? 'false' : '5',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}
