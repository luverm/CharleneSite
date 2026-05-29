"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listChatThreadsAction,
  fetchChatThreadAction,
  sendAdminMessageAction,
  setChatKeepAction,
  deleteChatThreadAction,
  uploadAdminChatImage,
} from "@/actions/admin-chat";
import type { ChatMessageDto } from "@/actions/chat";

type ThreadItem = {
  id: string;
  visitor_name: string | null;
  email: string | null;
  keep: boolean;
  last_message_at: string;
  unread: boolean;
  preview: string;
};

export function ChatInbox() {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [keep, setKeep] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    const list = await listChatThreadsAction();
    setThreads(list);
  }, []);

  const loadThread = useCallback(async (id: string) => {
    const r = await fetchChatThreadAction(id);
    if (r.ok) {
      setMessages(r.messages);
      setKeep(r.keep);
      setName(r.visitorName);
      setEmail(r.visitorEmail);
    }
  }, []);

  useEffect(() => {
    const tick = () => void loadThreads();
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 10000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [loadThreads]);

  useEffect(() => {
    if (!activeId) return;
    const tick = () => void loadThread(activeId);
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 5000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [activeId, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  async function reply() {
    if (!activeId) return;
    const body = text.trim();
    const file = fileRef.current?.files?.[0];
    if (!body && !file) return;
    setBusy(true);
    try {
      let imagePath = "";
      if (file) {
        const fd = new FormData();
        fd.set("file", file);
        const up = await uploadAdminChatImage(fd);
        if (fileRef.current) fileRef.current.value = "";
        if (!up.ok || !up.path) {
          toast.error("Afbeelding uploaden mislukt.");
          return;
        }
        imagePath = up.path;
      }
      const r = await sendAdminMessageAction({
        threadId: activeId,
        body,
        imagePath,
      });
      if (!r.ok) {
        toast.error("Versturen mislukt.");
        return;
      }
      setText("");
      await loadThread(activeId);
      await loadThreads();
    } finally {
      setBusy(false);
    }
  }

  async function toggleKeep() {
    if (!activeId) return;
    const r = await setChatKeepAction(activeId, !keep);
    if (r.ok) {
      setKeep((k) => !k);
      void loadThreads();
    } else {
      toast.error("Wijzigen mislukt.");
    }
  }

  async function remove() {
    if (!activeId) return;
    if (!window.confirm("Dit gesprek definitief verwijderen?")) return;
    const r = await deleteChatThreadAction(activeId);
    if (r.ok) {
      toast.success("Gesprek verwijderd");
      setActiveId(null);
      setMessages([]);
      void loadThreads();
    } else {
      toast.error("Verwijderen mislukt.");
    }
  }

  return (
    <>
    <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
      <div className="rounded-lg border">
        {threads.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Nog geen gesprekken.
          </p>
        ) : (
          <ul className="divide-y">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={
                    "block w-full px-4 py-3 text-left text-sm transition hover:bg-accent " +
                    (activeId === t.id ? "bg-accent" : "")
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {t.visitor_name || "Bezoeker"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {t.keep && (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          bewaard
                        </span>
                      )}
                      {t.unread && (
                        <span
                          className="h-2 w-2 rounded-full bg-primary"
                          aria-label="ongelezen"
                        />
                      )}
                    </span>
                  </span>
                  {t.email && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {t.email}
                    </span>
                  )}
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {t.preview || "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-h-[28rem] flex-col rounded-lg border">
        {!activeId ? (
          <p className="m-auto p-6 text-sm text-muted-foreground">
            Kies een gesprek.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{name || "Bezoeker"}</p>
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="block truncate text-xs text-muted-foreground underline underline-offset-2"
                  >
                    {email}
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={keep ? "default" : "outline"}
                  size="sm"
                  onClick={toggleKeep}
                >
                  {keep ? "Bewaard" : "Bewaren"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={remove}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m) => {
                const img = m.imageUrl;
                return (
                  <div
                    key={m.id}
                    className={
                      "flex " +
                      (m.sender === "admin"
                        ? "justify-end"
                        : "justify-start")
                    }
                  >
                    <div
                      className={
                        "max-w-[75%] rounded-2xl px-3 py-2 text-sm " +
                        (m.sender === "admin"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted")
                      }
                    >
                      {img && (
                        <button
                          type="button"
                          onClick={() => setZoom(img)}
                          aria-label="Afbeelding vergroten"
                          className="mb-1 block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt=""
                            className="max-h-56 cursor-zoom-in rounded-lg transition hover:opacity-90"
                          />
                        </button>
                      )}
                      {m.body && (
                        <p className="whitespace-pre-wrap">{m.body}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="flex items-end gap-2 border-t px-3 py-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Foto toevoegen"
                className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void reply();
                  }
                }}
                rows={1}
                placeholder="Typ een antwoord…"
                className="max-h-24 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void reply()}
                disabled={busy}
                aria-label="Versturen"
                className="shrink-0 rounded-md bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>

    {zoom && (
      <div
        onClick={() => setZoom(null)}
        role="dialog"
        aria-modal="true"
        aria-label="Afbeelding vergroot"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      >
        <button
          type="button"
          onClick={() => setZoom(null)}
          aria-label="Sluiten"
          className="absolute right-4 top-4 rounded-md bg-white/10 p-2 text-white transition hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={zoom}
          alt=""
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        />
      </div>
    )}
    </>
  );
}
