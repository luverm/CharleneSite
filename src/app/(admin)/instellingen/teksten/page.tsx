import Link from "next/link";
import type { Metadata } from "next";
import { CONTENT_GROUPS } from "@/content/editable";
import { getResolvedContent } from "@/lib/db/site-content";
import { SiteContentForm } from "@/components/admin/site-content-form";

export const metadata: Metadata = {
  title: "Teksten",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function TekstenPage() {
  const values = await getResolvedContent();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/instellingen"
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        ← Instellingen
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Teksten</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pas de teksten op de website aan. Wijzigingen zijn na opslaan
        direct zichtbaar. Laat een veld leeg of zet het terug op de
        standaardtekst om de oorspronkelijke tekst te gebruiken.
      </p>

      <div className="mt-8">
        <SiteContentForm groups={CONTENT_GROUPS} initialValues={values} />
      </div>
    </div>
  );
}
