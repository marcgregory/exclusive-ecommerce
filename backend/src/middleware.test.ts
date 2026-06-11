import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Response } from 'express';
import type { AuthedRequest } from './middleware.js';

const makeRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

const makeNext = () => vi.fn() as unknown as NextFunction;

describe('auth middleware', () => {
  it('rejects unauthenticated requests with 401', async () => {
    vi.resetModules();
    vi.doMock('./store.js', () => ({
      getSessionUser: vi.fn().mockResolvedValue(undefined),
    }));
    const { requireUser: localRequireUser } = await import('./middleware.js');
    const req = {} as AuthedRequest;
    const res = makeRes();
    const next = makeNext();
    await localRequireUser(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    vi.doUnmock('./store.js');
  });

  it('rejects customers from admin routes with 403', async () => {
    const getSessionUser = vi.fn().mockResolvedValue({ id: 'u1', role: 'customer' });
    vi.resetModules();
    vi.doMock('./store.js', () => ({ getSessionUser }));
    const { requireAdmin: localRequireAdmin } = await import('./middleware.js');
    const req = {} as AuthedRequest;
    const res = makeRes();
    const next = makeNext();
    await localRequireAdmin(req, res, next);
    expect(getSessionUser).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    vi.doUnmock('./store.js');
  });

  it('allows admins through to next()', async () => {
    const admin = { id: 'admin-1', role: 'admin' };
    const getSessionUser = vi.fn().mockResolvedValue(admin);
    vi.resetModules();
    vi.doMock('./store.js', () => ({ getSessionUser }));
    const { requireAdmin: localRequireAdmin } = await import('./middleware.js');
    const req = {} as AuthedRequest;
    const res = makeRes();
    const next = makeNext();
    await localRequireAdmin(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toEqual(admin);
    expect(next).toHaveBeenCalled();
    vi.doUnmock('./store.js');
  });

  it('attaches the session user for requireUser', async () => {
    const user = { id: 'u1', role: 'customer' };
    const getSessionUser = vi.fn().mockResolvedValue(user);
    vi.resetModules();
    vi.doMock('./store.js', () => ({ getSessionUser }));
    const { requireUser: localRequireUser } = await import('./middleware.js');
    const req = {} as AuthedRequest;
    const res = makeRes();
    const next = makeNext();
    await localRequireUser(req, res, next);
    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalled();
    vi.doUnmock('./store.js');
  });

  it('returns 401 when requireAdmin receives unauthenticated request', async () => {
    const getSessionUser = vi.fn().mockResolvedValue(undefined);
    vi.resetModules();
    vi.doMock('./store.js', () => ({ getSessionUser }));
    const { requireAdmin: localRequireAdmin } = await import('./middleware.js');
    const req = {} as AuthedRequest;
    const res = makeRes();
    const next = makeNext();
    await localRequireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    vi.doUnmock('./store.js');
  });
});

describe('asyncRoute middleware wrapper', () => {
  it('catches synchronous errors and passes to error handler', async () => {
    const { asyncRoute } = await import('./middleware.js');
    const error = new Error('Sync error');
    const handler = vi.fn().mockImplementation(() => {
      throw error;
    });
    const req = {} as AuthedRequest;
    const res = makeRes();
    const next = makeNext();

    const wrappedHandler = asyncRoute(handler);
    await wrappedHandler(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('catches asynchronous errors and passes to error handler', async () => {
    const { asyncRoute } = await import('./middleware.js');
    const error = new Error('Async error');
    const handler = vi.fn().mockRejectedValue(error);
    const req = {} as AuthedRequest;
    const res = makeRes();
    const next = makeNext();

    const wrappedHandler = asyncRoute(handler);
    await wrappedHandler(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows handler to resolve without error', async () => {
    const { asyncRoute } = await import('./middleware.js');
    const handler = vi.fn().mockResolvedValue(undefined);
    const req = {} as AuthedRequest;
    const res = makeRes();
    const next = makeNext();

    const wrappedHandler = asyncRoute(handler);
    await wrappedHandler(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('handles sync handlers that call next', async () => {
    const { asyncRoute } = await import('./middleware.js');
    const handler = vi.fn().mockImplementation((req, res, next) => {
      next();
    });
    const req = {} as AuthedRequest;
    const res = makeRes();
    const next = makeNext();

    const wrappedHandler = asyncRoute(handler);
    await wrappedHandler(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
