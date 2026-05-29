import type { Metadata } from "next";
import { listAdminNotifications } from "@/lib/db/notifications";
import { NotificationsList } from "@/components/admin/notifications-list";

export const metadata: Metadata = {
  title: "Notificaties",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function NotificatiesPage() {
  const items = await listAdminNotifications(200);
  const unread = items.filter((n) => n.read_at === null).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">
            Inbox
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight">
            Notificaties
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {unread > 0
              ? `${unread} ongelezen · ${items.length} totaal`
              : `${items.length} totaal`}
          </p>
        </div>
      </header>

      <div className="mt-8">
        <NotificationsList items={items} />
      </div>
    </div>
  );
}
