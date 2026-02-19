import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../../middleware/auth';

function mockReqResNext(user?: { userId: string; email: string; orgId: string; role: string }) {
  const req = { user } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('requireRole', () => {
  it('calls next when user has matching role', () => {
    const { req, res, next } = mockReqResNext({
      userId: 'u1',
      email: 'admin@example.com',
      orgId: 'org1',
      role: 'admin',
    });
    requireRole('admin', 'manager')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when user role does not match', () => {
    const { req, res, next } = mockReqResNext({
      userId: 'u1',
      email: 'user@example.com',
      orgId: 'org1',
      role: 'user',
    });
    requireRole('admin')(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
    });
  });

  it('returns 403 when req.user is undefined', () => {
    const { req, res, next } = mockReqResNext(undefined);
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
