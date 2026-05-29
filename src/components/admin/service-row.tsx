"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ServiceForm } from "@/components/admin/service-form";
import type { Service } from "@/lib/services-format";
import { formatPrice, formatDuration } from "@/lib/services-format";

export function ServiceRow({ service }: { service: Service }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="block w-full text-left"
        aria-label={`Bewerk ${service.name}`}
      >
        <div className="flex items-center justify-between gap-3 rounded-md border p-4 hover:bg-accent">
          <div>
            <p className="font-medium">{service.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {service.slug}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={service.kind === "bridal" ? "secondary" : "outline"}>
              {service.kind}
            </Badge>
            <span>{formatDuration(service.duration_min)}</span>
            <span>{formatPrice(service.price_cents)}</span>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{service.name}</DialogTitle>
        </DialogHeader>
        <ServiceForm service={service} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function NewServiceTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-9 items-center justify-center rounded-md bg-foreground px-4 text-sm text-background hover:opacity-90">
        Nieuwe dienst
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nieuwe dienst</DialogTitle>
        </DialogHeader>
        <ServiceForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
