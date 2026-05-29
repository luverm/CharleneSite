import Link from "next/link";
import type { Metadata } from "next";
import { listEmailTemplateValues } from "@/lib/email/templates";
import { EmailTemplatesAdmin } from "@/components/admin/email-templates-admin";

export const metadata: Metadata = {
  title: "Mailteksten",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function MailtekstenPage() {
  const templates = await listEmailTemplateValues();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/instellingen"
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        ← Instellingen
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Mailteksten
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pas de tekst en het onderwerp van de automatische e-mails aan naar
        je eigen woorden. De velden tussen accolades (zoals{" "}
        <code className="rounded bg-muted px-1 py-0.5">{"{naam}"}</code>)
        worden bij het versturen automatisch ingevuld — laat die staan.
      </p>

      <div className="mt-6">
        <EmailTemplatesAdmin
          templates={templates.map((t) => ({
            key: t.key,
            label: t.label,
            description: t.description,
            tokens: t.tokens,
            subject: t.subject,
            body: t.body,
          }))}
        />
      </div>
    </div>
  );
}
