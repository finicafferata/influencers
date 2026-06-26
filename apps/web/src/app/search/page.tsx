'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { nicheLabel } from '@repo/trpc/constants';
import type { CardPayload } from '@repo/trpc';
import { trpc } from '@/lib/trpc/client';
import { useBootstrap } from '@/lib/useBootstrap';
import { AppHeader } from '@/components/AppHeader';
import { ContactButton } from '@/components/ContactButton';
import { CreatorCard } from '@/components/CreatorCard';
import { CreatorFilters } from '@/components/CreatorFilters';
import { Avatar, Badge, Button, Card, Drawer, EmptyState, Input, Select, Spinner } from '@/components/ui';
import { formatFollowers, formatEngagement, countryLabel } from '@/lib/format';
import { es } from '@/lib/i18n';

// Canonical card shape from the search router — avoids drift with CreatorCard.
type CardItem = CardPayload;

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: me, isError: meError } = useBootstrap();

  // Guard: only orgs with search capability belong here.
  useEffect(() => {
    if (meError) router.replace('/login');
    else if (me && !me.orgs.some((o) => o.capabilities.includes('can_search_creators'))) {
      router.replace('/dashboard');
    }
  }, [me, meError, router]);

  const [niches, setNiches] = useState<string[]>(params.get('niches')?.split(',').filter(Boolean) ?? []);
  const [country, setCountry] = useState(params.get('country') ?? '');
  const [platform, setPlatform] = useState(params.get('platform') ?? '');
  const [followersMin, setFollowersMin] = useState(params.get('followersMin') ?? '');
  const [engagementMin, setEngagementMin] = useState(params.get('engagementMin') ?? '');
  const [audienceCountry, setAudienceCountry] = useState(params.get('audienceCountry') ?? '');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [sort, setSort] = useState<'followers' | 'engagement' | 'recent'>(
    (params.get('sort') as 'followers' | 'engagement' | 'recent') ?? 'followers',
  );
  const [selected, setSelected] = useState<CardItem | null>(null);

  const input = useMemo(
    () => ({
      niches: niches.length ? niches : undefined,
      country: country || undefined,
      platform: platform || undefined,
      followersMin: followersMin ? Number(followersMin) : undefined,
      engagementMin: engagementMin ? Number(engagementMin) : undefined,
      audienceCountry: audienceCountry || undefined,
      q: q || undefined,
      sort,
      limit: 20,
    }),
    [niches, country, platform, followersMin, engagementMin, audienceCountry, q, sort],
  );

  function syncUrl() {
    const sp = new URLSearchParams();
    if (niches.length) sp.set('niches', niches.join(','));
    if (country) sp.set('country', country);
    if (platform) sp.set('platform', platform);
    if (followersMin) sp.set('followersMin', followersMin);
    if (engagementMin) sp.set('engagementMin', engagementMin);
    if (audienceCountry) sp.set('audienceCountry', audienceCountry);
    if (q) sp.set('q', q);
    if (sort !== 'followers') sp.set('sort', sort);
    router.replace(`/search?${sp.toString()}`);
  }

  const query = trpc.search.creators.useInfiniteQuery(input, {
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialCursor: undefined,
    retry: false,
  });
  const sent = trpc.contact.listSentByOrg.useQuery(undefined, { retry: false });
  const contactedIds = new Set((sent.data ?? []).map((c) => c.toCreatorId));

  const items = (query.data?.pages.flatMap((p) => p.items) ?? []) as CardItem[];
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Filters */}
          <aside className="space-y-4">
            <Card>
              <h2 className="mb-2 font-bold text-gray-900">{es.search.filters}</h2>
              <Input placeholder={es.common.search} value={q} onChange={(e) => setQ(e.target.value)} onBlur={syncUrl} />
              <div className="mt-3">
                <CreatorFilters
                  value={{ niches, country, platform, followersMin, engagementMin, audienceCountry }}
                  onChange={(f) => {
                    setNiches(f.niches);
                    setCountry(f.country);
                    setPlatform(f.platform);
                    setFollowersMin(f.followersMin);
                    setEngagementMin(f.engagementMin);
                    setAudienceCountry(f.audienceCountry);
                  }}
                />
              </div>
              <Button className="mt-3 w-full" onClick={syncUrl}>{es.common.search}</Button>
            </Card>
          </aside>

          {/* Results */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">{es.search.results(total)}</p>
              <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-auto">
                <option value="followers">{es.search.sortFollowers}</option>
                <option value="engagement">{es.search.sortEngagement}</option>
                <option value="recent">{es.search.sortRecent}</option>
              </Select>
            </div>

            {query.isLoading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : query.isError ? (
              <EmptyState title={es.common.error} hint={es.common.retry} />
            ) : items.length === 0 ? (
              <EmptyState title={es.search.empty} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((c) => (
                  <CreatorCard
                    key={c.id}
                    item={c}
                    onClick={() => setSelected(c)}
                    extraBadge={contactedIds.has(c.id) ? <Badge color="green">{es.search.contacted}</Badge> : null}
                  />
                ))}
              </div>
            )}

            {query.hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                  {query.isFetchingNextPage ? <Spinner className="h-4 w-4" /> : es.search.loadMore}
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>

      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div>
            <div className="flex items-center gap-3">
              <Avatar src={selected.avatar} name={selected.name ?? selected.username} size={64} />
              <div>
                <div className="flex items-center gap-1">
                  <h2 className="text-lg font-bold text-gray-900">@{selected.username}</h2>
                  {selected.verified && <Badge color="green">✓ {es.creator.verified}</Badge>}
                </div>
                <p className="text-sm text-gray-500">{[countryLabel(selected.country)].filter(Boolean).join('')}</p>
              </div>
            </div>
            {selected.headline && <p className="mt-3 text-gray-700">{selected.headline}</p>}
            <div className="mt-4 space-y-2">
              {selected.topAccounts.map((a) => (
                <div key={a.platform} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm">
                  <span className="capitalize">{a.platform}</span>
                  <span className="text-gray-600">{formatFollowers(a.followers)} · {formatEngagement(a.engagementRate)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-1">
              {selected.niches.map((n) => <Badge key={n}>{nicheLabel(n)}</Badge>)}
            </div>
            <div className="mt-6 flex items-center gap-3">
              {contactedIds.has(selected.id) ? (
                <Badge color="green">{es.search.contacted}</Badge>
              ) : (
                <ContactButton creatorId={selected.id} />
              )}
              <Link href={`/c/${selected.username}`} className="text-sm text-gray-600 hover:underline">
                {es.creator.viewPublic}
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
      <SearchInner />
    </Suspense>
  );
}
