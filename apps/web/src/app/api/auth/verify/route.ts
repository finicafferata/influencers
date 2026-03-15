import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ message: 'Token is required' }, { status: 400 });
  }

  const res = await fetch(
    `${apiUrl}/auth/verify?token=${encodeURIComponent(token)}`,
  );

  const data = (await res.json()) as unknown;
  return NextResponse.json(data, { status: res.status });
}
