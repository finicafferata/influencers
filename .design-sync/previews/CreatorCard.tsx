import { CreatorCard } from '@repo/web';

const valentina = {
  id: '1',
  username: 'valentina.makeup',
  name: 'Valentina Ruiz',
  avatar: null,
  headline: 'Maquilladora profesional · tutoriales y reseñas',
  country: 'AR',
  contentType: 'video',
  niches: ['beauty', 'fashion', 'lifestyle'],
  maxFollowers: 128000,
  maxEngagement: 4.8,
  verified: true,
  topAccounts: [
    { platform: 'instagram', followers: 128000, engagementRate: 4.8, verified: true, audienceTopCountry: 'AR' },
  ],
};

const mateo = {
  id: '2',
  username: 'mateo.fit',
  name: 'Mateo Sosa',
  avatar: null,
  headline: 'Entrenador · rutinas y nutrición',
  country: 'MX',
  contentType: 'video',
  niches: ['fitness', 'wellness'],
  maxFollowers: 54200,
  maxEngagement: 6.1,
  verified: false,
  topAccounts: [
    { platform: 'tiktok', followers: 54200, engagementRate: 6.1, verified: false, audienceTopCountry: 'MX' },
  ],
};

export const Verified = () => (
  <div style={{ maxWidth: 340 }}>
    <CreatorCard item={valentina} />
  </div>
);

export const Unverified = () => (
  <div style={{ maxWidth: 340 }}>
    <CreatorCard item={mateo} />
  </div>
);

export const Grid = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 320px)', gap: 16 }}>
    <CreatorCard item={valentina} />
    <CreatorCard item={mateo} />
  </div>
);
