import { Chip } from '@repo/web';

export const NicheFilters = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
    <Chip active onClick={() => {}}>Belleza</Chip>
    <Chip onClick={() => {}}>Moda</Chip>
    <Chip active onClick={() => {}}>Fitness</Chip>
    <Chip onClick={() => {}}>Gastronomía</Chip>
    <Chip onClick={() => {}}>Viajes</Chip>
  </div>
);

export const AllActive = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
    <Chip active onClick={() => {}}>Instagram</Chip>
    <Chip active onClick={() => {}}>TikTok</Chip>
    <Chip active onClick={() => {}}>YouTube</Chip>
  </div>
);

export const AllInactive = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
    <Chip onClick={() => {}}>Micro</Chip>
    <Chip onClick={() => {}}>Mid-tier</Chip>
    <Chip onClick={() => {}}>Macro</Chip>
  </div>
);
