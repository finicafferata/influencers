'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CardPayload } from '@repo/trpc';
import { trpc } from '@/lib/trpc/client';
import { useBootstrap } from '@/lib/useBootstrap';
import { AppHeader } from '@/components/AppHeader';
import { CreatorCard } from '@/components/CreatorCard';
import { CreatorFilters, type CreatorFilterState } from '@/components/CreatorFilters';
import { ContactButton } from '@/components/ContactButton';
import { Button, Card, Drawer, EmptyState, Spinner, Textarea, Badge } from '@/components/ui';
import { es } from '@/lib/i18n';
import { features } from '@/lib/flags';

type Criteria = {
  niches: string[];
  country?: string;
  platform?: string;
  followersMin?: number;
  followersMax?: number;
  engagementMin?: number;
  contentType?: 'ugc' | 'influencer' | 'both';
  audienceCountry?: string;
  budget?: number;
};

const EMPTY_FS: CreatorFilterState = { niches: [], country: '', platform: '', followersMin: '', engagementMin: '', audienceCountry: '' };

export default function MatchPage() {
  const router = useRouter();
  const { data: me, isError: meError } = useBootstrap();
  useEffect(() => {
    // AI match is flagged off for v1 — the page is unreachable; send to search.
    if (!features.aiMatch) router.replace('/search');
    else if (meError) router.replace('/login');
    else if (me && !me.orgs.some((o) => o.capabilities.includes('can_search_creators'))) router.replace('/dashboard');
  }, [me, meError, router]);

  const [brief, setBrief] = useState('');
  const [fs, setFs] = useState<CreatorFilterState>(EMPTY_FS);
  const [extra, setExtra] = useState<Pick<Criteria, 'followersMax' | 'contentType' | 'budget'>>({});
  const [reviewing, setReviewing] = useState(false);
  const [runCriteria, setRunCriteria] = useState<Criteria | null>(null);
  const [selected, setSelected] = useState<CardPayload | null>(null);

  const parse = trpc.match.parseBrief.useMutation();
  const feedback = trpc.match.feedback.useMutation();
  const run = trpc.match.run.useQuery(
    { criteria: runCriteria ?? { niches: [] }, limit: 10 },
    { enabled: !!runCriteria, retry: false },
  );

  // AI match flagged off for v1 — all hooks above run unconditionally (rules of
  // hooks); the useEffect redirects, this just avoids a flash of the page.
  if (!features.aiMatch) return null;

  function fsToCriteria(): Criteria {
    return {
      niches: fs.niches,
      country: fs.country || undefined,
      platform: fs.platform || undefined,
      followersMin: fs.followersMin ? Number(fs.followersMin) : undefined,
      engagementMin: fs.engagementMin ? Number(fs.engagementMin) : undefined,
      audienceCountry: fs.audienceCountry || undefined,
      ...extra,
    };
  }

  async function doParse() {
    const c = await parse.mutateAsync({ text: brief });
    setFs({
      niches: c.niches ?? [],
      country: c.country ?? '',
      platform: c.platform ?? '',
      followersMin: c.followersMin != null ? String(c.followersMin) : '',
      engagementMin: c.engagementMin != null ? String(c.engagementMin) : '',
      audienceCountry: c.audienceCountry ?? '',
    });
    setExtra({ followersMax: c.followersMax, contentType: c.contentType, budget: c.budget });
    setReviewing(true);
  }

  function MatchFooter({ m }: { m: { creator: CardPayload; score: number; breakdown: Record<string, number>; rationale?: string } }) {
    return (
      <div className="mt-3 border-t border-gray-100 pt-3">
        {m.rationale && <p className="text-sm text-gray-700">{m.rationale}</p>}
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-gray-400">
            Match {Math.round(m.score * 100)}% · ver desglose
          </summary>
          <ul className="mt-1 text-xs text-gray-500">
            {Object.entries(m.breakdown).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><span>{Math.round(v * 100)}%</span></li>
            ))}
          </ul>
        </details>
        <div className="mt-2 flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); feedback.mutate({ creatorId: m.creator.id, vote: 'up', briefText: brief }); }} className="text-sm text-gray-400 hover:text-green-600">👍</button>
          <button onClick={(e) => { e.stopPropagation(); feedback.mutate({ creatorId: m.creator.id, vote: 'down', briefText: brief }); }} className="text-sm text-gray-400 hover:text-red-600">👎</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Buscar con IA</h1>

        {/* Brief input */}
        <Card className="mb-4">
          <p className="mb-2 text-sm text-gray-600">Describí tu campaña y te armamos una lista de creadores.</p>
          <Textarea
            rows={3}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            maxLength={1000}
            placeholder="Ej: micro-influencers de belleza en México, 20-80k seguidores, buen engagement, para skincare"
          />
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={doParse} disabled={parse.isPending || brief.trim().length === 0}>
              {parse.isPending ? <Spinner className="h-4 w-4" /> : 'Analizar brief'}
            </Button>
            <button onClick={() => { setReviewing(true); }} className="text-sm text-gray-500 hover:text-gray-800">
              o usar modo guiado
            </button>
          </div>
        </Card>

        {/* Editable criteria */}
        {reviewing && (
          <Card className="mb-4">
            <h2 className="mb-3 font-bold text-gray-900">Criterios</h2>
            <CreatorFilters value={fs} onChange={setFs} />
            <Button className="mt-4" onClick={() => setRunCriteria(fsToCriteria())}>
              Buscar creadores
            </Button>
          </Card>
        )}

        {/* Results */}
        {runCriteria && (
          run.isLoading ? (
            <div className="flex flex-col items-center py-12">
              <Spinner />
              <p className="mt-3 text-sm text-gray-500">Analizando tu brief…</p>
            </div>
          ) : run.isError ? (
            <EmptyState title={es.common.error} hint={es.common.retry} />
          ) : (run.data && (run.data.exact.length > 0 || run.data.approximate.length > 0)) ? (
            <>
              {run.data.exact.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {run.data.exact.map((m) => (
                    <CreatorCard key={m.creator.id} item={m.creator} onClick={() => setSelected(m.creator)} footer={<MatchFooter m={m} />} />
                  ))}
                </div>
              )}
              {run.data.approximate.length > 0 && (
                <>
                  <h2 className="mb-2 mt-6 font-bold text-gray-900">Resultados aproximados</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {run.data.approximate.map((m) => (
                      <CreatorCard key={m.creator.id} item={m.creator} onClick={() => setSelected(m.creator)} footer={<MatchFooter m={m} />} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <EmptyState title="No encontramos creadores" hint="Probá ampliar los criterios" />
          )
        )}
      </main>

      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">@{selected.username}</h2>
              {selected.verified && <Badge color="green">✓ {es.creator.verified}</Badge>}
            </div>
            {selected.headline && <p className="mt-2 text-gray-700">{selected.headline}</p>}
            <div className="mt-4">
              <ContactButton creatorId={selected.id} />
            </div>
            <a href={`/c/${selected.username}`} className="mt-3 inline-block text-sm text-gray-600 hover:underline">
              {es.creator.viewPublic}
            </a>
          </div>
        )}
      </Drawer>
    </>
  );
}
