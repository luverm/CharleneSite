import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getDefaultStaffId } from "@/lib/db/staff";
import { getAvailableSlotsWithDiagnostics } from "@/lib/db/availability";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? "2026-05-01";
  const slug = url.searchParams.get("slug") ?? "knippen";

  const supabase = createSupabaseServiceClient();

  const [{ data: staffRows }, { data: serviceRow }, defaultStaffId] = await Promise.all([
    supabase
      .from("staff")
      .select("id, display_name, email, is_active, user_id, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("services").select("*").eq("slug", slug).maybeSingle(),
    getDefaultStaffId().catch((e) => `ERROR: ${(e as Error).message}`),
  ]);

  if (!serviceRow) {
    return NextResponse.json({
      error: `service "${slug}" not found`,
      staff: staffRows,
      defaultStaffId,
    });
  }

  const { slots, diag } = await getAvailableSlotsWithDiagnostics({
    staffId: typeof defaultStaffId === "string" ? defaultStaffId : "",
    serviceId: serviceRow.id,
    date,
  });

  const { data: openingHours } = await supabase
    .from("opening_hours")
    .select("staff_id, weekday, start_time, end_time")
    .order("weekday");

  return NextResponse.json({
    input: { date, slug },
    defaultStaffId,
    staff: staffRows,
    service: serviceRow,
    openingHoursAll: openingHours,
    diagnostics: diag,
    slotsCount: slots.length,
    firstFewSlots: slots.slice(0, 5).map((s) => ({
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
    })),
  });
}
