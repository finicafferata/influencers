import { Button } from '@repo/web';

export const Variants = () => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
    <Button variant="primary">Guardar</Button>
    <Button variant="accent">Contactar</Button>
    <Button variant="secondary">Cancelar</Button>
    <Button variant="ghost">Ver más</Button>
    <Button variant="danger">Eliminar</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Button size="sm" variant="accent">Pequeño</Button>
    <Button size="md" variant="accent">Mediano</Button>
    <Button size="lg" variant="accent">Grande</Button>
  </div>
);

export const Disabled = () => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <Button variant="primary" disabled>Guardar</Button>
    <Button variant="accent" disabled>Contactar</Button>
  </div>
);
