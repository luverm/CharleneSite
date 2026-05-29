"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical, Star, X } from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ServiceRow } from "@/components/admin/service-row";
import {
  reorderServicesAction,
  setFeaturedServiceAction,
  setServiceColorAction,
  setServiceCategoryAction,
} from "@/actions/service";
import type { Service } from "@/lib/services-format";
import { AGENDA_COLORS } from "@/lib/agenda-colors";
import type { ServiceCategory } from "@/lib/db/service-categories";

export function ServiceList({
  services,
  featuredIds = [],
  colors = {},
  categories = [],
  categoryMap = {},
}: {
  services: Service[];
  featuredIds?: string[];
  colors?: Record<string, string>;
  categories?: ServiceCategory[];
  categoryMap?: Record<string, string>;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Service[]>(services);
  const [featured, setFeatured] = useState<Set<string>>(
    () => new Set(featuredIds),
  );
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    startTransition(async () => {
      const r = await reorderServicesAction(next.map((s) => s.id));
      if (!r.ok) toast.error("Volgorde opslaan mislukt.");
      router.refresh();
    });
  }

  function toggleFeatured(id: string) {
    const willFeature = !featured.has(id);
    const next = new Set(featured);
    if (willFeature) next.add(id);
    else next.delete(id);
    setFeatured(next);
    startTransition(async () => {
      const r = await setFeaturedServiceAction(id, willFeature);
      if (!r.ok) {
        toast.error("Homepage-selectie opslaan mislukt.");
        setFeatured(featured);
        return;
      }
      router.refresh();
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid gap-2">
          {items.map((s) => (
            <SortableRow
              key={s.id}
              service={s}
              featured={featured.has(s.id)}
              color={colors[s.id]}
              categories={categories}
              categoryId={categoryMap[s.id] ?? ""}
              onToggleFeatured={() => toggleFeatured(s.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  service,
  featured,
  color,
  categories,
  categoryId,
  onToggleFeatured,
}: {
  service: Service;
  featured: boolean;
  color?: string;
  categories: ServiceCategory[];
  categoryId: string;
  onToggleFeatured: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Versleep om de volgorde te wijzigen"
        className="flex w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border text-muted-foreground hover:bg-accent active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <ServiceRow service={service} />
      </div>
      {categories.length > 0 && (
        <ServiceCategorySelect
          serviceId={service.id}
          categories={categories}
          categoryId={categoryId}
        />
      )}
      <ServiceColorPicker serviceId={service.id} color={color} />
      <button
        type="button"
        onClick={onToggleFeatured}
        aria-pressed={featured}
        title={
          featured
            ? "Wordt getoond op de homepage — klik om te verbergen"
            : "Niet op de homepage — klik om te tonen"
        }
        className={`flex w-9 shrink-0 items-center justify-center rounded-md border transition ${
          featured
            ? "border-primary bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent"
        }`}
      >
        <Star className={`h-4 w-4 ${featured ? "fill-current" : ""}`} />
        <span className="sr-only">
          {featured ? "Van homepage halen" : "Op homepage tonen"}
        </span>
      </button>
    </div>
  );
}

function ServiceColorPicker({
  serviceId,
  color,
}: {
  serviceId: string;
  color?: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<string>(color ?? "");
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function pick(next: string) {
    const previous = current;
    setCurrent(next);
    setOpen(false);
    startTransition(async () => {
      const r = await setServiceColorAction(serviceId, next);
      if (!r.ok) {
        toast.error("Kleur opslaan mislukt.");
        setCurrent(previous);
        return;
      }
      router.refresh();
    });
  }

  const active = AGENDA_COLORS.find((c) => c.key === current);

  if (open) {
    return (
      <div className="flex shrink-0 items-center gap-1 rounded-md border bg-background p-1">
        {AGENDA_COLORS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => pick(c.key)}
            aria-label={c.label}
            title={c.label}
            className={
              "h-5 w-5 rounded-full transition " +
              c.swatch +
              (current === c.key
                ? " ring-2 ring-stone-900 ring-offset-1"
                : "")
            }
          />
        ))}
        <button
          type="button"
          onClick={() => pick("")}
          aria-label="Geen kleur"
          title="Geen kleur"
          className="flex h-5 w-5 items-center justify-center rounded-full border text-muted-foreground hover:bg-accent"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Kleur in de agenda kiezen"
      title={
        active ? `Agenda-kleur: ${active.label}` : "Agenda-kleur kiezen"
      }
      className="flex w-9 shrink-0 items-center justify-center rounded-md border hover:bg-accent"
    >
      <span
        className={
          "h-4 w-4 rounded-full " +
          (active
            ? active.swatch
            : "border border-dashed border-muted-foreground")
        }
      />
    </button>
  );
}

function ServiceCategorySelect({
  serviceId,
  categories,
  categoryId,
}: {
  serviceId: string;
  categories: ServiceCategory[];
  categoryId: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(categoryId);
  const [, startTransition] = useTransition();

  function change(next: string) {
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      const r = await setServiceCategoryAction(serviceId, next);
      if (!r.ok) {
        toast.error("Categorie opslaan mislukt.");
        setCurrent(previous);
        return;
      }
      router.refresh();
    });
  }

  return (
    <select
      value={current}
      onChange={(e) => change(e.target.value)}
      aria-label="Categorie van de dienst"
      className="w-28 shrink-0 rounded-md border bg-background px-2 text-xs sm:w-36"
    >
      <option value="">Geen categorie</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
