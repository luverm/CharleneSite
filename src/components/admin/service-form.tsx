"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import {
  serviceUpsertSchema,
  type ServiceUpsertInput,
} from "@/lib/schemas/service";
import {
  saveServiceAction,
  deleteServiceAction,
} from "@/actions/service";
import type { Service } from "@/lib/services-format";

const DEFAULT_VALUES: ServiceUpsertInput = {
  slug: "",
  name: "",
  description: "",
  kind: "regular",
  duration_min: 45,
  buffer_min: 0,
  price_cents: 0,
  is_online_bookable: true,
  is_active: true,
  sort_order: 100,
};

export function ServiceForm({
  service,
  onDone,
}: {
  service?: Service;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<ServiceUpsertInput>({
    resolver: zodResolver(serviceUpsertSchema),
    defaultValues: service
      ? {
          id: service.id,
          slug: service.slug,
          name: service.name,
          description: service.description ?? "",
          kind: service.kind,
          duration_min: service.duration_min,
          buffer_min: service.buffer_min,
          price_cents: service.price_cents,
          is_online_bookable: service.is_online_bookable,
          is_active: true,
          sort_order: service.sort_order,
        }
      : DEFAULT_VALUES,
    mode: "onBlur",
  });

  const errors = form.formState.errors;

  function onSubmit(values: ServiceUpsertInput) {
    startTransition(async () => {
      const result = await saveServiceAction(values);
      if (result.ok) {
        toast.success("Opgeslagen");
        router.refresh();
        onDone?.();
      } else {
        toast.error(result.message);
      }
    });
  }

  function onDelete() {
    if (!service) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteServiceAction(service.id);
      if (result.ok) {
        toast.success("Verwijderd");
        router.refresh();
        onDone?.();
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Naam</Label>
          <Input id="name" {...form.register("name")} />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" {...form.register("slug")} placeholder="knippen" />
          {errors.slug && (
            <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Beschrijving</Label>
        <Textarea id="description" rows={3} {...form.register("description")} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="kind">Type</Label>
          <select
            id="kind"
            {...form.register("kind")}
            className="block h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            <option value="regular">Regulier</option>
            <option value="bridal">Bruid</option>
          </select>
        </div>
        <div>
          <Label htmlFor="duration_min">Duur (min)</Label>
          <Input
            id="duration_min"
            type="number"
            {...form.register("duration_min", { valueAsNumber: true })}
          />
          {errors.duration_min && (
            <p className="mt-1 text-xs text-red-600">
              {errors.duration_min.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="buffer_min">Buffer (min)</Label>
          <Input
            id="buffer_min"
            type="number"
            {...form.register("buffer_min", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="price_cents">Prijs (in cents)</Label>
          <Input
            id="price_cents"
            type="number"
            {...form.register("price_cents", { valueAsNumber: true })}
          />
          {errors.price_cents && (
            <p className="mt-1 text-xs text-red-600">
              {errors.price_cents.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="sort_order">Volgorde</Label>
          <Input
            id="sort_order"
            type="number"
            {...form.register("sort_order", { valueAsNumber: true })}
          />
        </div>
      </div>

      <Controller
        control={form.control}
        name="is_online_bookable"
        render={({ field }) => (
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
            />
            Online boekbaar
          </label>
        )}
      />
      <Controller
        control={form.control}
        name="is_active"
        render={({ field }) => (
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
            />
            Actief
          </label>
        )}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan..." : "Opslaan"}
        </Button>
        {service && (
          <Button
            type="button"
            variant={confirmDelete ? "destructive" : "outline"}
            onClick={onDelete}
            disabled={pending}
          >
            {confirmDelete ? "Bevestig verwijderen" : "Verwijderen"}
          </Button>
        )}
      </div>
    </form>
  );
}
