"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelOwnBooking } from "@/actions/booking";

export function CancelBooking({ id, token }: { id: string; token: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [confirming, setConfirming] = useState(false);

  if (state === "done") {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-sm text-emerald-900">
        <p className="font-medium">Je afspraak is geannuleerd.</p>
        <p className="mt-1">Bedankt voor het laten weten — het slot is weer vrij.</p>
      </div>
    );
  }

  function cancel() {
    startTransition(async () => {
      const result = await cancelOwnBooking(id, token);
      setState(result.ok ? "done" : "error");
    });
  }

  return (
    <div className="grid gap-3">
      {state === "error" && (
        <p className="text-sm text-red-600">
          Annuleren lukte niet. Probeer het later opnieuw of neem contact op.
        </p>
      )}
      {!confirming ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirming(true)}
        >
          Afspraak annuleren
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            onClick={cancel}
            disabled={pending}
          >
            {pending ? "Annuleren…" : "Ja, annuleer"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Toch niet
          </Button>
        </div>
      )}
    </div>
  );
}
