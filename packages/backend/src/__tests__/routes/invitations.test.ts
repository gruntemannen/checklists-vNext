import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../db/operations', () => ({
  putItem: vi.fn(),
  getItem: vi.fn(),
  queryByPk: vi.fn().mockResolvedValue({ items: [], nextToken: undefined }),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));

import { invitationsRouter } from '../../routes/invitations';
import { createTestApp } from '../helpers/test-app';
import { putItem, getItem, queryByPk, updateItem, deleteItem } from '../../db/operations';

const app = createTestApp(invitationsRouter, '/invitations');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /invitations', () => {
  it('creates a single invitation', async () => {
    const res = await request(app)
      .post('/invitations')
      .send({ email: 'new@example.com', role: 'user' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      entityType: 'Invitation',
      email: 'new@example.com',
      role: 'user',
      status: 'pending',
      orgId: 'org-1',
    });
    expect(res.body.data.expiresAt).toBeDefined();
    expect(putItem).toHaveBeenCalledOnce();
  });

  it('creates a scheduled invitation', async () => {
    const res = await request(app)
      .post('/invitations')
      .send({ email: 'scheduled@example.com', role: 'manager', scheduledAt: '2025-06-01T09:00:00Z' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('scheduled');
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/invitations')
      .send({ email: 'bad-email', role: 'user' });

    expect(res.status).toBe(400);
  });
});

describe('POST /invitations/bulk', () => {
  it('creates multiple invitations', async () => {
    const res = await request(app)
      .post('/invitations/bulk')
      .send({
        invitations: [
          { email: 'a@example.com', role: 'user' },
          { email: 'b@example.com', role: 'manager' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(2);
    expect(putItem).toHaveBeenCalledTimes(2);
  });

  it('returns 400 for empty invitations', async () => {
    const res = await request(app)
      .post('/invitations/bulk')
      .send({ invitations: [] });

    expect(res.status).toBe(400);
  });
});

describe('GET /invitations', () => {
  it('returns list of invitations', async () => {
    vi.mocked(queryByPk).mockResolvedValueOnce({
      items: [{ invitationId: 'i1', email: 'a@example.com' }],
      nextToken: undefined,
    });

    const res = await request(app).get('/invitations');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('DELETE /invitations/:id', () => {
  it('revokes an invitation when action=revoke', async () => {
    vi.mocked(getItem).mockResolvedValueOnce({ invitationId: 'i1', status: 'pending' });

    const res = await request(app).delete('/invitations/i1?action=revoke');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('revoked');
    expect(updateItem).toHaveBeenCalledWith('ORG#org-1', 'INVITE#i1', { status: 'revoked' });
  });

  it('permanently deletes when no action specified', async () => {
    vi.mocked(getItem).mockResolvedValueOnce({ invitationId: 'i1' });

    const res = await request(app).delete('/invitations/i1');

    expect(res.status).toBe(204);
    expect(deleteItem).toHaveBeenCalledWith('ORG#org-1', 'INVITE#i1');
  });

  it('returns 404 for non-existent invitation', async () => {
    vi.mocked(getItem).mockResolvedValueOnce(undefined);

    const res = await request(app).delete('/invitations/nope');

    expect(res.status).toBe(404);
  });
});
