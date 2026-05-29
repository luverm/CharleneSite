"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Trash2, MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  deleteNotificationsAction,
} from "@/actions/notifications";
import { toast } from "sonner";

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsList({ items }: { items: Notification[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (items.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
        Nog geen notificaties. Nieuwe boekingen en wachtlijst-aanmeldingen
        verschijnen hier.
      </div>
    );
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = selected.size === items.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  };

  const hasUnread = items.some((i) => i.read_at === null);

  const handleMarkAllRead = () =>
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (result.ok) {
        toast.success("Alles gemarkeerd als gelezen");
        router.refresh();
      } else {
        toast.error("Kon niet markeren");
      }
    });

  const handleDelete = () =>
    startTransition(async () => {
      const ids = Array.from(selected);
      if (ids.length === 0) return;
      const result = await deleteNotificationsAction(ids);
      if (result.ok) {
        toast.success(`${result.deleted ?? ids.length} verwijderd`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error("Kon niet verwijderen");
      }
    });

  const handleMarkOneRead = (id: string) =>
    startTransition(async () => {
      const result = await markNotificationReadAction(id);
      if (result.ok) router.refresh();
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-border"
          />
          Alles
        </label>
        <div className="ml-auto flex gap-2">
          {hasUnread && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={pending}
            >
              <MailOpen className="h-4 w-4" aria-hidden />
              Alles gelezen
            </Button>
          )}
          {selected.size > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={pending}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Verwijder ({selected.size})
            </Button>
          )}
        </div>
      </div>

      <ul className="divide-y divide-border rounded-sm border border-border bg-card">
        {items.map((n) => {
          const isUnread = n.read_at === null;
          const isSelected = selected.has(n.id);
          const ago = formatDistanceToNow(new Date(n.created_at), {
            addSuffix: true,
            locale: nl,
          });
          return (
            <li
              key={n.id}
              className={
                "flex items-start gap-3 p-4 transition " +
                (isUnread ? "bg-secondary/30" : "")
              }
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(n.id)}
                className="mt-1 h-4 w-4 rounded border-border"
                aria-label="Selecteer notificatie"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <p
                    className={
                      "text-sm " + (isUnread ? "font-medium" : "text-foreground/80")
                    }
                  >
                    {n.title}
                  </p>
                  <span className="text-xs text-muted-foreground">{ago}</span>
                </div>
                {n.body && (
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    {n.body}
                  </p>
                )}
                {n.href && (
                  <Link
                    href={n.href}
                    onClick={() => isUnread && handleMarkOneRead(n.id)}
                    className="mt-2 inline-block text-xs uppercase tracking-[0.15em] text-accent underline underline-offset-[6px]"
                  >
                    Open
                  </Link>
                )}
              </div>
              {isUnread && (
                <button
                  type="button"
                  onClick={() => handleMarkOneRead(n.id)}
                  disabled={pending}
                  className="rounded-sm p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  aria-label="Markeer als gelezen"
                  title="Markeer als gelezen"
                >
                  <Check className="h-4 w-4" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
