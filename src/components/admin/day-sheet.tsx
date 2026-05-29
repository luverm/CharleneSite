"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  setBookingPaymentAction,
  updateBookingStatusAction,
} from "@/actions/admin-booking";
import { formatPrice } from "@/lib/services-format";
import { formatTime } from "@/lib/time";
import { bookingStatusLabel, bookingStatusVariant } from "@/lib/status-labels";

export type DayRow = {
  id: string;
  startsAt: string;
  name: string;
  phone: string | null;
  service: string;
  priceCents: number;
  status: string;
  paid: boolean;
  paidMethod: string | null;
  paidAmountCents: number | null;
};

export function DaySheet({ rows }: { rows: DayRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean }>, okMsg: string) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(okMsg);
        router.refresh();
      } else {
        toast.error("Mislukt — probeer opnieuw.");
      }
    });
  }

  function pay(row: DayRow, method: "contant" | "pin") {
    run(
      () =>
        setBookingPaymentAction({
          id: row.id,
          paid: true,
          method,
          amountCents: row.priceCents,
        }),
      `Betaald genoteerd (${method})`,
    );
  }

  return (
    <div className="grid gap-3">
      {rows.map((b) => {
        const terminal = b.status === "no_show" || b.status === "completed";
        return (
          <div
            key={b.id}
            className="rounded-lg border p-4 sm:flex sm:items-center sm:gap-4"
          >
            <div className="flex items-baseline gap-3 sm:w-40 sm:shrink-0">
              <span className="font-mono text-lg font-semibold tabular-nums">
                {formatTime(new Date(b.startsAt))}
              </span>
              <Badge variant={bookingStatusVariant(b.status)}>
                {bookingStatusLabel(b.status)}
              </Badge>
            </div>

            <div className="mt-2 min-w-0 flex-1 sm:mt-0">
              <p className="font-medium">{b.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {b.service}
                {b.phone ? ` · ${b.phone}` : ""}
              </p>
            </div>

            <div className="mt-2 text-left sm:mt-0 sm:w-28 sm:text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Te rekenen
              </p>
              <p className="text-lg font-semibold tabular-nums">
                {b.priceCents ? formatPrice(b.priceCents) : "—"}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:w-72 sm:shrink-0 sm:justify-end print:hidden">
              {b.paid ? (
                <span className="flex items-center gap-2 text-sm">
                  <span className="rounded-md bg-emerald-100 px-2 py-1 font-medium text-emerald-800">
                    Betaald · {b.paidMethod ?? "ja"} ·{" "}
                    {formatPrice(b.paidAmountCents ?? b.priceCents)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          setBookingPaymentAction({
                            id: b.id,
                            paid: false,
                          }),
                        "Betaling teruggedraaid",
                      )
                    }
                  >
                    Ongedaan
                  </Button>
                </span>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => pay(b, "contant")}
                  >
                    Betaald · contant
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => pay(b, "pin")}
                  >
                    Pin
                  </Button>
                </>
              )}

              {!terminal && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `${b.name} als no-show markeren?`,
                      )
                    )
                      return;
                    run(
                      () => updateBookingStatusAction(b.id, "no_show"),
                      "No-show genoteerd",
                    );
                  }}
                >
                  No-show
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  if (
                    !window.confirm(
                      `Afspraak van ${b.name} annuleren? De klant krijgt bericht en het slot komt vrij.`,
                    )
                  )
                    return;
                  run(
                    () => updateBookingStatusAction(b.id, "cancelled"),
                    "Afspraak geannuleerd",
                  );
                }}
              >
                Annuleren
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
