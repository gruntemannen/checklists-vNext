import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler } from '../../middleware/error-handler';

function callErrorHandler(err: Error) {
  const req = {} as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  errorHandler(err, req, res, next);
  return { res };
}

describe('AppError', () => {
  it('stores statusCode, code, and message', () => {
    const err = new AppError(404, 'NOT_FOUND', 'User not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('User not found');
    expect(err.name).toBe('AppError');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('errorHandler', () => {
  it('returns correct status and body for AppError', () => {
    const err = new AppError(409, 'CONFLICT', 'Already exists');
    const { res } = callErrorHandler(err);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'CONFLICT', message: 'Already exists' },
    });
  });

  it('returns 500 for generic errors', () => {
    const err = new Error('Something broke');
    const { res } = callErrorHandler(err);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });
});
