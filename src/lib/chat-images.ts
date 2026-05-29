import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const CHAT_BUCKET = "chat";
export const CHAT_ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
export const CHAT_MAX_BYTES = 8 * 1024 * 1024;

function ext(type: string): string {
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/avif") return ".avif";
  return ".jpg";
}

/** Uploads one chat image, returns its object path (or null on failure). */
export async function uploadChatImage(file: File): Promise<string | null> {
  if (!CHAT_ALLOWED.includes(file.type) || file.size > CHAT_MAX_BYTES) {
    return null;
  }
  try {
    const svc = createSupabaseServiceClient();
    const path = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${ext(file.type)}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await svc.storage
      .from(CHAT_BUCKET)
      .upload(path, bytes, { contentType: file.type });
    if (error) {
      console.error("[chat] image upload failed:", error.message);
      return null;
    }
    return path;
  } catch (err) {
    console.error("[chat] image upload failed:", err);
    return null;
  }
}

/** Short-lived signed URLs keyed by object path. Missing/failed → skipped. */
export async function signChatImages(
  paths: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const svc = createSupabaseServiceClient();
    const { data, error } = await svc.storage
      .from(CHAT_BUCKET)
      .createSignedUrls(unique, 60 * 60);
    if (error || !data) return {};
    const map: Record<string, string> = {};
    data.forEach((d, i) => {
      if (d.signedUrl) map[unique[i]] = d.signedUrl;
    });
    return map;
  } catch {
    return {};
  }
}

export async function deleteChatImages(paths: string[]): Promise<void> {
  const list = paths.filter(Boolean);
  if (list.length === 0) return;
  try {
    const svc = createSupabaseServiceClient();
    await svc.storage.from(CHAT_BUCKET).remove(list);
  } catch (err) {
    console.error("[chat] image cleanup failed:", err);
  }
}
