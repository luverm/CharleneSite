import type { Metadata } from "next";
import { listOpeningHours } from "@/lib/db/admin-schedule";
import { getDefaultStaffId } from "@/lib/db/staff";
import { OpeningHoursForm } from "@/components/admin/opening-hours-form";

export const metadata: Metadata = {
  title: "Openingstijden",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function OpeningstijdenPage() {
  const staffId = await getDefaultStaffId();
  const rows = await listOpeningHours(staffId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Openingstijden</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vink een dag aan om hem open te zetten en stel de openingstijden in.
        </p>
      </header>
      <OpeningHoursForm staffId={staffId} rows={rows} />
    </div>
  );
}
