import { Select } from '@repo/web';

export const Niche = () => (
  <div style={{ maxWidth: 360 }}>
    <Select defaultValue="belleza">
      <option value="belleza">Belleza</option>
      <option value="moda">Moda</option>
      <option value="fitness">Fitness</option>
      <option value="gastronomia">Gastronomía</option>
      <option value="viajes">Viajes</option>
    </Select>
  </div>
);

export const Country = () => (
  <div style={{ maxWidth: 360 }}>
    <Select defaultValue="ar">
      <option value="ar">Argentina</option>
      <option value="mx">México</option>
      <option value="es">España</option>
      <option value="co">Colombia</option>
      <option value="cl">Chile</option>
    </Select>
  </div>
);

export const Platform = () => (
  <div style={{ maxWidth: 360 }}>
    <Select defaultValue="instagram">
      <option value="instagram">Instagram</option>
      <option value="tiktok">TikTok</option>
      <option value="youtube">YouTube</option>
    </Select>
  </div>
);
