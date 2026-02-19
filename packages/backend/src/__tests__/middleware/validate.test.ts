import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';

function mockReqResNext(body: unknown) {
  const req = { body } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

const schema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
});

describe('validate middleware', () => {
  it('calls next() on valid body', () => {
    const { req, res, next } = mockReqResNext({ name: 'Alice', age: 30 });
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('replaces req.body with parsed output (coercion/defaults)', () => {
    const { req, res, next } = mockReqResNext({ name: 'Alice', age: 30, extra: 'removed' });
    validate(schema)(req, res, next);
    expect(req.body).toEqual({ name: 'Alice', age: 30 });
  });

  it('returns 400 with VALIDATION_ERROR on invalid body', () => {
    const { req, res, next } = mockReqResNext({ name: '', age: -1 });
    validate(schema)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: expect.any(Array),
        }),
      }),
    );
  });

  it('returns 400 when required fields are missing', () => {
    const { req, res, next } = mockReqResNext({});
    validate(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
