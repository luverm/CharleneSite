"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function IcsSubscribe({
  httpsUrl,
  webcalUrl,
}: {
  httpsUrl: string;
  webcalUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      toast.success("Link gekopieerd");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopiëren lukte niet — selecteer en kopieer handmatig");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          readOnly
          value={httpsUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="font-mono text-xs"
          aria-label="Agenda-abonneerlink"
        />
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? "Gekopieerd" : "Kopieer link"}
        </Button>
      </div>
      <a
        href={webcalUrl}
        className={cn(buttonVariants(), "w-full sm:w-auto")}
      >
        Direct toevoegen aan agenda
      </a>
    </div>
  );
}
