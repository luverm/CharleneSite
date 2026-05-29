"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setBookingPaymentAction } from "@/actions/admin-booking";

const METHODS = ["contant", "pin", "overboeking", "factuur"] as const;

export function BookingPayment({
  bookingId,
  initialPaid,
  initialMethod,
  initialAmountCents,
  servicePriceCents,
}: {
  bookingId: string;
  initialPaid: boolean;
  initialMethod: string | null;
  initialAmountCents: number | null;
  servicePriceCents: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paid, setPaid] = useState(initialPaid);
  const [method, setMethod] = useState(initialMethod ?? "pin");
  const [amount, setAmount] = useState(
    ((initialAmountCents ?? servicePriceCents) / 100).toFixed(2),
  );

  function save() {
    startTransition(async () => {
      const result = await setBookingPaymentAction({
        id: bookingId,
        paid,
        method: paid ? method : "",
        amountCents: paid
          ? Math.round(parseFloat(amount.replace(",", ".")) * 100) || 0
          : undefined,
      });
      if (result.ok) {
        toast.success("Betaling bijgewerkt");
        router.refresh();
      } else {
        toast.error("Bijwerken mislukt.");
      }
    });
  }

  return (
    <div className="grid gap-4">
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={paid}
          onChange={(e) => setPaid(e.target.checked)}
          className="h-4 w-4"
        />
        Betaald
      </label>

      {paid && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pay-method">Methode</Label>
            <select
              id="pay-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1.5 block h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="pay-amount">Bedrag (€)</Label>
            <Input
              id="pay-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>
      )}

      <div>
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Opslaan…" : "Betaling opslaan"}
        </Button>
      </div>
    </div>
  );
}
