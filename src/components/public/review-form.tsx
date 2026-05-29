"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitReviewAction } from "@/actions/review";

export function ReviewForm({
  bookingId,
  token,
  defaultAuthor,
}: {
  bookingId: string;
  token: string;
  defaultAuthor: string;
}) {
  const [author, setAuthor] = useState(defaultAuthor);
  const [quote, setQuote] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-sm text-emerald-900">
        <p className="font-medium">Bedankt voor je review!</p>
        <p className="mt-1">
          We bekijken hem en plaatsen hem dan op de website.
        </p>
      </div>
    );
  }

  function submit() {
    setError(null);
    if (author.trim().length < 2 || quote.trim().length < 4) {
      setError("Vul je naam en een korte review in.");
      return;
    }
    startTransition(async () => {
      const r = await submitReviewAction({
        bookingId,
        token,
        author,
        quote,
        website,
      });
      if (r.ok) {
        setDone(true);
      } else if (r.code === "ALREADY") {
        setError("Je hebt voor deze afspraak al een review achtergelaten.");
      } else if (r.code === "NOT_ELIGIBLE") {
        setError("Voor deze afspraak kun je geen review achterlaten.");
      } else {
        setError("Er ging iets mis. Probeer het later opnieuw.");
      }
    });
  }

  return (
    <div className="grid gap-4">
      <div>
        <Label htmlFor="rv-author">Je naam</Label>
        <Input
          id="rv-author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="mt-1.5"
          maxLength={120}
        />
      </div>
      <div>
        <Label htmlFor="rv-quote">Je review</Label>
        <Textarea
          id="rv-quote"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={4}
          className="mt-1.5"
          maxLength={600}
          placeholder="Hoe was je ervaring?"
        />
      </div>

      {/* Honeypot — leave empty. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Versturen…" : "Review versturen"}
        </Button>
      </div>
    </div>
  );
}
