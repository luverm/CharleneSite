import Link from "next/link";
import type { Metadata } from "next";
import { listStoragePortfolio, ABOUT_IMAGE_KEY } from "@/lib/portfolio";
import { getSiteValue } from "@/lib/db/site-content";
import { PortfolioAdmin } from "@/components/admin/portfolio-admin";

export const metadata: Metadata = {
  title: "Portfolio",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function PortfolioAdminPage() {
  const [images, aboutImage] = await Promise.all([
    listStoragePortfolio(),
    getSiteValue(ABOUT_IMAGE_KEY),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/instellingen"
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        ← Instellingen
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Portfolio</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Foto&apos;s die je hier uploadt verschijnen op de portfolio- en
        homepagina.
      </p>

      <div className="mt-8">
        <PortfolioAdmin
          key={images.map((i) => i.name).join("|")}
          images={images}
          aboutImage={aboutImage ?? ""}
        />
      </div>
    </div>
  );
}
