import express from 'express';
import { errorHandler } from '../../middleware/error-handler';
import type { AuthUser } from '../../middleware/auth';

export function createTestApp(
  router: express.Router,
  path: string,
  user: AuthUser = { userId: 'test-user-id', email: 'test@example.com', orgId: 'org-1', role: 'admin' },
) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use(path, router);
  app.use(errorHandler);
  return app;
}
