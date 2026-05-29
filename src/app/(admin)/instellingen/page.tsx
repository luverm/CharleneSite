import Link from "next/link";
import type { Metadata } from "next";
import {
  Building2,
  Scissors,
  Clock,
  CalendarOff,
  CalendarPlus,
  CalendarClock,
  RefreshCw,
  Mail,
  Mails,
  ListChecks,
  Image as ImageIcon,
  Star,
  Type,
  Wallet,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Instellingen",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

type HubItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

const GROUPS: { title: string; items: HubItem[] }[] = [
  {
    title: "Bedrijf",
    items: [
      {
        href: "/instellingen/bedrijfsgegevens",
        label: "Bedrijfsgegevens",
        description: "Naam, contact, KvK, BTW en social",
        icon: Building2,
      },
    ],
  },
  {
    title: "Agenda & boeken",
    items: [
      {
        href: "/instellingen/diensten",
        label: "Diensten",
        description: "Behandelingen, prijzen en duur",
        icon: Scissors,
      },
      {
        href: "/instellingen/openingstijden",
        label: "Openingstijden",
        description: "Werktijden per weekdag",
        icon: Clock,
      },
      {
        href: "/instellingen/vrije-dagen",
        label: "Vrije dagen / blokkades",
        description: "Vakantie, vrije dagen en pauzes",
        icon: CalendarOff,
      },
      {
        href: "/instellingen/extra-open",
        label: "Extra openingsdagen",
        description: "Eenmalig open op een gesloten dag",
        icon: CalendarPlus,
      },
      {
        href: "/instellingen/agenda",
        label: "Agenda in je telefoon",
        description: "Boekingen automatisch in je telefoonagenda",
        icon: CalendarClock,
      },
    ],
  },
  {
    title: "Klantcontact",
    items: [
      {
        href: "/instellingen/terugkommail",
        label: "Terugkom-mail",
        description: "Automatische ‘tijd voor een nieuwe afspraak’",
        icon: RefreshCw,
      },
      {
        href: "/instellingen/mailteksten",
        label: "Mailteksten",
        description: "De tekst van automatische e-mails aanpassen",
        icon: Mails,
      },
      {
        href: "/instellingen/e-mails",
        label: "E-maillog",
        description: "Verzonden mails bekijken en opnieuw sturen",
        icon: Mail,
      },
      {
        href: "/instellingen/wachtlijst",
        label: "Wachtlijst",
        description: "Klanten die op een vrij plekje wachten",
        icon: ListChecks,
      },
    ],
  },
  {
    title: "Website & content",
    items: [
      {
        href: "/instellingen/teksten",
        label: "Teksten",
        description: "Paginateksten van de website aanpassen",
        icon: Type,
      },
      {
        href: "/instellingen/portfolio",
        label: "Portfolio",
        description: "Foto’s op de website",
        icon: ImageIcon,
      },
      {
        href: "/instellingen/reviews",
        label: "Reviews",
        description: "Klantbeoordelingen beheren",
        icon: Star,
      },
    ],
  },
  {
    title: "Financieel",
    items: [
      {
        href: "/instellingen/financien",
        label: "Financieel & BTW",
        description: "Omzet, BTW en boekhoud-export",
        icon: Wallet,
      },
    ],
  },
];

function HubRow({ item }: { item: HubItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-4 rounded-lg border p-4 transition hover:border-foreground/20 hover:bg-accent"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{item.label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {item.description}
        </span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

export default function InstellingenPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Instellingen</h1>
      </header>

      {GROUPS.map((group) => (
        <section key={group.title} className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <HubRow key={item.href} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
