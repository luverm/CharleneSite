"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, ImagePlus, Send } from "lucide-react";
import {
  startChat,
  sendVisitorMessage,
  fetchChat,
  uploadVisitorChatImage,
  requestChatLink,
  type ChatMessageDto,
} from "@/actions/chat";

const TOKEN_KEY = "hbj_chat_token";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const fromUrl = new URLSearchParams(window.location.search).get(
        "chat",
      );
      if (fromUrl) return fromUrl;
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeEmail, setResumeEmail] = useState("");
  const [resumeSent, setResumeSent] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);

  // Deep link from the "Jeanine reageerde"-mail: ?chat=<token> opens
  // the conversation. Deferred setState to stay SSR/lint-safe.
  useEffect(() => {
    const hasParam =
      new URLSearchParams(window.location.search).get("chat") !== null;
    if (!hasParam) return;
    const t = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  // Other parts of the site (e.g. the "Andere vraag?" link) can open
  // the chat by dispatching this event.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("hbj:open-chat", handler);
    return () => window.removeEventListener("hbj:open-chat", handler);
  }, []);

  // Persist the active token so the conversation survives navigation.
  useEffect(() => {
    if (!token) return;
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* private mode */
    }
  }, [token]);

  // Poll for new messages while open and a thread exists.
  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;

    let everOk = false;
    const load = async () => {
      const r = await fetchChat({ token, sinceId: lastIdRef.current });
      if (cancelled) return;
      if (!r.ok) {
        // A stored token that resolves to nothing (thread gone / DB
        // reset) — drop it so the fresh start UI (incl. email) returns
        // instead of a permanently stuck chat.
        if (!everOk) {
          try {
            window.localStorage.removeItem(TOKEN_KEY);
          } catch {
            /* ignore */
          }
          lastIdRef.current = 0;
          setMessages([]);
          setToken(null);
        }
        return;
      }
      everOk = true;
      if (r.messages.length === 0) return;
      lastIdRef.current = r.messages[r.messages.length - 1].id;
      setMessages((prev) => [...prev, ...r.messages]);
    };

    void load();
    const id = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, token]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Free the object URL when the preview changes or the widget unmounts.
  useEffect(() => {
    if (!imagePreview) return;
    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  function onPickFile() {
    setError(null);
    const file = fileRef.current?.files?.[0] ?? null;
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  function clearImage() {
    if (fileRef.current) fileRef.current.value = "";
    setImagePreview(null);
  }

  async function uploadImage(): Promise<string | null> {
    const file = fileRef.current?.files?.[0];
    if (!file) return null;
    const fd = new FormData();
    fd.set("file", file);
    const r = await uploadVisitorChatImage(fd);
    if (!r.ok || !r.path) {
      setError("Afbeelding uploaden mislukt.");
      return null;
    }
    return r.path;
  }

  async function freshThread(): Promise<string | null> {
    const s = await startChat({
      token: "",
      name: name.trim(),
      email: email.trim(),
    });
    if (!s.ok) return null;
    setToken(s.token);
    try {
      window.localStorage.setItem(TOKEN_KEY, s.token);
    } catch {
      /* private mode — chat still works this session */
    }
    return s.token;
  }

  async function send() {
    const body = text.trim();
    const hasImage = !!fileRef.current?.files?.length;
    if (!body && !hasImage) return;
    setBusy(true);
    setError(null);
    try {
      let activeToken = token ?? (await freshThread());
      if (!activeToken) {
        setError("Kon de chat niet starten. Probeer het later opnieuw.");
        return;
      }

      const imagePath = hasImage ? await uploadImage() : null;
      if (hasImage && !imagePath) return;

      let r = await sendVisitorMessage({
        token: activeToken,
        body,
        imagePath: imagePath ?? "",
        website: "",
      });

      // Stale/dead token (thread no longer exists) — start a fresh
      // conversation and retry once, so the visitor never gets stuck.
      if (!r.ok && r.code === "INVALID") {
        try {
          window.localStorage.removeItem(TOKEN_KEY);
        } catch {
          /* ignore */
        }
        const newToken = await freshThread();
        if (newToken) {
          activeToken = newToken;
          r = await sendVisitorMessage({
            token: newToken,
            body,
            imagePath: imagePath ?? "",
            website: "",
          });
        }
      }

      if (!r.ok) {
        setError(
          r.code === "RATE_LIMITED"
            ? "Te veel berichten — wacht even."
            : r.message
              ? `Versturen mislukt: ${r.message}`
              : "Versturen mislukt.",
        );
        return;
      }
      setText("");
      clearImage();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Chat openen"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 print:hidden"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[32rem] max-h-[80vh] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl print:hidden">
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Chat met de salon</p>
          <p className="text-xs text-muted-foreground">
            Reactie meestal binnen een dag
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Chat sluiten"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Stel gerust je vraag — over een afspraak, bruidsstyling of iets
            anders. Je kunt ook een foto meesturen.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              "flex " +
              (m.sender === "visitor" ? "justify-end" : "justify-start")
            }
          >
            <div
              className={
                "max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
                (m.sender === "visitor"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted")
              }
            >
              {m.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.imageUrl}
                  alt=""
                  className="mb-1 max-h-48 rounded-lg"
                />
              )}
              {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && (
        <p className="px-4 pb-1 text-xs text-red-600">{error}</p>
      )}

      {messages.length === 0 && !token && (
        <div className="grid gap-2 px-4 pb-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Je naam (optioneel)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={80}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Je e-mail (optioneel — voor een seintje bij antwoord)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={254}
          />

          {resumeSent ? (
            <p className="text-xs text-emerald-700">
              Als er een gesprek bij dit e-mailadres hoort, sturen we je
              zo de link.
            </p>
          ) : resumeOpen ? (
            <div className="flex gap-2">
              <input
                value={resumeEmail}
                onChange={(e) => setResumeEmail(e.target.value)}
                type="email"
                placeholder="E-mail van je eerdere chat"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                maxLength={254}
              />
              <button
                type="button"
                disabled={busy || !resumeEmail.includes("@")}
                onClick={() => {
                  setBusy(true);
                  void requestChatLink({ email: resumeEmail.trim() })
                    .then(() => setResumeSent(true))
                    .finally(() => setBusy(false));
                }}
                className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Stuur link
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setResumeOpen(true)}
              className="text-left text-xs text-muted-foreground underline underline-offset-4"
            >
              Al eerder gechat? Mail me de link naar mijn gesprek
            </button>
          )}
        </div>
      )}

      <div className="border-t px-3 py-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={onPickFile}
        />
        {imagePreview && (
          <div className="mb-2 flex items-center gap-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Geselecteerde afbeelding"
                className="h-16 w-16 rounded-md border object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                aria-label="Afbeelding verwijderen"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background shadow ring-2 ring-background hover:bg-foreground/90"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              Foto toegevoegd — verstuur om te delen
            </span>
          </div>
        )}
        <div className="flex items-end gap-2">
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
                void send();
              }
            }}
            rows={1}
            placeholder="Typ een bericht…"
            className="max-h-24 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy}
            aria-label="Versturen"
            className="shrink-0 rounded-md bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
