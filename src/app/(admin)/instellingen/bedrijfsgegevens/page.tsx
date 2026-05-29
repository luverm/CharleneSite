import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { getBusiness } from "@/lib/db/business-settings";
import { BusinessSettingsForm } from "@/components/admin/business-settings-form";

export const metadata: Metadata = {
  title: "Bedrijfsgegevens",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function BedrijfsgegevensPage() {
  const b = await getBusiness();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/instellingen"
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        ← Instellingen
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Bedrijfsgegevens
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Wijzigingen verschijnen direct op de website (kop, footer, contact).
      </p>

      <Card className="mt-6 p-6">
        <BusinessSettingsForm
          initial={{
            name: b.name,
            ownerName: b.ownerName,
            email: b.email,
            phone: b.phone,
            street: b.address.street,
            postcode: b.address.postcode,
            city: b.address.city,
            kvk: b.kvk,
            btw: b.btw,
            iban: b.iban,
            vatRate: b.vatRate,
            invoicePrefix: b.invoicePrefix,
            instagram: b.socials.instagram,
            instagramUrl: b.socials.instagramUrl,
            tiktok: b.socials.tiktok,
          }}
        />
      </Card>
    </div>
  );
}
