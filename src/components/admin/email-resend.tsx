"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resendEmailAction } from "@/actions/admin-booking";

export function EmailResend({ id }: { id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function resend() {
    startTransition(async () => {
      const result = await resendEmailAction(id);
      if (result.ok) {
        toast.success("Opnieuw verzonden");
        router.refresh();
      } else {
        toast.error("Opnieuw verzenden mislukt.");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={resend}
      disabled={pending}
    >
      {pending ? "Bezig…" : "Opnieuw verzenden"}
    </Button>
  );
}
