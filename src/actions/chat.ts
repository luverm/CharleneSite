"use server";

import { z } from "zod";
import {
  getOrCreateThread,
  postMessage,
  getVisitorView,
  resolveThreadIdByToken,
  getThreadByEmail,
} from "@/lib/db/chat";
import {
  uploadChatImage as storeChatImage,
  signChatImages,
} from "@/lib/chat-images";
import { sendEmail } from "@/lib/email/client";
import { chatResumeText } from "@/lib/email/messages";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export type ChatMessageDto = {
  id: number;
  sender: "visitor" | "admin";
  body: string;
  imageUrl: string | null;
  created_at: string;
};

const startSchema = z.object({
  token: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().max(80).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .optional()
    .or(z.literal("")),
});

export async function startChat(
  input: unknown,
): Promise<{ ok: true; token: string } | { ok: false }> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  try {
    const { token } = await getOrCreateThread(
      parsed.data.token || null,
      parsed.data.name || null,
      parsed.data.email || null,
    );
    return { ok: true, token };
  } catch (err) {
    console.error("[chat] start failed:", err);
    return { ok: false };
  }
}

const resumeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

/**
 * "Mail me mijn chat": sends a magic link to the visitor's most
 * recent thread. Always reports success (no email enumeration); the
 * link only works because public_token is the unguessable capability.
 */
export async function requestChatLink(
  input: unknown,
): Promise<{ ok: boolean }> {
  const parsed = resumeSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const ip = await getClientIp();
  const limited = await rateLimit({
    key: `chat-link:${ip}`,
    max: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) return { ok: true };

  try {
    const thread = await getThreadByEmail(parsed.data.email);
    if (thread) {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      await sendEmail({
        to: parsed.data.email,
        subject: "Je chatgesprek",
        context: "chat_resume",
        text: chatResumeText({
          customerName: thread.name,
          chatUrl: `${siteUrl.replace(/\/+$/, "")}/?chat=${
            thread.publicToken
          }`,
        }),
      });
    }
  } catch (err) {
    console.error("[chat] resume link failed:", err);
  }
  return { ok: true };
}

const sendSchema = z.object({
  token: z.string().uuid(),
  body: z.string().trim().max(2000).optional().or(z.literal("")),
  imagePath: z.string().max(300).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});

export async function sendVisitorMessage(input: unknown): Promise<{
  ok: boolean;
  code?: "RATE_LIMITED" | "EMPTY" | "INVALID" | "INTERNAL";
  message?: string;
}> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID" };
  const d = parsed.data;
  if (d.website) return { ok: true }; // honeypot

  const body = (d.body ?? "").trim();
  const imagePath = d.imagePath || null;
  if (!body && !imagePath) return { ok: false, code: "EMPTY" };

  const ip = await getClientIp();
  const limited = await rateLimit({
    key: `chat:${ip}`,
    max: 20,
    windowMs: 60 * 1000,
  });
  if (!limited.ok) return { ok: false, code: "RATE_LIMITED" };

  const threadId = await resolveThreadIdByToken(d.token);
  if (!threadId) return { ok: false, code: "INVALID" };

  try {
    await postMessage({ threadId, sender: "visitor", body, imagePath });
    return { ok: true };
  } catch (err) {
    console.error("[chat] send failed:", err);
    return {
      ok: false,
      code: "INTERNAL",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

const fetchSchema = z.object({
  token: z.string().uuid(),
  sinceId: z.number().int().min(0).optional(),
});

export async function fetchChat(input: unknown): Promise<
  | {
      ok: true;
      messages: ChatMessageDto[];
      visitorName: string | null;
    }
  | { ok: false }
> {
  const parsed = fetchSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  try {
    const view = await getVisitorView(
      parsed.data.token,
      parsed.data.sinceId ?? 0,
    );
    if (!view) return { ok: false };
    const signed = await signChatImages(
      view.messages.map((m) => m.image_path).filter((p): p is string => !!p),
    );
    return {
      ok: true,
      visitorName: view.thread.visitor_name,
      messages: view.messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        body: m.body,
        imageUrl: m.image_path ? (signed[m.image_path] ?? null) : null,
        created_at: m.created_at,
      })),
    };
  } catch (err) {
    console.error("[chat] fetch failed:", err);
    return { ok: false };
  }
}

export async function uploadVisitorChatImage(
  formData: FormData,
): Promise<{ ok: boolean; path?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false };

  const ip = await getClientIp();
  const limited = await rateLimit({
    key: `chat-upload:${ip}`,
    max: 15,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) return { ok: false };

  const path = await storeChatImage(file);
  return path ? { ok: true, path } : { ok: false };
}
