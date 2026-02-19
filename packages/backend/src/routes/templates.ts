import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { createTemplateSchema, updateTemplateSchema } from '@checklists-vnext/shared';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/async-handler';
import { putItem, getItem, queryByPk, updateItem, deleteItem } from '../db/operations';
import { AppError } from '../middleware/error-handler';

const router = Router();

router.post('/', validate(createTemplateSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const templateId = uuid();
  const now = new Date().toISOString();

  const items = req.body.items.map((item: any, index: number) => ({
    itemId: uuid(),
    title: item.title,
    description: item.description,
    required: item.required,
    sortOrder: index,
  }));

  const template = {
    PK: `ORG#${orgId}`,
    SK: `TMPL#${templateId}`,
    entityType: 'ChecklistTemplate',
    templateId,
    orgId,
    title: req.body.title,
    description: req.body.description,
    items,
    recurrence: req.body.recurrence,
    createdBy: req.user!.userId,
    createdAt: now,
    updatedAt: now,
  };

  await putItem(template);
  res.status(201).json({ data: template });
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const { items, nextToken } = await queryByPk(`ORG#${orgId}`, 'TMPL#', {
    limit: Number(req.query.limit) || 50,
    nextToken: req.query.nextToken as string,
  });
  res.json({ data: items, nextToken });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const item = await getItem(`ORG#${orgId}`, `TMPL#${req.params.id}`);
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Template not found');
  res.json({ data: item });
}));

router.patch('/:id', validate(updateTemplateSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const templateId = req.params.id;
  const existing = await getItem(`ORG#${orgId}`, `TMPL#${templateId}`);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Template not found');

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (req.body.title) updates.title = req.body.title;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.recurrence) updates.recurrence = req.body.recurrence;
  if (req.body.items) {
    updates.items = req.body.items.map((item: any, index: number) => ({
      itemId: uuid(),
      title: item.title,
      description: item.description,
      required: item.required,
      sortOrder: index,
    }));
  }

  await updateItem(`ORG#${orgId}`, `TMPL#${templateId}`, updates);
  res.json({ data: { ...existing, ...updates } });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const templateId = req.params.id;
  const existing = await getItem(`ORG#${orgId}`, `TMPL#${templateId}`);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Template not found');

  await deleteItem(`ORG#${orgId}`, `TMPL#${templateId}`);
  res.status(204).send();
}));

export { router as templatesRouter };
