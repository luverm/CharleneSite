"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rescheduleOwnBooking } from "@/actions/booking";
import { fetchAvailableSlots, type SlotDto } from "@/actions/availability";
import { formatTime } from "@/lib/time";

export function RescheduleOwnBooking({
  id,
  token,
  serviceId,
  staffId,
}: {
  id: string;
  token: string;
  serviceId: string;
  staffId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<SlotDto[] | null>(null);
  const [selected, setSelected] = useState<SlotDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loadingSlots, startSlots] = useTransition();
  const [pending, startSubmit] = useTransition();

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-sm text-emerald-900">
        <p className="font-medium">Je afspraak is verzet.</p>
        <p className="mt-1">
          Je ontvangt een bevestiging per e-mail met het nieuwe moment.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Afspraak verzetten
      </Button>
    );
  }

  function loadSlots() {
    setError(null);
    setSelected(null);
    if (!date) {
      setError("Kies eerst een datum.");
      return;
    }
    startSlots(async () => {
      try {
        const dtos = await fetchAvailableSlots({ staffId, serviceId, date });
        setSlots(dtos);
      } catch {
        setError("Kon vrije tijden niet ophalen. Probeer het opnieuw.");
      }
    });
  }

  function submit() {
    if (!selected) {
      setError("Kies een nieuw tijdstip.");
      return;
    }
    setError(null);
    startSubmit(async () => {
      const result = await rescheduleOwnBooking(
        id,
        token,
        selected.startsAt,
        selected.endsAt,
      );
      if (result.ok) {
        setDone(true);
        router.refresh();
      } else if (result.code === "SLOT_TAKEN") {
        setError("Dat moment is net bezet. Kies een ander tijdstip.");
        setSelected(null);
        loadSlots();
      } else if (result.code === "ALREADY") {
        setError("Deze afspraak is al geannuleerd.");
      } else {
        setError("Verzetten lukte niet. Probeer het later of neem contact op.");
      }
    });
  }

  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <p className="text-sm font-medium">Kies een nieuw moment</p>

      <div>
        <Label htmlFor="rs-date">Nieuwe datum</Label>
        <Input
          id="rs-date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSlots(null);
            setSelected(null);
          }}
          className="mt-1.5"
        />
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadSlots}
          disabled={loadingSlots}
        >
          {loadingSlots ? "Laden…" : "Toon vrije tijden"}
        </Button>
        {slots && (
          <div className="mt-2 flex flex-wrap gap-2">
            {slots.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Geen vrije tijden op deze dag — kies een andere datum.
              </span>
            ) : (
              slots.map((s) => {
                const label = formatTime(new Date(s.startsAt));
                const active = selected?.startsAt === s.startsAt;
                return (
                  <button
                    key={s.startsAt}
                    type="button"
                    onClick={() => setSelected(s)}
                    className={
                      "rounded-md border px-2.5 py-1 text-xs transition " +
                      (active
                        ? "border-primary bg-accent font-medium"
                        : "hover:bg-accent")
                    }
                  >
                    {label}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={submit}
          disabled={pending || !selected}
        >
          {pending ? "Verzetten…" : "Bevestig nieuwe tijd"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Terug
        </Button>
      </div>
    </div>
  );
}
