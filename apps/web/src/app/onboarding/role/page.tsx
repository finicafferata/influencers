'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBootstrap } from '@/lib/useBootstrap';
import { Card, Spinner } from '@/components/ui';
import { es } from '@/lib/i18n';

export default function RolePage() {
  const router = useRouter();
  const { data, isLoading, isError } = useBootstrap();

  useEffect(() => {
    if (isError) router.replace('/login');
    else if (data && data.role !== 'none') router.replace('/dashboard');
  }, [data, isError, router]);

  if (isLoading || (data && data.role !== 'none')) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="mb-8 text-center text-2xl font-bold text-gray-900">{es.roles.title}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <button onClick={() => router.push('/onboarding/creator')} className="text-left">
          <Card className="h-full transition hover:border-gray-900">
            <div className="text-3xl">✨</div>
            <h2 className="mt-3 text-lg font-bold text-gray-900">{es.roles.creator}</h2>
            <p className="mt-1 text-sm text-gray-600">{es.roles.creatorDesc}</p>
          </Card>
        </button>
        <button onClick={() => router.push('/onboarding/org')} className="text-left">
          <Card className="h-full transition hover:border-gray-900">
            <div className="text-3xl">🔎</div>
            <h2 className="mt-3 text-lg font-bold text-gray-900">{es.roles.org}</h2>
            <p className="mt-1 text-sm text-gray-600">{es.roles.orgDesc}</p>
          </Card>
        </button>
      </div>
    </main>
  );
}
