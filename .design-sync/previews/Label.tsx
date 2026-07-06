import { Label, Input } from '@repo/web';

export const Default = () => (
  <div style={{ maxWidth: 360 }}>
    <Label>Nombre de la marca</Label>
    <Input defaultValue="Aurora Cosmetics" />
  </div>
);

export const WithHint = () => (
  <div style={{ maxWidth: 360 }}>
    <Label hint="opcional">Sitio web</Label>
    <Input placeholder="https://auroracosmetics.com" />
  </div>
);

export const EmailField = () => (
  <div style={{ maxWidth: 360 }}>
    <Label>Correo de contacto</Label>
    <Input type="email" defaultValue="hola@auroracosmetics.com" />
  </div>
);
