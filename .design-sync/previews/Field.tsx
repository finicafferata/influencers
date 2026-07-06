import { Field, Input, Select } from '@repo/web';

export const WithInput = () => (
  <div style={{ maxWidth: 360 }}>
    <Field label="Nombre de la marca">
      <Input defaultValue="Aurora Cosmetics" />
    </Field>
  </div>
);

export const WithSelect = () => (
  <div style={{ maxWidth: 360 }}>
    <Field label="Nicho principal">
      <Select defaultValue="belleza">
        <option value="belleza">Belleza</option>
        <option value="moda">Moda</option>
        <option value="fitness">Fitness</option>
      </Select>
    </Field>
  </div>
);

export const WithHint = () => (
  <div style={{ maxWidth: 360 }}>
    <Field label="Presupuesto de campaña" hint="opcional">
      <Input placeholder="Ej. 2.500 USD" />
    </Field>
  </div>
);
