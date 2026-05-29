"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Per SPA session: once it has played, in-app navigation back to the
// landing page never re-triggers it (no flash either).
let played = false;

export function IntroOverlay({
  brandName,
  logoSrc,
  preload,
}: {
  brandName: string;
  logoSrc: string;
  preload: string[];
}) {
  const [show, setShow] = useState(() => !played);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    // SPA navigation back to the landing page: lazy-init already kept it
    // hidden, nothing to do.
    if (played) return;

    let seen = false;
    try {
      seen = !!window.sessionStorage.getItem("introSeen");
    } catch {
      seen = false;
    }
    if (seen) {
      played = true;
      const t = window.setTimeout(() => setShow(false), 0);
      return () => window.clearTimeout(t);
    }

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const MIN = reduce ? 0 : 4000;
    const MAX = reduce ? 500 : 6000;
    const start = Date.now();
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      const wait = Math.max(0, MIN - (Date.now() - start));
      window.setTimeout(() => {
        setHiding(true);
        window.setTimeout(() => {
          played = true;
          try {
            window.sessionStorage.setItem("introSeen", "1");
          } catch {
            /* private mode — fine, just plays again next load */
          }
          setShow(false);
        }, 700);
      }, wait);
    };

    // Warm the hero images while the splash is up, so the site feels
    // instant the moment it lifts.
    let remaining = preload.length;
    if (remaining === 0) finish();
    for (const src of preload) {
      const img = new window.Image();
      const tick = () => {
        remaining -= 1;
        if (remaining <= 0) finish();
      };
      img.onload = tick;
      img.onerror = tick;
      img.src = src;
    }

    const hardMax = window.setTimeout(finish, MAX);
    return () => window.clearTimeout(hardMax);
  }, [preload]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-label="Bezig met laden"
      onClick={() => setHiding(true)}
      className={
        "fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-700 " +
        (hiding ? "pointer-events-none opacity-0" : "opacity-100")
      }
    >
      <div className="flex flex-col items-center gap-6">
        <Image
          src={logoSrc}
          alt=""
          width={1080}
          height={1080}
          priority
          className="h-24 w-auto animate-pulse"
        />
        <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">
          {brandName}
        </p>
      </div>
    </div>
  );
}
