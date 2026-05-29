"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportBookingsCsv } from "@/actions/finance";

export function CsvExport() {
  const now = new Date();
  const y = now.getFullYear();
  const [from, setFrom] = useState(`${y}-01-01`);
  const [to, setTo] = useState(
    now.toISOString().slice(0, 10),
  );
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await exportBookingsCsv(from, to);
      if (!result.ok) {
        toast.error("Export mislukt — controleer de datums.");
        return;
      }
      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `boekingen-${from}_${to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div>
        <Label htmlFor="from">Vanaf</Label>
        <Input
          id="from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="to">Tot</Label>
        <Input
          id="to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="mt-1.5"
        />
      </div>
      <Button type="button" onClick={run} disabled={pending}>
        {pending ? "Bezig…" : "Download CSV"}
      </Button>
    </div>
  );
}
