import { Input } from '@repo/web';

export const Default = () => (
  <div style={{ maxWidth: 360 }}>
    <Input placeholder="Buscar creadores por nombre…" />
  </div>
);

export const WithValue = () => (
  <div style={{ maxWidth: 360 }}>
    <Input defaultValue="Valentina Ríos" />
  </div>
);

export const Email = () => (
  <div style={{ maxWidth: 360 }}>
    <Input type="email" defaultValue="hola@auroracosmetics.com" />
  </div>
);

export const Disabled = () => (
  <div style={{ maxWidth: 360 }}>
    <Input defaultValue="Cuenta verificada" disabled />
  </div>
);
