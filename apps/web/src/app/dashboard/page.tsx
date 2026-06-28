'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBootstrap } from '@/lib/useBootstrap';
import { AppHeader } from '@/components/AppHeader';
import { Card, Spinner } from '@/components/ui';
import { es } from '@/lib/i18n';

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useBootstrap();

  useEffect(() => {
    if (isError) router.replace('/login');
    else if (data && data.role === 'none') router.replace('/onboarding/role');
  }, [data, isError, router]);

  if (isLoading || !data || data.role === 'none') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spinner />
      </main>
    );
  }

  const canSearch = data.orgs.some((o) => o.capabilities.includes('can_search_creators'));

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Hola{data.user.name ? `, ${data.user.name}` : ''} 👋
        </h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.role === 'creator' && (
            <>
              <Link href="/dashboard/profile">
                <Card className="transition hover:border-gray-900">
                  <h2 className="font-bold text-gray-900">Mi perfil</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {data.creatorProfile?.published ? es.creator.published : 'Completá y publicá tu perfil'}
                  </p>
                </Card>
              </Link>
              <Link href="/dashboard/contacts">
                <Card className="transition hover:border-gray-900">
                  <h2 className="font-bold text-gray-900">{es.contact.inbox}</h2>
                  <p className="mt-1 text-sm text-gray-600">Revisá las propuestas de marcas</p>
                </Card>
              </Link>
            </>
          )}
          {canSearch && (
            <Link href="/search">
              <Card className="transition hover:border-gray-900">
                <h2 className="font-bold text-gray-900">{es.search.title}</h2>
                <p className="mt-1 text-sm text-gray-600">Encontrá creadores para tu campaña</p>
              </Card>
            </Link>
          )}
          {data.user.isAdmin && (
            <Link href="/admin">
              <Card className="transition hover:border-gray-900">
                <h2 className="font-bold text-gray-900">{es.admin.title}</h2>
                <p className="mt-1 text-sm text-gray-600">Gestioná creadores, usuarios y contactos</p>
              </Card>
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
