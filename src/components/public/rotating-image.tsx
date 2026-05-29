"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Img = { src: string; alt: string };

/**
 * Crossfades through images inside its (relatively-positioned) parent.
 * The parent must set the size/aspect and `overflow-hidden`.
 */
export function RotatingImage({
  images,
  sizes,
  priority,
}: {
  images: Img[];
  sizes?: string;
  priority?: boolean;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = setInterval(
      () => setIndex((p) => (p + 1) % images.length),
      5000,
    );
    return () => clearInterval(id);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <>
      {images.map((img, i) => (
        <Image
          key={img.src}
          src={img.src}
          alt={i === 0 ? img.alt : ""}
          fill
          priority={!!priority && i === 0}
          sizes={sizes}
          className={
            "object-cover transition-opacity duration-1000 ease-in-out " +
            (i === index ? "opacity-100" : "opacity-0")
          }
        />
      ))}
    </>
  );
}
