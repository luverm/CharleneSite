import { ImageResponse } from "next/og";
import { business } from "@/content/business";

export const runtime = "edge";
export const alt = business.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #fafaf9 0%, #f5f5f4 50%, #e7e5e4 100%)",
          color: "#1c1917",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.6, letterSpacing: 2, textTransform: "uppercase" }}>
          Hair & bridal styling
        </div>
        <div style={{ fontSize: 96, fontWeight: 600, marginTop: 24, lineHeight: 1.1 }}>
          {business.name}
        </div>
        <div style={{ fontSize: 36, marginTop: 32, opacity: 0.7, maxWidth: 900 }}>
          {business.tagline}
        </div>
      </div>
    ),
    size,
  );
}
