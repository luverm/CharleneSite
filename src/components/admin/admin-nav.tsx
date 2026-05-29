"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  Bell,
  UserRound,
  MessageSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { SignOutButton } from "@/components/admin/sign-out-button";

type Item = { href: string; label: string; icon: LucideIcon; badgeKey?: "unread" };

const NAV_ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/boekingen", label: "Boekingen", icon: CalendarDays },
  { href: "/notificaties", label: "Notificaties", icon: Bell, badgeKey: "unread" },
  { href: "/klanten", label: "Klanten", icon: UserRound },
  { href: "/berichten", label: "Berichten", icon: MessageSquare },
  { href: "/instellingen", label: "Instellingen", icon: Settings },
];

export function AdminNav({
  email,
  unreadCount = 0,
}: {
  email: string | null;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const renderLinks = (onNavigate?: () => void) =>
    NAV_ITEMS.map((item) => {
      const active = isActive(item.href);
      const Icon = item.icon;
      const badge =
        item.badgeKey === "unread" && unreadCount > 0 ? unreadCount : 0;
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={
            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition " +
            (active
              ? "bg-secondary font-medium text-foreground"
              : "text-foreground hover:bg-secondary")
          }
        >
          <Icon className="size-4 shrink-0 opacity-70" aria-hidden />
          <span className="flex-1">{item.label}</span>
          {badge > 0 && (
            <span
              aria-label={`${badge} ongelezen`}
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-medium text-accent-foreground"
            >
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Link>
      );
    });

  return (
    <>
      <aside className="hidden w-56 shrink-0 border-r bg-muted/30 md:flex md:flex-col print:hidden">
        <div className="px-4 py-5">
          <p className="text-sm font-semibold tracking-tight">Admin</p>
          {email && (
            <p
              className="mt-1 truncate text-xs text-muted-foreground"
              title={email}
            >
              {email}
            </p>
          )}
        </div>
        <nav className="flex flex-col gap-0.5 px-2">{renderLinks()}</nav>
        <div className="mt-auto p-4">
          <SignOutButton />
        </div>
      </aside>

      <header className="border-b bg-muted/30 md:hidden print:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <p className="text-sm font-semibold">Admin</p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="admin-mobile-nav"
            aria-label="Menu"
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-base leading-none"
          >
            <span aria-hidden>{open ? "✕" : "☰"}</span>
          </button>
        </div>
        {open && (
          <nav
            id="admin-mobile-nav"
            className="flex flex-col gap-0.5 border-t px-2 py-2"
          >
            {renderLinks(() => setOpen(false))}
            <div className="mt-2 border-t px-2 pt-3">
              <SignOutButton />
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
