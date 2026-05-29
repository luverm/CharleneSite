import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { getResolvedContent } from "@/lib/db/site-content";

export const metadata: Metadata = {
  title: "Bedankt voor je bericht",
  robots: { index: false },
};

export default async function BedanktPage() {
  const content = await getResolvedContent();
  return (
    <div className="mx-auto max-w-2xl px-4 py-28">
      <div className="flex items-center gap-3 text-accent">
        <CheckCircle2 className="h-7 w-7" aria-hidden />
        <p className="text-xs uppercase tracking-[0.2em]">Verzonden</p>
      </div>
      <h1 className="mt-5 text-5xl tracking-tight sm:text-6xl">
        {content["bedankt.title"]}
      </h1>
      <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
        {content["bedankt.body"]}
      </p>
      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/portfolio"
          className="inline-flex items-center justify-center rounded-sm border border-foreground/20 px-5 py-3 text-xs uppercase tracking-[0.18em] transition hover:border-foreground hover:bg-foreground hover:text-background"
        >
          Bekijk portfolio
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-sm bg-accent px-5 py-3 text-xs uppercase tracking-[0.18em] text-accent-foreground transition hover:bg-accent/90"
        >
          Terug naar de site
        </Link>
      </div>
    </div>
  );
}
