'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NICHES, PLATFORMS } from '@repo/trpc/constants';
import { trpc } from '@/lib/trpc/client';
import { useBootstrap } from '@/lib/useBootstrap';
import { AppHeader } from '@/components/AppHeader';
import { Badge, Button, Card, Chip, Field, Input, Select, Spinner, Textarea } from '@/components/ui';
import { es } from '@/lib/i18n';

type Tab = 'creators' | 'users' | 'contacts' | 'funnel';

export default function AdminPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useBootstrap();
  const [tab, setTab] = useState<Tab>('creators');

  useEffect(() => {
    if (isError) router.replace('/login');
    else if (data && !data.user.isAdmin) router.replace('/dashboard');
  }, [data, isError, router]);

  if (isLoading || !data?.user.isAdmin) {
    return <main className="flex min-h-screen items-center justify-center"><Spinner /></main>;
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{es.admin.title}</h1>
        <div className="mb-4 flex gap-2">
          <Button variant={tab === 'creators' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('creators')}>
            {es.admin.creators}
          </Button>
          <Button variant={tab === 'users' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('users')}>
            {es.admin.users}
          </Button>
          <Button variant={tab === 'contacts' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('contacts')}>
            {es.admin.contacts}
          </Button>
          <Button variant={tab === 'funnel' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('funnel')}>
            Funnel
          </Button>
        </div>
        {tab === 'creators' ? <CreatorsTab /> : tab === 'users' ? <UsersTab /> : tab === 'contacts' ? <ContactsTab /> : <FunnelTab />}
      </main>
    </>
  );
}

function UsersTab() {
  const utils = trpc.useUtils();
  const users = trpc.admin.listUsers.useQuery(undefined, { retry: false });
  const suspend = trpc.admin.suspendUser.useMutation({ onSuccess: () => utils.admin.listUsers.invalidate() });
  const unsuspend = trpc.admin.unsuspendUser.useMutation({ onSuccess: () => utils.admin.listUsers.invalidate() });

  if (users.isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!users.data) return <p className="py-6 text-center text-sm text-gray-500">{es.common.error}</p>;

  return (
    <div className="space-y-2">
      {users.data.items.map((u) => (
        <Card key={u.id}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{u.name ?? u.email}</p>
              <p className="text-sm text-gray-500">
                {u.email}
                {u.creatorProfile && <> · @{u.creatorProfile.username} {u.creatorProfile.published ? <Badge color="green">público</Badge> : <Badge>borrador</Badge>}</>}
                {u.isAdmin && <> · <Badge color="blue">admin</Badge></>}
              </p>
            </div>
            {u.suspended ? (
              <Button size="sm" variant="secondary" onClick={() => unsuspend.mutate({ userId: u.id })}>{es.admin.unsuspend}</Button>
            ) : (
              <Button size="sm" variant="danger" onClick={() => suspend.mutate({ userId: u.id })}>{es.admin.suspend}</Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function CreatorsTab() {
  return (
    <div className="space-y-4">
      <SeedCreatorForm />
      <BulkSeedForm />
      <VerifyAccountsPanel />
    </div>
  );
}

const BULK_SAMPLE = `[
  {
    "email": "creator1@example.com",
    "name": "Nombre Apellido",
    "username": "creator1",
    "country": "AR",
    "contentType": "both",
    "niches": ["moda"],
    "publish": true,
    "socialAccounts": [
      { "platform": "instagram", "handle": "creator1", "followers": 25000, "engagementRate": 3.2 }
    ]
  }
]`;

function BulkSeedForm() {
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bulk = trpc.admin.bulkSeedCreators.useMutation();

  async function submit() {
    setError(null);
    let creators: unknown;
    try {
      creators = JSON.parse(json);
    } catch {
      setError('JSON inválido');
      return;
    }
    if (!Array.isArray(creators) || creators.length === 0) {
      setError('Se espera un array con al menos un creador');
      return;
    }
    try {
      await bulk.mutateAsync({ creators: creators as Parameters<typeof bulk.mutateAsync>[0]['creators'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  return (
    <Card>
      <h2 className="mb-1 font-bold text-gray-900">Carga masiva de creadores</h2>
      <p className="mb-3 text-sm text-gray-500">
        Pegá un array JSON. Idempotente: los usernames existentes se omiten. Máx. 200.
      </p>
      <Textarea
        rows={8}
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder={BULK_SAMPLE}
        className="font-mono text-xs"
      />
      <div className="mt-2 flex items-center gap-3">
        <Button size="sm" onClick={submit} disabled={bulk.isPending || json.trim().length === 0}>
          {bulk.isPending ? <Spinner className="h-4 w-4" /> : 'Cargar'}
        </Button>
        <button className="text-xs text-gray-400 hover:text-gray-700" onClick={() => setJson(BULK_SAMPLE)}>
          usar ejemplo
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {bulk.data && (
        <div className="mt-3 rounded-lg border border-gray-100 p-3 text-sm">
          <p className="font-medium text-gray-900">
            {bulk.data.summary.created} creados · {bulk.data.summary.skipped} omitidos · {bulk.data.summary.errored} con error
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
            {bulk.data.results.map((r) => (
              <li key={r.username}>
                <span className="font-mono">@{r.username}</span> —{' '}
                <span className={r.status === 'error' ? 'text-red-600' : r.status === 'skipped' ? 'text-gray-400' : 'text-green-600'}>
                  {r.status}
                </span>
                {r.message && <> · {r.message}</>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function FunnelTab() {
  const [days, setDays] = useState(30);
  const funnel = trpc.admin.funnel.useQuery({ days }, { retry: false });

  if (funnel.isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!funnel.data) return <p className="py-6 text-center text-sm text-gray-500">{es.common.error}</p>;

  const { stages, conversion } = funnel.data;
  const rows: { label: string; value: number }[] = [
    { label: 'Perfiles publicados', value: stages.published },
    { label: 'Búsquedas', value: stages.searched },
    { label: 'Contactos enviados', value: stages.contacted },
    { label: 'Respuestas', value: stages.responded },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Funnel de validación</h2>
          <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-auto">
            <option value="7">7 días</option>
            <option value="30">30 días</option>
            <option value="90">90 días</option>
          </Select>
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">{r.label}</span>
                <span className="font-medium text-gray-900">{r.value}</span>
              </div>
              <div className="mt-0.5 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="mb-2 font-bold text-gray-900">Conversión</h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li className="flex justify-between">
            <span>Búsqueda → contacto</span>
            <span className="font-medium">{conversion.searchToContact != null ? `${conversion.searchToContact}%` : '—'}</span>
          </li>
          <li className="flex justify-between">
            <span>Contacto → respuesta</span>
            <span className="font-medium">{conversion.contactToResponse != null ? `${conversion.contactToResponse}%` : '—'}</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function SeedCreatorForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('AR');
  const [contentType, setContentType] = useState('both');
  const [niches, setNiches] = useState<string[]>([]);
  const [platform, setPlatform] = useState('instagram');
  const [handle, setHandle] = useState('');
  const [followers, setFollowers] = useState('');
  const [publish, setPublish] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = trpc.admin.createCreatorProfile.useMutation();

  async function submit() {
    setError(null); setMsg(null);
    try {
      await create.mutateAsync({
        email, name: name || undefined, username, country,
        contentType: contentType as 'ugc' | 'influencer' | 'both',
        niches,
        publish,
        socialAccounts: handle && followers
          ? [{ platform, handle, followers: Number(followers) }]
          : [],
      });
      setMsg(`Creador @${username} creado`);
      setEmail(''); setName(''); setUsername(''); setHandle(''); setFollowers(''); setNiches([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : es.common.error);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 font-bold text-gray-900">{es.admin.seed}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Nombre"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={es.creator.username}><Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} /></Field>
        <Field label={es.creator.country}><Input value={country} onChange={(e) => setCountry(e.target.value)} /></Field>
        <Field label={es.creator.contentType}>
          <Select value={contentType} onChange={(e) => setContentType(e.target.value)}>
            <option value="ugc">UGC</option><option value="influencer">Influencer</option><option value="both">Ambos</option>
          </Select>
        </Field>
      </div>
      <Field label={es.creator.niches}>
        <div className="flex flex-wrap gap-1.5">
          {NICHES.map((n) => (
            <Chip key={n.slug} active={niches.includes(n.slug)} onClick={() => setNiches((c) => c.includes(n.slug) ? c.filter((s) => s !== n.slug) : [...c, n.slug])}>
              {n.labelEs}
            </Chip>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Input placeholder="@handle" value={handle} onChange={(e) => setHandle(e.target.value)} />
        <Input type="number" placeholder="Seguidores" value={followers} onChange={(e) => setFollowers(e.target.value)} />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
        Publicar inmediatamente
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {msg && <p className="mt-2 text-sm text-green-600">{msg}</p>}
      <div className="mt-3 flex justify-end">
        <Button onClick={submit} disabled={create.isPending || !email || username.length < 3}>
          {create.isPending ? es.common.saving : es.admin.seed}
        </Button>
      </div>
    </Card>
  );
}

function VerifyAccountsPanel() {
  const utils = trpc.useUtils();
  const [username, setUsername] = useState('');
  const [search, setSearch] = useState('');
  const lookup = trpc.admin.getCreatorByUsername.useQuery(
    { username: search },
    { enabled: !!search, retry: false },
  );
  const verify = trpc.admin.verifySocialAccount.useMutation({
    onSuccess: () => utils.admin.getCreatorByUsername.invalidate(),
  });
  const unverify = trpc.admin.unverifySocialAccount.useMutation({
    onSuccess: () => utils.admin.getCreatorByUsername.invalidate(),
  });
  const verifyAud = trpc.admin.verifyAudience.useMutation({
    onSuccess: () => utils.admin.getCreatorByUsername.invalidate(),
  });
  const unverifyAud = trpc.admin.unverifyAudience.useMutation({
    onSuccess: () => utils.admin.getCreatorByUsername.invalidate(),
  });

  return (
    <Card>
      <h2 className="mb-3 font-bold text-gray-900">Verificar cuentas</h2>
      <div className="flex gap-2">
        <Input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
        <Button variant="secondary" onClick={() => setSearch(username)}>{es.common.search}</Button>
      </div>
      {lookup.isError && <p className="mt-2 text-sm text-red-600">No se encontró el creador</p>}
      {lookup.data && (
        <div className="mt-3">
          <p className="text-sm text-gray-600">
            @{lookup.data.username} {lookup.data.published ? <Badge color="green">público</Badge> : <Badge>borrador</Badge>}
          </p>
          <div className="mt-2 space-y-2">
            {lookup.data.socialAccounts.map((a) => {
              const acc = a as typeof a & { audienceVerified?: boolean; audienceTopCountry?: string | null };
              return (
                <div key={a.id} className="rounded-lg border border-gray-100 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{a.platform} · @{a.handle} · {a.followers.toLocaleString('es')}</span>
                    {a.verified ? (
                      <Button size="sm" variant="secondary" onClick={() => unverify.mutate({ socialAccountId: a.id })}>{es.admin.unverify}</Button>
                    ) : (
                      <Button size="sm" onClick={() => verify.mutate({ socialAccountId: a.id })}>{es.admin.verify}</Button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Audiencia: {acc.audienceTopCountry ?? '—'} {acc.audienceVerified && <Badge color="green">verificada</Badge>}</span>
                    {acc.audienceVerified ? (
                      <Button size="sm" variant="secondary" onClick={() => unverifyAud.mutate({ socialAccountId: a.id })}>Quitar audiencia</Button>
                    ) : (
                      <Button size="sm" onClick={() => verifyAud.mutate({ socialAccountId: a.id })}>Verificar audiencia</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

function ContactsTab() {
  const contacts = trpc.admin.listContacts.useQuery(undefined, { retry: false });
  if (contacts.isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!contacts.data) return <p className="py-6 text-center text-sm text-gray-500">{es.common.error}</p>;
  return (
    <div className="space-y-2">
      {contacts.data.items.map((c) => (
        <Card key={c.id}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-900">{c.orgName} → @{c.creator.username}</span>
            <Badge>{c.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-600">{c.message}</p>
        </Card>
      ))}
    </div>
  );
}
