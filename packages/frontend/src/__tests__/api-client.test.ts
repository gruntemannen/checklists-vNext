import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api/client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  api.setToken(null);
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiClient', () => {
  describe('setToken', () => {
    it('includes Authorization header when token is set', async () => {
      api.setToken('my-jwt-token');
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: [] }));

      await api.get('/users');

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Authorization']).toBe('Bearer my-jwt-token');
    });

    it('omits Authorization header when token is null', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: [] }));

      await api.get('/users');

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Authorization']).toBeUndefined();
    });
  });

  describe('get', () => {
    it('makes GET request to correct URL', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: 'ok' }));

      const result = await api.get('/health');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/health',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual({ data: 'ok' });
    });
  });

  describe('post', () => {
    it('makes POST request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { id: '1' } }, 201));

      const result = await api.post('/users', { name: 'Alice' });

      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ name: 'Alice' }));
      expect(result).toEqual({ data: { id: '1' } });
    });
  });

  describe('patch', () => {
    it('makes PATCH request', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ data: { updated: true } }));

      await api.patch('/users/1', { name: 'Bob' });

      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe('PATCH');
    });
  });

  describe('delete', () => {
    it('handles 204 No Content', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

      const result = await api.delete('/users/1');

      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws on non-ok response with error message', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: 'Not Found' } }),
          { status: 404 },
        ),
      );

      await expect(api.get('/users/nope')).rejects.toThrow('Not Found');
    });

    it('throws generic message when error body is unparseable', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('not json', { status: 500, statusText: 'Internal Server Error' }),
      );

      await expect(api.get('/crash')).rejects.toThrow('Internal Server Error');
    });
  });
});
