import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { hasPurchased } from '@/lib/db';
import fs from 'fs';
import path from 'path';

const BOOK_PATH = path.join(process.cwd(), 'private', 'book.pdf');
const PREVIEW_PAGES = 5;

export async function GET(req: NextRequest) {
  const session = await getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const purchased = hasPurchased(session.userId, 'koltey-golai');
  const isPreview = !purchased;

  if (!fs.existsSync(BOOK_PATH)) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(BOOK_PATH);

  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Preview-Only': isPreview ? String(PREVIEW_PAGES) : 'false',
    'Content-Disposition': 'inline',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
  });

  return new NextResponse(fileBuffer, { headers });
}
