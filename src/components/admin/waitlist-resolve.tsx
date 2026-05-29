"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resolveWaitlistAction } from "@/actions/waitlist";

export function WaitlistResolve({
  id,
  resolved,
}: {
  id: string;
  resolved: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const r = await resolveWaitlistAction(id, !resolved);
      if (r.ok) router.refresh();
      else toast.error("Wijzigen mislukt.");
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={pending}
    >
      {resolved ? "Heropen" : "Afgehandeld"}
    </Button>
  );
}
