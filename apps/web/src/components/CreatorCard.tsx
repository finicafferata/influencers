'use client';

import type { ReactNode } from 'react';
import type { CardPayload } from '@repo/trpc';
import { nicheLabel } from '@repo/trpc/constants';
import { Avatar, Badge, Card } from '@/components/ui';
import { formatFollowers, formatEngagement, countryLabel } from '@/lib/format';

/**
 * Refreshed CreatorCard.
 * Changes vs. original:
 *  - Larger 52px avatar, items-start alignment
 *  - Stats sit below a hairline divider (border-line-soft) with mono figures
 *  - Verified check uses the accent-soft token badge (auto-violet)
 *  - Slightly tighter niche chips
 * No new backend fields required — same CardPayload shape.
 */
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
    <Card className="flex h-full flex-col transition hover:border-ink">
      <div className="flex items-start gap-3">
        <Avatar src={item.avatar} name={item.name ?? item.username} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-ink">@{item.username}</span>
            {item.verified && (
              <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-bold text-accent-soft-fg">
                ✓
              </span>
            )}
            {extraBadge}
          </div>
          <p className="truncate text-sm text-muted">{item.headline ?? countryLabel(item.country)}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-6 border-t border-line-soft pt-3.5">
        <div>
          <div className="font-mono text-[15px] font-bold text-ink">{formatFollowers(item.maxFollowers)}</div>
          <div className="text-[11px] text-muted">seguidores</div>
        </div>
        <div>
          <div className="font-mono text-[15px] font-bold text-ink">{formatEngagement(item.maxEngagement)}</div>
          <div className="text-[11px] text-muted">engagement</div>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
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
