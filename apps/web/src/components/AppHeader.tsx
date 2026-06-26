'use client';

import Link from 'next/link';
import { useBootstrap, logout } from '@/lib/useBootstrap';
import { NotificationBell } from '@/components/NotificationBell';
import { es } from '@/lib/i18n';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-line-soft hover:text-ink"
    >
      {children}
    </Link>
  );
}

export function AppHeader() {
  const { data, isAuthed, role } = useBootstrap();
  const canSearch = data?.orgs.some((o) => o.capabilities.includes('can_search_creators'));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          {es.appName}
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {canSearch && (
            <>
              <NavLink href="/search">{es.search.title}</NavLink>
              <NavLink href="/match">Buscar con IA</NavLink>
            </>
          )}
          {role === 'creator' && (
            <>
              <NavLink href="/dashboard/profile">Mi perfil</NavLink>
              <NavLink href="/dashboard/contacts">{es.contact.inbox}</NavLink>
            </>
          )}
          {data?.user.isAdmin && <NavLink href="/admin">{es.admin.title}</NavLink>}
          {isAuthed && <NotificationBell />}
          {isAuthed && (
            <button
              onClick={() => logout()}
              className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-line-soft hover:text-ink"
            >
              {es.common.logout}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
