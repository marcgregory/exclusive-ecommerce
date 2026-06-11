import { describe, expect, it, vi } from 'vitest';

describe('withTransaction', () => {
  it('retries deadlocks and releases each client once', async () => {
    vi.resetModules();

    const clients = [
      { query: vi.fn(), release: vi.fn() },
      { query: vi.fn(), release: vi.fn() },
    ];
    clients[0].query.mockResolvedValue({ rows: [], rowCount: 0 });
    clients[1].query.mockResolvedValue({ rows: [], rowCount: 0 });

    const connect = vi.fn().mockResolvedValueOnce(clients[0]).mockResolvedValueOnce(clients[1]);

    vi.doMock('pg', () => ({
      Pool: vi.fn().mockImplementation(() => ({ connect })),
    }));

    process.env.DATABASE_URL = 'postgres://example/test';
    const { withTransaction } = await import('./db.js');
    const deadlock = Object.assign(new Error('deadlock detected'), {
      code: '40P01',
    });
    const callback = vi.fn().mockRejectedValueOnce(deadlock).mockResolvedValueOnce('ok');

    await expect(withTransaction(callback)).resolves.toBe('ok');

    expect(connect).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(clients[0].query).toHaveBeenCalledWith('BEGIN');
    expect(clients[0].query).toHaveBeenCalledWith('ROLLBACK');
    expect(clients[1].query).toHaveBeenCalledWith('BEGIN');
    expect(clients[1].query).toHaveBeenCalledWith('COMMIT');
    expect(clients[0].release).toHaveBeenCalledTimes(1);
    expect(clients[1].release).toHaveBeenCalledTimes(1);

    vi.doUnmock('pg');
  });
});
