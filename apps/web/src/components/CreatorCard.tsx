'use client';

import type { ReactNode } from 'react';
import type { CardPayload } from '@repo/trpc';
import { nicheLabel } from '@repo/trpc/constants';
import { Avatar, Badge, Card, Stat } from '@/components/ui';
import { formatFollowers, formatEngagement, countryLabel } from '@/lib/format';

export function CreatorCard({
  item,
  onClick,
  extraBadge,
  footer,
}: {
  item: CardPayload;
  onClick?: () => void;
  extraBadge?: ReactNode;
  footer?: ReactNode;
}) {
  const body = (
    <Card className="h-full transition hover:border-gray-900">
      <div className="flex items-center gap-3">
        <Avatar src={item.avatar} name={item.name ?? item.username} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate font-semibold text-ink">@{item.username}</span>
            {item.verified && <Badge color="green">✓</Badge>}
            {extraBadge}
          </div>
          <p className="truncate text-sm text-muted">{item.headline ?? countryLabel(item.country)}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-4">
        <Stat label="seguidores" value={formatFollowers(item.maxFollowers)} />
        <Stat label="engagement" value={formatEngagement(item.maxEngagement)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {item.niches.slice(0, 3).map((n) => (
          <Badge key={n}>{nicheLabel(n)}</Badge>
        ))}
      </div>
      {footer}
    </Card>
  );

  if (onClick) {
    // role=button (not <button>) so the footer can contain its own buttons /
    // <details> without invalid nested-interactive HTML / hydration mismatch.
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className="block w-full cursor-pointer text-left"
      >
        {body}
      </div>
    );
  }
  return body;
}
