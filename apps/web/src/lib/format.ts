// Locale-aware formatting (Spanish-first).

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')}K`;
  return String(n);
}

export function formatEngagement(rate: number | null | undefined): string {
  if (rate == null) return '—';
  return `${rate.toFixed(1)}%`;
}

export function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('es', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

const COUNTRY_LABELS: Record<string, string> = {
  AR: 'Argentina',
  MX: 'México',
  BR: 'Brasil',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Perú',
  UY: 'Uruguay',
  ES: 'España',
};

export function countryLabel(code: string | null | undefined): string {
  if (!code) return '';
  return COUNTRY_LABELS[code] ?? code;
}

export const COUNTRIES = Object.entries(COUNTRY_LABELS).map(([code, label]) => ({ code, label }));
