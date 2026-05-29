"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinWaitlist } from "@/actions/waitlist";

export function WaitlistCta({
  serviceId,
  preferredDate,
  preferredTime,
}: {
  serviceId: string | null;
  preferredDate: string;
  preferredTime?: string;
}) {
  const [open, setOpen] = useState(!!preferredTime);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
        Je staat op de wachtlijst. Komt er een plek vrij, dan nemen we
        contact op.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium underline underline-offset-4"
      >
        Zet me op de wachtlijst voor deze dag
      </button>
    );
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await joinWaitlist({
        serviceId: serviceId ?? "",
        preferredDate,
        fullName: String(formData.get("wl_name") ?? ""),
        email: String(formData.get("wl_email") ?? ""),
        phone: String(formData.get("wl_phone") ?? ""),
        note: preferredTime ? `Voorkeurstijd: ${preferredTime}` : "",
        website: String(formData.get("wl_website") ?? ""),
      });
      if (result.ok) {
        setDone(true);
      } else if (result.code === "RATE_LIMITED") {
        toast.error("Te veel verzoeken — probeer het later opnieuw.");
      } else {
        toast.error("Aanmelden mislukt — controleer je gegevens.");
      }
    });
  }

  return (
    <form
      action={submit}
      className="grid gap-3 rounded-lg border bg-muted/30 p-4"
    >
      <p className="text-sm">
        {preferredTime
          ? `De tijd van ${preferredTime} is bezet. Laat je gegevens achter — komt er iets vrij op deze dag, dan nemen we contact op.`
          : "Geen vrije tijd op deze dag? Laat je gegevens achter — we nemen contact op zodra er iets vrijkomt."}
      </p>
      <input
        type="text"
        name="wl_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="wl_name">Naam</Label>
          <Input id="wl_name" name="wl_name" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="wl_email">E-mail</Label>
          <Input
            id="wl_email"
            name="wl_email"
            type="email"
            required
            className="mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="wl_phone">Telefoon (optioneel)</Label>
        <Input id="wl_phone" name="wl_phone" type="tel" className="mt-1.5" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Versturen…" : "Aanmelden"}
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
    </form>
  );
}
