'use client';

import React from 'react';

// Shared UI primitives — CreatorLink design system (monochrome + electric
// accent). Tokens live in globals.css (@theme). Kept in-app for reliable
// Tailwind scanning; structured for later extraction to packages/ui.

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variants = {
    primary: 'bg-ink text-white hover:bg-ink-soft active:scale-[.98] disabled:opacity-40',
    accent: 'bg-accent text-accent-fg shadow-sm hover:bg-accent-strong active:scale-[.98] disabled:opacity-40',
    secondary: 'border border-line bg-surface text-ink hover:bg-line-soft active:scale-[.98]',
    ghost: 'text-ink-soft hover:bg-line-soft',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 active:scale-[.98] disabled:opacity-40',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

const fieldBase =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint transition-colors focus:border-accent focus:outline-none';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(fieldBase, 'resize-y', className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(fieldBase, 'cursor-pointer', className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-ink-soft">
      {children}
      {hint && <span className="ml-2 font-normal text-faint">{hint}</span>}
    </label>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <Label hint={hint}>{label}</Label>
      {children}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-full border px-3 py-1 text-sm font-medium transition-all duration-150 active:scale-95',
        active
          ? 'border-ink bg-ink text-white'
          : 'border-line bg-surface text-ink-soft hover:border-ink/40 hover:bg-line-soft',
      )}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  color = 'gray',
}: {
  children: React.ReactNode;
  color?: 'gray' | 'green' | 'blue' | 'yellow' | 'red';
}) {
  const colors = {
    gray: 'bg-line-soft text-ink-soft',
    green: 'bg-accent-soft text-accent-soft-fg',
    blue: 'bg-sky-50 text-sky-700',
    yellow: 'bg-amber-50 text-amber-700',
    red: 'bg-rose-50 text-rose-700',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        colors[color],
      )}
    >
      {children}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cx('rounded-card border border-line bg-surface p-5 shadow-card', className)}>{children}</div>
  );
}

export function Avatar({
  src,
  name,
  size = 48,
  accent = false,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  // Use the violet accent for the initials fallback instead of ink — keeps the
  // avatar legible when it sits on a dark surface (e.g. the profile cover band).
  accent?: boolean;
}) {
  const initials = (name ?? '?').trim().slice(0, 1).toUpperCase();
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name ?? ''}
        width={size}
        height={size}
        className="rounded-full object-cover ring-1 ring-line"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cx('flex items-center justify-center rounded-full font-semibold text-white', accent ? 'bg-accent' : 'bg-ink')}
      style={{ width: size, height: size, fontSize: size / 2.4 }}
    >
      {initials}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cx('h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent', className)}
      role="status"
      aria-label="Cargando"
    />
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface/50 p-12 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold tracking-tight text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto bg-surface p-6 shadow-pop sm:rounded-l-card">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-faint transition-colors hover:bg-line-soft hover:text-ink"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-card bg-surface p-6 shadow-pop">
        {title && <h2 className="mb-4 text-lg font-bold tracking-tight text-ink">{title}</h2>}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-faint transition-colors hover:bg-line-soft hover:text-ink"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-2">
      {steps.map((s, i) => (
        <li
          key={s}
          className={cx(
            'flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
            i === current
              ? 'bg-ink text-white'
              : i < current
                ? 'bg-accent-soft text-accent-soft-fg'
                : 'bg-line-soft text-muted',
          )}
        >
          <span className={cx('flex h-4 w-4 items-center justify-center rounded-full text-[10px]', i < current && 'bg-accent text-white')}>
            {i < current ? '✓' : i + 1}
          </span>
          <span className="hidden sm:inline">{s}</span>
        </li>
      ))}
    </ol>
  );
}
