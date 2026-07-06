import { Textarea } from '@repo/web';

export const Default = () => (
  <div style={{ maxWidth: 420 }}>
    <Textarea rows={4} placeholder="Escribe tu propuesta de colaboración…" />
  </div>
);

export const WithMessage = () => (
  <div style={{ maxWidth: 420 }}>
    <Textarea
      rows={4}
      defaultValue={
        'Hola Valentina, somos Aurora Cosmetics.\n' +
        'Nos encantaría colaborar contigo en el lanzamiento de nuestra nueva línea de cuidado facial.\n' +
        'Buscamos tres reels y dos historias durante septiembre.'
      }
    />
  </div>
);

export const Disabled = () => (
  <div style={{ maxWidth: 420 }}>
    <Textarea
      rows={3}
      disabled
      defaultValue="Esta propuesta ya fue enviada y no puede editarse."
    />
  </div>
);
