import { NextRequest, NextResponse } from 'next/server';

// First-party landing for the Google OAuth flow. The API redirects here with
// the signed JWT; we set the session cookie on the WEB origin (so the tRPC
// proxy can forward it) and send the user to the dashboard, which routes by
// role via me.bootstrap.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const webBase = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${webBase}/login?error=oauth`);
  }

  const res = NextResponse.redirect(`${webBase}/dashboard`);
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
