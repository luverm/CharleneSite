"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { dismissNoShowFlagAction } from "@/actions/admin-booking";

export function NoShowDismiss({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function dismiss() {
    startTransition(async () => {
      const result = await dismissNoShowFlagAction(customerId);
      if (result.ok) {
        toast.success("Melding verborgen");
        router.refresh();
      } else {
        toast.error("Verbergen mislukt.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={dismiss}
      disabled={pending}
    >
      {pending ? "Bezig…" : "Verberg melding"}
    </Button>
  );
}
