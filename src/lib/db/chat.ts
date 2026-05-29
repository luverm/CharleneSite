import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ChatMessage = {
  id: number;
  sender: "visitor" | "admin";
  body: string;
  image_path: string | null;
  created_at: string;
};

export type ChatThread = {
  id: string;
  public_token: string;
  visitor_name: string | null;
  visitor_email: string | null;
  keep: boolean;
  last_message_at: string;
  last_admin_read_at: string | null;
  created_at: string;
};

export type ThreadListItem = {
  id: string;
  visitor_name: string | null;
  email: string | null;
  keep: boolean;
  last_message_at: string;
  unread: boolean;
  preview: string;
};

export async function getOrCreateThread(
  token: string | null | undefined,
  visitorName?: string | null,
  visitorEmail?: string | null,
): Promise<{ id: string; token: string }> {
  const svc = createSupabaseServiceClient();

  if (token) {
    const { data } = await svc
      .from("chat_threads")
      .select("id, public_token")
      .eq("public_token", token)
      .maybeSingle();
    if (data) {
      const row = data as { id: string; public_token: string };
      return { id: row.id, token: row.public_token };
    }
  }

  const name = visitorName?.trim() || null;
  const email = visitorEmail?.trim().toLowerCase() || null;

  // Email is the lightweight identity: if this person already has a
  // thread under this email, continue it (so switching device /
  // clearing the browser keeps one conversation). Defensive if the
  // visitor_email column isn't migrated yet.
  if (email) {
    const existing = await svc
      .from("chat_threads")
      .select("id, public_token")
      .eq("visitor_email", email)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!existing.error && existing.data) {
      const row = existing.data as { id: string; public_token: string };
      return { id: row.id, token: row.public_token };
    }
  }

  let res = await svc
    .from("chat_threads")
    .insert({ visitor_name: name, visitor_email: email })
    .select("id, public_token")
    .single();
  // Degrade if migration 0017 (visitor_email) isn't applied yet —
  // chat must keep working; notifications simply start once it is.
  if (res.error) {
    res = await svc
      .from("chat_threads")
      .insert({ visitor_name: name })
      .select("id, public_token")
      .single();
  }
  if (res.error) throw res.error;
  const row = res.data as { id: string; public_token: string };
  return { id: row.id, token: row.public_token };
}

/** Most recent thread for an email — for the "mail me my chat" link. */
export async function getThreadByEmail(email: string): Promise<{
  publicToken: string;
  name: string | null;
} | null> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("chat_threads")
    .select("public_token, visitor_name")
    .eq("visitor_email", email.trim().toLowerCase())
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { public_token: string; visitor_name: string | null };
  return { publicToken: row.public_token, name: row.visitor_name };
}

/** Contact + the last message's sender, for the reply notification. */
export async function getThreadNotifyInfo(threadId: string): Promise<{
  publicToken: string;
  email: string | null;
  name: string | null;
  lastSender: "visitor" | "admin" | null;
} | null> {
  const svc = createSupabaseServiceClient();
  let tRes = await svc
    .from("chat_threads")
    .select("public_token, visitor_email, visitor_name")
    .eq("id", threadId)
    .maybeSingle();
  if (tRes.error) {
    // visitor_email column not migrated yet — no notification possible.
    tRes = await svc
      .from("chat_threads")
      .select("public_token, visitor_name")
      .eq("id", threadId)
      .maybeSingle();
  }
  if (!tRes.data) return null;
  const thread = tRes.data as {
    public_token: string;
    visitor_email?: string | null;
    visitor_name: string | null;
  };
  const { data: last } = await svc
    .from("chat_messages")
    .select("sender")
    .eq("thread_id", threadId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    publicToken: thread.public_token,
    email: thread.visitor_email ?? null,
    name: thread.visitor_name,
    lastSender:
      (last as { sender: "visitor" | "admin" } | null)?.sender ?? null,
  };
}

async function threadByToken(token: string): Promise<ChatThread | null> {
  const svc = createSupabaseServiceClient();
  const { data } = await svc
    .from("chat_threads")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  return (data as ChatThread | null) ?? null;
}

export async function postMessage(args: {
  threadId: string;
  sender: "visitor" | "admin";
  body: string;
  imagePath?: string | null;
}): Promise<ChatMessage> {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("chat_messages")
    .insert({
      thread_id: args.threadId,
      sender: args.sender,
      body: args.body,
      image_path: args.imagePath ?? null,
    })
    .select("id, sender, body, image_path, created_at")
    .single();
  if (error) throw error;

  const now = new Date().toISOString();
  const patch: Record<string, string> =
    args.sender === "admin"
      ? { last_message_at: now, last_admin_read_at: now }
      : { last_message_at: now };
  await svc.from("chat_threads").update(patch).eq("id", args.threadId);

  return data as ChatMessage;
}

export async function getVisitorView(
  token: string,
  sinceId: number,
): Promise<{ thread: ChatThread; messages: ChatMessage[] } | null> {
  const thread = await threadByToken(token);
  if (!thread) return null;
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from("chat_messages")
    .select("id, sender, body, image_path, created_at")
    .eq("thread_id", thread.id)
    .gt("id", sinceId)
    .order("id", { ascending: true });
  if (error) throw error;
  return { thread, messages: (data ?? []) as ChatMessage[] };
}

export async function resolveThreadIdByToken(
  token: string,
): Promise<string | null> {
  const t = await threadByToken(token);
  return t?.id ?? null;
}

export async function listThreads(): Promise<ThreadListItem[]> {
  const svc = createSupabaseServiceClient();
  const primary = await svc
    .from("chat_threads")
    .select(
      "id, visitor_name, visitor_email, keep, last_message_at, last_admin_read_at",
    )
    .order("last_message_at", { ascending: false })
    .limit(200);

  let error: unknown = primary.error;
  let data: unknown = primary.data;
  // Degrade if migration 0017 (visitor_email) isn't applied yet.
  if (primary.error) {
    const fb = await svc
      .from("chat_threads")
      .select("id, visitor_name, keep, last_message_at, last_admin_read_at")
      .order("last_message_at", { ascending: false })
      .limit(200);
    error = fb.error;
    data = fb.data;
  }
  if (error) throw error;
  const threads = (data ?? []) as {
    id: string;
    visitor_name: string | null;
    visitor_email?: string | null;
    keep: boolean;
    last_message_at: string;
    last_admin_read_at: string | null;
  }[];

  const out: ThreadListItem[] = [];
  for (const t of threads) {
    const { data: last } = await svc
      .from("chat_messages")
      .select("sender, body, image_path")
      .eq("thread_id", t.id)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastMsg = last as
      | { sender: string; body: string; image_path: string | null }
      | null;
    const unread =
      !t.last_admin_read_at ||
      new Date(t.last_message_at).getTime() >
        new Date(t.last_admin_read_at).getTime();
    out.push({
      id: t.id,
      visitor_name: t.visitor_name,
      email: t.visitor_email ?? null,
      keep: t.keep,
      last_message_at: t.last_message_at,
      unread,
      preview: lastMsg
        ? lastMsg.body || (lastMsg.image_path ? "📷 afbeelding" : "")
        : "",
    });
  }
  return out;
}

export async function getThreadMessages(
  threadId: string,
): Promise<{ thread: ChatThread; messages: ChatMessage[] } | null> {
  const svc = createSupabaseServiceClient();
  const { data: t } = await svc
    .from("chat_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();
  if (!t) return null;
  const { data, error } = await svc
    .from("chat_messages")
    .select("id, sender, body, image_path, created_at")
    .eq("thread_id", threadId)
    .order("id", { ascending: true });
  if (error) throw error;
  return {
    thread: t as ChatThread,
    messages: (data ?? []) as ChatMessage[],
  };
}

export async function markThreadRead(threadId: string): Promise<void> {
  const svc = createSupabaseServiceClient();
  await svc
    .from("chat_threads")
    .update({ last_admin_read_at: new Date().toISOString() })
    .eq("id", threadId);
}

export async function setThreadKeep(
  threadId: string,
  keep: boolean,
): Promise<void> {
  const svc = createSupabaseServiceClient();
  await svc.from("chat_threads").update({ keep }).eq("id", threadId);
}

/** Deletes a thread (messages cascade). Returns image paths to clean up. */
export async function deleteThread(threadId: string): Promise<string[]> {
  const svc = createSupabaseServiceClient();
  const { data: imgs } = await svc
    .from("chat_messages")
    .select("image_path")
    .eq("thread_id", threadId)
    .not("image_path", "is", null);
  const paths = ((imgs ?? []) as { image_path: string }[]).map(
    (r) => r.image_path,
  );
  const { error } = await svc
    .from("chat_threads")
    .delete()
    .eq("id", threadId);
  if (error) throw error;
  return paths;
}

/** Purge threads idle > `days`, unless kept. Returns image paths removed. */
export async function purgeOldThreads(days: number): Promise<{
  threads: number;
  imagePaths: string[];
}> {
  const svc = createSupabaseServiceClient();
  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: stale } = await svc
    .from("chat_threads")
    .select("id")
    .eq("keep", false)
    .lt("last_message_at", cutoff);
  const ids = ((stale ?? []) as { id: string }[]).map((r) => r.id);
  if (ids.length === 0) return { threads: 0, imagePaths: [] };

  const { data: imgs } = await svc
    .from("chat_messages")
    .select("image_path")
    .in("thread_id", ids)
    .not("image_path", "is", null);
  const imagePaths = ((imgs ?? []) as { image_path: string }[]).map(
    (r) => r.image_path,
  );

  const { error } = await svc.from("chat_threads").delete().in("id", ids);
  if (error) throw error;
  return { threads: ids.length, imagePaths };
}
