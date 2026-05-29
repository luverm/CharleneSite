import type { Metadata } from "next";
import { listAllServices } from "@/lib/db/admin-services";
import {
  getSiteStringArray,
  getSiteStringRecord,
} from "@/lib/db/site-content";
import {
  listServiceCategories,
  getServiceCategoryMap,
} from "@/lib/db/service-categories";
import { NewServiceTrigger } from "@/components/admin/service-row";
import { ServiceList } from "@/components/admin/service-list";
import { ServiceCategoryManager } from "@/components/admin/service-category-manager";
import type { Service } from "@/lib/services-format";

export const metadata: Metadata = {
  title: "Diensten beheren",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

function sig(services: Service[]) {
  return services
    .map((s) => `${s.id}:${s.sort_order}:${s.name}`)
    .join("|");
}

export default async function DienstenAdminPage() {
  const [services, featuredIds, colors, categories, categoryMap] =
    await Promise.all([
      listAllServices(),
      getSiteStringArray("home.featured_services"),
      getSiteStringRecord("agenda.service_colors"),
      listServiceCategories(),
      getServiceCategoryMap(),
    ]);

  const hasCategories = categories.length > 0;
  const knownCat = new Set(categories.map((c) => c.id));
  const uncategorised = services.filter(
    (s) => !knownCat.has(categoryMap[s.id] ?? ""),
  );
  const regular = services.filter((s) => s.kind === "regular");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Diensten</h1>
        <NewServiceTrigger />
      </header>

      <p className="mb-6 text-sm text-muted-foreground">
        Sleep met de greep links om de volgorde aan te passen — die
        volgorde wordt ook op de website en in het boekformulier gebruikt.
        Met het kleur-rondje kies je de kleur van de dienst in de agenda.
        Klik op het ster-icoon om een dienst op de homepage te tonen.
      </p>

      <ServiceCategoryManager categories={categories} />

      {hasCategories ? (
        <>
          {categories.map((cat) => {
            const inCat = services.filter(
              (s) => categoryMap[s.id] === cat.id,
            );
            return (
              <section key={cat.id} className="mt-8">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {cat.label}
                </h2>
                <div className="mt-3">
                  {inCat.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nog geen diensten in deze categorie.
                    </p>
                  ) : (
                    <ServiceList
                      key={sig(inCat)}
                      services={inCat}
                      featuredIds={featuredIds}
                      colors={colors}
                      categories={categories}
                      categoryMap={categoryMap}
                    />
                  )}
                </div>
              </section>
            );
          })}
          {uncategorised.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-medium text-muted-foreground">
                Zonder categorie
              </h2>
              <div className="mt-3">
                <ServiceList
                  key={sig(uncategorised)}
                  services={uncategorised}
                  featuredIds={featuredIds}
                  colors={colors}
                  categories={categories}
                  categoryMap={categoryMap}
                />
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground">Diensten</h2>
          <div className="mt-3">
            {regular.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nog geen diensten.
              </p>
            ) : (
              <ServiceList
                key={sig(regular)}
                services={regular}
                featuredIds={featuredIds}
                colors={colors}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
