"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveSiteContentAction } from "@/actions/site-content";
import type { EditableGroup } from "@/content/editable";

export function SiteContentForm({
  groups,
  initialValues,
}: {
  groups: EditableGroup[];
  initialValues: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await saveSiteContentAction(values);
      if (r.ok) {
        toast.success("Teksten opgeslagen");
      } else {
        toast.error(r.error ?? "Opslaan mislukt");
      }
    });
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="text-lg font-semibold">{group.title}</h2>
          <div className="mt-4 space-y-5">
            {group.blocks.map((block) => {
              const value = values[block.key] ?? block.defaultValue;
              const changed = value !== block.defaultValue;
              return (
                <div key={block.key}>
                  <label
                    htmlFor={block.key}
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    {block.label}
                    {changed && (
                      <span className="text-[10px] uppercase tracking-wide text-amber-600">
                        aangepast
                      </span>
                    )}
                  </label>
                  {block.multiline ? (
                    <Textarea
                      id={block.key}
                      value={value}
                      rows={Math.min(
                        10,
                        Math.max(3, value.split("\n").length + 1),
                      )}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [block.key]: e.target.value,
                        }))
                      }
                      className="mt-1.5"
                    />
                  ) : (
                    <Input
                      id={block.key}
                      value={value}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [block.key]: e.target.value,
                        }))
                      }
                      className="mt-1.5"
                    />
                  )}
                  {changed && (
                    <button
                      type="button"
                      onClick={() =>
                        setValues((v) => ({
                          ...v,
                          [block.key]: block.defaultValue,
                        }))
                      }
                      className="mt-1 text-xs text-muted-foreground underline underline-offset-4"
                    >
                      Terug naar standaardtekst
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Opslaan…" : "Teksten opslaan"}
        </Button>
      </div>
    </div>
  );
}
