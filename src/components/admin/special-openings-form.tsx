"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addSpecialOpeningAction,
  deleteSpecialOpeningAction,
} from "@/actions/schedule";
import type { SpecialOpening } from "@/lib/db/admin-schedule";

export function SpecialOpeningsManager({
  rows,
}: {
  rows: SpecialOpening[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");

  function onAdd() {
    if (!date) {
      toast.error("Kies een datum.");
      return;
    }
    startTransition(async () => {
      const r = await addSpecialOpeningAction({ date, start, end });
      if (r.ok) {
        toast.success("Extra openingsdag toegevoegd");
        setDate("");
        router.refresh();
      } else {
        toast.error(r.message ?? "Opslaan mislukt.");
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteSpecialOpeningAction(id);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-lg border p-5">
        <h2 className="text-base font-semibold">Nieuwe openingsdag</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Op deze dag kunnen klanten online boeken en staat de dag open in
          je agenda — ook al is die weekdag normaal gesloten.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="so-date">Datum</Label>
            <Input
              id="so-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="so-start">Van</Label>
            <Input
              id="so-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="so-end">Tot</Label>
            <Input
              id="so-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={onAdd} disabled={pending}>
            {pending ? "..." : "Toevoegen"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">Geplande openingsdagen</h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nog geen extra openingsdagen.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <p className="font-medium capitalize">
                  {format(parseISO(r.date), "EEEE d MMMM yyyy", {
                    locale: nl,
                  })}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {r.start} – {r.end}
                  </span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(r.id)}
                  disabled={pending}
                >
                  Verwijderen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
