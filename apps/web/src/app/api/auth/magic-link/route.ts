import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001';

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const email = typeof (body as Record<string, unknown>)?.email === 'string'
    ? ((body as Record<string, unknown>).email as string).trim()
    : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const res = await fetch(`${apiUrl}/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = (await res.json()) as unknown;
  return NextResponse.json(data, { status: res.status });
}
