"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { saveOpeningHoursAction } from "@/actions/schedule";
import type { OpeningHourRow } from "@/lib/db/admin-schedule";

const WEEKDAYS = [
  { id: 1, label: "Maandag" },
  { id: 2, label: "Dinsdag" },
  { id: 3, label: "Woensdag" },
  { id: 4, label: "Donderdag" },
  { id: 5, label: "Vrijdag" },
  { id: 6, label: "Zaterdag" },
  { id: 0, label: "Zondag" },
];

type RowState = {
  weekday: number;
  enabled: boolean;
  start: string;
  end: string;
};

function buildInitial(rows: OpeningHourRow[]): RowState[] {
  return WEEKDAYS.map((wd) => {
    const existing = rows.find((r) => r.weekday === wd.id);
    return {
      weekday: wd.id,
      enabled: !!existing,
      start: existing?.start_time.slice(0, 5) ?? "09:00",
      end: existing?.end_time.slice(0, 5) ?? "17:00",
    };
  });
}

export function OpeningHoursForm({
  staffId,
  rows,
}: {
  staffId: string;
  rows: OpeningHourRow[];
}) {
  const router = useRouter();
  const [state, setState] = useState<RowState[]>(() => buildInitial(rows));
  const [pending, startTransition] = useTransition();

  function update(weekday: number, patch: Partial<RowState>) {
    setState((prev) =>
      prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)),
    );
  }

  function onSubmit() {
    const enabled = state.filter((r) => r.enabled);
    for (const r of enabled) {
      if (r.start >= r.end) {
        toast.error(`Eindtijd moet na starttijd liggen (${r.weekday})`);
        return;
      }
    }
    startTransition(async () => {
      await saveOpeningHoursAction({
        staffId,
        rows: enabled.map((r) => ({
          weekday: r.weekday,
          start_time: r.start,
          end_time: r.end,
        })),
      });
      toast.success("Openingstijden opgeslagen");
      router.refresh();
    });
  }

  return (
    <form
      action={onSubmit}
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {state.map((row) => {
        const wd = WEEKDAYS.find((w) => w.id === row.weekday)!;
        return (
          <div
            key={row.weekday}
            className="flex flex-wrap items-center gap-3 rounded-md border p-3"
          >
            <label className="flex w-32 items-center gap-3 text-sm">
              <Checkbox
                checked={row.enabled}
                onCheckedChange={(v) => update(row.weekday, { enabled: v === true })}
              />
              {wd.label}
            </label>
            <div className="flex items-center gap-2 text-sm">
              <Input
                type="time"
                value={row.start}
                onChange={(e) => update(row.weekday, { start: e.target.value })}
                className="w-28"
                disabled={!row.enabled}
              />
              <span className="text-muted-foreground">tot</span>
              <Input
                type="time"
                value={row.end}
                onChange={(e) => update(row.weekday, { end: e.target.value })}
                className="w-28"
                disabled={!row.enabled}
              />
            </div>
          </div>
        );
      })}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan..." : "Opslaan"}
        </Button>
      </div>
    </form>
  );
}
