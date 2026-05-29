"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAdminBooking } from "@/actions/admin-booking";
import { searchCustomersAction } from "@/actions/admin-customer";
import { fetchAvailableSlots } from "@/actions/availability";
import { zonedDateTimeToUtc, formatTime } from "@/lib/time";

type CustomerOption = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
};

type Svc = {
  id: string;
  name: string;
  duration_min: number;
  kind: "regular";
};

export function AdminBookingForm({
  services,
  staffId,
  defaults,
  defaultServiceId,
  defaultDate,
  defaultTime,
}: {
  services: Svc[];
  staffId: string;
  defaults?: { fullName?: string; email?: string; phone?: string };
  defaultServiceId?: string;
  defaultDate?: string;
  defaultTime?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serviceId, setServiceId] = useState(
    defaultServiceId ?? services[0]?.id ?? "",
  );
  const [date, setDate] = useState(defaultDate ?? "");
  const [time, setTime] = useState(defaultTime ?? "");
  const [fullName, setFullName] = useState(defaults?.fullName ?? "");
  const [email, setEmail] = useState(defaults?.email ?? "");
  const [phone, setPhone] = useState(defaults?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadingSlots, startSlots] = useTransition();

  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<CustomerOption[]>([]);
  const [picked, setPicked] = useState(false);

  // Debounced customer search.
  useEffect(() => {
    if (picked) return;
    const q = custQuery.trim();
    let cancelled = false;
    const t = setTimeout(async () => {
      if (q.length < 2) {
        if (!cancelled) setCustResults([]);
        return;
      }
      const results = await searchCustomersAction(q);
      if (!cancelled) setCustResults(results);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [custQuery, picked]);

  function pickCustomer(c: CustomerOption) {
    setFullName(c.full_name);
    setEmail(c.email);
    setPhone(c.phone ?? "");
    setPicked(true);
    setCustResults([]);
    setCustQuery("");
  }

  function clearCustomer() {
    setPicked(false);
    setFullName("");
    setEmail("");
    setPhone("");
  }

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  );

  function loadSlots() {
    if (!service || !date) {
      toast.error("Kies eerst een dienst en datum.");
      return;
    }
    startSlots(async () => {
      try {
        const dtos = await fetchAvailableSlots({
          staffId,
          serviceId: service.id,
          date,
        });
        setSlots(dtos.map((d) => formatTime(new Date(d.startsAt))));
      } catch {
        toast.error("Kon vrije tijden niet ophalen.");
      }
    });
  }

  function submit() {
    if (!service || !date || !time) {
      toast.error("Vul dienst, datum en tijd in.");
      return;
    }
    const start = zonedDateTimeToUtc(date, time);
    const end = new Date(start.getTime() + service.duration_min * 60_000);
    startTransition(async () => {
      const result = await createAdminBooking({
        serviceId: service.id,
        staffId,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        customer: { fullName, email, phone, notes },
      });
      if (result.ok) {
        toast.success("Boeking aangemaakt");
        router.push("/dashboard");
      } else if (result.code === "SLOT_TAKEN") {
        toast.error("Dat tijdslot is al bezet.");
      } else {
        toast.error(result.message ?? "Aanmaken mislukt.");
      }
    });
  }

  return (
    <div className="grid gap-5">
      <div>
        <Label htmlFor="service">Dienst</Label>
        <select
          id="service"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setSlots(null);
          }}
          className="mt-1.5 block h-9 w-full rounded-md border bg-background px-2 text-sm"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.duration_min} min)
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="date">Datum</Label>
          <Input
            id="date"
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
          <Label htmlFor="time">Tijd</Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
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
          <div className="mt-3 flex flex-wrap gap-2">
            {slots.length === 0 && (
              <span className="text-xs text-muted-foreground">
                Geen vrije standaardtijden — voer handmatig een tijd in.
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

      <div className="rounded-lg border bg-muted/30 p-4">
        <Label htmlFor="cust">Klant</Label>
        {picked ? (
          <div className="mt-1.5 flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm">
            <span>
              <span className="font-medium">{fullName}</span>
              {email ? (
                <span className="text-muted-foreground"> · {email}</span>
              ) : null}
            </span>
            <button
              type="button"
              onClick={clearCustomer}
              className="text-xs underline underline-offset-4"
            >
              Wissen
            </button>
          </div>
        ) : (
          <>
            <Input
              id="cust"
              value={custQuery}
              onChange={(e) => setCustQuery(e.target.value)}
              placeholder="Zoek bestaande klant op naam of e-mail…"
              className="mt-1.5"
              autoComplete="off"
            />
            {custResults.length > 0 && (
              <ul className="mt-2 divide-y rounded-md border bg-background">
                {custResults.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => pickCustomer(c)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{c.full_name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {c.email}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Bestaande klant? Kies hierboven. Nieuwe klant? Vul de velden
              hieronder in — die wordt automatisch aangemaakt.
            </p>
          </>
        )}
      </div>

      <div>
        <Label htmlFor="fullName">Naam</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="phone">Telefoon</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Opmerking (optioneel)</Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1.5"
        />
      </div>

      <div>
        <Button type="button" onClick={submit} disabled={pending} size="lg">
          {pending ? "Aanmaken…" : "Boeking aanmaken"}
        </Button>
      </div>
    </div>
  );
}
