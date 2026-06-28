import { ImageResponse } from 'next/og';
import { nicheLabel } from '@repo/trpc/constants';
import { formatFollowers } from '@/lib/format';

// Node runtime + direct API fetch (NOT getServerTrpc, which is server-only and
// cookie-bound). Cached so crawlers don't hammer the API.
export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

type OgProfile = {
  username: string;
  headline: string | null;
  niches: string[];
  maxFollowers: number;
  user?: { name: string | null; avatar: string | null };
};

async function fetchProfile(username: string): Promise<OgProfile | null> {
  try {
    const input = encodeURIComponent(JSON.stringify({ username }));
    const res = await fetch(`${API_URL}/trpc/creator.getByUsername?input=${input}`, {
      next: { revalidate: 3600 }, // cache 1h for crawlers
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: { data?: OgProfile } };
    return json.result?.data ?? null;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await fetchProfile(username);

  const name = profile?.user?.name ?? `@${username}`;
  const headline = profile?.headline ?? 'Creador en CreatorLink';
  const reach = profile ? formatFollowers(profile.maxFollowers) : '';
  const niches = (profile?.niches ?? []).slice(0, 3).map(nicheLabel);
  const avatar = profile?.user?.avatar ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
          color: 'white',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} width={140} height={140} style={{ borderRadius: 70, objectFit: 'cover' }} alt="" />
          ) : (
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                background: '#374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 64,
                fontWeight: 700,
              }}
            >
              {name.replace('@', '').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 60, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 30, color: '#9ca3af' }}>@{username}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 38 }}>{headline}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {reach && (
              <div style={{ fontSize: 30, background: '#374151', padding: '8px 20px', borderRadius: 999 }}>
                {reach} seguidores
              </div>
            )}
            {niches.map((n) => (
              <div key={n} style={{ fontSize: 30, background: '#374151', padding: '8px 20px', borderRadius: 999 }}>
                {n}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 28, color: '#9ca3af' }}>
          <span>CreatorLink</span>
          <span>Media kit</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
