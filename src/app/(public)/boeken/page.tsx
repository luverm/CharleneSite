import type { Metadata } from "next";
import { addDays, format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Toaster } from "@/components/ui/sonner";
import { BookingForm } from "@/components/booking/booking-form";
import { listActiveServices } from "@/lib/db/services";
import { getDefaultStaffId } from "@/lib/db/staff";
import {
  listTimeOffInRange,
  listOpeningHours,
  listSpecialOpenings,
} from "@/lib/db/admin-schedule";
import { getSiteStringArray } from "@/lib/db/site-content";
import {
  listServiceCategories,
  getServiceCategoryMap,
} from "@/lib/db/service-categories";
import { verifyWaitlistToken } from "@/lib/booking-token";
import { getWaitlistContact } from "@/lib/db/waitlist";
import { formatIsoDate, startOfDayInTz, endOfDayInTz } from "@/lib/time";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Boek je afspraak",
  description: "Plan je afspraak online — knippen, kleuren of föhnen.",
};

// How far the date picker normally looks ahead, how far past the last
// blokkade it stays bookable, and a hard ceiling.
const MIN_HORIZON_DAYS = 90;
const AFTER_BLOCK_DAYS = 90;
const MAX_HORIZON_DAYS = 540;
const LOOKAHEAD_DAYS = 365;

function dayLabel(isoDay: string): string {
  return format(parseISO(isoDay), "d MMMM", { locale: nl });
}

export default async function BoekenPage({
  searchParams,
}: {
  searchParams: Promise<{
    dienst?: string;
    datum?: string;
    tijd?: string;
    wl?: string;
    token?: string;
  }>;
}) {
  const [services, staffId, params] = await Promise.all([
    listActiveServices(),
    getDefaultStaffId(),
    searchParams,
  ]);

  const bookable = services.filter((s) => s.is_online_bookable);

  // Time-off (absences) — used to disable closed days, show an absence
  // notice, and to keep the 3 months after a blokkade bookable.
  const today = new Date();
  const fromKey = formatIsoDate(today);
  const lookaheadKey = formatIsoDate(addDays(today, LOOKAHEAD_DAYS));
  const timeOff = await listTimeOffInRange(
    staffId,
    `${fromKey}T00:00:00Z`,
    `${lookaheadKey}T23:59:59Z`,
  ).catch(() => []);

  let horizonDays = MIN_HORIZON_DAYS;
  for (const t of timeOff) {
    const daysToEnd = Math.ceil(
      (new Date(t.ends_at).getTime() - today.getTime()) / 86_400_000,
    );
    horizonDays = Math.max(horizonDays, daysToEnd + AFTER_BLOCK_DAYS);
  }
  horizonDays = Math.min(horizonDays, MAX_HORIZON_DAYS);

  const blockedDates: string[] = [];
  for (let i = 0; i <= horizonDays; i++) {
    const dayKey = formatIsoDate(addDays(today, i));
    const ds = startOfDayInTz(dayKey).getTime();
    const de = endOfDayInTz(dayKey).getTime();
    const fullyOff = timeOff.some(
      (t) =>
        new Date(t.starts_at).getTime() <= ds &&
        new Date(t.ends_at).getTime() >= de,
    );
    if (fullyOff) blockedDates.push(dayKey);
  }

  // Absences whose public notice Jeanine switched off (e.g. a private
  // day off) — the date stays blocked, only the banner is hidden.
  const hiddenNotices = new Set(
    await getSiteStringArray("timeoff.hidden_notices"),
  );
  const visibleTimeOff = timeOff.filter((t) => !hiddenNotices.has(t.id));

  // Weekdays Jeanine is open (0 = Sunday) — days outside this are closed.
  const openingHours = await listOpeningHours(staffId).catch(() => []);
  const openWeekdays = [...new Set(openingHours.map((h) => h.weekday))];

  // One-off openings make a normally-closed day bookable.
  const specialOpenDates = (await listSpecialOpenings().catch(() => [])).map(
    (s) => s.date,
  );

  // Admin-defined service categories group the service picker.
  const [categories, categoryMap] = await Promise.all([
    listServiceCategories(),
    getServiceCategoryMap(),
  ]);

  // Coming from a waitlist "spot opened" mail: the service/date/time are
  // in the URL; the contact details are resolved server-side from the
  // signed waitlist id so no personal data travels in the link.
  let contact: { fullName: string; email: string; phone: string } | null =
    null;
  if (params?.wl && params?.token && verifyWaitlistToken(params.wl, params.token)) {
    try {
      const c = await getWaitlistContact(params.wl);
      if (c) {
        contact = {
          fullName: c.fullName,
          email: c.email,
          phone: c.phone ?? "",
        };
      }
    } catch {
      contact = null;
    }
  }

  const prefill =
    params?.dienst || contact
      ? {
          serviceSlug: params?.dienst,
          date: /^\d{4}-\d{2}-\d{2}$/.test(params?.datum ?? "")
            ? params!.datum
            : undefined,
          time: /^\d{2}:\d{2}$/.test(params?.tijd ?? "")
            ? params!.tijd
            : undefined,
          fullName: contact?.fullName,
          email: contact?.email,
          phone: contact?.phone,
        }
      : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <header className="mb-12 max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Online boeken
        </p>
        <h1 className="mt-4 text-5xl tracking-tight">Boek je afspraak</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
          Kies een dienst, een datum en een tijd. Bevestiging volgt direct per
          e-mail, met agenda-bijlage.
        </p>
      </header>

      {visibleTimeOff.length > 0 && (
        <div className="mb-10 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Let op — afwezig</p>
          <ul className="mt-1.5 space-y-0.5">
            {visibleTimeOff.map((t) => {
              const startKey = formatIsoDate(new Date(t.starts_at));
              const endKey = formatIsoDate(new Date(t.ends_at));
              const period =
                startKey === endKey
                  ? `op ${dayLabel(startKey)}`
                  : `van ${dayLabel(startKey)} tot ${dayLabel(endKey)}`;
              return (
                <li key={t.id}>
                  Afwezig {period}
                  {t.reason ? ` — ${t.reason}` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {bookable.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          Er zijn op dit moment geen online boekbare diensten.
        </p>
      ) : (
        <BookingForm
          services={bookable}
          staffId={staffId}
          prefill={prefill}
          blockedDates={blockedDates}
          horizonDays={horizonDays}
          openWeekdays={openWeekdays}
          specialOpenDates={specialOpenDates}
          categories={categories}
          categoryMap={categoryMap}
        />
      )}

      <Toaster richColors position="top-right" />
    </div>
  );
}
