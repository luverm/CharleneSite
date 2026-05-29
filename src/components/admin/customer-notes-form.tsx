"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateCustomerNotesAction } from "@/actions/admin-customer";

export function CustomerNotesForm({
  customerId,
  initialNotes,
}: {
  customerId: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialNotes ?? "");
  const [pending, startTransition] = useTransition();
  const dirty = value !== (initialNotes ?? "");

  function save() {
    startTransition(async () => {
      const result = await updateCustomerNotesAction(customerId, value);
      if (result.ok) {
        toast.success("Notitie opgeslagen");
        router.refresh();
      } else {
        toast.error("Opslaan mislukt.");
      }
    });
  }

  return (
    <div className="grid gap-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Interne notitie over deze klant…"
      />
      <div>
        <Button type="button" onClick={save} disabled={pending || !dirty}>
          {pending ? "Opslaan…" : "Notitie opslaan"}
        </Button>
      </div>
    </div>
  );
}
