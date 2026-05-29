import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Mail, MapPin } from "lucide-react";
import { getBookingDetail } from "@/lib/db/bookings";
import { formatHumanDateTime } from "@/lib/time";
import { formatPrice } from "@/lib/db/services";
import { business } from "@/content/business";
import { uuidString } from "@/lib/schemas/uuid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Boeking bevestigd",
  robots: { index: false },
};

const refSchema = uuidString();

export default async function BevestigdPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  const refResult = refSchema.safeParse(params?.ref);
  const booking = refResult.success
    ? await getBookingDetail(refResult.data)
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <div className="flex items-center gap-3 text-primary">
        <CheckCircle2 className="h-7 w-7" aria-hidden />
        <p className="text-xs font-medium uppercase tracking-[0.2em]">
          Bevestigd
        </p>
      </div>
      <h1 className="mt-4 text-5xl tracking-tight">Tot snel!</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
        Je afspraak staat in de agenda. Een bevestiging met agenda-bijlage is
        onderweg naar je e-mail.
      </p>
      <p className="mt-3 max-w-lg rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Geen bevestiging in je inbox? Kijk dan even in je spam- of
        ongewenste-mailmap.
      </p>

      {booking && (
        <div className="mt-10 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-accent/30 px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Jouw afspraak
            </p>
            <p className="mt-1 text-lg tracking-tight">
              {booking.service.name}
            </p>
          </div>
          <dl className="divide-y divide-border text-sm">
            <Row label="Wanneer" value={formatHumanDateTime(new Date(booking.starts_at))} />
            <Row label="Op naam van" value={booking.customer.full_name} />
            <Row label="Prijs" value={formatPrice(booking.service.price_cents)} />
          </dl>
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <InfoCard
          icon={<Mail className="h-4 w-4" />}
          title="Iets aanpassen?"
          body="Reply op de bevestigings-e-mail of stuur een bericht — we plannen het opnieuw."
        />
        <InfoCard
          icon={<MapPin className="h-4 w-4" />}
          title="Locatie"
          body={`${business.address.street}, ${business.address.postcode} ${business.address.city}`}
        />
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/portfolio"
          className="inline-flex items-center justify-center rounded-sm border border-foreground/20 px-5 py-3 text-xs uppercase tracking-[0.18em] transition hover:border-foreground hover:bg-foreground hover:text-background"
        >
          Bekijk portfolio
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-sm bg-accent px-5 py-3 text-xs uppercase tracking-[0.18em] text-accent-foreground transition hover:bg-accent/90"
        >
          Terug naar de site
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-6 py-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
