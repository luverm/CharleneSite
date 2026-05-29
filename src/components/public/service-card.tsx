import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  formatDuration,
  formatPrice,
  type Service,
} from "@/lib/services-format";

export function ServiceCard({ service }: { service: Service }) {
  const bookable = service.is_online_bookable;
  return (
    <Card className="group flex h-full flex-col rounded-sm border-border bg-card p-7 transition hover:border-foreground/30">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-2xl tracking-tight">{service.name}</h3>
      </div>
      {service.description && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {service.description}
        </p>
      )}
      <div className="mt-6 flex items-baseline gap-3">
        <span className="font-serif text-2xl text-foreground">
          {formatPrice(service.price_cents)}
        </span>
        <span aria-hidden className="text-muted-foreground/50">
          /
        </span>
        <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
          {formatDuration(service.duration_min)}
        </span>
      </div>
      <div className="mt-auto pt-8">
        {bookable && (
          <Link
            href={`/boeken?dienst=${service.slug}`}
            className="inline-flex rounded-sm bg-foreground px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-background transition hover:bg-accent hover:text-accent-foreground"
          >
            Boek deze dienst
          </Link>
        )}
      </div>
    </Card>
  );
}
