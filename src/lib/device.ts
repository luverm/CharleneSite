export type DeviceOS = "ios" | "android" | "other";

export type DeviceInfo = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  os: DeviceOS;
};

/**
 * Best-effort device classification from a User-Agent string. This is a
 * *hint* for progressive enhancement (e.g. a compact mobile layout) — the
 * UI stays responsive via CSS regardless, so a wrong guess never breaks
 * anything.
 */
export function parseUserAgent(ua: string | null | undefined): DeviceInfo {
  const s = ua ?? "";

  // iPadOS 13+ reports a desktop Safari UA; the Mobile token still differs.
  const isIpad = /iPad/i.test(s) || (/Macintosh/i.test(s) && /Mobile/i.test(s));
  const isAndroidTablet = /Android/i.test(s) && !/Mobile/i.test(s);
  const isTablet = isIpad || isAndroidTablet || /Tablet|PlayBook/i.test(s);

  const isMobile =
    !isTablet &&
    /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|IEMobile|Opera Mini/i.test(
      s,
    );

  const os: DeviceOS = /iPhone|iPad|iPod/i.test(s)
    ? "ios"
    : /Android/i.test(s)
      ? "android"
      : "other";

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    os,
  };
}

/** Server-side device hint from the incoming request's User-Agent. */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const { headers } = await import("next/headers");
  const h = await headers();
  return parseUserAgent(h.get("user-agent"));
}
