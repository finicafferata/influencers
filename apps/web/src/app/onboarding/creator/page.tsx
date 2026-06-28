'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NICHES, PLATFORMS, CONTENT_TYPES, nicheLabel } from '@repo/trpc/constants';
import { trpc } from '@/lib/trpc/client';
import { Button, Field, Input, Textarea, Select, Chip, Stepper, Spinner, Card } from '@/components/ui';
import { COUNTRIES } from '@/lib/format';
import { es } from '@/lib/i18n';

const STEPS = [es.creator.stepBasics, es.creator.stepSocial, es.creator.stepNiches, es.creator.stepDetails];
const RATE_KEYS: { key: string; label: string }[] = [
  { key: 'instagram_post', label: 'Post Instagram' },
  { key: 'tiktok_video', label: 'Video TikTok' },
  { key: 'ugc', label: 'UGC' },
];
const CONTENT_LABELS: Record<string, string> = { ugc: 'UGC', influencer: 'Influencer', both: 'Ambos' };

export default function CreatorOnboardingPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('AR');
  const [city, setCity] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [contentType, setContentType] = useState<string>('both');
  const [niches, setNiches] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [rates, setRates] = useState<Record<string, string>>({});
  const [socials, setSocials] = useState<
    { platform: string; handle: string; followers: string; engagementRate: string }[]
  >([{ platform: 'instagram', handle: '', followers: '', engagementRate: '' }]);
  const [profileCreated, setProfileCreated] = useState(false);

  const upsert = trpc.creator.upsertProfile.useMutation();
  const addSocial = trpc.creator.addSocialAccount.useMutation();
  const publish = trpc.creator.publish.useMutation();

  function toggleNiche(slug: string) {
    setNiches((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : cur.length < 10 ? [...cur, slug] : cur));
  }

  function buildRates() {
    const out: Record<string, { from: number; currency: string }> = {};
    for (const [k, v] of Object.entries(rates)) {
      const n = Number(v);
      if (v && !Number.isNaN(n)) out[k] = { from: n, currency: 'USD' };
    }
    return out;
  }

  async function saveProfile() {
    await upsert.mutateAsync({
      username,
      country,
      city: city || undefined,
      headline: headline || undefined,
      bio: bio || undefined,
      contentType: contentType as 'ugc' | 'influencer' | 'both',
      niches,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      rates: buildRates(),
    });
    setProfileCreated(true);
  }

  async function next() {
    setError(null);
    try {
      if (step === 0) {
        await saveProfile(); // creates the profile so social accounts can attach
        setStep(1);
      } else if (step === 1) {
        // persist any filled social accounts
        for (const s of socials) {
          if (s.handle && s.followers) {
            await addSocial.mutateAsync({
              platform: s.platform,
              handle: s.handle,
              followers: Number(s.followers),
              engagementRate: s.engagementRate ? Number(s.engagementRate) : undefined,
            });
          }
        }
        setStep(2);
      } else if (step === 2) {
        await saveProfile();
        setStep(3);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : es.common.error);
    }
  }

  async function finish() {
    setError(null);
    try {
      await saveProfile();
      await publish.mutateAsync();
      await utils.me.bootstrap.invalidate();
      router.replace(`/c/${username}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : es.common.error);
    }
  }

  const busy = upsert.isPending || addSocial.isPending || publish.isPending;

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{es.creator.onboarding}</h1>
      <Stepper steps={STEPS} current={step} />

      <Card>
        {step === 0 && (
          <>
            <Field label={es.creator.username} hint={es.creator.usernameHint}>
              <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="mariag" />
            </Field>
            <Field label={es.creator.country}>
              <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </Select>
            </Field>
            <Field label={es.creator.city} hint={es.common.optional}>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label={es.creator.headline} hint={es.common.optional}>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={80} />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            {socials.map((s, i) => (
              <div key={i} className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-gray-100 p-3">
                <Select
                  value={s.platform}
                  onChange={(e) => setSocials((cur) => cur.map((x, j) => (j === i ? { ...x, platform: e.target.value } : x)))}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
                <Input
                  placeholder="@handle"
                  value={s.handle}
                  onChange={(e) => setSocials((cur) => cur.map((x, j) => (j === i ? { ...x, handle: e.target.value } : x)))}
                />
                <Input
                  type="number"
                  placeholder="Seguidores"
                  value={s.followers}
                  onChange={(e) => setSocials((cur) => cur.map((x, j) => (j === i ? { ...x, followers: e.target.value } : x)))}
                />
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Engagement %"
                  value={s.engagementRate}
                  onChange={(e) => setSocials((cur) => cur.map((x, j) => (j === i ? { ...x, engagementRate: e.target.value } : x)))}
                />
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSocials((cur) => [...cur, { platform: 'tiktok', handle: '', followers: '', engagementRate: '' }])}
            >
              + {es.creator.addSocial}
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <Field label={es.creator.contentType}>
              <Select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                {CONTENT_TYPES.map((c) => (
                  <option key={c} value={c}>{CONTENT_LABELS[c]}</option>
                ))}
              </Select>
            </Field>
            <Field label={es.creator.niches}>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((n) => (
                  <Chip key={n.slug} active={niches.includes(n.slug)} onClick={() => toggleNiche(n.slug)}>
                    {n.labelEs}
                  </Chip>
                ))}
              </div>
            </Field>
            <Field label={es.creator.tags} hint="separadas por coma">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="skincare, rutina" />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <Field label={es.creator.bio} hint={es.common.optional}>
              <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} />
            </Field>
            <Field label={es.creator.rates} hint="USD, " >
              <div className="space-y-2">
                {RATE_KEYS.map((r) => (
                  <div key={r.key} className="flex items-center gap-2">
                    <span className="w-32 text-sm text-gray-600">{r.label}</span>
                    <Input
                      type="number"
                      placeholder="desde"
                      value={rates[r.key] ?? ''}
                      onChange={(e) => setRates((cur) => ({ ...cur, [r.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </Field>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
            {es.common.back}
          </Button>
          {step < 3 ? (
            <Button onClick={next} disabled={busy || (step === 0 && username.length < 3)}>
              {busy ? <Spinner className="h-4 w-4" /> : es.common.next}
            </Button>
          ) : (
            <Button variant="accent" onClick={finish} disabled={busy}>
              {busy ? <Spinner className="h-4 w-4" /> : es.creator.publish}
            </Button>
          )}
        </div>
      </Card>
      {profileCreated && step > 0 && (
        <p className="mt-3 text-center text-xs text-gray-400">Borrador guardado automáticamente</p>
      )}
    </main>
  );
}
