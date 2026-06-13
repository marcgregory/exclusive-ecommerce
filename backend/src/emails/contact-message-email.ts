/**
 * Premium email template for Contact Us notifications.
 *
 * Generates Resend-compatible { subject, html, text } payloads with
 * award-winning inline-CSS styling that is safe across all major email clients.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactMessageEmailInput {
  name: string;
  email: string;
  phone: string;
  message: string;
  submittedAt: string; // ISO-8601 or human-readable date string
}

export interface ContactMessageEmailOutput {
  subject: string;
  html: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape user-provided content to prevent XSS / HTML-injection in emails.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Convert plain-text line breaks into `<br>` tags (after HTML-escaping).
 */
function nl2br(escaped: string): string {
  return escaped.replace(/\n/g, '<br>');
}

// ---------------------------------------------------------------------------
// Brand tokens (inline, no external CSS)
// ---------------------------------------------------------------------------

const BRAND = {
  name: 'Exclusive',
  accent: '#DB4444',       // primary red
  accentDark: '#C03B3B',
  accentLight: '#FFF0F0',
  bg: '#F4F4F5',           // soft gray background
  card: '#FFFFFF',
  text: '#1A1A2E',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  radius: '12px',
} as const;

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildContactMessageEmail(
  input: ContactMessageEmailInput,
): ContactMessageEmailOutput {
  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.email);
  const safePhone = escapeHtml(input.phone);
  const safeMessage = escapeHtml(input.message);
  const safeSubmittedAt = escapeHtml(input.submittedAt);

  const subject = `New contact message from ${safeName}`;

  // --- Plain-text fallback -------------------------------------------------
  const text = [
    `New Contact Message — ${BRAND.name}`,
    '',
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
    `Submitted At: ${input.submittedAt}`,
    '',
    'Message:',
    input.message,
    '',
    `— ${BRAND.name}`,
  ].join('\n');

  // --- HTML ----------------------------------------------------------------
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <!-- Outer wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.bg};padding:40px 0;">
    <tr>
      <td align="center">
        <!-- Inner card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;width:100%;background-color:${BRAND.card};border-radius:${BRAND.radius};overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- ═══════════ HEADER ═══════════ -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.accent} 0%,${BRAND.accentDark} 100%);padding:36px 40px 32px 40px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Brand name -->
                    <h1 style="margin:0 0 8px 0;font-size:28px;font-weight:800;letter-spacing:1.5px;color:#FFFFFF;text-transform:uppercase;">
                      ${BRAND.name}
                    </h1>
                    <!-- Divider dot -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px auto;">
                      <tr>
                        <td style="width:6px;height:6px;border-radius:50%;background-color:rgba(255,255,255,0.5);"></td>
                      </tr>
                    </table>
                    <!-- Badge -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td style="background-color:rgba(255,255,255,0.2);border-radius:20px;padding:6px 18px;font-size:12px;font-weight:600;color:#FFFFFF;letter-spacing:0.8px;text-transform:uppercase;">
                          &#9679;&ensp;New Contact Message
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══════════ TITLE ═══════════ -->
          <tr>
            <td style="padding:36px 40px 8px 40px;text-align:center;">
              <h2 style="margin:0;font-size:22px;font-weight:700;color:${BRAND.text};line-height:1.3;">
                Customer Inquiry Received
              </h2>
              <p style="margin:10px 0 0 0;font-size:14px;color:${BRAND.textMuted};line-height:1.5;">
                A visitor has submitted a message through the contact form.
              </p>
            </td>
          </tr>

          <!-- ═══════════ CONTACT DETAILS ═══════════ -->
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <!-- Details grid — two-column on wide clients, stacks in narrow -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <!-- Name -->
                  <td width="50%" style="padding:0 6px 12px 0;vertical-align:top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.bg};border-radius:8px;border:1px solid ${BRAND.border};">
                      <tr>
                        <td style="padding:16px;">
                          <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:${BRAND.textMuted};text-transform:uppercase;letter-spacing:0.6px;">Name</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.text};word-break:break-word;">${safeName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Email -->
                  <td width="50%" style="padding:0 0 12px 6px;vertical-align:top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.bg};border-radius:8px;border:1px solid ${BRAND.border};">
                      <tr>
                        <td style="padding:16px;">
                          <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:${BRAND.textMuted};text-transform:uppercase;letter-spacing:0.6px;">Email</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.accent};word-break:break-word;">
                            <a href="mailto:${safeEmail}" style="color:${BRAND.accent};text-decoration:none;">${safeEmail}</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <!-- Phone -->
                  <td width="50%" style="padding:0 6px 12px 0;vertical-align:top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.bg};border-radius:8px;border:1px solid ${BRAND.border};">
                      <tr>
                        <td style="padding:16px;">
                          <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:${BRAND.textMuted};text-transform:uppercase;letter-spacing:0.6px;">Phone</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.text};word-break:break-word;">${safePhone}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Submitted At -->
                  <td width="50%" style="padding:0 0 12px 6px;vertical-align:top;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.bg};border-radius:8px;border:1px solid ${BRAND.border};">
                      <tr>
                        <td style="padding:16px;">
                          <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:${BRAND.textMuted};text-transform:uppercase;letter-spacing:0.6px;">Submitted At</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.text};word-break:break-word;">${safeSubmittedAt}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══════════ MESSAGE PANEL ═══════════ -->
          <tr>
            <td style="padding:12px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BRAND.accentLight};border-radius:8px;border-left:4px solid ${BRAND.accent};">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;color:${BRAND.accent};text-transform:uppercase;letter-spacing:0.6px;">Message</p>
                    <p style="margin:0;font-size:14px;color:${BRAND.text};line-height:1.7;word-break:break-word;">${nl2br(safeMessage)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══════════ DIVIDER ═══════════ -->
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid ${BRAND.border};font-size:0;line-height:0;height:1px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══════════ FOOTER ═══════════ -->
          <tr>
            <td style="padding:24px 40px 36px 40px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;color:${BRAND.textMuted};line-height:1.5;">
                This email was sent by <strong style="color:${BRAND.text};">${BRAND.name}</strong> contact form system.
              </p>
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.5;">
                &copy; ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Inner card -->
      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->
</body>
</html>`;

  return { subject, html, text };
}
