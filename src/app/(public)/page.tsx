import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { listActiveServices } from "@/lib/db/services";
import {
  listPortfolioImages,
  ABOUT_IMAGE_KEY,
  ABOUT_IMAGE_FALLBACK,
} from "@/lib/portfolio";
import { listVisibleReviews } from "@/lib/db/reviews";
import { ServiceCard } from "@/components/public/service-card";
import { HeroCarousel } from "@/components/public/hero-carousel";
import { FaqSection } from "@/components/public/faq-section";
import { PublicReviewForm } from "@/components/public/public-review-form";
import { JsonLd } from "@/components/seo/json-ld";
import {
  getResolvedContent,
  getSiteValue,
  getSiteStringArray,
} from "@/lib/db/site-content";
import { business } from "@/content/business";
import { landing } from "@/content/landing";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: business.name,
  description: business.tagline,
};

export default async function HomePage() {
  const [services, portfolio, dbReviews, content, aboutImageName, featuredIds] =
    await Promise.all([
      listActiveServices(),
      listPortfolioImages(),
      listVisibleReviews(),
      getResolvedContent(),
      getSiteValue(ABOUT_IMAGE_KEY),
      getSiteStringArray("home.featured_services"),
    ]);
  const aboutImage =
    portfolio.find((p) => p.name && p.name === aboutImageName)?.src ??
    ABOUT_IMAGE_FALLBACK;
  const regular = services.filter((s) => s.kind === "regular").slice(0, 4);
  // Admin-picked services (Instellingen → Diensten) take priority;
  // fall back to a sensible auto-selection when nothing is chosen.
  const featuredSet = new Set(featuredIds);
  const selected = services.filter((s) => featuredSet.has(s.id));
  const previewServices = selected.length > 0 ? selected : regular;
  const portfolioStrip = portfolio.slice(0, 6);
  const heroSlides = portfolio.slice(0, 5);
  const reviews =
    dbReviews.length > 0
      ? dbReviews.map((r) => ({ quote: r.quote, author: r.author }))
      : landing.reviews;

  const filled = (v: string) => (v && !v.startsWith("{{") ? v : undefined);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HairSalon",
          name: business.name,
          description: business.tagline,
          url: process.env.NEXT_PUBLIC_SITE_URL,
          telephone: filled(business.phone),
          email: filled(business.email),
          address: {
            "@type": "PostalAddress",
            streetAddress: filled(business.address.street),
            postalCode: filled(business.address.postcode),
            addressLocality: filled(business.address.city),
            addressCountry: "NL",
          },
        }}
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b bg-gradient-to-br from-accent/40 via-background to-muted/40">
        <HeroCarousel slides={heroSlides} />
        <div className="relative mx-auto max-w-6xl px-4 py-28 md:py-40">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {content["home.hero.eyebrow"]}
          </p>
          <h1 className="mt-6 max-w-3xl text-pretty text-4xl tracking-tight sm:text-5xl md:text-7xl">
            {content["home.hero.title"]}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {content["home.hero.subtitle"]}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href={landing.hero.primaryCta.href}
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              {content["home.hero.cta1"]}
            </Link>
            <Link
              href={landing.hero.secondaryCta.href}
              className="inline-flex items-center justify-center rounded-full border border-border bg-background/60 px-6 py-3 text-base transition hover:bg-accent hover:text-accent-foreground"
            >
              {content["home.hero.cta2"]}
            </Link>
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              {content["home.services.title"]}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Een greep uit het aanbod. Bekijk{" "}
              <Link href="/diensten" className="underline underline-offset-4">
                alle diensten
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {previewServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>

      {/* Portfolio strip */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold tracking-tight">
              {content["home.portfolio.title"]}
            </h2>
            <Link
              href="/portfolio"
              className="text-sm underline underline-offset-4"
            >
              Bekijk alles
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {portfolioStrip.length > 0
              ? portfolioStrip.map((img) => (
                  <Link
                    key={img.src}
                    href="/portfolio"
                    className="relative block aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </Link>
                ))
              : Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg bg-muted"
                    aria-hidden
                  />
                ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted md:order-last">
            <Image
              src={aboutImage}
              alt={business.name}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Over
            </p>
            <h2 className="mt-4 text-4xl tracking-tight">
              {content["home.about.title"]}
            </h2>
            <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
              {content["home.about.body"]}
            </p>
          </div>
        </div>
      </section>

      {/* Reviews or Instagram CTA */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          {reviews.length > 0 ? (
            <>
              <h2 className="text-3xl font-semibold tracking-tight">
                {content["home.reviews.title"]}
              </h2>
              <div className="mt-10 grid gap-6 md:grid-cols-3">
                {reviews.map((r, i) => (
                  <figure
                    key={i}
                    className="flex h-full flex-col rounded-lg border bg-background p-6"
                  >
                    <blockquote className="flex-1 text-base leading-relaxed">
                      &ldquo;{r.quote}&rdquo;
                    </blockquote>
                    <figcaption className="mt-4 text-sm text-muted-foreground">
                      — {r.author}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h2 className="text-3xl tracking-tight">
                  Volg het werk op Instagram
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Nieuwe looks en behind-the-scenes — bekijk het meest recente
                  werk op{" "}
                  <span className="font-medium text-foreground">
                    @{business.socials.instagram}
                  </span>
                  .
                </p>
              </div>
              <a
                href={business.socials.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Volg op Instagram
              </a>
            </div>
          )}

          <div className="mt-12 border-t pt-8">
            <p className="text-sm text-muted-foreground">
              Geweest? Deel je ervaring — na een korte controle verschijnt je
              review hier.
            </p>
            <div className="mt-3">
              <PublicReviewForm />
            </div>
          </div>
        </div>
      </section>

      <FaqSection content={content} />
    </>
  );
}
