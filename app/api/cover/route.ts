import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cover page is publicly accessible (marketing/landing page use)
export const maxDuration = 10;

const COVER_PATH = path.join(process.cwd(), 'private', 'cover.pdf');

export async function GET() {
  if (!fs.existsSync(COVER_PATH)) {
    return NextResponse.json({ error: 'Cover not found' }, { status: 404 });
  }
  const buf = fs.readFileSync(COVER_PATH);
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Disposition': 'inline',
    },
  });
}
