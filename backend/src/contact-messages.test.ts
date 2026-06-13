import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Use vi.hoisted to define variables and set env vars before ESM imports are executed
const mocks = vi.hoisted(() => {
  process.env.RESEND_API_KEY = 're_test_key_12345';
  process.env.CONTACT_TO_EMAIL = 'business@example.com';
  process.env.NODE_ENV = 'test';

  return {
    dbQuery: vi.fn(),
    mockSend: vi.fn(),
    sessionUser: { value: undefined as any },
  };
});

// Set up mocks
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => {
      return {
        emails: {
          send: mocks.mockSend,
        },
      };
    }),
  };
});

vi.mock('./db.js', () => ({
  closePool: vi.fn(),
  query: mocks.dbQuery,
}));

vi.mock('./store.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./store.js')>();
  return {
    ...actual,
    getSessionUser: () => Promise.resolve(mocks.sessionUser.value),
  };
});

// Import app after setting up environment and mocks
import app from './index.js';

describe('Contact Us System APIs', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.dbQuery.mockReset();
    mocks.mockSend.mockReset();
    mocks.sessionUser.value = undefined;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('POST /api/contact', () => {
    it('validates contact submission and requires name, email, phone, and message', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({
          name: '',
          email: 'not-an-email',
          phone: '',
          message: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
      expect(mocks.dbQuery).not.toHaveBeenCalled();
      expect(mocks.mockSend).not.toHaveBeenCalled();
    });

    it('saves message to database and sends email notification on successful validation', async () => {
      // Mock successful DB insertion
      mocks.dbQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'msg-123',
            name: 'Jane Doe',
            email: 'jane@example.com',
            phone: '555-1234',
            message: 'Hello, I need assistance.',
            status: 'new',
            created_at: new Date().toISOString(),
          },
        ],
        rowCount: 1,
      });

      // Mock successful Resend email sending
      mocks.mockSend.mockResolvedValueOnce({ id: 'email-sent-id' });

      const res = await request(app)
        .post('/api/contact')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '555-1234',
          message: 'Hello, I need assistance.',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Message received');
      expect(res.body.contactMessage.id).toBe('msg-123');

      // Verify DB insertion was called with sanitized fields
      expect(mocks.dbQuery).toHaveBeenCalled();
      const insertCall = mocks.dbQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO contact_messages');
      expect(insertCall[1]).toEqual(expect.arrayContaining([
        'Jane Doe',
        'jane@example.com',
        '555-1234',
        'Hello, I need assistance.',
      ]));

      // Verify Resend email was sent with premium template
      expect(mocks.mockSend).toHaveBeenCalledWith({
        from: 'Contact Form <onboarding@resend.dev>',
        to: 'business@example.com',
        subject: expect.stringContaining('Jane Doe'),
        html: expect.stringContaining('Jane Doe'),
        text: expect.stringContaining('Name: Jane Doe'),
      });
    });

    it('handles email sending failure gracefully by throwing a server error', async () => {
      // Mock successful DB insertion
      mocks.dbQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'msg-123',
            name: 'Jane Doe',
            email: 'jane@example.com',
            phone: '555-1234',
            message: 'Hello',
            status: 'new',
            created_at: new Date().toISOString(),
          },
        ],
        rowCount: 1,
      });

      // Mock Resend email sending failure
      mocks.mockSend.mockRejectedValueOnce(new Error('Resend service unavailable'));

      const res = await request(app)
        .post('/api/contact')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '555-1234',
          message: 'Hello',
        });

      expect(res.status).toBe(500);
      expect(mocks.mockSend).toHaveBeenCalled();
    });
  });

  describe('GET /api/admin/contact-messages', () => {
    it('denies access to non-admin and unauthenticated users', async () => {
      mocks.sessionUser.value = undefined;
      const res1 = await request(app).get('/api/admin/contact-messages');
      expect(res1.status).toBe(401);

      mocks.sessionUser.value = { id: 'user-1', role: 'customer' };
      const res2 = await request(app).get('/api/admin/contact-messages');
      expect(res2.status).toBe(403);
    });

    it('allows access to admin users and returns contact messages with pagination', async () => {
      mocks.sessionUser.value = { id: 'admin-1', role: 'admin' };

      // Mock count query
      mocks.dbQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
      });

      // Mock list query
      mocks.dbQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'msg-123',
            name: 'Jane Doe',
            email: 'jane@example.com',
            phone: '555-1234',
            message: 'Hello',
            status: 'new',
            created_at: new Date().toISOString(),
          },
        ],
        rowCount: 1,
      });

      const res = await request(app)
        .get('/api/admin/contact-messages?page=1&limit=10')
        .set('Cookie', ['connect.sid=some-cookie']); // dummy session cookie

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);

      // Verify db query for count and list
      expect(mocks.dbQuery).toHaveBeenCalledTimes(2);
      expect(mocks.dbQuery.mock.calls[0][0]).toContain('SELECT COUNT(*)');
      expect(mocks.dbQuery.mock.calls[1][0]).toContain('SELECT * FROM contact_messages');
      expect(mocks.dbQuery.mock.calls[1][1]).toEqual(expect.arrayContaining([10, 0])); // limit=10, offset=0
    });
  });
});
