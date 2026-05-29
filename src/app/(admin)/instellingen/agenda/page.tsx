import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { getServerEnv, publicEnv } from "@/lib/env";
import { IcsSubscribe } from "@/components/admin/ics-subscribe";

export const metadata: Metadata = {
  title: "Agenda in je telefoon",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default function AgendaFeedPage() {
  const { ADMIN_ICS_TOKEN } = getServerEnv();
  const base = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  const httpsUrl = `${base}/api/ics?token=${ADMIN_ICS_TOKEN}`;
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, "webcal://");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <Link
          href="/instellingen"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:opacity-80"
        >
          ← Instellingen
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Agenda in je telefoon
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Abonneer je telefoon op deze link en al je afspraken verschijnen
          automatisch in je gewone Agenda-app. Nieuwe en gewijzigde boekingen
          worden vanzelf bijgewerkt — je hoeft hier niets meer voor te doen.
        </p>
      </header>

      <Card className="p-6">
        <h2 className="text-base font-semibold">Jouw persoonlijke link</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Deel deze link met niemand: wie hem heeft, kan je agenda meelezen.
        </p>
        <div className="mt-4">
          <IcsSubscribe httpsUrl={httpsUrl} webcalUrl={webcalUrl} />
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-base font-semibold">Instellen</h2>

        <div className="mt-4 space-y-5 text-sm">
          <div>
            <h3 className="font-medium">iPhone / iPad</h3>
            <p className="mt-1 text-muted-foreground">
              Tik op deze pagina (op je iPhone) op{" "}
              <span className="font-medium text-foreground">
                Direct toevoegen aan agenda
              </span>{" "}
              en bevestig met{" "}
              <span className="font-medium text-foreground">Abonneren</span>.
              Lukt dat niet? Ga naar Instellingen → Agenda → Account-toevoegen →
              Anders → Agenda-abonnement, en plak de gekopieerde link.
            </p>
          </div>

          <div>
            <h3 className="font-medium">Google Agenda (Android)</h3>
            <p className="mt-1 text-muted-foreground">
              Open{" "}
              <span className="font-medium text-foreground">
                calendar.google.com
              </span>{" "}
              op een computer (kan niet in de telefoon-app). Klik naast{" "}
              <span className="font-medium text-foreground">
                Andere agenda&apos;s
              </span>{" "}
              op + → Via URL, plak de gekopieerde link en klik{" "}
              <span className="font-medium text-foreground">
                Agenda toevoegen
              </span>
              . Daarna verschijnt hij ook in de Google Agenda-app op je
              telefoon.
            </p>
          </div>

          <div>
            <h3 className="font-medium">Outlook</h3>
            <p className="mt-1 text-muted-foreground">
              Agenda → Agenda toevoegen → Abonneren via internet, plak de link
              en bevestig.
            </p>
          </div>
        </div>

        <p className="mt-5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          De agenda werkt maar één kant op: afspraken die hier in het systeem
          staan, zie je in je telefoon. Iets wijzigen doe je altijd hier in het
          beheer, niet in de Agenda-app. Telefoons verversen een abonnement vaak
          maar elk uur — een net gemaakte boeking kan dus even duren.
        </p>
      </Card>
    </div>
  );
}
