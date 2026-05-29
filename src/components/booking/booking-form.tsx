"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Check, Clock, Calendar as CalendarIcon, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";

import {
  publicCustomerSchema,
  type PublicCustomerInput,
} from "@/lib/schemas/booking";
import {
  formatPrice,
  formatDuration,
  type Service,
} from "@/lib/services-format";
import type { ServiceCategory } from "@/lib/db/service-categories";
import { fetchDaySlots, type DaySlotDto } from "@/actions/availability";
import { createBooking } from "@/actions/booking";
import { SlotGrid, type Slot } from "@/components/booking/slot-grid";
import { WaitlistCta } from "@/components/booking/waitlist-cta";
import { formatIsoDate, formatHumanDateTime, formatTime } from "@/lib/time";
import { SERVICE_CATEGORIES, categoryForSlug } from "@/content/services";

const STEPS = ["Dienst", "Datum & tijd", "Gegevens"] as const;
const TOTAL_STEPS = STEPS.length;

const todayInTz = new Date(formatIsoDate(new Date()) + "T00:00:00Z");

export type BookingPrefill = {
  serviceSlug?: string;
  date?: string;
  time?: string;
  fullName?: string;
  email?: string;
  phone?: string;
};

type Group = { key: string; label: string; items: Service[] };

/** Groups regular services by the admin's categories, or by slug. */
function groupRegularServices(
  services: Service[],
  categories: ServiceCategory[],
  categoryMap: Record<string, string>,
): Group[] {
  const regular = services.filter((s) => s.kind === "regular");
  if (categories.length > 0) {
    const known = new Set(categories.map((c) => c.id));
    return [
      ...categories.map((c) => ({
        key: c.id,
        label: c.label,
        items: regular.filter((s) => categoryMap[s.id] === c.id),
      })),
      {
        key: "overig",
        label: "Overig",
        items: regular.filter((s) => !known.has(categoryMap[s.id] ?? "")),
      },
    ].filter((g) => g.items.length > 0);
  }
  const buckets = new Map<string, Service[]>();
  for (const s of regular) {
    const key = categoryForSlug(s.slug)?.key ?? "overig";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(s);
  }
  const groups: Group[] = [];
  for (const cat of SERVICE_CATEGORIES) {
    const items = buckets.get(cat.key);
    if (items && items.length) {
      groups.push({ key: cat.key, label: cat.label, items });
    }
  }
  const overig = buckets.get("overig");
  if (overig && overig.length) {
    groups.push({ key: "overig", label: "Overig", items: overig });
  }
  return groups;
}

export function BookingForm({
  services,
  staffId,
  prefill,
  blockedDates = [],
  horizonDays = 90,
  openWeekdays = [],
  specialOpenDates = [],
  categories = [],
  categoryMap = {},
}: {
  services: Service[];
  staffId: string;
  prefill?: BookingPrefill;
  blockedDates?: string[];
  horizonDays?: number;
  openWeekdays?: number[];
  specialOpenDates?: string[];
  categories?: ServiceCategory[];
  categoryMap?: Record<string, string>;
}) {
  const router = useRouter();
  const prefilledServiceId = prefill?.serviceSlug
    ? (services.find((s) => s.slug === prefill.serviceSlug)?.id ?? null)
    : null;
  // A pre-chosen service (e.g. ?dienst=knippen-dames) skips the
  // service-picker and starts at the date+time step.
  const [step, setStep] = useState(prefilledServiceId ? 1 : 0);
  const [serviceId, setServiceId] = useState<string | null>(
    prefilledServiceId,
  );
  const [date, setDate] = useState<Date | undefined>(
    prefill?.date ? new Date(`${prefill.date}T00:00:00Z`) : undefined,
  );
  const [fetchedSlots, setFetchedSlots] = useState<Slot[]>([]);
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);
  const [selectedStartIso, setSelectedStartIso] = useState<string | null>(null);
  const [waitlistTime, setWaitlistTime] = useState<string | null>(null);
  // Idempotency-key generated once per mount via lazy useState initialiser.
  // Different value on server vs. client is fine — it isn't rendered into HTML.
  const [idempotencyKey] = useState<string>(() => uuidv4());
  const prefillAppliedRef = useRef(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<PublicCustomerInput>({
    resolver: zodResolver(publicCustomerSchema),
    defaultValues: {
      fullName: prefill?.fullName ?? "",
      email: prefill?.email ?? "",
      phone: prefill?.phone ?? "",
      notes: "",
    },
    mode: "onBlur",
  });

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  const dateStr = date ? formatIsoDate(date) : null;
  const requestKey = service && dateStr ? `${service.id}|${dateStr}` : null;
  const slotsLoading = requestKey !== null && fetchedFor !== requestKey;

  useEffect(() => {
    if (!service || !dateStr || !requestKey) return;
    let cancelled = false;
    fetchDaySlots({ staffId, serviceId: service.id, date: dateStr })
      .then((dtos: DaySlotDto[]) => {
        if (cancelled) return;
        setFetchedSlots(
          dtos.map((s) => ({
            startsAt: new Date(s.startsAt),
            endsAt: new Date(s.endsAt),
            available: s.available,
          })),
        );
        setFetchedFor(requestKey);

        // One-shot: arrived from a waitlist "spot opened" link with a
        // service, date, time and pre-filled contact. Jump straight to
        // the confirm step with the desired time selected — or to the
        // date+time step if it's gone, with the contact still filled in.
        if (prefill && !prefillAppliedRef.current) {
          prefillAppliedRef.current = true;
          if (prefill.time) {
            const hit = dtos.find(
              (s) =>
                s.available &&
                formatTime(new Date(s.startsAt)) === prefill.time,
            );
            if (hit) {
              setSelectedStartIso(new Date(hit.startsAt).toISOString());
              setStep(2);
            } else {
              toast.error("Die tijd is net bezet — kies een ander moment.");
              setStep(1);
            }
          } else {
            setStep(1);
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        toast.error("Kon vrije tijden niet ophalen — probeer het opnieuw.");
        setFetchedSlots([]);
        setFetchedFor(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [staffId, service, dateStr, requestKey, prefill]);

  const slots: Slot[] =
    service && dateStr && fetchedFor === requestKey ? fetchedSlots : [];

  function handleSelectService(id: string) {
    setServiceId(id);
    setFetchedSlots([]);
    setFetchedFor(null);
    setSelectedStartIso(null);
    setWaitlistTime(null);
  }

  function handleSelectDate(d: Date | undefined) {
    setDate(d);
    setFetchedSlots([]);
    setFetchedFor(null);
    setSelectedStartIso(null);
    setWaitlistTime(null);
  }

  function refreshSlots() {
    if (!service || !dateStr || !requestKey) return;
    setFetchedFor(null);
    fetchDaySlots({ staffId, serviceId: service.id, date: dateStr }).then(
      (dtos) => {
        setFetchedSlots(
          dtos.map((s) => ({
            startsAt: new Date(s.startsAt),
            endsAt: new Date(s.endsAt),
            available: s.available,
          })),
        );
        setFetchedFor(requestKey);
      },
    );
  }

  const selectedSlot = slots.find(
    (s) => s.startsAt.toISOString() === selectedStartIso,
  );

  function onSubmit(values: PublicCustomerInput) {
    if (!service || !selectedSlot || !selectedSlot.available || !idempotencyKey)
      return;
    startTransition(async () => {
      const result = await createBooking({
        serviceId: service.id,
        staffId,
        startsAt: selectedSlot.startsAt.toISOString(),
        endsAt: selectedSlot.endsAt.toISOString(),
        idempotencyKey,
        customer: {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          notes: values.notes ?? "",
        },
        website: "",
      });

      if (result.ok) {
        router.push(`/boeken/bevestigd?ref=${result.bookingId}`);
        return;
      }

      if (result.code === "SLOT_TAKEN") {
        toast.error("Dit slot is net weg — kies opnieuw.");
        setStep(1);
        setSelectedStartIso(null);
        refreshSlots();
        return;
      }

      toast.error(result.message ?? "Er ging iets mis. Probeer het opnieuw.");
    });
  }

  return (
    <div className="grid gap-10 pb-24 lg:grid-cols-[1fr_320px] lg:pb-0">
      <div>
        <Stepper current={step} />

        <div className="mt-10">
          {step === 0 && (
            <ServiceStep
              services={services}
              categories={categories}
              categoryMap={categoryMap}
              selectedId={serviceId}
              onSelect={handleSelectService}
            />
          )}

          {step === 1 && (
            <DateTimeStep
              date={date}
              dateStr={dateStr}
              blockedDates={blockedDates}
              horizonDays={horizonDays}
              openWeekdays={openWeekdays}
              specialOpenDates={specialOpenDates}
              onSelectDate={handleSelectDate}
              serviceId={service?.id ?? null}
              slots={slots}
              selectedStartIso={selectedStartIso}
              onSelectTime={setSelectedStartIso}
              waitlistTime={waitlistTime}
              onWaitlist={(s) => setWaitlistTime(formatTime(s.startsAt))}
              loading={slotsLoading}
            />
          )}

          {step === 2 && service && selectedSlot && (
            <DetailsStep
              service={service}
              slot={selectedSlot}
              form={form}
              onSubmit={onSubmit}
            />
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <Summary
          service={service}
          date={date}
          slot={selectedSlot ?? null}
          step={step}
        />
        <BookingNav
          step={step}
          canNext={
            step === 0
              ? !!serviceId
              : step === 1
                ? !!selectedStartIso
                : true
          }
          pending={pending}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          onNext={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Stepper                                                                 */
/* ─────────────────────────────────────────────────────────────────────── */

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1 sm:gap-3">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className={
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm transition " +
                  (active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : done
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground")
                }
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={
                  "hidden text-sm sm:inline " +
                  (active
                    ? "font-medium text-foreground"
                    : done
                      ? "text-foreground"
                      : "text-muted-foreground")
                }
              >
                {label}
              </span>
            </div>
            {i < TOTAL_STEPS - 1 && (
              <span
                aria-hidden
                className={
                  "h-px flex-1 transition " +
                  (i < current ? "bg-primary/40" : "bg-border")
                }
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Step 1 — choose service                                                 */
/* ─────────────────────────────────────────────────────────────────────── */

function ServiceStep({
  services,
  categories,
  categoryMap,
  selectedId,
  onSelect,
}: {
  services: Service[];
  categories: ServiceCategory[];
  categoryMap: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const groups = groupRegularServices(services, categories, categoryMap);

  return (
    <section>
      <h2 className="text-2xl tracking-tight">Kies een dienst</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Alle prijzen incl. wassen waar van toepassing.
      </p>

      <div className="mt-6 space-y-8">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {g.label}
            </p>
            <div className="grid gap-3">
              {g.items.map((s) => {
                const isSelected = s.id === selectedId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelect(s.id)}
                    className={
                      "group flex w-full items-start gap-4 rounded-lg border p-5 text-left transition " +
                      (isSelected
                        ? "border-primary bg-accent/30 shadow-sm"
                        : "border-border bg-card hover:border-primary/40 hover:bg-accent/10")
                    }
                  >
                    <span
                      className={
                        "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition " +
                        (isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border")
                      }
                      aria-hidden
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-lg tracking-tight">{s.name}</h3>
                        <span className="font-medium">
                          {formatPrice(s.price_cents)}
                        </span>
                      </div>
                      {s.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {s.description}
                        </p>
                      )}
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDuration(s.duration_min)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Step 2 — choose date and time (combined)                                */
/* ─────────────────────────────────────────────────────────────────────── */

function DateTimeStep({
  date,
  dateStr,
  blockedDates,
  horizonDays,
  openWeekdays,
  specialOpenDates,
  onSelectDate,
  serviceId,
  slots,
  selectedStartIso,
  onSelectTime,
  waitlistTime,
  onWaitlist,
  loading,
}: {
  date: Date | undefined;
  dateStr: string | null;
  blockedDates: string[];
  horizonDays: number;
  openWeekdays: number[];
  specialOpenDates: string[];
  onSelectDate: (d: Date | undefined) => void;
  serviceId: string | null;
  slots: Slot[];
  selectedStartIso: string | null;
  onSelectTime: (iso: string) => void;
  waitlistTime: string | null;
  onWaitlist: (slot: Slot) => void;
  loading: boolean;
}) {
  const maxDate = new Date(todayInTz.getTime() + horizonDays * 86_400_000);
  const showWaitlist =
    !loading &&
    !!dateStr &&
    (slots.length === 0 || slots.some((s) => !s.available));

  return (
    <section>
      <h2 className="text-2xl tracking-tight">Kies datum en tijd</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Kies een dag — de vrije tijden verschijnen er meteen onder.
      </p>

      <div className="mt-6 flex justify-center rounded-lg border border-border bg-card p-4 sm:p-6">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelectDate}
          locale={nl}
          weekStartsOn={1}
          disabled={(d) => {
            if (d < todayInTz) return true;
            if (d > maxDate) return true;
            const iso = formatIsoDate(d);
            // A one-off opening makes a normally-closed day bookable.
            const isSpecialOpen = specialOpenDates.includes(iso);
            // Weekdays without opening hours are closed. Fall back to
            // "Sunday closed" only when no opening hours are configured.
            if (
              !isSpecialOpen &&
              (openWeekdays.length > 0
                ? !openWeekdays.includes(d.getDay())
                : d.getDay() === 0)
            )
              return true;
            // Whole days Jeanine blocked off (afwezig / vrij).
            if (blockedDates.includes(iso)) return true;
            return false;
          }}
        />
      </div>

      {date && (
        <div className="mt-8">
          <h3 className="text-sm font-medium">
            Beschikbare tijden ·{" "}
            <span className="text-muted-foreground">
              {format(date, "EEEE d MMMM", { locale: nl })}
            </span>
          </h3>
          <div className="mt-3">
            <SlotGrid
              slots={slots}
              selected={selectedStartIso}
              onSelect={onSelectTime}
              onWaitlist={onWaitlist}
              loading={loading}
            />
            {showWaitlist && dateStr && (
              <div className="mt-4">
                <WaitlistCta
                  key={`${dateStr}:${waitlistTime ?? "day"}`}
                  serviceId={serviceId}
                  preferredDate={dateStr}
                  preferredTime={waitlistTime ?? undefined}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Step 3 — customer details                                               */
/* ─────────────────────────────────────────────────────────────────────── */

function DetailsStep({
  service,
  slot,
  form,
  onSubmit,
}: {
  service: Service;
  slot: Slot;
  form: ReturnType<typeof useForm<PublicCustomerInput>>;
  onSubmit: (v: PublicCustomerInput) => void;
}) {
  return (
    <section>
      <h2 className="text-2xl tracking-tight">Jouw gegevens</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Vul je naam en contactgegevens in. Je krijgt een bevestiging per
        e-mail met agenda-bijlage.
      </p>

      <div className="mt-6 rounded-lg border border-border bg-accent/20 p-5 text-sm">
        <p>
          <span className="font-medium">{service.name}</span>{" "}
          <span className="text-muted-foreground">
            · {formatDuration(service.duration_min)} ·{" "}
            {formatPrice(service.price_cents)}
          </span>
        </p>
        <p className="mt-1 text-muted-foreground">
          {formatHumanDateTime(slot.startsAt)}
        </p>
      </div>

      <form
        id="booking-details-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-6 grid gap-5"
        noValidate
      >
        {/* Honeypot */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
          defaultValue=""
        />

        <div>
          <Label htmlFor="fullName">Naam</Label>
          <Input
            id="fullName"
            {...form.register("fullName")}
            autoComplete="name"
            className="mt-1.5"
          />
          {form.formState.errors.fullName && (
            <p className="mt-1 text-xs text-destructive">
              {form.formState.errors.fullName.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...form.register("email")}
              className="mt-1.5"
            />
            {form.formState.errors.email && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="phone">Telefoon</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              {...form.register("phone")}
              className="mt-1.5"
            />
            {form.formState.errors.phone && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Opmerking (optioneel)</Label>
          <Textarea
            id="notes"
            rows={3}
            {...form.register("notes")}
            className="mt-1.5"
            placeholder="Allergieën, gewenste lengte, inspiratiebeelden..."
          />
        </div>
      </form>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Navigation — sticky bottom bar on mobile, under the summary on desktop  */
/* ─────────────────────────────────────────────────────────────────────── */

function BookingNav({
  step,
  canNext,
  pending,
  onBack,
  onNext,
}: {
  step: number;
  canNext: boolean;
  pending: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t bg-background p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
      {step > 0 && (
        <Button type="button" variant="outline" onClick={onBack}>
          Terug
        </Button>
      )}
      {step < TOTAL_STEPS - 1 ? (
        <Button
          type="button"
          disabled={!canNext}
          onClick={onNext}
          size="lg"
          className="flex-1"
        >
          Volgende
        </Button>
      ) : (
        <Button
          type="submit"
          form="booking-details-form"
          disabled={pending}
          size="lg"
          className="flex-1"
        >
          {pending ? "Bevestigen..." : "Bevestig boeking"}
        </Button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Sticky summary card                                                     */
/* ─────────────────────────────────────────────────────────────────────── */

function Summary({
  service,
  date,
  slot,
  step,
}: {
  service: Service | null;
  date: Date | undefined;
  slot: Slot | null;
  step: number;
}) {
  const empty = !service && !date && !slot;
  return (
    <aside>
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Samenvatting
        </p>

        {empty ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Vul de stappen in om je samenvatting hier te zien.
          </p>
        ) : (
          <dl className="mt-5 space-y-5 text-sm">
            <SummaryRow
              icon={<User className="h-4 w-4" />}
              label="Dienst"
              value={
                service ? (
                  <>
                    <span className="block font-medium">{service.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDuration(service.duration_min)}
                    </span>
                  </>
                ) : null
              }
              done={step > 0}
            />
            <SummaryRow
              icon={<CalendarIcon className="h-4 w-4" />}
              label="Datum"
              value={
                date
                  ? format(date, "EEEE d MMMM yyyy", { locale: nl })
                  : null
              }
              done={step > 1}
            />
            <SummaryRow
              icon={<Clock className="h-4 w-4" />}
              label="Tijd"
              value={slot ? formatTime(slot.startsAt) : null}
              done={step > 1}
            />
          </dl>
        )}

        {service && (
          <div className="mt-6 flex items-baseline justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Totaal</span>
            <span className="text-lg font-medium">
              {formatPrice(service.price_cents)}
            </span>
          </div>
        )}
      </div>

      <p className="mt-4 px-2 text-xs text-muted-foreground">
        Geen vooruitbetaling. Annuleren kan kosteloos tot 24 uur vooraf.
      </p>
    </aside>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  done,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  done: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full " +
          (done
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground")
        }
        aria-hidden
      >
        {icon}
      </span>
      <div className="flex-1">
        <dt className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5">
          {value ?? (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </dd>
      </div>
    </div>
  );
}
