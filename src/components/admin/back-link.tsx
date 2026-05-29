"use client";

import { useRouter } from "next/navigation";

/**
 * "Back" control that returns to the actual previous page (browser
 * history) — so opening a booking from the agenda goes back to the
 * agenda. Falls back to a fixed route when there is no history
 * (e.g. the page was opened directly).
 */
export function BackLink({
  fallback,
  label = "Terug",
}: {
  fallback: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
      className="text-xs text-muted-foreground underline underline-offset-4"
    >
      ← {label}
    </button>
  );
}
