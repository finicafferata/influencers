// Barrel entry for the CreatorLink Claude Design bundle. Re-exports the DS
// components the design agent should build with. Not app code — this file
// exists only to give the /design-sync converter one esbuild entry point.
// The handoff/ CreatorCard supersedes the app's (the "refresh" redesign).

import './process-shim'; // MUST be first — defines globalThis.process before Next/React load

export * from '@/components/ui'; // 16 primitives

// Handoff redesigns (design-system refresh drop-ins)
export { CreatorCard } from './handoff/CreatorCard';
export { default as ContactsInboxPage } from './handoff/ContactsInboxPage';
export { default as RolePage } from './handoff/RolePage';

// App feature components
export { CreatorFilters } from '@/components/CreatorFilters';
export { ShareKit } from '@/components/ShareKit';
export { AppHeader } from '@/components/AppHeader';
export { NotificationBell } from '@/components/NotificationBell';
export { ContactButton } from '@/components/ContactButton';
export { AudienceEditor } from '@/components/AudienceEditor';
