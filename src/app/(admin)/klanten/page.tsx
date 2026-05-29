import type { Metadata } from "next";
import Link from "next/link";
import { listCustomers } from "@/lib/db/admin-customers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getDeviceInfo } from "@/lib/device";
import { CustomersList } from "@/components/admin/customers-list";

export const metadata: Metadata = {
  title: "Klanten",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function KlantenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const [customers, device] = await Promise.all([
    listCustomers(params.q),
    getDeviceInfo(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Klanten</h1>
      </header>

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-4"
      >
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="q">Zoek</Label>
          <Input
            id="q"
            name="q"
            type="search"
            placeholder="naam of e-mail"
            defaultValue={params.q ?? ""}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Zoeken</Button>
          {params.q && (
            <Link
              href="/klanten"
              className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm hover:bg-accent"
            >
              Reset
            </Link>
          )}
        </div>
      </form>

      {customers.length === 0 ? (
        <p className="mt-6 rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Geen klanten gevonden.
        </p>
      ) : (
        <CustomersList customers={customers} isMobile={device.isMobile} />
      )}
    </div>
  );
}
