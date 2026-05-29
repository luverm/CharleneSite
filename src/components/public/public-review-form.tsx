"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitPublicReviewAction } from "@/actions/review";

/** Open review form for website visitors; submissions await approval. */
export function PublicReviewForm() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [author, setAuthor] = useState("");
  const [quote, setQuote] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (author.trim().length < 2 || quote.trim().length < 4) {
      toast.error("Vul je naam en een korte review in.");
      return;
    }
    startTransition(async () => {
      const r = await submitPublicReviewAction({ author, quote, website });
      if (r.ok) {
        setDone(true);
      } else {
        toast.error("Versturen mislukt — probeer het later opnieuw.");
      }
    });
  }

  if (done) {
    return (
      <p className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        Bedankt voor je review! Hij verschijnt na een korte controle.
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Schrijf een review
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="grid max-w-xl gap-4 rounded-lg border bg-background p-5"
      noValidate
    >
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      <div>
        <Label htmlFor="review-author">Je naam</Label>
        <Input
          id="review-author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          maxLength={120}
          autoComplete="name"
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="review-quote">Je review</Label>
        <Textarea
          id="review-quote"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={4}
          maxLength={600}
          className="mt-1.5"
          placeholder="Vertel kort over je ervaring…"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Versturen…" : "Review versturen"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
