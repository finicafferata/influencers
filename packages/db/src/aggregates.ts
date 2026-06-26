import type { PrismaClient } from '@prisma/client';

/**
 * Single source of truth for the denormalized CreatorProfile.maxFollowers /
 * maxEngagement columns. Recomputes from the creator's social accounts.
 *
 * maxFollowers = the highest follower count across accounts.
 * maxEngagement = the engagement rate of the account with the most followers
 *   (the "representative" account), so reach and engagement sorts stay
 *   keyset-stable. Falls back to the max engagement if the top account has none.
 */
export async function recomputeCreatorAggregates(
  db: Pick<PrismaClient, 'socialAccount' | 'creatorProfile'>,
  creatorId: string,
): Promise<void> {
  const accounts = await db.socialAccount.findMany({
    where: { creatorId },
    select: { followers: true, engagementRate: true },
  });

  let maxFollowers = 0;
  let maxEngagement = 0;
  let topFollowers = -1;
  let topAccountEngagement = 0;

  for (const a of accounts) {
    if (a.followers > maxFollowers) maxFollowers = a.followers;
    const eng = a.engagementRate ?? 0;
    if (eng > maxEngagement) maxEngagement = eng;
    if (a.followers > topFollowers) {
      topFollowers = a.followers;
      topAccountEngagement = eng;
    }
  }

  const representativeEngagement =
    topAccountEngagement > 0 ? topAccountEngagement : maxEngagement;

  await db.creatorProfile.update({
    where: { id: creatorId },
    data: { maxFollowers, maxEngagement: representativeEngagement },
  });
}
