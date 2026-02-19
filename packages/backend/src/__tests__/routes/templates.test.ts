import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../db/operations', () => ({
  putItem: vi.fn(),
  getItem: vi.fn(),
  queryByPk: vi.fn().mockResolvedValue({ items: [], nextToken: undefined }),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

import { templatesRouter } from '../../routes/templates';
import { createTestApp } from '../helpers/test-app';
import { putItem, getItem, queryByPk, updateItem, deleteItem } from '../../db/operations';

const app = createTestApp(templatesRouter, '/templates');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /templates', () => {
  it('creates a template with items', async () => {
    const res = await request(app)
      .post('/templates')
      .send({
        title: 'Morning Check',
        items: [
          { title: 'Step 1', required: true },
          { title: 'Step 2', required: false },
        ],
        recurrence: 'daily',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      entityType: 'ChecklistTemplate',
      title: 'Morning Check',
      recurrence: 'daily',
      orgId: 'org-1',
    });
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items[0].sortOrder).toBe(0);
    expect(res.body.data.items[1].sortOrder).toBe(1);
    expect(putItem).toHaveBeenCalledOnce();
  });

  it('returns 400 for empty items', async () => {
    const res = await request(app)
      .post('/templates')
      .send({ title: 'Empty', items: [], recurrence: 'none' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid recurrence', async () => {
    const res = await request(app)
      .post('/templates')
      .send({
        title: 'Bad',
        items: [{ title: 'X', required: true }],
        recurrence: 'hourly',
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /templates', () => {
  it('returns list of templates', async () => {
    vi.mocked(queryByPk).mockResolvedValueOnce({
      items: [{ templateId: 't1', title: 'Template 1' }],
      nextToken: undefined,
    });

    const res = await request(app).get('/templates');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /templates/:id', () => {
  it('returns a template by id', async () => {
    vi.mocked(getItem).mockResolvedValueOnce({ templateId: 't1', title: 'My Template' });

    const res = await request(app).get('/templates/t1');

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('My Template');
  });

  it('returns 404 for non-existent template', async () => {
    vi.mocked(getItem).mockResolvedValueOnce(undefined);

    const res = await request(app).get('/templates/nope');

    expect(res.status).toBe(404);
  });
});

describe('PATCH /templates/:id', () => {
  it('updates template title', async () => {
    vi.mocked(getItem).mockResolvedValueOnce({ templateId: 't1', title: 'Old' });

    const res = await request(app)
      .patch('/templates/t1')
      .send({ title: 'Updated' });

    expect(res.status).toBe(200);
    expect(updateItem).toHaveBeenCalledOnce();
  });

  it('returns 404 if template does not exist', async () => {
    vi.mocked(getItem).mockResolvedValueOnce(undefined);

    const res = await request(app)
      .patch('/templates/nope')
      .send({ title: 'Updated' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /templates/:id', () => {
  it('deletes a template', async () => {
    vi.mocked(getItem).mockResolvedValueOnce({ templateId: 't1' });

    const res = await request(app).delete('/templates/t1');

    expect(res.status).toBe(204);
    expect(deleteItem).toHaveBeenCalledWith('ORG#org-1', 'TMPL#t1');
  });

  it('returns 404 if template does not exist', async () => {
    vi.mocked(getItem).mockResolvedValueOnce(undefined);

    const res = await request(app).delete('/templates/nope');

    expect(res.status).toBe(404);
  });
});
