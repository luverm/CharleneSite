"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteBookingAction } from "@/actions/admin-booking";

/** Inline two-step delete for a single booking. */
export function DeleteBookingButton({
  bookingId,
  customerName,
}: {
  bookingId: string;
  customerName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const r = await deleteBookingAction(bookingId);
      if (r.ok) {
        toast.success("Boeking verwijderd");
        router.refresh();
      } else {
        toast.error("Verwijderen mislukt.");
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex h-8 items-center rounded-md bg-destructive/10 px-2 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
        >
          {pending ? "Bezig…" : "Verwijder"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="inline-flex h-8 items-center rounded-md border px-2 text-xs hover:bg-accent disabled:opacity-50"
        >
          Annuleer
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Boeking van ${customerName} verwijderen`}
      title="Boeking verwijderen"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
