"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBusinessSettingsAction } from "@/actions/settings";

type Values = {
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  street: string;
  postcode: string;
  city: string;
  kvk: string;
  btw: string;
  iban: string;
  vatRate: number;
  invoicePrefix: string;
  instagram: string;
  instagramUrl: string;
  tiktok: string;
};

function clean(v: string) {
  return v && !v.startsWith("{{") ? v : "";
}

function Field({
  name,
  label,
  value,
  type = "text",
}: {
  name: string;
  label: string;
  value: string;
  type?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={clean(value)}
        className="mt-1.5"
      />
    </div>
  );
}

export function BusinessSettingsForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function save(formData: FormData) {
    startTransition(async () => {
      const r = await updateBusinessSettingsAction(formData);
      if (r.ok) {
        toast.success("Opgeslagen");
        router.refresh();
      } else {
        toast.error("Opslaan mislukt.");
      }
    });
  }

  return (
    <form action={save} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Bedrijfsnaam" value={initial.name} />
        <Field name="ownerName" label="Eigenaar" value={initial.ownerName} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" label="E-mail" value={initial.email} type="email" />
        <Field name="phone" label="Telefoon" value={initial.phone} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="street" label="Straat + nr" value={initial.street} />
        <Field name="postcode" label="Postcode" value={initial.postcode} />
        <Field name="city" label="Plaats" value={initial.city} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="kvk" label="KvK" value={initial.kvk} />
        <Field name="btw" label="BTW-nummer" value={initial.btw} />
        <Field name="iban" label="IBAN" value={initial.iban} />
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">Facturatie &amp; BTW</p>
        <p className="mt-1 text-xs text-muted-foreground">
          BTW-tarief in %. Zet op <strong>0</strong> als je de
          kleineondernemersregeling (KOR) gebruikt / BTW-vrijgesteld bent.
          Overleg bij twijfel met je boekhouder.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="vatRate">BTW-tarief (%)</Label>
            <Input
              id="vatRate"
              name="vatRate"
              type="number"
              min={0}
              max={30}
              step={1}
              defaultValue={String(initial.vatRate)}
              className="mt-1.5"
            />
          </div>
          <Field
            name="invoicePrefix"
            label="Factuurnummer-prefix (optioneel)"
            value={initial.invoicePrefix}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          name="instagram"
          label="Instagram handle"
          value={initial.instagram}
        />
        <Field
          name="instagramUrl"
          label="Instagram URL"
          value={initial.instagramUrl}
        />
        <Field name="tiktok" label="TikTok" value={initial.tiktok} />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
      </div>
    </form>
  );
}
