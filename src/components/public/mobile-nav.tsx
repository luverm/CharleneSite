"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { href: "/diensten", label: "Diensten" },
  { href: "/portfolio", label: "Portfolio" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm hover:bg-secondary"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl italic tracking-tight">
            Menu
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-1 px-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-sm px-2 py-2 text-base hover:bg-secondary"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/boeken"
            onClick={() => setOpen(false)}
            className="mt-4 rounded-sm bg-accent px-4 py-2.5 text-center text-xs uppercase tracking-[0.18em] text-accent-foreground"
          >
            Boek afspraak
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
