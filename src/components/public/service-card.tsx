import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatDuration,
  formatPrice,
  type Service,
} from "@/lib/services-format";

export function ServiceCard({ service }: { service: Service }) {
  const bookable = service.is_online_bookable;
  return (
    <Card className="group flex h-full flex-col p-6 transition hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl tracking-tight">{service.name}</h3>
        {service.kind === "bridal" && <Badge variant="secondary">Bruid</Badge>}
      </div>
      {service.description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {service.description}
        </p>
      )}
      <div className="mt-5 flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          {formatDuration(service.duration_min)}
        </span>
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <span className="font-medium">{formatPrice(service.price_cents)}</span>
      </div>
      <div className="mt-auto pt-6">
        {bookable ? (
          <Link
            href={`/boeken?dienst=${service.slug}`}
            className="inline-flex rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground transition hover:bg-primary/90"
          >
            Boek deze dienst
          </Link>
        ) : (
          <Link
            href="/bruid/contact"
            className="inline-flex rounded-full border border-border px-4 py-2 text-sm transition hover:bg-accent hover:text-accent-foreground"
          >
            Vraag je datum aan
          </Link>
        )}
      </div>
    </Card>
  );
}
