import { router } from './trpc';
import { healthRouter } from './routers/health';
import { meRouter } from './routers/me';
import { creatorRouter } from './routers/creator';
import { orgRouter } from './routers/org';
import { searchRouter } from './routers/search';
import { contactRouter } from './routers/contact';
import { notificationRouter } from './routers/notification';
import { adminRouter } from './routers/admin';
import { matchRouter } from './routers/match';

export const appRouter = router({
  health: healthRouter,
  me: meRouter,
  creator: creatorRouter,
  org: orgRouter,
  search: searchRouter,
  contact: contactRouter,
  notification: notificationRouter,
  admin: adminRouter,
  match: matchRouter,
});

export type AppRouter = typeof appRouter;
