'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button, Card, Field, Input, Select, Spinner } from '@/components/ui';
import { COUNTRIES } from '@/lib/format';
import { es } from '@/lib/i18n';

const DISPLAY_TYPES: { value: 'brand' | 'marketing_agency'; label: string }[] = [
  { value: 'brand', label: es.org.brand },
  { value: 'marketing_agency', label: es.org.marketing_agency },
];

export default function OrgOnboardingPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [name, setName] = useState('');
  const [displayType, setDisplayType] = useState<'brand' | 'marketing_agency'>('brand');
  const [country, setCountry] = useState('AR');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = trpc.org.create.useMutation();

  async function submit() {
    setError(null);
    try {
      await create.mutateAsync({
        name,
        displayType,
        country,
        website: website || undefined,
      });
      await utils.me.bootstrap.invalidate();
      router.replace('/search');
    } catch (e) {
      setError(e instanceof Error ? e.message : es.common.error);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{es.org.onboarding}</h1>
      <Card>
        <Field label={es.org.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi Marca SA" />
        </Field>
        <Field label={es.org.displayType}>
          <Select value={displayType} onChange={(e) => setDisplayType(e.target.value as 'brand' | 'marketing_agency')}>
            {DISPLAY_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-gray-500">Podrás buscar y contactar creadores.</p>
        </Field>
        <Field label={es.creator.country}>
          <Select value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </Select>
        </Field>
        <Field label={es.org.website} hint={es.common.optional}>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
        </Field>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end">
          <Button onClick={submit} disabled={create.isPending || name.trim().length < 2}>
            {create.isPending ? <Spinner className="h-4 w-4" /> : es.common.continue}
          </Button>
        </div>
      </Card>
    </main>
  );
}
