import Link from "next/link";
import type { Metadata } from "next";
import { listEmailLog } from "@/lib/db/email-log";
import { EmailLogList } from "@/components/admin/email-log-list";

export const metadata: Metadata = {
  title: "E-maillog",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function EmailLogPage() {
  let rows;
  try {
    rows = await listEmailLog(100);
  } catch {
    rows = null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/instellingen"
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        ← Instellingen
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">E-maillog</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Laatste 100 verzonden, mislukte en overgeslagen e-mails.
      </p>

      {rows === null ? (
        <p className="mt-6 rounded-lg border p-6 text-sm text-muted-foreground">
          Nog geen e-maillog beschikbaar. Draai migratie 0005 in Supabase om
          dit te activeren.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-lg border p-6 text-sm text-muted-foreground">
          Nog geen e-mails verstuurd.
        </p>
      ) : (
        <EmailLogList rows={rows} />
      )}
    </div>
  );
}
