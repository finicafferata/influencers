import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerTrpc } from '@/lib/trpc/server';
import { nicheLabel } from '@repo/trpc/constants';
import { Avatar, Badge, Card } from '@/components/ui';
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

/** 2-letter platform mark (IG / TT / YT …) for the platform rows. */
function platformMark(platform: string): string {
  const map: Record<string, string> = { instagram: 'IG', tiktok: 'TT', youtube: 'YT', twitch: 'TW', x: 'X', twitter: 'X' };
  return map[platform.toLowerCase()] ?? platform.slice(0, 2).toUpperCase();
}

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
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-line p-4 hover:border-ink">
      {item.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbnailUrl} alt="" className="mb-2 aspect-video w-full rounded-lg object-cover" />
      )}
      <span className="text-sm font-medium text-ink">{item.title ?? item.url}</span>
      <span className="mt-1 block truncate text-xs text-faint">{item.url}</span>
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
  const accounts = profile.socialAccounts;

  // Metric strip totals (computed — no new backend fields).
  const totalFollowers = accounts.reduce((sum, a) => sum + a.followers, 0);
  const engRates = accounts.map((a) => a.engagementRate).filter((r): r is number => r != null);
  const avgEngagement = engRates.length ? engRates.reduce((s, r) => s + r, 0) / engRates.length : null;
  const verified = accounts.some((a) => a.verified);

  const showAudience = features.audienceData && accounts.some((a) => a.audienceTopCountry);

  const stats = [
    { value: formatFollowers(totalFollowers), label: 'seguidores totales' },
    { value: formatEngagement(avgEngagement), label: 'engagement medio' },
    { value: String(accounts.length), label: accounts.length === 1 ? 'plataforma' : 'plataformas' },
    { value: String(profile.collaborations.length), label: profile.collaborations.length === 1 ? 'colaboración' : 'colaboraciones' },
  ];

  return (
    <main className="mx-auto max-w-[920px] px-4 py-8">
      <ViewPing username={profile.username} />

      {/* ── Profile header card ─────────────────────────── */}
      <div className="mb-5 overflow-hidden rounded-[20px] border border-line bg-surface shadow-card">
        <div className="relative h-[110px] bg-[linear-gradient(120deg,#09090b,#27272a)]">
          <div className="absolute inset-0 bg-[radial-gradient(60%_120%_at_85%_0%,rgba(109,94,252,0.35),transparent_60%)]" />
        </div>
        <div className="px-6 pb-7 sm:px-7">
          {/* Only the avatar overlaps the cover; name/actions stay below it so
              a wrapping name never slides up behind the dark band on mobile. */}
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-[18px]">
              <div className="w-fit flex-none rounded-full border-4 border-surface shadow-pop">
                <Avatar src={profile.user?.avatar} name={profile.user?.name ?? profile.username} size={96} accent />
              </div>
              <div className="min-w-0 sm:pb-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[26px] font-bold tracking-tight text-ink">@{profile.username}</h1>
                  {verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-soft-fg">
                      ✓ {es.creator.verified}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[15px] text-muted">
                  {[profile.user?.name, [profile.city, countryLabel(profile.country)].filter(Boolean).join(', ')]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 sm:pb-1.5">
              <ShareKit username={profile.username} />
              <ContactButton creatorId={profile.id} />
            </div>
          </div>

          {profile.pitch && <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-ink-soft">{profile.pitch}</p>}

          {profile.niches.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.niches.map((n) => (
                <Badge key={n}>{nicheLabel(n)}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Metric strip ─────────────────────────── */}
      <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-card border border-line bg-surface p-[18px]">
            <div className="font-mono text-2xl font-bold tracking-tight text-ink">{s.value}</div>
            <div className="mt-0.5 text-[13px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Platforms + audience ─────────────────────────── */}
      <div className={showAudience ? 'grid gap-5 lg:grid-cols-2' : ''}>
        <Card>
          <h2 className="mb-4 text-base font-bold text-ink">Plataformas</h2>
          <div>
            {accounts.map((a) => (
              <div
                key={a.platform}
                className="flex items-center justify-between border-b border-line-soft py-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-ink text-sm font-bold text-white">
                    {platformMark(a.platform)}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold capitalize text-ink">
                      {a.platform}
                      {a.verified && <span className="text-accent-strong">✓</span>}
                    </div>
                    {a.handle && <div className="text-xs text-muted">@{a.handle}</div>}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-ink">{formatFollowers(a.followers)}</div>
                  <div className="text-xs text-accent-strong">{formatEngagement(a.engagementRate)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {showAudience && (
          <Card>
            <h2 className="mb-4 text-base font-bold text-ink">Audiencia</h2>
            <div className="space-y-4">
              {accounts
                .filter((a) => a.audienceTopCountry)
                .map((a) => {
                  const acc = a as typeof a & {
                    audienceCountries?: { code: string; pct: number }[] | null;
                    audienceGender?: Record<string, number> | null;
                    audienceVerified?: boolean;
                  };
                  const countries = acc.audienceCountries ?? [];
                  const gender = acc.audienceGender ?? {};
                  const genderLabel = (g: string) => (g === 'female' ? 'Mujeres' : g === 'male' ? 'Hombres' : 'Otro');
                  const bars: { label: string; pct: number }[] = [
                    ...countries.map((c) => ({ label: countryLabel(c.code), pct: c.pct })),
                    ...Object.entries(gender).map(([g, p]) => ({ label: genderLabel(g), pct: p })),
                  ];
                  return (
                    <div key={a.platform} className="border-t border-line-soft pt-4 first:border-0 first:pt-0">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-sm font-semibold capitalize text-ink-soft">{a.platform}</span>
                        {acc.audienceVerified ? (
                          <Badge color="green">✓ Audiencia verificada</Badge>
                        ) : (
                          <Badge>declarada por el creador</Badge>
                        )}
                      </div>
                      {bars.map((b) => (
                        <div key={b.label} className="mb-3.5 last:mb-0">
                          <div className="mb-1.5 flex justify-between">
                            <span className="text-[13px] font-medium text-ink-soft">{b.label}</span>
                            <span className="font-mono text-[13px] font-semibold text-ink">{b.pct}%</span>
                          </div>
                          <div className="h-[7px] overflow-hidden rounded-full bg-line-soft">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(b.pct, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>
          </Card>
        )}
      </div>

      {portfolio.length > 0 && (
        <Card className="mt-5">
          <h2 className="mb-3 text-base font-bold text-ink">Trabajos</h2>
          <div className="grid grid-cols-2 gap-3">
            {portfolio.map((item) => (
              <Work key={item.id} item={item} />
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-5">
        <h2 className="mb-3 text-base font-bold text-ink">{es.creator.rates}</h2>
        {!profile.ratesPublic ? (
          <p className="text-sm text-muted">Tarifas a consultar</p>
        ) : rateEntries.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {rateEntries.map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span className="text-muted">{k.replace(/_/g, ' ')}</span>
                <span className="font-semibold text-ink">desde {formatMoney(v.from, v.currency ?? 'USD')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Tarifas a consultar</p>
        )}
      </Card>

      {profile.collaborations.length > 0 && (
        <Card className="mt-5">
          <h2 className="mb-3 text-base font-bold text-ink">Colaboraciones</h2>
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
