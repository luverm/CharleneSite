"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rescheduleBooking } from "@/actions/admin-booking";
import { fetchAvailableSlots } from "@/actions/availability";
import { zonedDateTimeToUtc, formatTime } from "@/lib/time";

export function RescheduleBooking({
  bookingId,
  serviceId,
  staffId,
  durationMin,
}: {
  bookingId: string;
  serviceId: string;
  staffId: string;
  durationMin: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(durationMin);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingSlots, startSlots] = useTransition();

  function loadSlots() {
    if (!date) {
      toast.error("Kies eerst een datum.");
      return;
    }
    startSlots(async () => {
      try {
        const dtos = await fetchAvailableSlots({ staffId, serviceId, date });
        setSlots(dtos.map((d) => formatTime(new Date(d.startsAt))));
      } catch {
        toast.error("Kon vrije tijden niet ophalen.");
      }
    });
  }

  function submit() {
    if (!date || !time) {
      toast.error("Vul datum en tijd in.");
      return;
    }
    if (!Number.isFinite(duration) || duration < 15 || duration > 480) {
      toast.error("Duur moet tussen 15 en 480 minuten liggen.");
      return;
    }
    const start = zonedDateTimeToUtc(date, time);
    const end = new Date(start.getTime() + duration * 60_000);
    startTransition(async () => {
      const result = await rescheduleBooking({
        id: bookingId,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      });
      if (result.ok) {
        toast.success("Afspraak verzet — klant is gemaild");
        setOpen(false);
        router.refresh();
      } else if (result.code === "SLOT_TAKEN") {
        toast.error("Dat tijdslot is al bezet.");
      } else {
        toast.error("Verzetten mislukt.");
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Verzetten
      </Button>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="r-date">Nieuwe datum</Label>
          <Input
            id="r-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSlots(null);
            }}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="r-time">Nieuwe tijd</Label>
          <Input
            id="r-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="r-duration">Duur (min)</Label>
          <Input
            id="r-duration"
            type="number"
            min={15}
            max={480}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1.5"
          />
        </div>
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
            {slots.length === 0 && (
              <span className="text-xs text-muted-foreground">
                Geen vrije standaardtijden — voer handmatig in.
              </span>
            )}
            {slots.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={
                  "rounded-md border px-2 py-1 text-xs " +
                  (time === t ? "border-primary bg-accent" : "")
                }
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Verzetten…" : "Bevestig nieuwe tijd"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Annuleren
        </Button>
      </div>
    </div>
  );
}
