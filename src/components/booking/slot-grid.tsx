"use client";

import { formatTime } from "@/lib/time";

export type Slot = { startsAt: Date; endsAt: Date; available: boolean };

export function SlotGrid({
  slots,
  selected,
  onSelect,
  onWaitlist,
  loading,
}: {
  slots: Slot[];
  selected: string | null;
  onSelect: (iso: string) => void;
  onWaitlist?: (slot: Slot) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
        <p className="text-sm font-medium">Geen tijden op deze dag</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Kies een andere datum — of probeer een andere dienst.
        </p>
      </div>
    );
  }

  // Split into morning (before 12:00 local) and afternoon (>= 12:00) so the
  // grid breathes a bit on long workdays. Group keys must match the local
  // timezone, which formatTime already handles.
  const morning = slots.filter((s) => parseInt(formatTime(s.startsAt)) < 12);
  const afternoon = slots.filter((s) => parseInt(formatTime(s.startsAt)) >= 12);

  const anyTaken = slots.some((s) => !s.available);

  return (
    <div className="space-y-6">
      {morning.length > 0 && (
        <SlotGroup
          label="Ochtend"
          slots={morning}
          selected={selected}
          onSelect={onSelect}
          onWaitlist={onWaitlist}
        />
      )}
      {afternoon.length > 0 && (
        <SlotGroup
          label="Middag"
          slots={afternoon}
          selected={selected}
          onSelect={onSelect}
          onWaitlist={onWaitlist}
        />
      )}
      {anyTaken && (
        <p className="text-xs text-muted-foreground">
          Doorgestreepte tijden zijn bezet — klik erop om je voor die dag op
          de wachtlijst te zetten.
        </p>
      )}
    </div>
  );
}

function SlotGroup({
  label,
  slots,
  selected,
  onSelect,
  onWaitlist,
}: {
  label: string;
  slots: Slot[];
  selected: string | null;
  onSelect: (iso: string) => void;
  onWaitlist?: (slot: Slot) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {slots.map((slot) => {
          const iso = slot.startsAt.toISOString();
          const time = formatTime(slot.startsAt);

          if (!slot.available) {
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onWaitlist?.(slot)}
                title="Bezet — zet me op de wachtlijst voor deze dag"
                className="rounded-md border border-dashed border-border bg-muted/40 px-2 py-3 text-sm font-medium tabular-nums text-muted-foreground line-through decoration-muted-foreground/60 transition hover:bg-muted"
              >
                {time}
              </button>
            );
          }

          const isSelected = iso === selected;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={
                "rounded-md border px-2 py-3 text-sm font-medium tabular-nums transition " +
                (isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/30")
              }
              aria-pressed={isSelected}
            >
              {time}
            </button>
          );
        })}
      </div>
    </div>
  );
}
