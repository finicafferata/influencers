import { NextRequest, NextResponse } from 'next/server';

// First-party tRPC proxy (REVIEW-01 C1). The browser calls this same-origin
// route, so the httpOnly `session` cookie is sent automatically; we forward it
// to the API server-side. Keeps the cookie SameSite=Lax/first-party — no CORS,
// no third-party-cookie exposure on Vercel(web)+Railway(api).
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

async function proxy(req: NextRequest, path: string) {
  const search = req.nextUrl.search ?? '';
  const target = `${API_URL}/trpc/${path}${search}`;

  const headers = new Headers();
  const cookie = req.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const body =
    req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text();

  const res = await fetch(target, { method: req.method, headers, body });
  const responseBody = await res.text();
  return new NextResponse(responseBody, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ trpc: string }> }) {
  const { trpc } = await params;
  return proxy(req, trpc);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ trpc: string }> }) {
  const { trpc } = await params;
  return proxy(req, trpc);
}
