import { BackLink } from "@/components/admin/back-link";
import type { Metadata } from "next";
import { listAllServices } from "@/lib/db/admin-services";
import { getDefaultStaffId } from "@/lib/db/staff";
import { getCustomerDetail } from "@/lib/db/admin-customers";
import { AdminBookingForm } from "@/components/admin/admin-booking-form";

export const metadata: Metadata = {
  title: "Nieuwe boeking",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{
    customer?: string;
    date?: string;
    tijd?: string;
  }>;
}) {
  const {
    customer: customerId,
    date: dateParam,
    tijd: timeParam,
  } = await searchParams;
  const [services, staffId] = await Promise.all([
    listAllServices(),
    getDefaultStaffId(),
  ]);

  const active = services.map((s) => ({
    id: s.id,
    name: s.name,
    duration_min: s.duration_min,
    kind: s.kind,
  }));

  let defaults: { fullName?: string; email?: string; phone?: string } | undefined;
  if (customerId) {
    const customer = await getCustomerDetail(customerId);
    if (customer) {
      defaults = {
        fullName: customer.full_name,
        email: customer.email,
        phone: customer.phone ?? "",
      };
    }
  }

  const defaultDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;
  const defaultTime =
    timeParam && /^\d{2}:\d{2}$/.test(timeParam) ? timeParam : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackLink fallback="/boekingen" />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Nieuwe boeking
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Handmatig een afspraak vastleggen. De klant krijgt een
        bevestigingsmail.
      </p>

      <div className="mt-8">
        <AdminBookingForm
          services={active}
          staffId={staffId}
          defaults={defaults}
          defaultDate={defaultDate}
          defaultTime={defaultTime}
        />
      </div>
    </div>
  );
}
