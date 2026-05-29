"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBookingDurationAction } from "@/actions/admin-booking";

/** Per-appointment duration adjustment — keeps the start time fixed. */
export function BookingDurationButton({
  bookingId,
  currentMinutes,
}: {
  bookingId: string;
  currentMinutes: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(currentMinutes);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!Number.isFinite(minutes) || minutes < 15 || minutes > 480) {
      toast.error("Duur moet tussen 15 en 480 minuten liggen.");
      return;
    }
    startTransition(async () => {
      const r = await updateBookingDurationAction({
        id: bookingId,
        durationMin: minutes,
      });
      if (r.ok) {
        toast.success("Duur aangepast");
        setOpen(false);
        router.refresh();
      } else if (r.code === "SLOT_TAKEN") {
        toast.error(
          "Met deze duur overlapt de afspraak een andere afspraak.",
        );
      } else {
        toast.error("Aanpassen mislukt.");
      }
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={() => setOpen(true)}
      >
        Duur aanpassen
      </Button>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <div>
        <Label htmlFor="booking-duration">
          Duur van deze afspraak (minuten)
        </Label>
        <Input
          id="booking-duration"
          type="number"
          min={15}
          max={480}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="mt-1.5 max-w-[140px]"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          De starttijd blijft hetzelfde — alleen de lengte verandert, ook
          in de agenda. De klant krijgt hiervan geen mail.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Opslaan…" : "Duur opslaan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOpen(false);
            setMinutes(currentMinutes);
          }}
          disabled={pending}
        >
          Annuleren
        </Button>
      </div>
    </div>
  );
}
