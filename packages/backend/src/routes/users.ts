import { Router, Request, Response } from 'express';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { v4 as uuid } from 'uuid';
import { createUserSchema, updateUserSchema } from '@checklists-vnext/shared';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/async-handler';
import { putItem, getItem, queryByPk, updateItem, deleteItem } from '../db/operations';
import { AppError } from '../middleware/error-handler';
import { config } from '../config';

const router = Router();
const cognito = new CognitoIdentityProviderClient({ region: config.region });

router.get('/', requireRole('admin', 'manager'), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const { items, nextToken } = await queryByPk(`ORG#${orgId}`, 'USER#', {
    limit: Number(req.query.limit) || 50,
    nextToken: req.query.nextToken as string,
  });
  res.json({ data: items, nextToken });
}));

router.use(requireRole('admin'));

router.post('/', validate(createUserSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, displayName, role, teamIds, accessPeriodStart, accessPeriodEnd } = req.body;
  const orgId = req.user!.orgId;
  const userId = uuid();

  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: config.userPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: displayName },
          { Name: 'custom:orgId', Value: orgId },
          { Name: 'custom:role', Value: role },
        ],
        DesiredDeliveryMediums: ['EMAIL'],
      }),
    );
  } catch (err: any) {
    throw new AppError(400, 'COGNITO_ERROR', err.message);
  }

  const now = new Date().toISOString();
  const user = {
    PK: `ORG#${orgId}`,
    SK: `USER#${userId}`,
    GSI1PK: `USER#${userId}`,
    GSI1SK: `ORG#${orgId}`,
    entityType: 'User',
    userId,
    orgId,
    email,
    displayName,
    role,
    status: 'pending',
    teamIds: teamIds || [],
    accessPeriodStart,
    accessPeriodEnd,
    createdAt: now,
    updatedAt: now,
  };

  await putItem(user);
  res.status(201).json({ data: user });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const item = await getItem(`ORG#${orgId}`, `USER#${req.params.id}`);
  if (!item) throw new AppError(404, 'NOT_FOUND', 'User not found');
  res.json({ data: item });
}));

router.patch('/:id', validate(updateUserSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const userId = req.params.id;
  const existing = await getItem(`ORG#${orgId}`, `USER#${userId}`);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'User not found');

  const updates: Record<string, unknown> = {
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  if (req.body.role && existing.email) {
    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: config.userPoolId,
        Username: existing.email as string,
        UserAttributes: [{ Name: 'custom:role', Value: req.body.role }],
      }),
    );
  }

  await updateItem(`ORG#${orgId}`, `USER#${userId}`, updates);
  res.json({ data: { ...existing, ...updates } });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const userId = req.params.id;
  const existing = await getItem(`ORG#${orgId}`, `USER#${userId}`);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'User not found');

  const action = req.query.action || 'inactivate';

  if (action === 'delete') {
    await cognito.send(
      new AdminDeleteUserCommand({
        UserPoolId: config.userPoolId,
        Username: existing.email as string,
      }),
    );
    await deleteItem(`ORG#${orgId}`, `USER#${userId}`);
    res.status(204).send();
  } else {
    await cognito.send(
      new AdminDisableUserCommand({
        UserPoolId: config.userPoolId,
        Username: existing.email as string,
      }),
    );
    await updateItem(`ORG#${orgId}`, `USER#${userId}`, {
      status: 'inactive',
      updatedAt: new Date().toISOString(),
    });
    res.json({ data: { ...existing, status: 'inactive' } });
  }
}));

export { router as usersRouter };
