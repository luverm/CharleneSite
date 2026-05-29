import { business } from "@/content/business";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wraps a plain-text message in a minimal, email-safe branded HTML
 * shell (wordmark on top, message below). The original text is still
 * sent as the text/plain part, so this only enhances — never replaces.
 */
export function wrapHtml(text: string): string {
  const body = escapeHtml(text);
  const name =
    business.name && !business.name.startsWith("{{")
      ? business.name
      : "Salon";
  const brand = escapeHtml(name);

  return `<!doctype html>
<html lang="nl">
<body style="margin:0;padding:0;background:#faf8f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f6;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #ece7e3;border-radius:12px;">
<tr><td align="center" style="padding:28px 24px 4px;font-family:Georgia,'Times New Roman',serif;color:#5b4636;font-size:20px;letter-spacing:0.04em;">
${brand}
</td></tr>
<tr><td style="padding:16px 32px 32px;font-family:Arial,Helvetica,sans-serif;color:#3a3330;font-size:15px;line-height:1.6;">
<div style="white-space:pre-wrap;">${body}</div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
