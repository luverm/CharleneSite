"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

/**
 * Mounted in the admin layout (only when logged in). Subscribes to Postgres
 * INSERTs on admin_notifications via Supabase Realtime and, for each new row,
 * fires a toast, a chime, an OS notification, and refreshes the server tree so
 * the sidebar badge re-syncs. Renders nothing.
 *
 * Degrades silently: if Realtime is unreachable (e.g. migration not applied)
 * the subscription just stays quiet and the on-refresh badge keeps working.
 */
export function LiveNotifications() {
  const router = useRouter();
  // Lazily created on the first user gesture so autoplay/permission policies
  // don't block us. Kept in a ref so it survives re-renders.
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // --- Unlock audio + ask for OS-notification permission on first gesture.
    const unlock = () => {
      if (!audioCtxRef.current) {
        try {
          const Ctor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext;
          if (Ctor) audioCtxRef.current = new Ctor();
        } catch {
          /* ignore — sound just won't play */
        }
      }
      audioCtxRef.current?.resume().catch(() => {});

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        Notification.requestPermission().catch(() => {});
      }
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    // --- Realtime subscription.
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => handleNewNotification(payload.new as NotificationRow),
      )
      .subscribe();

    function handleNewNotification(n: NotificationRow) {
      // 1. Toast
      toast(n.title, {
        description: n.body ?? undefined,
        action: n.href
          ? { label: "Open", onClick: () => router.push(n.href as string) }
          : undefined,
      });

      // 2. Chime
      playChime(audioCtxRef.current);

      // 3. OS notification (only if granted + tab not focused enough to matter).
      try {
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          const osNotif = new Notification(n.title, {
            body: n.body ?? undefined,
            tag: n.id,
          });
          if (n.href) {
            osNotif.onclick = () => {
              window.focus();
              router.push(n.href as string);
            };
          }
        }
      } catch {
        /* ignore */
      }

      // 4. Re-sync the server-rendered sidebar badge (and any open list).
      router.refresh();
    }

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}

/** Two short sine beeps via the Web Audio API. No-op if no audio context. */
function playChime(ctx: AudioContext | null) {
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const beep = (start: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      // Quick fade in/out to avoid clicks.
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.linearRampToValueAtTime(0, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    };
    beep(now, 880);
    beep(now + 0.18, 1174.7);
  } catch {
    /* ignore */
  }
}
