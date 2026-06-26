'use client';

import { NICHES, PLATFORMS } from '@repo/trpc/constants';
import { Chip, Input, Select } from '@/components/ui';
import { COUNTRIES } from '@/lib/format';
import { es } from '@/lib/i18n';

export interface CreatorFilterState {
  niches: string[];
  country: string;
  platform: string;
  followersMin: string;
  engagementMin: string;
  audienceCountry: string;
}

export function CreatorFilters({
  value,
  onChange,
}: {
  value: CreatorFilterState;
  onChange: (next: CreatorFilterState) => void;
}) {
  function toggleNiche(slug: string) {
    onChange({
      ...value,
      niches: value.niches.includes(slug)
        ? value.niches.filter((s) => s !== slug)
        : [...value.niches, slug],
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-sm font-medium text-gray-700">{es.search.niche}</p>
        <div className="flex flex-wrap gap-1.5">
          {NICHES.map((n) => (
            <Chip key={n.slug} active={value.niches.includes(n.slug)} onClick={() => toggleNiche(n.slug)}>
              {n.labelEs}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-gray-700">{es.creator.country} (creador)</p>
        <Select value={value.country} onChange={(e) => onChange({ ...value, country: e.target.value })}>
          <option value="">Todos</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </Select>
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-gray-700">Audiencia en…</p>
        <Select value={value.audienceCountry} onChange={(e) => onChange({ ...value, audienceCountry: e.target.value })}>
          <option value="">Cualquiera</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </Select>
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-gray-700">{es.search.platform}</p>
        <Select value={value.platform} onChange={(e) => onChange({ ...value, platform: e.target.value })}>
          <option value="">Todas</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">{es.search.followers} {es.search.min}</p>
          <Input type="number" value={value.followersMin} onChange={(e) => onChange({ ...value, followersMin: e.target.value })} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">{es.search.engagement} {es.search.min}</p>
          <Input type="number" step="0.1" value={value.engagementMin} onChange={(e) => onChange({ ...value, engagementMin: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
