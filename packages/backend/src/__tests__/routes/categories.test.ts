import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../db/operations', () => ({
  putItem: vi.fn(),
  getItem: vi.fn(),
  queryByPk: vi.fn().mockResolvedValue({ items: [], nextToken: undefined }),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

import { categoriesRouter } from '../../routes/categories';
import { createTestApp } from '../helpers/test-app';
import { putItem, queryByPk, deleteItem } from '../../db/operations';

const app = createTestApp(categoriesRouter, '/categories');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /categories', () => {
  it('creates a category with valid data', async () => {
    const res = await request(app)
      .post('/categories')
      .send({ name: 'Safety' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      entityType: 'Category',
      name: 'Safety',
      orgId: 'org-1',
    });
    expect(putItem).toHaveBeenCalledOnce();
  });

  it('returns 400 for empty name', async () => {
    const res = await request(app)
      .post('/categories')
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a category with optional description', async () => {
    const res = await request(app)
      .post('/categories')
      .send({ name: 'Quality', description: 'Quality control checks' });

    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe('Quality control checks');
  });
});

describe('GET /categories', () => {
  it('returns list of categories', async () => {
    const mockCategories = [
      { categoryId: 'c1', name: 'Safety', orgId: 'org-1' },
      { categoryId: 'c2', name: 'Quality', orgId: 'org-1' },
    ];
    vi.mocked(queryByPk).mockResolvedValueOnce({ items: mockCategories, nextToken: undefined });

    const res = await request(app).get('/categories');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(queryByPk).toHaveBeenCalledWith('ORG#org-1', 'CAT#', expect.any(Object));
  });
});

describe('DELETE /categories/:id', () => {
  it('deletes a category', async () => {
    const res = await request(app).delete('/categories/cat-123');

    expect(res.status).toBe(204);
    expect(deleteItem).toHaveBeenCalledWith('ORG#org-1', 'CAT#cat-123');
  });
});
