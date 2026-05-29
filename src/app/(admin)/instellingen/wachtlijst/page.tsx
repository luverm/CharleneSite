import Link from "next/link";
import type { Metadata } from "next";
import { listWaitlist } from "@/lib/db/waitlist";
import { WaitlistResolve } from "@/components/admin/waitlist-resolve";
import { formatHumanDateTime } from "@/lib/time";

export const metadata: Metadata = {
  title: "Wachtlijst",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function WaitlistPage() {
  let rows;
  try {
    rows = await listWaitlist();
  } catch {
    rows = null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/instellingen"
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        ← Instellingen
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Wachtlijst</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Mensen die zich aanmeldden toen er geen vrije tijden waren.
      </p>

      <div className="mt-8">
        {rows === null ? (
          <p className="rounded-lg border p-6 text-sm text-muted-foreground">
            Wachtlijst-tabel nog niet beschikbaar. Draai migratie 0008 in
            Supabase om dit te activeren.
          </p>
        ) : rows.length === 0 ? (
          <p className="rounded-lg border p-6 text-sm text-muted-foreground">
            Nog niemand op de wachtlijst.
          </p>
        ) : (
          <ul className="grid gap-3">
            {rows.map((w) => (
              <li
                key={w.id}
                className={
                  "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between " +
                  (w.resolved ? "opacity-60" : "")
                }
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {w.full_name}{" "}
                    <span className="font-normal text-muted-foreground break-all">
                      · {w.email}
                      {w.phone ? ` · ${w.phone}` : ""}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {w.service?.name ?? "Dienst onbekend"}
                    {w.preferred_date ? ` · voorkeur ${w.preferred_date}` : ""}
                    {" · "}
                    {formatHumanDateTime(new Date(w.created_at))}
                  </p>
                  {w.note && <p className="mt-1 text-sm">{w.note}</p>}
                </div>
                <div className="shrink-0">
                  <WaitlistResolve id={w.id} resolved={w.resolved} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
