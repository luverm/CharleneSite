import Link from "next/link";
import type { Metadata } from "next";
import { getBusiness } from "@/lib/db/business-settings";
import { loadFinanceSummary } from "@/lib/db/finance";
import { Card } from "@/components/ui/card";
import { CsvExport } from "@/components/admin/csv-export";
import { formatPrice } from "@/lib/db/services";

export const metadata: Metadata = {
  title: "Financieel",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const { vatRate } = await getBusiness();
  let summary;
  try {
    summary = await loadFinanceSummary(vatRate);
  } catch {
    summary = null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/instellingen"
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        ← Instellingen
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Financieel overzicht
        </h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Gerealiseerde omzet (afgeronde + verstreken bevestigde afspraken).
        BTW-tarief: <strong>{vatRate}%</strong>
        {vatRate === 0 ? " (KOR / vrijgesteld)" : ""}. Cijfers zijn een
        hulpmiddel — je boekhouder is leidend.
      </p>

      {summary === null ? (
        <p className="mt-6 rounded-lg border p-6 text-sm text-muted-foreground">
          Nog niet beschikbaar. Draai migratie 0011 in Supabase om dit te
          activeren.
        </p>
      ) : (
        <div className="mt-6 grid gap-6">
          {summary.years
            .slice()
            .reverse()
            .map((y) => (
              <Card key={y.year} className="p-6">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold">{y.year}</h2>
                  <span className="text-sm text-muted-foreground">
                    {y.total.count} afspraken
                  </span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="py-2 pr-3">Periode</th>
                        <th className="py-2 pr-3 text-right">Excl. BTW</th>
                        <th className="py-2 pr-3 text-right">BTW</th>
                        <th className="py-2 text-right">Incl. BTW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {y.quarters.map((q) => (
                        <tr key={q.label} className="border-b">
                          <td className="py-2 pr-3">{q.label}</td>
                          <td className="py-2 pr-3 text-right">
                            {formatPrice(q.exclCents)}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            {formatPrice(q.vatCents)}
                          </td>
                          <td className="py-2 text-right">
                            {formatPrice(q.inclCents)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold">
                        <td className="py-2 pr-3">Totaal {y.year}</td>
                        <td className="py-2 pr-3 text-right">
                          {formatPrice(y.total.exclCents)}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {formatPrice(y.total.vatCents)}
                        </td>
                        <td className="py-2 text-right">
                          {formatPrice(y.total.inclCents)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}

          <Card className="p-6">
            <h2 className="text-lg font-semibold">Boekhoud-export</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              CSV met BTW-uitsplitsing per afspraak — voor je boekhouder of
              boekhoudprogramma.
            </p>
            <div className="mt-4">
              <CsvExport />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
