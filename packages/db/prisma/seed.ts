import { prisma } from '../src/index';

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@creatorlink.app' },
    update: {},
    create: {
      email: 'admin@creatorlink.app',
      name: 'Admin',
      isAdmin: true,
    },
  });
  console.log('Created admin:', admin.email);

  // Create sample creator
  const creator = await prisma.user.upsert({
    where: { email: 'maria@example.com' },
    update: {},
    create: {
      email: 'maria@example.com',
      name: 'María García',
      creatorProfile: {
        create: {
          username: 'mariag',
          country: 'AR',
          city: 'Buenos Aires',
          bio: 'Creadora de contenido lifestyle y bienestar. Especialista en UGC para cosmética.',
          contentType: 'both',
          niches: ['Belleza', 'Lifestyle', 'Bienestar'],
          rates: {
            instagram_post: { from: 200 },
            tiktok_video: { from: 300 },
            ugc: { from: 150 },
          },
          socialAccounts: {
            create: [
              {
                platform: 'instagram',
                handle: 'mariag',
                followers: 85000,
                engagementRate: 4.2,
              },
              {
                platform: 'tiktok',
                handle: 'mariag',
                followers: 120000,
                engagementRate: 4.5,
              },
            ],
          },
        },
      },
    },
  });
  console.log('Created creator:', creator.email);

  // Create sample brand org
  const brandUser = await prisma.user.upsert({
    where: { email: 'brand@example.com' },
    update: {},
    create: {
      email: 'brand@example.com',
      name: 'Brand Manager',
    },
  });

  const brand = await prisma.organization.upsert({
    where: { id: 'seed-brand-001' },
    update: {},
    create: {
      id: 'seed-brand-001',
      name: 'Cosmética Natural SA',
      displayType: 'brand',
      capabilities: ['can_search_creators'],
      country: 'AR',
      members: {
        create: {
          userId: brandUser.id,
          role: 'owner',
        },
      },
    },
  });
  console.log('Created brand:', brand.name);

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
