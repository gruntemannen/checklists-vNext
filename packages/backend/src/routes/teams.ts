import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { createTeamSchema, updateTeamSchema } from '@checklists-vnext/shared';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/async-handler';
import { putItem, getItem, queryByPk, updateItem, deleteItem } from '../db/operations';
import { AppError } from '../middleware/error-handler';

const router = Router();

router.use(requireRole('admin', 'manager'));

router.post('/', validate(createTeamSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const teamId = uuid();
  const now = new Date().toISOString();

  const team = {
    PK: `ORG#${orgId}`,
    SK: `TEAM#${teamId}`,
    GSI1PK: `TEAM#${teamId}`,
    GSI1SK: `ORG#${orgId}`,
    entityType: 'Team',
    teamId,
    orgId,
    name: req.body.name,
    description: req.body.description,
    visibility: req.body.visibility,
    managerId: req.body.managerId,
    memberIds: req.body.memberIds || [],
    createdAt: now,
    updatedAt: now,
  };

  await putItem(team);
  res.status(201).json({ data: team });
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const { items, nextToken } = await queryByPk(`ORG#${orgId}`, 'TEAM#', {
    limit: Number(req.query.limit) || 50,
    nextToken: req.query.nextToken as string,
  });
  res.json({ data: items, nextToken });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const item = await getItem(`ORG#${orgId}`, `TEAM#${req.params.id}`);
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Team not found');
  res.json({ data: item });
}));

router.patch('/:id', validate(updateTeamSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const teamId = req.params.id;
  const existing = await getItem(`ORG#${orgId}`, `TEAM#${teamId}`);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Team not found');

  const updates = { ...req.body, updatedAt: new Date().toISOString() };
  await updateItem(`ORG#${orgId}`, `TEAM#${teamId}`, updates);
  res.json({ data: { ...existing, ...updates } });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const teamId = req.params.id;
  const existing = await getItem(`ORG#${orgId}`, `TEAM#${teamId}`);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Team not found');

  await deleteItem(`ORG#${orgId}`, `TEAM#${teamId}`);
  res.status(204).send();
}));

export { router as teamsRouter };
