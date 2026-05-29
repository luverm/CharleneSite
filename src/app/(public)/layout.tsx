import Link from "next/link";
import { getBusiness } from "@/lib/db/business-settings";
import { getResolvedContent } from "@/lib/db/site-content";
import { listOpeningHours } from "@/lib/db/admin-schedule";
import { getDefaultStaffId } from "@/lib/db/staff";
import { MobileNav } from "@/components/public/mobile-nav";
import { ChatWidget } from "@/components/public/chat-widget";

// Weekday order Monday-first; DB weekday: 0 = zondag … 6 = zaterdag.
const OPENING_DAYS: Array<{ weekday: number; label: string }> = [
  { weekday: 1, label: "Maandag" },
  { weekday: 2, label: "Dinsdag" },
  { weekday: 3, label: "Woensdag" },
  { weekday: 4, label: "Donderdag" },
  { weekday: 5, label: "Vrijdag" },
  { weekday: 6, label: "Zaterdag" },
  { weekday: 0, label: "Zondag" },
];

const navLinks = [
  { href: "/diensten", label: "Diensten" },
  { href: "/portfolio", label: "Portfolio" },
];

const isFilled = (v: string) => v.length > 0 && !v.startsWith("{{");

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [business, content] = await Promise.all([
    getBusiness(),
    getResolvedContent(),
  ]);

  // Opening hours from settings, grouped per weekday.
  const openingByDay = new Map<number, string[]>();
  try {
    const rows = await listOpeningHours(await getDefaultStaffId());
    for (const r of rows) {
      const range = `${r.start_time.slice(0, 5)} – ${r.end_time.slice(0, 5)}`;
      const arr = openingByDay.get(r.weekday);
      if (arr) arr.push(range);
      else openingByDay.set(r.weekday, [range]);
    }
  } catch {
    /* opening hours not configured — column is hidden */
  }
  const hasOpeningHours = openingByDay.size > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
          <Link
            href="/"
            aria-label={business.name}
            className="shrink-0 text-xl tracking-tight"
          >
            {business.name}
          </Link>

          <ul className="hidden items-center gap-6 text-sm md:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-foreground/70">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/boeken"
                className="rounded-full bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
              >
                Boek afspraak
              </Link>
            </li>
          </ul>

          <div className="md:hidden">
            <MobileNav />
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-base font-semibold">{business.name}</p>
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                {content["site.tagline"]}
              </p>
            </div>

            {(isFilled(business.email) || isFilled(business.phone)) && (
              <div>
                <p className="text-sm font-medium">Contact</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {isFilled(business.email) && (
                    <li>
                      <a
                        href={`mailto:${business.email}`}
                        className="hover:text-foreground"
                      >
                        {business.email}
                      </a>
                    </li>
                  )}
                  {isFilled(business.phone) && <li>{business.phone}</li>}
                </ul>
              </div>
            )}

            <div>
              <p className="text-sm font-medium">Adres</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>{business.address.street}</li>
                <li>
                  {business.address.postcode} {business.address.city}
                </li>
              </ul>
            </div>

            {hasOpeningHours && (
              <div>
                <p className="text-sm font-medium">Openingstijden</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {OPENING_DAYS.map((d) => {
                    const ranges = openingByDay.get(d.weekday) ?? [];
                    return (
                      <li key={d.weekday} className="flex justify-between gap-3">
                        <span>{d.label}</span>
                        <span>
                          {ranges.length > 0 ? ranges.join(", ") : "Gesloten"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div>
              <p className="text-sm font-medium">Volg</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {isFilled(business.socials.instagram) && (
                  <li>
                    <a
                      href={business.socials.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground"
                    >
                      Instagram · @{business.socials.instagram}
                    </a>
                  </li>
                )}
                {isFilled(business.socials.tiktok) && (
                  <li>TikTok: {business.socials.tiktok}</li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t pt-6 text-xs text-muted-foreground md:flex-row">
            <p>
              {[
                isFilled(business.kvk) && `KvK ${business.kvk}`,
                isFilled(business.btw) && `BTW ${business.btw}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p>© {new Date().getFullYear()} {business.name}</p>
          </div>
        </div>
      </footer>
      <ChatWidget />
    </div>
  );
}
