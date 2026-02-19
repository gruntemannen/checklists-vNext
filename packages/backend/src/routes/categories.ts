import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { createCategorySchema, updateCategorySchema } from '@checklists-vnext/shared';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/async-handler';
import { putItem, queryByPk, deleteItem, updateItem } from '../db/operations';

const router = Router();

router.use(requireRole('admin', 'manager'));

router.post('/', validate(createCategorySchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const categoryId = uuid();
  const now = new Date().toISOString();

  const category = {
    PK: `ORG#${orgId}`,
    SK: `CAT#${categoryId}`,
    entityType: 'Category',
    categoryId,
    orgId,
    name: req.body.name,
    description: req.body.description,
    createdAt: now,
  };

  await putItem(category);
  res.status(201).json({ data: category });
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const result = await queryByPk(`ORG#${orgId}`, 'CAT#', {
    limit: Number(req.query.limit) || 100,
    nextToken: req.query.nextToken as string,
  });
  res.json({ data: result.items, nextToken: result.nextToken });
}));

router.patch('/:id', validate(updateCategorySchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const categoryId = req.params.id;
  await updateItem(`ORG#${orgId}`, `CAT#${categoryId}`, {
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
  res.json({ data: { categoryId, ...req.body } });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const categoryId = req.params.id;
  await deleteItem(`ORG#${orgId}`, `CAT#${categoryId}`);
  res.status(204).send();
}));

export { router as categoriesRouter };
