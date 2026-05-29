import { ChevronDown } from "lucide-react";
import { faq } from "@/content/faq";
import { business } from "@/content/business";
import { JsonLd } from "@/components/seo/json-ld";
import { OpenChatButton } from "@/components/public/open-chat-button";

export function FaqSection({
  content = {},
}: {
  content?: Record<string, string>;
}) {
  const items = faq.items.map((it, i) => ({
    q: content[`faq.${i}.q`] ?? it.q,
    a: content[`faq.${i}.a`] ?? it.a,
  }));

  return (
    <section className="border-t">
      <div className="mx-auto max-w-3xl px-4 py-20">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((it) => ({
              "@type": "Question",
              name: it.q,
              acceptedAnswer: { "@type": "Answer", text: it.a },
            })),
          }}
        />

        <h2 className="text-3xl font-semibold tracking-tight">
          Veelgestelde vragen
        </h2>
        <p className="mt-3 text-muted-foreground">{faq.intro}</p>

        <div className="mt-10 divide-y border-t">
          {items.map((it, i) => (
            <details key={i} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                <span>{it.q}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {it.a}
              </p>
            </details>
          ))}
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          Andere vraag?{" "}
          <OpenChatButton className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/70">
            Stuur {business.ownerName} een bericht via de chat
          </OpenChatButton>
          .
        </p>
      </div>
    </section>
  );
}
