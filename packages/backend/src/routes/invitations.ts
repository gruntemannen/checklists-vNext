import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import {
  createInvitationSchema,
  bulkInvitationSchema,
} from '@checklists-vnext/shared';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/async-handler';
import { putItem, getItem, queryByPk, updateItem, deleteItem } from '../db/operations';
import { AppError } from '../middleware/error-handler';

const router = Router();

router.use(requireRole('admin'));

async function createInvitation(
  orgId: string,
  email: string,
  role: string,
  invitedBy: string,
  scheduledAt?: string,
) {
  const invitationId = uuid();
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const invitation = {
    PK: `ORG#${orgId}`,
    SK: `INVITE#${invitationId}`,
    GSI1PK: `EMAIL#${email}`,
    GSI1SK: `INVITE#${invitationId}`,
    entityType: 'Invitation',
    invitationId,
    orgId,
    email,
    role,
    status: scheduledAt ? 'scheduled' : 'pending',
    invitedBy,
    scheduledAt,
    expiresAt,
    createdAt: now,
  };

  await putItem(invitation);
  return invitation;
}

router.post('/', validate(createInvitationSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const { email, role, scheduledAt } = req.body;
  const invitation = await createInvitation(orgId, email, role, req.user!.userId, scheduledAt);
  res.status(201).json({ data: invitation });
}));

router.post('/bulk', validate(bulkInvitationSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const results = await Promise.all(
    req.body.invitations.map((inv: any) =>
      createInvitation(orgId, inv.email, inv.role, req.user!.userId, inv.scheduledAt),
    ),
  );
  res.status(201).json({ data: results });
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const { items, nextToken } = await queryByPk(`ORG#${orgId}`, 'INVITE#', {
    limit: Number(req.query.limit) || 50,
    nextToken: req.query.nextToken as string,
  });
  res.json({ data: items, nextToken });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const invitationId = req.params.id;
  const existing = await getItem(`ORG#${orgId}`, `INVITE#${invitationId}`);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Invitation not found');

  if (req.query.action === 'revoke') {
    await updateItem(`ORG#${orgId}`, `INVITE#${invitationId}`, {
      status: 'revoked',
    });
    res.json({ data: { ...existing, status: 'revoked' } });
  } else {
    await deleteItem(`ORG#${orgId}`, `INVITE#${invitationId}`);
    res.status(204).send();
  }
}));

export { router as invitationsRouter };
