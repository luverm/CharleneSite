import Link from "next/link";
import type { Metadata } from "next";
import { listSpecialOpenings } from "@/lib/db/admin-schedule";
import { SpecialOpeningsManager } from "@/components/admin/special-openings-form";

export const metadata: Metadata = {
  title: "Extra openingsdagen",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function ExtraOpenPage() {
  const rows = await listSpecialOpenings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/instellingen"
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        ← Instellingen
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Extra openingsdagen
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Wil je een keer open op een dag die normaal gesloten is? Voeg die
        dag hier toe — klanten kunnen dan online boeken en de dag staat
        open in je agenda.
      </p>

      <div className="mt-6">
        <SpecialOpeningsManager rows={rows} />
      </div>
    </div>
  );
}
