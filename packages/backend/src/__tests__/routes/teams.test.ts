import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../db/operations', () => ({
  putItem: vi.fn(),
  getItem: vi.fn(),
  queryByPk: vi.fn().mockResolvedValue({ items: [], nextToken: undefined }),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

import { teamsRouter } from '../../routes/teams';
import { createTestApp } from '../helpers/test-app';
import { putItem, getItem, queryByPk, updateItem, deleteItem } from '../../db/operations';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';
const app = createTestApp(teamsRouter, '/teams');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /teams', () => {
  it('creates a team with valid data', async () => {
    const res = await request(app)
      .post('/teams')
      .send({ name: 'Engineering', visibility: 'public', managerId: validUuid });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      entityType: 'Team',
      name: 'Engineering',
      visibility: 'public',
      managerId: validUuid,
      orgId: 'org-1',
    });
    expect(putItem).toHaveBeenCalledOnce();
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/teams')
      .send({ name: 'Engineering' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid visibility', async () => {
    const res = await request(app)
      .post('/teams')
      .send({ name: 'Engineering', visibility: 'secret', managerId: validUuid });

    expect(res.status).toBe(400);
  });
});

describe('GET /teams', () => {
  it('returns list of teams', async () => {
    const mockTeams = [
      { teamId: 't1', name: 'Engineering', orgId: 'org-1' },
    ];
    vi.mocked(queryByPk).mockResolvedValueOnce({ items: mockTeams, nextToken: undefined });

    const res = await request(app).get('/teams');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /teams/:id', () => {
  it('returns a team by id', async () => {
    const mockTeam = { teamId: 't1', name: 'Engineering', orgId: 'org-1' };
    vi.mocked(getItem).mockResolvedValueOnce(mockTeam);

    const res = await request(app).get('/teams/t1');

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Engineering');
  });

  it('returns 404 for non-existent team', async () => {
    vi.mocked(getItem).mockResolvedValueOnce(undefined);

    const res = await request(app).get('/teams/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /teams/:id', () => {
  it('updates a team', async () => {
    vi.mocked(getItem).mockResolvedValueOnce({ teamId: 't1', name: 'Old Name', orgId: 'org-1' });

    const res = await request(app)
      .patch('/teams/t1')
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('New Name');
    expect(updateItem).toHaveBeenCalledOnce();
  });

  it('returns 404 if team does not exist', async () => {
    vi.mocked(getItem).mockResolvedValueOnce(undefined);

    const res = await request(app)
      .patch('/teams/nonexistent')
      .send({ name: 'New Name' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /teams/:id', () => {
  it('deletes a team', async () => {
    vi.mocked(getItem).mockResolvedValueOnce({ teamId: 't1', orgId: 'org-1' });

    const res = await request(app).delete('/teams/t1');

    expect(res.status).toBe(204);
    expect(deleteItem).toHaveBeenCalledWith('ORG#org-1', 'TEAM#t1');
  });

  it('returns 404 if team does not exist', async () => {
    vi.mocked(getItem).mockResolvedValueOnce(undefined);

    const res = await request(app).delete('/teams/nonexistent');

    expect(res.status).toBe(404);
  });
});
