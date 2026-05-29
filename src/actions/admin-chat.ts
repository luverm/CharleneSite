"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  listThreads,
  getThreadMessages,
  markThreadRead,
  postMessage,
  setThreadKeep,
  deleteThread,
  getThreadNotifyInfo,
  type ThreadListItem,
} from "@/lib/db/chat";
import {
  uploadChatImage as storeChatImage,
  signChatImages,
  deleteChatImages,
} from "@/lib/chat-images";
import { requireAdmin } from "@/lib/auth/require-admin";
import { writeAuditLog } from "@/lib/db/bookings";
import { sendEmail } from "@/lib/email/client";
import { chatReplyText } from "@/lib/email/messages";
import type { ChatMessageDto } from "@/actions/chat";

export async function listChatThreadsAction(): Promise<ThreadListItem[]> {
  await requireAdmin();
  try {
    return await listThreads();
  } catch (err) {
    console.error("[chat] list threads failed:", err);
    return [];
  }
}

export async function fetchChatThreadAction(threadId: string): Promise<
  | {
      ok: true;
      messages: ChatMessageDto[];
      keep: boolean;
      visitorName: string | null;
      visitorEmail: string | null;
    }
  | { ok: false }
> {
  await requireAdmin();
  try {
    const view = await getThreadMessages(threadId);
    if (!view) return { ok: false };
    await markThreadRead(threadId);
    const signed = await signChatImages(
      view.messages.map((m) => m.image_path).filter((p): p is string => !!p),
    );
    return {
      ok: true,
      keep: view.thread.keep,
      visitorName: view.thread.visitor_name,
      visitorEmail: view.thread.visitor_email ?? null,
      messages: view.messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        body: m.body,
        imageUrl: m.image_path ? (signed[m.image_path] ?? null) : null,
        created_at: m.created_at,
      })),
    };
  } catch (err) {
    console.error("[chat] fetch thread failed:", err);
    return { ok: false };
  }
}

const sendSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().max(2000).optional().or(z.literal("")),
  imagePath: z.string().max(300).optional().or(z.literal("")),
});

export async function sendAdminMessageAction(
  input: unknown,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const body = (parsed.data.body ?? "").trim();
  const imagePath = parsed.data.imagePath || null;
  if (!body && !imagePath) return { ok: false };

  // Capture state before posting: only mail the customer when this is
  // a genuine reply to their last message (not a follow-up burst).
  const info = await getThreadNotifyInfo(parsed.data.threadId).catch(
    () => null,
  );

  try {
    await postMessage({
      threadId: parsed.data.threadId,
      sender: "admin",
      body,
      imagePath,
    });
    revalidatePath("/berichten");
  } catch (err) {
    console.error("[chat] admin send failed:", err);
    return { ok: false };
  }

  if (info && info.email && info.lastSender === "visitor") {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    try {
      await sendEmail({
        to: info.email,
        subject: "Reactie op je chatbericht",
        context: "chat_reply",
        text: chatReplyText({
          customerName: info.name,
          chatUrl: `${siteUrl.replace(/\/+$/, "")}/?chat=${info.publicToken}`,
        }),
      });
    } catch (err) {
      console.error("[chat] reply notification failed:", err);
    }
  }

  return { ok: true };
}

export async function setChatKeepAction(
  threadId: string,
  keep: boolean,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  try {
    await setThreadKeep(threadId, keep);
    revalidatePath("/berichten");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteChatThreadAction(
  threadId: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  try {
    const paths = await deleteThread(threadId);
    await deleteChatImages(paths);
    await writeAuditLog({
      actor: "admin",
      action: "chat.delete",
      entity: "chat_thread",
      entityId: threadId,
    }).catch(() => {});
    revalidatePath("/berichten");
    return { ok: true };
  } catch (err) {
    console.error("[chat] delete thread failed:", err);
    return { ok: false };
  }
}

export async function uploadAdminChatImage(
  formData: FormData,
): Promise<{ ok: boolean; path?: string }> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false };
  const path = await storeChatImage(file);
  return path ? { ok: true, path } : { ok: false };
}
