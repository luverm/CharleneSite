"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type HeroSlide = { src: string; alt: string };

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = setInterval(
      () => setIndex((p) => (p + 1) % slides.length),
      5500,
    );
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {slides.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          className={
            "object-cover transition-opacity duration-1000 ease-in-out " +
            (i === index ? "opacity-100" : "opacity-0")
          }
        />
      ))}
      {/* Scrim keeps the headline and buttons readable over any photo. */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/70 to-background/40" />
    </div>
  );
}
