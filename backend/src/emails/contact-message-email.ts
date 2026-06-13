/**
 * Premium email template for Contact Us notifications.
 *
 * Generates Resend-compatible { subject, html, text } payloads.
 * Design: Stripe / Linear / Vercel-level SaaS aesthetic.
 * Layout: table-based, inline CSS only, email-client safe.
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
// Design tokens — Stripe / Linear inspired palette
// ---------------------------------------------------------------------------

const T = {
  name: 'Exclusive',
  // Colors
  bg: '#F7F7F8',
  surface: '#FFFFFF',
  text: '#0A0A0B',
  textSecondary: '#6E6E80',
  textTertiary: '#A1A1AA',
  accent: '#DB4444',
  accentHover: '#C73A3A',
  accentSubtle: '#FEF2F2',
  border: '#EBEBEF',
  // Spacing
  outerPad: '0',
  cardPad: '48px',
  sectionGap: '40px',
  // Dimensions
  cardWidth: '640',
  radius: '16px',
} as const;

// Reusable system font stack (same as Stripe / Linear)
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

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
    `New Contact Message — ${T.name}`,
    '',
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
    `Submitted At: ${input.submittedAt}`,
    '',
    'Message:',
    input.message,
    '',
    `— ${T.name}`,
  ].join('\n');

  // --- HTML (Stripe / Linear aesthetic) ------------------------------------
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
<body style="margin:0;padding:0;background-color:${T.bg};font-family:${FONT};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;color:${T.text};">

  <!-- ── Outer wrapper ── -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${T.bg};">
    <tr>
      <td align="center" style="padding:60px 24px;">

        <!-- ── Card ── -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${T.cardWidth}" style="max-width:640px;width:100%;background-color:${T.surface};border-radius:${T.radius};border:1px solid ${T.border};">


          <!-- ════════════════ BRAND HEADER ════════════════ -->
          <tr>
            <td style="padding:${T.cardPad} ${T.cardPad} 0 ${T.cardPad};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;font-size:18px;font-weight:700;letter-spacing:-0.2px;color:${T.text};">${T.name}</p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:${T.accentSubtle};border-radius:100px;padding:5px 14px;">
                          <p style="margin:0;font-size:12px;font-weight:600;color:${T.accent};letter-spacing:0.01em;">New Contact Message</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- ════════════════ HERO ════════════════ -->
          <tr>
            <td style="padding:${T.sectionGap} ${T.cardPad} 0 ${T.cardPad};">
              <h1 style="margin:0;font-size:26px;font-weight:700;line-height:1.25;letter-spacing:-0.4px;color:${T.text};">Customer Inquiry Received</h1>
              <p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;color:${T.textSecondary};">A visitor has submitted a message through the contact form. Their details and message are below.</p>
            </td>
          </tr>


          <!-- ════════════════ CONTACT DETAILS ════════════════ -->
          <tr>
            <td style="padding:${T.sectionGap} ${T.cardPad} 0 ${T.cardPad};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${T.bg};border-radius:12px;">
                <!-- Name -->
                <tr>
                  <td style="padding:20px 24px 0 24px;">
                    <p style="margin:0;font-size:12px;font-weight:500;color:${T.textTertiary};text-transform:uppercase;letter-spacing:0.06em;">Name</p>
                    <p style="margin:6px 0 0 0;font-size:15px;font-weight:600;color:${T.text};line-height:1.4;word-break:break-word;">${safeName}</p>
                  </td>
                </tr>
                <!-- Separator via spacing -->
                <tr><td style="padding:16px 24px 0 24px;border-top:1px solid ${T.border};"></td></tr>
                <!-- Email -->
                <tr>
                  <td style="padding:4px 24px 0 24px;">
                    <p style="margin:0;font-size:12px;font-weight:500;color:${T.textTertiary};text-transform:uppercase;letter-spacing:0.06em;">Email</p>
                    <p style="margin:6px 0 0 0;font-size:15px;font-weight:600;line-height:1.4;word-break:break-word;">
                      <a href="mailto:${safeEmail}" style="color:${T.accent};text-decoration:none;">${safeEmail}</a>
                    </p>
                  </td>
                </tr>
                <!-- Separator -->
                <tr><td style="padding:16px 24px 0 24px;border-top:1px solid ${T.border};"></td></tr>
                <!-- Phone -->
                <tr>
                  <td style="padding:4px 24px 0 24px;">
                    <p style="margin:0;font-size:12px;font-weight:500;color:${T.textTertiary};text-transform:uppercase;letter-spacing:0.06em;">Phone</p>
                    <p style="margin:6px 0 0 0;font-size:15px;font-weight:600;color:${T.text};line-height:1.4;word-break:break-word;">${safePhone}</p>
                  </td>
                </tr>
                <!-- Separator -->
                <tr><td style="padding:16px 24px 0 24px;border-top:1px solid ${T.border};"></td></tr>
                <!-- Submitted At -->
                <tr>
                  <td style="padding:4px 24px 20px 24px;">
                    <p style="margin:0;font-size:12px;font-weight:500;color:${T.textTertiary};text-transform:uppercase;letter-spacing:0.06em;">Submitted At</p>
                    <p style="margin:6px 0 0 0;font-size:15px;font-weight:600;color:${T.text};line-height:1.4;word-break:break-word;">${safeSubmittedAt}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- ════════════════ MESSAGE ════════════════ -->
          <tr>
            <td style="padding:${T.sectionGap} ${T.cardPad} 0 ${T.cardPad};">
              <p style="margin:0 0 12px 0;font-size:12px;font-weight:500;color:${T.textTertiary};text-transform:uppercase;letter-spacing:0.06em;">Message</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${T.accentSubtle};border-radius:12px;">
                <tr>
                  <td style="padding:24px;border-left:3px solid ${T.accent};border-radius:12px;">
                    <p style="margin:0;font-size:15px;line-height:1.75;color:${T.text};word-break:break-word;">${nl2br(safeMessage)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- ════════════════ CTA ════════════════ -->
          <tr>
            <td style="padding:${T.sectionGap} ${T.cardPad} 0 ${T.cardPad};" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color:${T.accent};border-radius:10px;">
                    <a href="mailto:${safeEmail}" style="display:inline-block;padding:14px 36px;font-family:${FONT};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;letter-spacing:-0.01em;">Reply to ${safeName}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


          <!-- ════════════════ FOOTER ════════════════ -->
          <tr>
            <td style="padding:${T.sectionGap} ${T.cardPad} ${T.cardPad} ${T.cardPad};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid ${T.border};padding-top:${T.sectionGap};">
                    <p style="margin:0;font-size:13px;line-height:1.6;color:${T.textTertiary};">This notification was sent by the <strong style="color:${T.textSecondary};">${T.name}</strong> contact form. You&rsquo;re receiving this because you&rsquo;re an admin of this store.</p>
                    <p style="margin:12px 0 0 0;font-size:12px;color:${T.textTertiary};">&copy; ${new Date().getFullYear()} ${T.name}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>


        </table>
        <!-- / Card -->

      </td>
    </tr>
  </table>
  <!-- / Outer wrapper -->

</body>
</html>`;

  return { subject, html, text };
}
