import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createChecklistSchema,
  updateChecklistSchema,
  addChecklistItemSchema,
  updateChecklistItemSchema,
  submitApprovalSchema,
  approvalDecisionSchema,
} from '@checklists-vnext/shared';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../middleware/async-handler';
import {
  putItem,
  getItem,
  queryByPk,
  updateItem,
  deleteItem,
} from '../db/operations';
import { AppError } from '../middleware/error-handler';
import { config } from '../config';

const router = Router();
const s3 = new S3Client({ region: config.region });

// --- Checklists CRUD ---

router.post('/', validate(createChecklistSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const checklistId = uuid();
  const now = new Date().toISOString();

  let templateItems: any[] = [];
  if (req.body.templateId) {
    const template = await getItem(`ORG#${orgId}`, `TMPL#${req.body.templateId}`);
    if (template) {
      templateItems = (template.items as any[]) || [];
    }
  }

  const checklist = {
    PK: `ORG#${orgId}`,
    SK: `CL#${checklistId}`,
    GSI1PK: req.body.assigneeId ? `ASSIGN#${req.body.assigneeId}` : `ORG#${orgId}`,
    GSI1SK: `CL#${checklistId}`,
    GSI2PK: `ORG#${orgId}#STATUS`,
    GSI2SK: `draft#${req.body.dueDate || '9999-12-31'}#${checklistId}`,
    entityType: 'Checklist',
    checklistId,
    orgId,
    templateId: req.body.templateId,
    categoryId: req.body.categoryId,
    title: req.body.title,
    description: req.body.description,
    status: 'draft',
    assigneeId: req.body.assigneeId,
    ownerIds: req.body.ownerIds || [],
    teamId: req.body.teamId,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    dueDate: req.body.dueDate,
    recurrence: req.body.recurrence || 'none',
    createdBy: req.user!.userId,
    createdAt: now,
    updatedAt: now,
  };

  await putItem(checklist);

  for (const tItem of templateItems) {
    const itemId = uuid();
    await putItem({
      PK: `CL#${checklistId}`,
      SK: `ITEM#${String(tItem.sortOrder).padStart(5, '0')}`,
      entityType: 'ChecklistItem',
      itemId,
      checklistId,
      title: tItem.title,
      description: tItem.description,
      status: 'pending',
      sortOrder: tItem.sortOrder,
      required: tItem.required,
      hasDeviation: false,
      mediaUrl: tItem.mediaUrl,
      mediaType: tItem.mediaType,
      attachments: [],
    });
  }

  res.status(201).json({ data: checklist });
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const assigneeId = req.query.assigneeId as string;

  let result;
  if (assigneeId) {
    result = await queryByPk(`ASSIGN#${assigneeId}`, 'CL#', {
      limit: Number(req.query.limit) || 50,
      nextToken: req.query.nextToken as string,
      indexName: 'GSI1',
    });
  } else {
    result = await queryByPk(`ORG#${orgId}`, 'CL#', {
      limit: Number(req.query.limit) || 50,
      nextToken: req.query.nextToken as string,
    });
  }

  let items = result.items.filter((c: any) => c.orgId === orgId);

  const statusFilter = req.query.status as string;
  if (statusFilter) {
    items = items.filter((c: any) => c.status === statusFilter);
  }
  const teamIdFilter = req.query.teamId as string;
  if (teamIdFilter) {
    items = items.filter((c: any) => c.teamId === teamIdFilter);
  }
  const categoryIdFilter = req.query.categoryId as string;
  if (categoryIdFilter) {
    items = items.filter((c: any) => c.categoryId === categoryIdFilter);
  }
  const fromDate = req.query.fromDate as string;
  const toDate = req.query.toDate as string;
  if (fromDate) {
    items = items.filter((c: any) => (c.dueDate || c.endDate || '') >= fromDate);
  }
  if (toDate) {
    items = items.filter((c: any) => (c.dueDate || c.endDate || '') <= toDate);
  }

  res.json({ data: items, nextToken: result.nextToken });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const checklistId = req.params.id;

  const checklist = await getItem(`ORG#${orgId}`, `CL#${checklistId}`);
  if (!checklist) throw new AppError(404, 'NOT_FOUND', 'Checklist not found');

  const { items: checklistItems } = await queryByPk(`CL#${checklistId}`, 'ITEM#');
  const { items: approvals } = await queryByPk(`CL#${checklistId}`, 'APPROVAL#');

  res.json({
    data: { ...checklist, items: checklistItems, approvals },
  });
}));

router.patch('/:id', validate(updateChecklistSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const checklistId = req.params.id;
  const existing = await getItem(`ORG#${orgId}`, `CL#${checklistId}`);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Checklist not found');

  const updates: Record<string, unknown> = {
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  if (req.body.assigneeId !== undefined) {
    updates.GSI1PK = req.body.assigneeId
      ? `ASSIGN#${req.body.assigneeId}`
      : `ORG#${orgId}`;
  }
  if (req.body.dueDate !== undefined) {
    updates.GSI2SK = `${existing.status}#${req.body.dueDate || '9999-12-31'}#${checklistId}`;
  }

  await updateItem(`ORG#${orgId}`, `CL#${checklistId}`, updates);
  res.json({ data: { ...existing, ...updates } });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const checklistId = req.params.id;
  const existing = await getItem(`ORG#${orgId}`, `CL#${checklistId}`);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Checklist not found');

  const { items } = await queryByPk(`CL#${checklistId}`, 'ITEM#');
  for (const item of items) {
    await deleteItem(`CL#${checklistId}`, item.SK as string);
  }

  const { items: approvals } = await queryByPk(`CL#${checklistId}`, 'APPROVAL#');
  for (const approval of approvals) {
    await deleteItem(`CL#${checklistId}`, approval.SK as string);
  }

  await deleteItem(`ORG#${orgId}`, `CL#${checklistId}`);
  res.status(204).send();
}));

// --- Checklist Items ---

router.post('/:id/items', validate(addChecklistItemSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const checklistId = req.params.id;

  const checklist = await getItem(`ORG#${orgId}`, `CL#${checklistId}`);
  if (!checklist) throw new AppError(404, 'NOT_FOUND', 'Checklist not found');

  const { items: existingItems } = await queryByPk(`CL#${checklistId}`, 'ITEM#');
  const sortOrder = existingItems.length;
  const itemId = uuid();

  const item = {
    PK: `CL#${checklistId}`,
    SK: `ITEM#${String(sortOrder).padStart(5, '0')}`,
    entityType: 'ChecklistItem',
    itemId,
    checklistId,
    title: req.body.title,
    description: req.body.description,
    status: 'pending',
    sortOrder,
    required: req.body.required || false,
    hasDeviation: false,
    mediaUrl: req.body.mediaUrl,
    mediaType: req.body.mediaType,
    attachments: [],
  };

  await putItem(item);
  res.status(201).json({ data: item });
}));

router.patch('/:id/items/:itemId', validate(updateChecklistItemSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const checklistId = req.params.id;
  const itemId = req.params.itemId;

  const checklist = await getItem(`ORG#${orgId}`, `CL#${checklistId}`);
  if (!checklist) throw new AppError(404, 'NOT_FOUND', 'Checklist not found');

  const { items: allItems } = await queryByPk(`CL#${checklistId}`, 'ITEM#');
  const existingItem = allItems.find((i: any) => i.itemId === itemId);
  if (!existingItem) throw new AppError(404, 'NOT_FOUND', 'Item not found');

  const updates: Record<string, unknown> = { ...req.body };
  if (req.body.status === 'completed') {
    updates.completedBy = req.user!.userId;
    updates.completedAt = new Date().toISOString();
  }
  if (req.body.hasDeviation) {
    updates.status = 'deviation';
    updates.hasDeviation = true;
  }

  await updateItem(`CL#${checklistId}`, existingItem.SK as string, updates);
  res.json({ data: { ...existingItem, ...updates } });
}));

// --- Complete Checklist (user marks as executed) ---

router.post('/:id/complete', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const checklistId = req.params.id;

  const checklist = await getItem(`ORG#${orgId}`, `CL#${checklistId}`);
  if (!checklist) throw new AppError(404, 'NOT_FOUND', 'Checklist not found');

  const now = new Date().toISOString();
  await updateItem(`ORG#${orgId}`, `CL#${checklistId}`, {
    status: 'completed',
    completedAt: now,
    updatedAt: now,
    GSI2SK: `completed#${checklist.dueDate || '9999-12-31'}#${checklistId}`,
  });

  res.json({ data: { ...checklist, status: 'completed', completedAt: now } });
}));

// --- Item Media Upload ---

router.post('/:id/items/:itemId/media', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const checklistId = req.params.id;
  const itemId = req.params.itemId;
  const { fileName, mimeType } = req.body;

  if (!fileName || !mimeType) {
    throw new AppError(400, 'VALIDATION_ERROR', 'fileName and mimeType are required');
  }

  const checklist = await getItem(`ORG#${orgId}`, `CL#${checklistId}`);
  if (!checklist) throw new AppError(404, 'NOT_FOUND', 'Checklist not found');

  const { items: allItems } = await queryByPk(`CL#${checklistId}`, 'ITEM#');
  const existingItem = allItems.find((i: any) => i.itemId === itemId);
  if (!existingItem) throw new AppError(404, 'NOT_FOUND', 'Item not found');

  const mediaId = uuid();
  const s3Key = `${orgId}/${checklistId}/items/${itemId}/${mediaId}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: config.attachmentsBucket,
    Key: s3Key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  const mediaUrl = `https://${config.attachmentsBucket}.s3.${config.region}.amazonaws.com/${s3Key}`;
  await updateItem(`CL#${checklistId}`, existingItem.SK as string, {
    mediaUrl,
    mediaType: mimeType,
  });

  res.json({ data: { uploadUrl, s3Key, mediaUrl } });
}));

// --- Approval Workflow ---

router.post('/:id/submit', validate(submitApprovalSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const checklistId = req.params.id;

  const checklist = await getItem(`ORG#${orgId}`, `CL#${checklistId}`);
  if (!checklist) throw new AppError(404, 'NOT_FOUND', 'Checklist not found');

  const now = new Date().toISOString();

  for (const approverId of req.body.approverIds) {
    const approvalId = uuid();
    await putItem({
      PK: `CL#${checklistId}`,
      SK: `APPROVAL#${approverId}`,
      entityType: 'Approval',
      approvalId,
      checklistId,
      approverId,
      decision: 'pending',
      createdAt: now,
    });
  }

  await updateItem(`ORG#${orgId}`, `CL#${checklistId}`, {
    status: 'submitted',
    updatedAt: now,
    GSI2SK: `submitted#${checklist.dueDate || '9999-12-31'}#${checklistId}`,
  });

  res.json({ data: { ...checklist, status: 'submitted' } });
}));

router.post('/:id/approve', validate(approvalDecisionSchema), asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const checklistId = req.params.id;
  const approverId = req.user!.userId;

  const checklist = await getItem(`ORG#${orgId}`, `CL#${checklistId}`);
  if (!checklist) throw new AppError(404, 'NOT_FOUND', 'Checklist not found');

  const approval = await getItem(`CL#${checklistId}`, `APPROVAL#${approverId}`);
  if (!approval) throw new AppError(403, 'FORBIDDEN', 'You are not an approver for this checklist');

  const now = new Date().toISOString();
  await updateItem(`CL#${checklistId}`, `APPROVAL#${approverId}`, {
    decision: req.body.decision,
    comment: req.body.comment,
    decidedAt: now,
  });

  const newStatus = req.body.decision === 'approved' ? 'approved' : 'rejected';
  await updateItem(`ORG#${orgId}`, `CL#${checklistId}`, {
    status: newStatus,
    updatedAt: now,
    GSI2SK: `${newStatus}#${checklist.dueDate || '9999-12-31'}#${checklistId}`,
  });

  res.json({ data: { decision: req.body.decision, comment: req.body.comment } });
}));

// --- Attachments ---

router.post('/:id/attachments', asyncHandler(async (req: Request, res: Response) => {
  const orgId = req.user!.orgId;
  const checklistId = req.params.id;
  const { fileName, mimeType } = req.body;

  if (!fileName || !mimeType) {
    throw new AppError(400, 'VALIDATION_ERROR', 'fileName and mimeType are required');
  }

  const checklist = await getItem(`ORG#${orgId}`, `CL#${checklistId}`);
  if (!checklist) throw new AppError(404, 'NOT_FOUND', 'Checklist not found');

  const attachmentId = uuid();
  const s3Key = `${orgId}/${checklistId}/${attachmentId}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: config.attachmentsBucket,
    Key: s3Key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  res.json({
    data: { uploadUrl, s3Key, attachmentId },
  });
}));

export { router as checklistsRouter };
