'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NICHES, PLATFORMS, CONTENT_TYPES, PORTFOLIO_TYPES } from '@repo/trpc/constants';
import { trpc } from '@/lib/trpc/client';
import { AppHeader } from '@/components/AppHeader';
import { ShareKit } from '@/components/ShareKit';
import { AudienceEditor } from '@/components/AudienceEditor';
import { Button, Card, Field, Input, Textarea, Select, Chip, Spinner, Badge } from '@/components/ui';
import { COUNTRIES } from '@/lib/format';
import { es } from '@/lib/i18n';

const CONTENT_LABELS: Record<string, string> = { ugc: 'UGC', influencer: 'Influencer', both: 'Ambos' };

export default function ProfileEditorPage() {
  const utils = trpc.useUtils();
  const me = trpc.creator.getMine.useQuery(undefined, { retry: false });
  const upsert = trpc.creator.upsertProfile.useMutation();
  const publish = trpc.creator.publish.useMutation();
  const unpublish = trpc.creator.unpublish.useMutation();
  const addSocial = trpc.creator.addSocialAccount.useMutation();
  const removeSocial = trpc.creator.removeSocialAccount.useMutation();
  const addPortfolio = trpc.creator.addPortfolioItem.useMutation();
  const removePortfolio = trpc.creator.removePortfolioItem.useMutation();

  const [headline, setHeadline] = useState('');
  const [pitch, setPitch] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('AR');
  const [bio, setBio] = useState('');
  const [contentType, setContentType] = useState('both');
  const [niches, setNiches] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [ratesPublic, setRatesPublic] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newSocial, setNewSocial] = useState({ platform: 'instagram', handle: '', followers: '', engagementRate: '' });
  const [newWork, setNewWork] = useState({ type: 'image', url: '', title: '' });

  useEffect(() => {
    if (me.data) {
      setHeadline(me.data.headline ?? '');
      setPitch(me.data.pitch ?? '');
      setCity(me.data.city ?? '');
      setCountry(me.data.country ?? 'AR');
      setBio(me.data.bio ?? '');
      setContentType(me.data.contentType ?? 'both');
      setNiches(me.data.niches ?? []);
      setTags((me.data.tags ?? []).join(', '));
      setRatesPublic(me.data.ratesPublic ?? true);
    }
  }, [me.data]);

  if (me.isLoading) {
    return (
      <>
        <AppHeader />
        <main className="flex min-h-[60vh] items-center justify-center"><Spinner /></main>
      </>
    );
  }

  const profile = me.data;
  if (!profile) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto max-w-lg px-4 py-10 text-center">
          <p className="mb-4 text-gray-600">Todavía no tenés un perfil de creador.</p>
          <Link href="/onboarding/creator"><Button>Crear perfil</Button></Link>
        </main>
      </>
    );
  }

  function toggleNiche(slug: string) {
    setNiches((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }

  async function save() {
    setError(null); setMsg(null);
    try {
      await upsert.mutateAsync({
        username: profile!.username,
        headline: headline || undefined,
        pitch: pitch || undefined,
        city: city || undefined,
        country,
        bio: bio || undefined,
        contentType: contentType as 'ugc' | 'influencer' | 'both',
        niches,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        ratesPublic,
      });
      setMsg('Cambios guardados');
      utils.creator.getMine.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.common.error);
    }
  }

  async function addWork() {
    if (!newWork.url) return;
    setError(null);
    try {
      await addPortfolio.mutateAsync({
        url: newWork.url,
        type: newWork.type as 'image' | 'video' | 'link',
        title: newWork.title || undefined,
      });
      setNewWork({ type: 'image', url: '', title: '' });
      utils.creator.getMine.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.common.error);
    }
  }

  async function removeWork(id: string) {
    await removePortfolio.mutateAsync({ id });
    utils.creator.getMine.invalidate();
  }

  async function togglePublish() {
    setError(null);
    try {
      if (profile!.published) await unpublish.mutateAsync();
      else await publish.mutateAsync();
      utils.creator.getMine.invalidate();
      utils.me.bootstrap.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.common.error);
    }
  }

  async function addAccount() {
    if (!newSocial.handle || !newSocial.followers) return;
    setError(null);
    try {
      await addSocial.mutateAsync({
        platform: newSocial.platform,
        handle: newSocial.handle,
        followers: Number(newSocial.followers),
        engagementRate: newSocial.engagementRate ? Number(newSocial.engagementRate) : undefined,
      });
      setNewSocial({ platform: 'instagram', handle: '', followers: '', engagementRate: '' });
      utils.creator.getMine.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : es.common.error);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">@{profile.username}</h1>
          <div className="flex items-center gap-2">
            {profile.published ? <Badge color="green">{es.creator.published}</Badge> : <Badge>Borrador</Badge>}
            <Link href={`/c/${profile.username}`} className="text-sm text-gray-600 hover:underline">
              {es.creator.viewPublic}
            </Link>
          </div>
        </div>

        <p className="mb-3 text-sm text-gray-500">Tu media kit fue visto {profile.viewCount ?? 0} veces</p>

        <div className="mb-4">
          <ShareKit username={profile.username} variant="card" />
        </div>

        <Card className="mb-4">
          <Field label={es.creator.headline}><Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={80} /></Field>
          <Field label="Pitch" hint="frase de presentación"><Textarea rows={2} value={pitch} onChange={(e) => setPitch(e.target.value)} maxLength={280} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={es.creator.country}>
              <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label={es.creator.city}><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
          </div>
          <Field label={es.creator.contentType}>
            <Select value={contentType} onChange={(e) => setContentType(e.target.value)}>
              {CONTENT_TYPES.map((c) => <option key={c} value={c}>{CONTENT_LABELS[c]}</option>)}
            </Select>
          </Field>
          <Field label={es.creator.niches}>
            <div className="flex flex-wrap gap-2">
              {NICHES.map((n) => <Chip key={n.slug} active={niches.includes(n.slug)} onClick={() => toggleNiche(n.slug)}>{n.labelEs}</Chip>)}
            </div>
          </Field>
          <Field label={es.creator.tags} hint="separadas por coma"><Input value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
          <Field label={es.creator.bio}><Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} /></Field>
          <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={ratesPublic} onChange={(e) => setRatesPublic(e.target.checked)} />
            Mostrar tarifas en el perfil público (si no, se muestra &quot;a consultar&quot;)
          </label>
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {msg && <p className="mb-2 text-sm text-green-600">{msg}</p>}
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={togglePublish} disabled={publish.isPending || unpublish.isPending}>
              {profile.published ? es.creator.unpublish : es.creator.publish}
            </Button>
            <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? es.common.saving : es.common.save}</Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-bold text-gray-900">{es.creator.stepSocial}</h2>
          <div className="space-y-2">
            {profile.socialAccounts.map((s) => (
              <div key={s.platform} className="rounded-lg border border-gray-100 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.platform}</span>
                  <span className="text-gray-600">@{s.handle} · {s.followers.toLocaleString('es')} {s.verified && <Badge color="green">{es.creator.verified}</Badge>}</span>
                  <button onClick={async () => { await removeSocial.mutateAsync({ id: (s as { id: string }).id }); utils.creator.getMine.invalidate(); }} className="text-gray-400 hover:text-red-600">✕</button>
                </div>
                <AudienceEditor account={s as Parameters<typeof AudienceEditor>[0]['account']} />
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Select value={newSocial.platform} onChange={(e) => setNewSocial({ ...newSocial, platform: e.target.value })}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Input placeholder="@handle" value={newSocial.handle} onChange={(e) => setNewSocial({ ...newSocial, handle: e.target.value })} />
            <Input type="number" placeholder="Seguidores" value={newSocial.followers} onChange={(e) => setNewSocial({ ...newSocial, followers: e.target.value })} />
            <Input type="number" step="0.1" placeholder="Engagement %" value={newSocial.engagementRate} onChange={(e) => setNewSocial({ ...newSocial, engagementRate: e.target.value })} />
          </div>
          <Button variant="secondary" size="sm" className="mt-2" onClick={addAccount} disabled={addSocial.isPending}>+ {es.creator.addSocial}</Button>
        </Card>

        <Card className="mt-4">
          <h2 className="mb-3 font-bold text-gray-900">Trabajos</h2>
          <div className="space-y-2">
            {(profile.portfolio ?? []).map((p) => (
              <div key={(p as { id: string }).id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm">
                <span className="truncate text-gray-700">{(p as { title: string | null }).title ?? p.url}</span>
                <button onClick={() => removeWork((p as { id: string }).id)} className="ml-2 shrink-0 text-gray-400 hover:text-red-600">✕</button>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Select value={newWork.type} onChange={(e) => setNewWork({ ...newWork, type: e.target.value })}>
              {PORTFOLIO_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Input placeholder="URL" value={newWork.url} onChange={(e) => setNewWork({ ...newWork, url: e.target.value })} />
            <Input placeholder="Título (opcional)" value={newWork.title} onChange={(e) => setNewWork({ ...newWork, title: e.target.value })} />
          </div>
          <Button variant="secondary" size="sm" className="mt-2" onClick={addWork} disabled={addPortfolio.isPending}>+ Agregar trabajo</Button>
        </Card>
      </main>
    </>
  );
}
