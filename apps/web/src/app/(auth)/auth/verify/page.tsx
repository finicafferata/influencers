'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('Enlace de acceso inválido. No se encontró el token.');
      return;
    }

    async function verify() {
      try {
        const res = await fetch(
          `/api/auth/verify?token=${encodeURIComponent(token!)}`,
        );
        const data = (await res.json()) as {
          token?: string;
          isNewUser?: boolean;
          message?: string;
        };

        if (!res.ok || !data.token) {
          throw new Error(data.message ?? 'Token inválido o expirado');
        }

        localStorage.setItem('jwt', data.token);

        if (data.isNewUser) {
          router.replace('/onboarding/role');
        } else {
          router.replace('/dashboard');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Error al verificar el enlace',
        );
      }
    }

    void verify();
  }, [searchParams, router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">
            Enlace inválido
          </h1>
          <p className="mb-6 text-gray-600">{error}</p>
          <a
            href="/login"
            className="inline-block rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
          >
            Volver al inicio
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-gray-200 border-t-gray-900" />
        <h1 className="mb-2 text-xl font-bold text-gray-900">Verificando...</h1>
        <p className="text-gray-500">
          Estamos validando tu enlace de acceso.
        </p>
      </div>
    </main>
  );
}
