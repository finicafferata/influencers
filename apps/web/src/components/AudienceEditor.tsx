'use client';

import { useState } from 'react';
import { AGE_BANDS, GENDERS, GENDER_LABELS } from '@repo/trpc/constants';
import { trpc } from '@/lib/trpc/client';
import { Badge, Button, Input, Select } from '@/components/ui';
import { COUNTRIES } from '@/lib/format';

type Account = {
  id: string;
  audienceTopCountry?: string | null;
  audienceCountries?: unknown;
  audienceAges?: unknown;
  audienceGender?: unknown;
  audienceVerified?: boolean;
};

type CountryRow = { code: string; pct: string };

export function AudienceEditor({ account }: { account: Account }) {
  const utils = trpc.useUtils();
  const save = trpc.creator.setAudience.useMutation();
  const [open, setOpen] = useState(false);

  const initialCountries =
    (account.audienceCountries as { code: string; pct: number }[] | null)?.map((c) => ({ code: c.code, pct: String(c.pct) })) ?? [];
  const initAges = (account.audienceAges as Record<string, number> | null) ?? {};
  const initGender = (account.audienceGender as Record<string, number> | null) ?? {};

  const [countries, setCountries] = useState<CountryRow[]>(
    initialCountries.length ? initialCountries : [{ code: '', pct: '' }],
  );
  const [ages, setAges] = useState<Record<string, string>>(
    Object.fromEntries(AGE_BANDS.map((b) => [b, initAges[b] != null ? String(initAges[b]) : ''])),
  );
  const [gender, setGender] = useState<Record<string, string>>(
    Object.fromEntries(GENDERS.map((g) => [g, initGender[g] != null ? String(initGender[g]) : ''])),
  );
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setMsg(null);
    const topCountries = countries
      .filter((c) => c.code && c.pct)
      .slice(0, 3)
      .map((c) => ({ code: c.code, pct: Number(c.pct) }));
    const agesObj = Object.fromEntries(Object.entries(ages).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]));
    const genderObj = Object.fromEntries(Object.entries(gender).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]));
    await save.mutateAsync({
      socialAccountId: account.id,
      topCountries,
      ages: Object.keys(agesObj).length ? agesObj : undefined,
      gender: Object.keys(genderObj).length ? (genderObj as { female?: number; male?: number; other?: number }) : undefined,
    });
    setMsg('Audiencia guardada');
    utils.creator.getMine.invalidate();
  }

  return (
    <div className="mt-2 rounded-lg bg-gray-50 p-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-sm text-gray-600">
        <span>
          Audiencia {account.audienceVerified ? <Badge color="green">verificada</Badge> : account.audienceTopCountry ? <Badge color="gray">declarada</Badge> : <span className="text-faint">sin datos</span>}
        </span>
        <span>{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Top países de la audiencia</p>
            {countries.map((c, i) => (
              <div key={i} className="mb-1 flex gap-2">
                <Select value={c.code} onChange={(e) => setCountries((cur) => cur.map((x, j) => (j === i ? { ...x, code: e.target.value } : x)))}>
                  <option value="">País</option>
                  {COUNTRIES.map((co) => <option key={co.code} value={co.code}>{co.label}</option>)}
                </Select>
                <Input type="number" placeholder="%" value={c.pct} onChange={(e) => setCountries((cur) => cur.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} />
              </div>
            ))}
            {countries.length < 3 && (
              <button onClick={() => setCountries((c) => [...c, { code: '', pct: '' }])} className="text-xs text-gray-500 hover:text-gray-800">+ país</button>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Edad (%)</p>
            <div className="grid grid-cols-5 gap-1">
              {AGE_BANDS.map((b) => (
                <Input key={b} type="number" placeholder={b} value={ages[b]} onChange={(e) => setAges((a) => ({ ...a, [b]: e.target.value }))} />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Género (%)</p>
            <div className="grid grid-cols-3 gap-1">
              {GENDERS.map((g) => (
                <Input key={g} type="number" placeholder={GENDER_LABELS[g]} value={gender[g]} onChange={(e) => setGender((x) => ({ ...x, [g]: e.target.value }))} />
              ))}
            </div>
          </div>

          {msg && <p className="text-xs text-green-600">{msg}</p>}
          <Button size="sm" onClick={submit} disabled={save.isPending}>{save.isPending ? 'Guardando…' : 'Guardar audiencia'}</Button>
        </div>
      )}
    </div>
  );
}
