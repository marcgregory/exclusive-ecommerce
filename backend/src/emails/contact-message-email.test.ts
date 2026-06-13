import { describe, expect, it } from 'vitest';
import {
  buildContactMessageEmail,
  escapeHtml,
  type ContactMessageEmailInput,
} from './contact-message-email.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASIC_INPUT: ContactMessageEmailInput = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+1-555-0199',
  message: 'I would like to learn more about your products.',
  submittedAt: '2026-06-13T14:00:00Z',
};

const XSS_INPUT: ContactMessageEmailInput = {
  name: '<script>alert("xss")</script>',
  email: 'hacker@evil.com<img src=x onerror=alert(1)>',
  phone: '555&"<>\'',
  message: '<b>Bold</b> & "quoted" <a href="javascript:void(0)">link</a>',
  submittedAt: '<em>now</em>',
};

const MULTILINE_INPUT: ContactMessageEmailInput = {
  ...BASIC_INPUT,
  message: 'Line one.\nLine two.\nLine three.',
};

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('escapes a combined dangerous string', () => {
    const result = escapeHtml('<script>alert("xss")</script>');
    expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(result).not.toContain('<script');
  });
});

// ---------------------------------------------------------------------------
// buildContactMessageEmail — subject
// ---------------------------------------------------------------------------

describe('buildContactMessageEmail', () => {
  describe('subject', () => {
    it('includes the sender name', () => {
      const { subject } = buildContactMessageEmail(BASIC_INPUT);
      expect(subject).toBe('New contact message from Jane Doe');
    });

    it('escapes the sender name in the subject', () => {
      const { subject } = buildContactMessageEmail(XSS_INPUT);
      expect(subject).toContain('&lt;script&gt;');
      expect(subject).not.toContain('<script>');
    });
  });

  // -------------------------------------------------------------------------
  // HTML output
  // -------------------------------------------------------------------------

  describe('html', () => {
    it('contains the brand name', () => {
      const { html } = buildContactMessageEmail(BASIC_INPUT);
      expect(html).toContain('Exclusive');
    });

    it('contains the badge text', () => {
      const { html } = buildContactMessageEmail(BASIC_INPUT);
      expect(html).toContain('New Contact Message');
    });

    it('contains the section title', () => {
      const { html } = buildContactMessageEmail(BASIC_INPUT);
      expect(html).toContain('Customer Inquiry Received');
    });

    it('includes all contact fields', () => {
      const { html } = buildContactMessageEmail(BASIC_INPUT);
      expect(html).toContain('Jane Doe');
      expect(html).toContain('jane@example.com');
      expect(html).toContain('+1-555-0199');
      expect(html).toContain('2026-06-13T14:00:00Z');
    });

    it('includes the customer message', () => {
      const { html } = buildContactMessageEmail(BASIC_INPUT);
      expect(html).toContain(
        'I would like to learn more about your products.',
      );
    });

    it('escapes all user-provided XSS content in HTML', () => {
      const { html } = buildContactMessageEmail(XSS_INPUT);

      // Name must be escaped
      expect(html).toContain(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
      expect(html).not.toContain('<script>alert');

      // Email must be escaped
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).not.toContain('<img src=x');

      // Phone must be escaped
      expect(html).toContain('555&amp;&quot;&lt;&gt;&#39;');

      // Message must be escaped
      expect(html).toContain('&lt;b&gt;Bold&lt;/b&gt;');
      expect(html).not.toContain('<b>Bold</b>');

      // Submitted At must be escaped
      expect(html).toContain('&lt;em&gt;now&lt;/em&gt;');
      expect(html).not.toContain('<em>now</em>');
    });

    it('converts newlines in message to <br> tags', () => {
      const { html } = buildContactMessageEmail(MULTILINE_INPUT);
      expect(html).toContain('Line one.<br>Line two.<br>Line three.');
    });

    it('uses inline styles only (no <style> or <link> tags)', () => {
      const { html } = buildContactMessageEmail(BASIC_INPUT);
      // Should not contain a <style> block
      expect(html).not.toMatch(/<style[\s>]/i);
      // Should not contain a <link rel="stylesheet"> tag
      expect(html).not.toMatch(/<link[^>]*stylesheet/i);
    });

    it('does not contain <script> tags', () => {
      const { html } = buildContactMessageEmail(BASIC_INPUT);
      expect(html).not.toMatch(/<script[\s>]/i);
    });

    it('is valid XHTML (starts with DOCTYPE and has closing tags)', () => {
      const { html } = buildContactMessageEmail(BASIC_INPUT);
      expect(html).toContain('<!DOCTYPE');
      expect(html).toContain('</html>');
      expect(html).toContain('</body>');
    });

    it('sets max-width of 640px on the inner card', () => {
      const { html } = buildContactMessageEmail(BASIC_INPUT);
      expect(html).toContain('max-width:640px');
    });
  });

  // -------------------------------------------------------------------------
  // Plain-text fallback
  // -------------------------------------------------------------------------

  describe('text (plain-text fallback)', () => {
    it('contains all contact fields', () => {
      const { text } = buildContactMessageEmail(BASIC_INPUT);
      expect(text).toContain('Name: Jane Doe');
      expect(text).toContain('Email: jane@example.com');
      expect(text).toContain('Phone: +1-555-0199');
      expect(text).toContain('Submitted At: 2026-06-13T14:00:00Z');
    });

    it('contains the message body', () => {
      const { text } = buildContactMessageEmail(BASIC_INPUT);
      expect(text).toContain(
        'I would like to learn more about your products.',
      );
    });

    it('contains the brand name', () => {
      const { text } = buildContactMessageEmail(BASIC_INPUT);
      expect(text).toContain('Exclusive');
    });

    it('uses raw (unescaped) values in plain text', () => {
      const { text } = buildContactMessageEmail(XSS_INPUT);
      // Plain text should contain raw values (no HTML to exploit)
      expect(text).toContain('Name: <script>alert("xss")</script>');
      expect(text).toContain('<b>Bold</b> & "quoted"');
    });
  });
});
