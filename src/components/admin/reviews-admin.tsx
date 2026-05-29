"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createReviewAction,
  setReviewVisibleAction,
  deleteReviewAction,
} from "@/actions/review";

type Review = {
  id: string;
  author: string;
  quote: string;
  is_visible: boolean;
};

export function ReviewsAdmin({ initial }: { initial: Review[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function add(formData: FormData) {
    startTransition(async () => {
      const r = await createReviewAction(formData);
      if (r.ok) {
        toast.success("Review toegevoegd");
        router.refresh();
      } else {
        toast.error("Toevoegen mislukt — controleer de velden.");
      }
    });
  }

  function toggle(id: string, visible: boolean) {
    startTransition(async () => {
      const r = await setReviewVisibleAction(id, visible);
      if (r.ok) router.refresh();
      else toast.error("Wijzigen mislukt.");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const r = await deleteReviewAction(id);
      if (r.ok) {
        toast.success("Verwijderd");
        router.refresh();
      } else {
        toast.error("Verwijderen mislukt.");
      }
    });
  }

  return (
    <div className="grid gap-8">
      <form action={add} className="grid gap-3 rounded-lg border p-4">
        <div>
          <Label htmlFor="author">Naam</Label>
          <Input id="author" name="author" required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="quote">Review</Label>
          <Textarea
            id="quote"
            name="quote"
            rows={3}
            required
            className="mt-1.5"
          />
        </div>
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Bezig…" : "Review toevoegen"}
          </Button>
        </div>
      </form>

      {initial.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen reviews.</p>
      ) : (
        <ul className="grid gap-3">
          {initial.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm">&ldquo;{r.quote}&rdquo;</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  — {r.author} {r.is_visible ? "" : "· verborgen"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggle(r.id, !r.is_visible)}
                  disabled={pending}
                >
                  {r.is_visible ? "Verberg" : "Toon"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(r.id)}
                  disabled={pending}
                >
                  Verwijder
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
