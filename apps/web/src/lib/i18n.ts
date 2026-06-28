// Spanish-first string dictionary. Only `es` ships in Slice 1; structured so a
// second locale can be added later (ISS-2.14). Keep UI copy here, not inline.

export const es = {
  appName: 'CreatorLink',
  tagline: 'Conectá creadores con marcas',

  common: {
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    next: 'Siguiente',
    back: 'Atrás',
    continue: 'Continuar',
    finish: 'Finalizar',
    loading: 'Cargando…',
    retry: 'Reintentar',
    search: 'Buscar',
    logout: 'Cerrar sesión',
    optional: 'opcional',
    error: 'Ocurrió un error',
  },

  roles: {
    title: '¿Cómo querés usar CreatorLink?',
    creator: 'Soy creador',
    creatorDesc: 'Mostrá tu perfil y recibí propuestas de marcas',
    org: 'Soy marca o agencia',
    orgDesc: 'Buscá y contactá creadores para tus campañas',
  },

  creator: {
    onboarding: 'Creá tu perfil',
    stepBasics: 'Datos básicos',
    stepSocial: 'Redes y métricas',
    stepNiches: 'Nichos y contenido',
    stepDetails: 'Detalles y tarifas',
    username: 'Nombre de usuario',
    usernameHint: 'No se puede cambiar después',
    country: 'País',
    city: 'Ciudad',
    headline: 'Titular',
    bio: 'Biografía',
    contentType: 'Tipo de contenido',
    niches: 'Nichos',
    tags: 'Etiquetas',
    rates: 'Tarifas',
    addSocial: 'Agregar red social',
    publish: 'Publicar perfil',
    published: 'Perfil publicado',
    unpublish: 'Despublicar',
    viewPublic: 'Ver perfil público',
    verified: 'Verificado',
  },

  org: {
    onboarding: 'Creá tu organización',
    name: 'Nombre',
    displayType: 'Tipo',
    brand: 'Marca',
    marketing_agency: 'Agencia de marketing',
    website: 'Sitio web',
    logo: 'Logo (URL)',
  },

  search: {
    title: 'Buscar creadores',
    filters: 'Filtros',
    niche: 'Nicho',
    platform: 'Plataforma',
    followers: 'Seguidores',
    engagement: 'Engagement',
    min: 'Mín',
    max: 'Máx',
    sort: 'Ordenar',
    sortFollowers: 'Más seguidores',
    sortEngagement: 'Mejor engagement',
    sortRecent: 'Más recientes',
    results: (n: number) => `${n} creador${n === 1 ? '' : 'es'}`,
    empty: 'Ajustá los filtros para ver más creadores',
    loadMore: 'Cargar más',
    contact: 'Contactar',
    contacted: 'Contactado',
  },

  contact: {
    title: 'Contactar creador',
    message: 'Mensaje',
    brief: 'Brief de campaña',
    send: 'Enviar propuesta',
    sent: '¡Propuesta enviada!',
    inbox: 'Propuestas recibidas',
    accept: 'Aceptar',
    decline: 'Rechazar',
    accepted: 'Aceptada',
    declined: 'Rechazada',
    pending: 'Pendiente',
    empty: 'Todavía no recibiste propuestas',
  },

  notifications: {
    title: 'Notificaciones',
    empty: 'No tenés notificaciones',
    markAll: 'Marcar todas como leídas',
  },

  admin: {
    title: 'Administración',
    creators: 'Creadores',
    users: 'Usuarios',
    contacts: 'Contactos',
    seed: 'Crear creador',
    suspend: 'Suspender',
    unsuspend: 'Reactivar',
    verify: 'Verificar',
    unverify: 'Quitar verificación',
  },
} as const;

/** Convenience accessor (kept simple; only `es` exists in Slice 1). */
export function t<K extends keyof typeof es>(section: K): (typeof es)[K] {
  return es[section];
}
