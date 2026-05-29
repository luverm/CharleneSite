"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRebookingSettingsAction } from "@/actions/settings";

type Values = {
  enabled: boolean;
  minDays: number;
  maxDays: number;
  cooldownDays: number;
};

function NumberField({
  name,
  label,
  hint,
  value,
}: {
  name: string;
  label: string;
  hint: string;
  value: number;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="number"
        min={1}
        defaultValue={value}
        className="mt-1.5"
      />
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function RebookingSettingsForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function save(formData: FormData) {
    startTransition(async () => {
      const r = await updateRebookingSettingsAction(formData);
      if (r.ok) {
        toast.success("Opgeslagen");
        router.refresh();
      } else {
        toast.error("Opslaan mislukt — controleer de waarden.");
      }
    });
  }

  return (
    <form action={save} className="grid gap-5">
      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={initial.enabled}
          className="size-4 rounded border-input accent-primary"
        />
        <span>Terugkom-mail automatisch versturen</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          name="minDays"
          label="Versturen na (dagen)"
          hint="Dagen na de laatste afspraak voordat de mail mag."
          value={initial.minDays}
        />
        <NumberField
          name="maxDays"
          label="Niet meer na (dagen)"
          hint="Daarna geen mail meer — klant is waarschijnlijk weg."
          value={initial.maxDays}
        />
        <NumberField
          name="cooldownDays"
          label="Wachttijd (dagen)"
          hint="Minimaal tussen twee mails naar dezelfde klant."
          value={initial.cooldownDays}
        />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
      </div>
    </form>
  );
}
