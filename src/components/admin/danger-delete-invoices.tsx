"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAllInvoicesAction } from "@/actions/admin-invoice";

const PHRASE = "VERWIJDER";

export function DangerDeleteInvoices() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const r = await deleteAllInvoicesAction(value);
      if (r.ok) {
        toast.success(`${r.deleted ?? 0} factu(u)r(en) verwijderd`);
        setOpen(false);
        setValue("");
        router.refresh();
      } else {
        toast.error("Verwijderen mislukt.");
      }
    });
  }

  return (
    <div className="mt-10 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
      <h2 className="text-base font-semibold text-destructive">Gevarenzone</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Verwijdert <strong>alle</strong> facturen (boekingsfacturen én
        bruidsfacturen, inclusief regelitems) definitief. Dit kan niet
        ongedaan worden gemaakt.
      </p>

      {!open ? (
        <Button
          type="button"
          variant="destructive"
          className="mt-4"
          onClick={() => setOpen(true)}
        >
          Alle facturen verwijderen
        </Button>
      ) : (
        <div className="mt-4 grid gap-3">
          <label className="text-sm">
            Typ <code className="rounded bg-muted px-1.5 py-0.5">{PHRASE}</code>{" "}
            om te bevestigen:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              className="mt-1.5 max-w-xs"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={run}
              disabled={pending || value !== PHRASE}
            >
              {pending ? "Verwijderen…" : "Definitief verwijderen"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setValue("");
              }}
              disabled={pending}
            >
              Annuleren
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
