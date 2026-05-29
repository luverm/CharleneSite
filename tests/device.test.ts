import { describe, expect, it } from "vitest";
import { parseUserAgent } from "@/lib/device";

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  androidPhone:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  androidTablet:
    "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  ipad:
    "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  desktopChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  desktopMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
};

describe("parseUserAgent", () => {
  it("classifies an iPhone as mobile / iOS", () => {
    const d = parseUserAgent(UA.iphone);
    expect(d).toMatchObject({ isMobile: true, isTablet: false, os: "ios" });
  });

  it("classifies an Android phone as mobile / android", () => {
    const d = parseUserAgent(UA.androidPhone);
    expect(d).toMatchObject({ isMobile: true, isTablet: false, os: "android" });
  });

  it("classifies an iPad as tablet, not mobile", () => {
    const d = parseUserAgent(UA.ipad);
    expect(d.isTablet).toBe(true);
    expect(d.isMobile).toBe(false);
  });

  it("classifies an Android tablet (no Mobile token) as tablet", () => {
    const d = parseUserAgent(UA.androidTablet);
    expect(d.isTablet).toBe(true);
    expect(d.isMobile).toBe(false);
  });

  it("classifies desktop browsers as desktop", () => {
    expect(parseUserAgent(UA.desktopChrome).isDesktop).toBe(true);
    expect(parseUserAgent(UA.desktopMac).isDesktop).toBe(true);
  });

  it("falls back to desktop for empty/unknown UA", () => {
    const d = parseUserAgent(undefined);
    expect(d).toEqual({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      os: "other",
    });
  });
});
