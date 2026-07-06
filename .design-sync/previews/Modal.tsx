import { Modal, Button, Field, Input, Textarea } from '@repo/web';

// Overlay renders open (cardMode:single + viewport set in cfg.overrides so the
// fixed-position dialog stays inside the card).
export const ContactForm = () => (
  // Spacer gives the transformed single-card container real height so the
  // modal's fixed-position overlay centers inside the card instead of clipping.
  <div style={{ height: 600 }}>
    <Modal open onClose={() => {}} title="Contactar a Valentina">
      <Field label="Nombre de la marca">
        <Input placeholder="Ej. Aurora Cosmetics" defaultValue="Aurora Cosmetics" />
      </Field>
      <Field label="Mensaje" hint="opcional">
        <Textarea rows={3} defaultValue="Hola Valentina, nos encantaría colaborar en el lanzamiento de nuestra nueva línea." />
      </Field>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <Button variant="secondary">Cancelar</Button>
        <Button variant="accent">Enviar propuesta</Button>
      </div>
    </Modal>
  </div>
);
