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

  const data = (await res.json()) as { token?: string };

  if (!res.ok || !data.token) {
    return NextResponse.json(
      { message: 'Invalid or expired token' },
      { status: res.status || 401 },
    );
  }

  // Routing after verify is decided by me.bootstrap on the client (no isNewUser).
  const response = NextResponse.json({ ok: true });
  response.cookies.set('session', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  return response;
}
