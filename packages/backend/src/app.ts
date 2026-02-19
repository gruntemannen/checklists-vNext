import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { usersRouter } from './routes/users';
import { invitationsRouter } from './routes/invitations';
import { teamsRouter } from './routes/teams';
import { checklistsRouter } from './routes/checklists';
import { templatesRouter } from './routes/templates';
import { categoriesRouter } from './routes/categories';
import { analyticsRouter } from './routes/analytics';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(authMiddleware);

app.use('/users', usersRouter);
app.use('/invitations', invitationsRouter);
app.use('/teams', teamsRouter);
app.use('/checklists', checklistsRouter);
app.use('/templates', templatesRouter);
app.use('/categories', categoriesRouter);
app.use('/analytics', analyticsRouter);

app.use(errorHandler);

export { app };
