import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { recordEmail } from "@/lib/db/email-log";
import { wrapHtml } from "@/lib/email/html";

type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

/**
 * Reads SMTP config from the environment. Returns null when it is not
 * (fully) configured so callers can skip sending instead of crashing —
 * a missing mail setup must never block a booking or lead.
 */
function getMailConfig(): MailConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM ?? user;
  if (!host || !user || !pass || !from) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  return { host, port, secure: port === 465, user, pass, from };
}

let _transporter: Transporter | null = null;

function getTransporter(cfg: MailConfig): Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
  }
  return _transporter;
}

export type EmailAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

export type SendArgs = {
  to: string | string[];
  subject: string;
  text: string;
  /** Optional explicit HTML; otherwise the text is auto-wrapped (branded). */
  html?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** Short tag for the email log, e.g. "booking_confirmation". */
  context?: string;
};

export async function sendEmail(args: SendArgs): Promise<{ id: string | null }> {
  const recipients = Array.isArray(args.to) ? args.to.join(", ") : args.to;
  const cfg = getMailConfig();

  if (!cfg) {
    console.warn(
      `[email] SMTP not configured — skipped "${args.subject}" to ${recipients}`,
    );
    await recordEmail({
      to: recipients,
      subject: args.subject,
      body: args.text,
      status: "skipped",
      context: args.context,
    });
    return { id: null };
  }

  try {
    const info = await getTransporter(cfg).sendMail({
      from: cfg.from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html ?? wrapHtml(args.text),
      replyTo: args.replyTo,
      attachments: args.attachments,
    });
    await recordEmail({
      to: recipients,
      subject: args.subject,
      body: args.text,
      status: "sent",
      context: args.context,
    });
    return { id: info.messageId ?? null };
  } catch (err) {
    await recordEmail({
      to: recipients,
      subject: args.subject,
      body: args.text,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      context: args.context,
    });
    throw err;
  }
}
