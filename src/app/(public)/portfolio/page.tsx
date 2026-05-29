import Image from "next/image";
import type { Metadata } from "next";
import { listPortfolioImages } from "@/lib/portfolio";
import { getResolvedContent } from "@/lib/db/site-content";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Een selectie uit recent werk.",
};

export default async function PortfolioPage() {
  const [images, content] = await Promise.all([
    listPortfolioImages(),
    getResolvedContent(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Werk
        </p>
        <h1 className="mt-4 text-5xl tracking-tight">Portfolio</h1>
        <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
          {content["portfolio.intro"]}
        </p>
      </header>

      {images.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          <p>Nog geen portfolio-afbeeldingen.</p>
          <p className="mt-2">
            Voeg foto&apos;s toe aan{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">
              public/images/portfolio/
            </code>
            .
          </p>
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <div
              key={img.src}
              className={
                "relative overflow-hidden rounded-lg bg-muted " +
                // Mosaic: every third image gets a tall (3:4) aspect ratio
                // so the grid feels editorial instead of perfectly square.
                (i % 3 === 1 ? "aspect-[3/4]" : "aspect-square")
              }
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-500 hover:scale-[1.03]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
