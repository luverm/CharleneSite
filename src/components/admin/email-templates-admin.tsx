"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveEmailTemplateAction } from "@/actions/email-templates";

type TemplateItem = {
  key: string;
  label: string;
  description: string;
  tokens: string[];
  subject: string;
  body: string;
};

export function EmailTemplatesAdmin({
  templates,
}: {
  templates: TemplateItem[];
}) {
  return (
    <div className="grid gap-6">
      {templates.map((t) => (
        <TemplateEditor key={t.key} item={t} />
      ))}
    </div>
  );
}

function TemplateEditor({ item }: { item: TemplateItem }) {
  const router = useRouter();
  const [subject, setSubject] = useState(item.subject);
  const [body, setBody] = useState(item.body);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Onderwerp en tekst mogen niet leeg zijn.");
      return;
    }
    startTransition(async () => {
      const r = await saveEmailTemplateAction({
        key: item.key,
        subject,
        body,
      });
      if (r.ok) {
        toast.success("Opgeslagen");
        router.refresh();
      } else {
        toast.error("Opslaan mislukt.");
      }
    });
  }

  return (
    <section className="rounded-lg border p-5">
      <h2 className="text-base font-semibold">{item.label}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {item.description}
      </p>

      <div className="mt-3">
        <Label htmlFor={`${item.key}-subject`}>Onderwerp</Label>
        <Input
          id={`${item.key}-subject`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          className="mt-1.5"
        />
      </div>

      <div className="mt-3">
        <Label htmlFor={`${item.key}-body`}>Tekst</Label>
        <Textarea
          id={`${item.key}-body`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          maxLength={4000}
          className="mt-1.5 text-sm"
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Velden tussen accolades worden automatisch ingevuld — laat ze
        staan: {item.tokens.map((t) => `{${t}}`).join("  ·  ")}
      </p>

      <div className="mt-3">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
      </div>
    </section>
  );
}
