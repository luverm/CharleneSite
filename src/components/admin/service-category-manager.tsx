"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveServiceCategoriesAction } from "@/actions/service";
import type { ServiceCategory } from "@/lib/db/service-categories";

export function ServiceCategoryManager({
  categories,
}: {
  categories: ServiceCategory[];
}) {
  const router = useRouter();
  const [list, setList] = useState<ServiceCategory[]>(categories);
  const [pending, startTransition] = useTransition();

  function add() {
    setList([...list, { id: crypto.randomUUID(), label: "" }]);
  }

  function rename(id: string, label: string) {
    setList(list.map((c) => (c.id === id ? { ...c, label } : c)));
  }

  function remove(id: string) {
    setList(list.filter((c) => c.id !== id));
  }

  function save() {
    const cleaned = list
      .map((c) => ({ id: c.id, label: c.label.trim() }))
      .filter((c) => c.label.length > 0);
    startTransition(async () => {
      const r = await saveServiceCategoriesAction(cleaned);
      if (r.ok) {
        toast.success("Categorieën opgeslagen");
        setList(cleaned);
        router.refresh();
      } else {
        toast.error("Opslaan mislukt.");
      }
    });
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <h2 className="text-sm font-medium">Categorieën</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Maak je eigen kopjes (bijv. Knippen, Kleuren, Feestkapsels). Wijs
        daarna per dienst een categorie toe — de diensten worden hieronder
        per categorie gegroepeerd.
      </p>
      <div className="mt-3 grid gap-2">
        {list.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <Input
              value={c.label}
              onChange={(e) => rename(c.id, e.target.value)}
              placeholder="Naam van de categorie"
              maxLength={60}
            />
            <button
              type="button"
              onClick={() => remove(c.id)}
              aria-label="Categorie verwijderen"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={pending}
        >
          <Plus className="h-4 w-4" />
          Categorie toevoegen
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Opslaan…" : "Categorieën opslaan"}
        </Button>
      </div>
    </div>
  );
}
