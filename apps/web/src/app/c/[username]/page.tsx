import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerTrpc } from '@/lib/trpc/server';
import { nicheLabel } from '@repo/trpc/constants';
import { Avatar, Badge, Card, Stat } from '@/components/ui';
import { ContactButton } from '@/components/ContactButton';
import { ShareKit } from '@/components/ShareKit';
import { ViewPing } from '@/components/ViewPing';
import { getEmbed } from '@/lib/embed';
import { formatFollowers, formatEngagement, formatMoney, countryLabel } from '@/lib/format';
import { es } from '@/lib/i18n';
import { features } from '@/lib/flags';

async function fetchProfile(username: string) {
  const trpc = await getServerTrpc();
  try {
    return await trpc.creator.getByUsername.query({ username });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfile(username);
  if (!profile) return { title: 'CreatorLink' };
  const title = `@${profile.username}${profile.headline ? ` — ${profile.headline}` : ''} · CreatorLink`;
  const description =
    profile.pitch ??
    profile.bio ??
    `${profile.niches.map(nicheLabel).join(', ')}`.slice(0, 160);
  // og:image is auto-injected by opengraph-image.tsx in this segment.
  return {
    title,
    description,
    openGraph: { title, description, type: 'profile' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

type PortfolioItem = { id: string; url: string; type: string; title: string | null; thumbnailUrl: string | null };

function Work({ item }: { item: PortfolioItem }) {
  const embed = getEmbed(item.url);
  if (embed.kind === 'image' || item.type === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.url} alt={item.title ?? ''} className="aspect-square w-full rounded-xl object-cover" />;
  }
  if (embed.kind === 'youtube') {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl">
        <iframe src={embed.embedUrl} title={item.title ?? 'video'} className="h-full w-full" allowFullScreen />
      </div>
    );
  }
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-gray-200 p-4 hover:border-gray-900">
      {item.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbnailUrl} alt="" className="mb-2 aspect-video w-full rounded-lg object-cover" />
      )}
      <span className="text-sm font-medium text-gray-900">{item.title ?? item.url}</span>
      <span className="mt-1 block truncate text-xs text-gray-400">{item.url}</span>
    </a>
  );
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await fetchProfile(username);
  if (!profile) notFound();

  const rates = (profile.rates ?? {}) as Record<string, { from: number; currency?: string }>;
  const rateEntries = Object.entries(rates);
  const portfolio = (profile.portfolio ?? []) as PortfolioItem[];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <ViewPing username={profile.username} />

      <Card>
        <div className="flex items-start gap-4">
          <Avatar src={profile.user?.avatar} name={profile.user?.name ?? profile.username} size={72} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">@{profile.username}</h1>
              {profile.socialAccounts.some((a) => a.verified) && <Badge color="green">✓ {es.creator.verified}</Badge>}
            </div>
            {profile.headline && <p className="text-gray-700">{profile.headline}</p>}
            <p className="text-sm text-gray-500">
              {[profile.city, countryLabel(profile.country)].filter(Boolean).join(', ')}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <ContactButton creatorId={profile.id} />
            <ShareKit username={profile.username} />
          </div>
        </div>

        {profile.pitch && <p className="mt-4 text-gray-700">{profile.pitch}</p>}

        {profile.niches.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.niches.map((n) => (
              <Badge key={n}>{nicheLabel(n)}</Badge>
            ))}
          </div>
        )}
      </Card>

      {portfolio.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-3 font-bold text-gray-900">Trabajos</h2>
          <div className="grid grid-cols-2 gap-3">
            {portfolio.map((item) => (
              <Work key={item.id} item={item} />
            ))}
          </div>
        </Card>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold text-gray-900">Redes</h2>
          <div className="space-y-3">
            {profile.socialAccounts.map((a) => (
              <div key={a.platform} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize text-gray-700">
                  {a.platform} {a.verified && <span className="text-blue-600">✓</span>}
                </span>
                <div className="flex gap-4">
                  <Stat label="seguidores" value={formatFollowers(a.followers)} />
                  <Stat label="engagement" value={formatEngagement(a.engagementRate)} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-bold text-gray-900">{es.creator.rates}</h2>
          {!profile.ratesPublic ? (
            <p className="text-sm text-gray-500">Tarifas a consultar</p>
          ) : rateEntries.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {rateEntries.map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-gray-600">{k.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-gray-900">desde {formatMoney(v.from, v.currency ?? 'USD')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Tarifas a consultar</p>
          )}
        </Card>
      </div>

      {features.audienceData && profile.socialAccounts.some((a) => a.audienceTopCountry) && (
        <Card className="mt-4">
          <h2 className="mb-3 font-bold text-gray-900">Audiencia</h2>
          <div className="space-y-4">
            {profile.socialAccounts
              .filter((a) => a.audienceTopCountry)
              .map((a) => {
                const acc = a as typeof a & {
                  audienceCountries?: { code: string; pct: number }[] | null;
                  audienceGender?: Record<string, number> | null;
                  audienceAges?: Record<string, number> | null;
                  audienceVerified?: boolean;
                };
                const countries = acc.audienceCountries ?? [];
                const gender = acc.audienceGender ?? {};
                return (
                  <div key={a.platform} className="border-t border-gray-100 pt-3 first:border-0 first:pt-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium capitalize text-gray-700">{a.platform}</span>
                      {acc.audienceVerified ? (
                        <Badge color="green">✓ Audiencia verificada</Badge>
                      ) : (
                        <Badge>declarada por el creador</Badge>
                      )}
                    </div>
                    {countries.length > 0 && (
                      <p className="text-sm text-gray-600">
                        Países: {countries.map((c) => `${countryLabel(c.code)} ${c.pct}%`).join(' · ')}
                      </p>
                    )}
                    {Object.keys(gender).length > 0 && (
                      <p className="text-sm text-gray-600">
                        Género: {Object.entries(gender).map(([g, p]) => `${g === 'female' ? 'Mujeres' : g === 'male' ? 'Hombres' : 'Otro'} ${p}%`).join(' · ')}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {profile.collaborations.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-3 font-bold text-gray-900">Colaboraciones</h2>
          <div className="flex flex-wrap items-center gap-3">
            {profile.collaborations.map((c) =>
              c.brandLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={c.id} src={c.brandLogo} alt={c.brandName} className="h-8 rounded object-contain" title={c.brandName} />
              ) : (
                <Badge key={c.id}>{c.brandName}</Badge>
              ),
            )}
          </div>
        </Card>
      )}
    </main>
  );
}
