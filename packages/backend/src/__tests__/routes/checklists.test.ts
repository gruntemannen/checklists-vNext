import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../db/operations', () => ({
  putItem: vi.fn(),
  getItem: vi.fn(),
  queryByPk: vi.fn().mockResolvedValue({ items: [], nextToken: undefined }),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

vi.mock('../../config', () => ({
  config: {
    tableName: 'test-table',
    userPoolId: 'test-pool',
    attachmentsBucket: 'test-bucket',
    region: 'eu-north-1',
    nodeEnv: 'test',
  },
}));

vi.mock('@aws-sdk/client-s3', () => {
  const S3Client = vi.fn();
  S3Client.prototype = {};
  return { S3Client, PutObjectCommand: vi.fn() };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://presigned-url.example.com'),
}));

import { checklistsRouter } from '../../routes/checklists';
import { createTestApp } from '../helpers/test-app';
import { putItem, getItem, queryByPk, updateItem, deleteItem } from '../../db/operations';

const app = createTestApp(checklistsRouter, '/checklists');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(queryByPk).mockResolvedValue({ items: [], nextToken: undefined });
});

describe('POST /checklists', () => {
  it('creates a checklist', async () => {
    const res = await request(app)
      .post('/checklists')
      .send({ title: 'Morning Round' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      entityType: 'Checklist',
      title: 'Morning Round',
      status: 'draft',
      orgId: 'org-1',
      recurrence: 'none',
    });
    expect(putItem).toHaveBeenCalledOnce();
  });

  it('creates checklist from template and copies items', async () => {
    const templateUuid = '550e8400-e29b-41d4-a716-446655440000';
    vi.mocked(getItem).mockResolvedValueOnce({
      templateId: templateUuid,
      items: [
        { title: 'Step 1', required: true, sortOrder: 0 },
        { title: 'Step 2', required: false, sortOrder: 1 },
      ],
    });

    const res = await request(app)
      .post('/checklists')
      .send({ title: 'From Template', templateId: templateUuid });

    expect(res.status).toBe(201);
    // 1 checklist + 2 items
    expect(putItem).toHaveBeenCalledTimes(3);
  });

  it('returns 400 for empty title', async () => {
    const res = await request(app)
      .post('/checklists')
      .send({ title: '' });

    expect(res.status).toBe(400);
  });
});

describe('GET /checklists', () => {
  it('returns checklists for the org', async () => {
    vi.mocked(queryByPk).mockResolvedValueOnce({
      items: [
        { checklistId: 'c1', title: 'CL 1', orgId: 'org-1', status: 'draft' },
        { checklistId: 'c2', title: 'CL 2', orgId: 'org-1', status: 'completed' },
      ],
      nextToken: undefined,
    });

    const res = await request(app).get('/checklists');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('filters by status', async () => {
    vi.mocked(queryByPk).mockResolvedValueOnce({
      items: [
        { checklistId: 'c1', orgId: 'org-1', status: 'draft' },
        { checklistId: 'c2', orgId: 'org-1', status: 'completed' },
      ],
      nextToken: undefined,
    });

    const res = await request(app).get('/checklists?status=completed');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].checklistId).toBe('c2');
  });

  it('filters by assigneeId using GSI1', async () => {
    vi.mocked(queryByPk).mockResolvedValueOnce({
      items: [{ checklistId: 'c1', orgId: 'org-1', status: 'active' }],
      nextToken: undefined,
    });

    const res = await request(app).get('/checklists?assigneeId=user-42');

    expect(res.status).toBe(200);
    expect(queryByPk).toHaveBeenCalledWith('ASSIGN#user-42', 'CL#', expect.objectContaining({ indexName: 'GSI1' }));
  });

  it('filters out checklists from other orgs', async () => {
    vi.mocked(queryByPk).mockResolvedValueOnce({
      items: [
        { checklistId: 'c1', orgId: 'org-1', status: 'draft' },
        { checklistId: 'c2', orgId: 'other-org', status: 'draft' },
      ],
      nextToken: undefined,
    });

    const res = await request(app).get('/checklists');

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].orgId).toBe('org-1');
  });
});

describe('GET /checklists/:id', () => {
  it('returns checklist with items and approvals', async () => {
    vi.mocked(getItem).mockResolvedValueOnce({ checklistId: 'c1', title: 'CL 1', orgId: 'org-1' });
    vi.mocked(queryByPk)
      .mockResolvedValueOnce({ items: [{ itemId: 'i1', title: 'Item 1' }], nextToken: undefined })
      .mockResolvedValueOnce({ items: [], nextToken: undefined });

    const res = await request(app).get('/checklists/c1');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.approvals).toHaveLength(0);
  });

  it('returns 404 for non-existent checklist', async () => {
    vi.mocked(getItem).mockResolvedValueOnce(undefined);

    const res = await request(app).get('/checklists/nope');

    expect(res.status).toBe(404);
  });
});

describe('PATCH /checklists/:id', () => {
  it('updates checklist fields', async () => {
    vi.mocked(getItem).mockResolvedValueOnce({ checklistId: 'c1', orgId: 'org-1', status: 'draft' });

    const res = await request(app)
      .patch('/checklists/c1')
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Title');
    expect(updateItem).toHaveBeenCalledOnce();
  });

  it('updates GSI1PK when assigneeId changes', async () => {
    const assigneeUuid = '550e8400-e29b-41d4-a716-446655440000';
    vi.mocked(getItem).mockResolvedValueOnce({ checklistId: 'c1', orgId: 'org-1' });

    await request(app)
      .patch('/checklists/c1')
      .send({ assigneeId: assigneeUuid });

    const updateCall = vi.mocked(updateItem).mock.calls[0];
    expect(updateCall[2]).toMatchObject({
      GSI1PK: `ASSIGN#${assigneeUuid}`,
    });
  });
});

describe('DELETE /checklists/:id', () => {
  it('deletes checklist, items, and approvals', async () => {
    vi.mocked(getItem).mockResolvedValueOnce({ checklistId: 'c1', orgId: 'org-1' });
    vi.mocked(queryByPk)
      .mockResolvedValueOnce({ items: [{ SK: 'ITEM#00000' }], nextToken: undefined })
      .mockResolvedValueOnce({ items: [{ SK: 'APPROVAL#user1' }], nextToken: undefined });

    const res = await request(app).delete('/checklists/c1');

    expect(res.status).toBe(204);
    expect(deleteItem).toHaveBeenCalledTimes(3); // 1 item + 1 approval + checklist itself
  });
});

describe('POST /checklists/:id/items', () => {
  it('adds an item to a checklist', async () => {
    vi.mocked(getItem).mockResolvedValueOnce({ checklistId: 'c1', orgId: 'org-1' });
    vi.mocked(queryByPk).mockResolvedValueOnce({ items: [{ itemId: 'existing' }], nextToken: undefined });

    const res = await request(app)
      .post('/checklists/c1/items')
      .send({ title: 'New Item' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: 'New Item',
      status: 'pending',
      sortOrder: 1,
      required: false,
    });
  });

  it('returns 404 if checklist does not exist', async () => {
    vi.mocked(getItem).mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/checklists/nope/items')
      .send({ title: 'Item' });

    expect(res.status).toBe(404);
  });
});

describe('POST /checklists/:id/complete', () => {
  it('marks a checklist as completed', async () => {
    vi.mocked(getItem).mockResolvedValueOnce({
      checklistId: 'c1',
      orgId: 'org-1',
      status: 'in_progress',
      dueDate: '2025-03-01T00:00:00Z',
    });

    const res = await request(app).post('/checklists/c1/complete');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.completedAt).toBeDefined();
    expect(updateItem).toHaveBeenCalledWith(
      'ORG#org-1',
      'CL#c1',
      expect.objectContaining({ status: 'completed' }),
    );
  });
});

describe('POST /checklists/:id/submit', () => {
  it('submits checklist for approval', async () => {
    const approverUuid = '550e8400-e29b-41d4-a716-446655440000';
    vi.mocked(getItem).mockResolvedValueOnce({ checklistId: 'c1', orgId: 'org-1' });

    const res = await request(app)
      .post('/checklists/c1/submit')
      .send({ approverIds: [approverUuid] });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('submitted');
    expect(putItem).toHaveBeenCalledOnce(); // approval record
  });
});

describe('POST /checklists/:id/approve', () => {
  it('approves a checklist', async () => {
    vi.mocked(getItem)
      .mockResolvedValueOnce({ checklistId: 'c1', orgId: 'org-1', status: 'submitted' })
      .mockResolvedValueOnce({ approvalId: 'a1', decision: 'pending' });

    const res = await request(app)
      .post('/checklists/c1/approve')
      .send({ decision: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.data.decision).toBe('approved');
  });

  it('returns 403 when user is not an approver', async () => {
    vi.mocked(getItem)
      .mockResolvedValueOnce({ checklistId: 'c1', orgId: 'org-1' })
      .mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/checklists/c1/approve')
      .send({ decision: 'approved' });

    expect(res.status).toBe(403);
  });
});
