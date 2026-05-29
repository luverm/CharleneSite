import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getSiteValue, setSiteValue } from "@/lib/db/site-content";

export type OpeningHourRow = {
  id: string;
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export async function listOpeningHours(staffId: string): Promise<OpeningHourRow[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("opening_hours")
    .select("id, staff_id, weekday, start_time, end_time")
    .eq("staff_id", staffId)
    .order("weekday", { ascending: true });
  if (error) throw error;
  return (data ?? []) as OpeningHourRow[];
}

export async function replaceOpeningHours(
  staffId: string,
  rows: Array<{ weekday: number; start_time: string; end_time: string }>,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error: delErr } = await supabase
    .from("opening_hours")
    .delete()
    .eq("staff_id", staffId);
  if (delErr) throw delErr;
  if (rows.length === 0) return;
  const { error: insErr } = await supabase.from("opening_hours").insert(
    rows.map((r) => ({ staff_id: staffId, ...r })),
  );
  if (insErr) throw insErr;
}

export type TimeOffRow = {
  id: string;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export async function listTimeOff(staffId: string): Promise<TimeOffRow[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("time_off")
    .select("id, staff_id, starts_at, ends_at, reason")
    .eq("staff_id", staffId)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TimeOffRow[];
}

/** Time-off blocks overlapping the [fromIso, toIso) window. */
export async function listTimeOffInRange(
  staffId: string,
  fromIso: string,
  toIso: string,
): Promise<TimeOffRow[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("time_off")
    .select("id, staff_id, starts_at, ends_at, reason")
    .eq("staff_id", staffId)
    .lt("starts_at", toIso)
    .gt("ends_at", fromIso)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TimeOffRow[];
}

export async function insertTimeOff(input: {
  staffId: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("time_off").insert({
    staff_id: input.staffId,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    reason: input.reason ?? null,
  });
  if (error) throw error;
}

export async function deleteTimeOff(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("time_off").delete().eq("id", id);
  if (error) throw error;
}

/**
 * A one-off opening on a date that's normally closed (or a different
 * window than the recurring weekday hours). Stored in site_content.
 */
export type SpecialOpening = {
  id: string;
  date: string; // YYYY-MM-DD (Europe/Amsterdam)
  start: string; // HH:MM
  end: string; // HH:MM
};

const SPECIAL_OPENINGS_KEY = "schedule.special_openings";

export async function listSpecialOpenings(): Promise<SpecialOpening[]> {
  const raw = await getSiteValue(SPECIAL_OPENINGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[])
      .filter(
        (x): x is SpecialOpening =>
          !!x &&
          typeof x === "object" &&
          typeof (x as SpecialOpening).id === "string" &&
          typeof (x as SpecialOpening).date === "string" &&
          typeof (x as SpecialOpening).start === "string" &&
          typeof (x as SpecialOpening).end === "string",
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

export async function saveSpecialOpenings(
  rows: SpecialOpening[],
): Promise<void> {
  await setSiteValue(SPECIAL_OPENINGS_KEY, JSON.stringify(rows));
}
