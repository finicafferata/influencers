import { prisma, Prisma } from '../src/index';

type SeedAccount = {
  platform: string;
  handle: string;
  followers: number;
  engagementRate: number;
  verified?: boolean;
};

async function seedCreator(opts: {
  email: string;
  name: string;
  username: string;
  country: string;
  city: string;
  headline: string;
  bio: string;
  contentType: string;
  niches: string[];
  tags: string[];
  rates: Record<string, { from: number; currency?: string }>;
  accounts: SeedAccount[];
}) {
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    update: { name: opts.name },
    create: { email: opts.email, name: opts.name },
  });

  let profile = await prisma.creatorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    profile = await prisma.creatorProfile.create({
      data: {
        userId: user.id,
        username: opts.username,
        country: opts.country,
        city: opts.city,
        headline: opts.headline,
        bio: opts.bio,
        contentType: opts.contentType,
        niches: opts.niches,
        tags: opts.tags,
        rates: opts.rates as Prisma.InputJsonValue,
        published: true,
      },
    });

    // Create accounts individually so the recompute extension maintains
    // maxFollowers / maxEngagement (single write path).
    for (const a of opts.accounts) {
      await prisma.socialAccount.create({
        data: {
          creatorId: profile.id,
          platform: a.platform,
          handle: a.handle,
          followers: a.followers,
          engagementRate: a.engagementRate,
          verified: a.verified ?? false,
          verificationSource: a.verified ? 'admin' : 'self_reported',
          verifiedAt: a.verified ? new Date() : null,
        },
      });
    }
  }
  console.log('Creator:', opts.email);
}

async function main() {
  console.log('Seeding database...');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@creatorlink.app' },
    update: { isAdmin: true },
    create: { email: 'admin@creatorlink.app', name: 'Admin', isAdmin: true },
  });
  console.log('Admin:', admin.email);

  await seedCreator({
    email: 'maria@example.com',
    name: 'María García',
    username: 'mariag',
    country: 'AR',
    city: 'Buenos Aires',
    headline: 'Creadora de lifestyle y bienestar',
    bio: 'Creadora de contenido lifestyle y bienestar. Especialista en UGC para cosmética.',
    contentType: 'both',
    niches: ['beauty', 'lifestyle', 'wellness'],
    tags: ['skincare', 'rutina', 'autocuidado'],
    rates: {
      instagram_post: { from: 200, currency: 'USD' },
      tiktok_video: { from: 300, currency: 'USD' },
      ugc: { from: 150, currency: 'USD' },
    },
    accounts: [
      { platform: 'instagram', handle: 'mariag', followers: 85000, engagementRate: 4.2, verified: true },
      { platform: 'tiktok', handle: 'mariag', followers: 120000, engagementRate: 4.5 },
    ],
  });

  await seedCreator({
    email: 'tomas@example.com',
    name: 'Tomás Fernández',
    username: 'tomasfit',
    country: 'MX',
    city: 'Ciudad de México',
    headline: 'Fitness y nutrición sin vueltas',
    bio: 'Entrenador y creador de contenido fitness. Rutinas, nutrición y motivación.',
    contentType: 'influencer',
    niches: ['fitness', 'wellness', 'sports'],
    tags: ['gym', 'nutricion', 'rutinas'],
    rates: { instagram_post: { from: 250, currency: 'USD' }, youtube_video: { from: 600, currency: 'USD' } },
    accounts: [
      { platform: 'instagram', handle: 'tomasfit', followers: 210000, engagementRate: 3.1 },
      { platform: 'youtube', handle: 'tomasfit', followers: 95000, engagementRate: 5.4 },
    ],
  });

  await seedCreator({
    email: 'luana@example.com',
    name: 'Luana Souza',
    username: 'luanatech',
    country: 'BR',
    city: 'São Paulo',
    headline: 'Tech reviews en español y portugués',
    bio: 'Reviews de tecnología, gadgets y apps. UGC para marcas tech.',
    contentType: 'ugc',
    niches: ['tech', 'gaming'],
    tags: ['gadgets', 'reviews', 'apps'],
    rates: { ugc: { from: 220, currency: 'USD' }, tiktok_video: { from: 280, currency: 'USD' } },
    accounts: [
      { platform: 'tiktok', handle: 'luanatech', followers: 64000, engagementRate: 6.0 },
      { platform: 'instagram', handle: 'luanatech', followers: 41000, engagementRate: 3.8 },
    ],
  });

  // Sample brand org
  const brandUser = await prisma.user.upsert({
    where: { email: 'brand@example.com' },
    update: {},
    create: { email: 'brand@example.com', name: 'Brand Manager' },
  });
  const existingBrand = await prisma.organization.findFirst({
    where: { name: 'Cosmética Natural SA' },
  });
  if (!existingBrand) {
    await prisma.organization.create({
      data: {
        name: 'Cosmética Natural SA',
        displayType: 'brand',
        capabilities: ['can_search_creators'],
        country: 'AR',
        members: { create: { userId: brandUser.id, role: 'owner' } },
      },
    });
    console.log('Brand: Cosmética Natural SA');
  } else {
    console.log('Brand already exists, skipping');
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
