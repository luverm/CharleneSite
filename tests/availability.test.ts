import { describe, expect, it } from "vitest";
import { computeAvailableSlots, inflate } from "@/lib/db/availability";

const tz = "Europe/Amsterdam";
void tz;

const opening = [{ start: "09:00", end: "17:00" }];

// Reference "now" at 2026-04-01 06:00 UTC = 08:00 Amsterdam, well before opening.
const NOW = new Date("2026-04-01T06:00:00Z");

describe("computeAvailableSlots", () => {
  it("emits 15-min steps inside opening hours when nothing is occupied", () => {
    const slots = computeAvailableSlots({
      date: "2026-04-02", // Thursday
      openingBlocks: opening,
      occupied: [],
      durationMin: 45,
      now: NOW,
    });
    // 09:00 → 16:15 starts (last that ends ≤ 17:00 is 16:15)
    expect(slots.length).toBe(30);
    expect(slots[0].startsAt.toISOString()).toBe("2026-04-02T07:00:00.000Z"); // 09:00 CEST
    expect(slots[slots.length - 1].startsAt.toISOString()).toBe(
      "2026-04-02T14:15:00.000Z", // 16:15 CEST
    );
  });

  it("excludes slots overlapping a time-off interval", () => {
    const occupied = [
      {
        startsAt: new Date("2026-04-02T10:00:00Z"), // 12:00 CEST
        endsAt: new Date("2026-04-02T12:00:00Z"), // 14:00 CEST
      },
    ];
    const slots = computeAvailableSlots({
      date: "2026-04-02",
      openingBlocks: opening,
      occupied,
      durationMin: 45,
      now: NOW,
    });
    const localStarts = slots.map((s) => s.startsAt.toISOString());
    // No slot may overlap [10:00Z,12:00Z]
    for (const iso of localStarts) {
      const start = new Date(iso);
      const end = new Date(start.getTime() + 45 * 60_000);
      const overlap =
        start < occupied[0].endsAt && occupied[0].startsAt < end;
      expect(overlap).toBe(false);
    }
  });

  it("respects an existing booking once it is inflated with buffer", () => {
    const booking = {
      startsAt: new Date("2026-04-02T08:00:00Z"), // 10:00 CEST
      endsAt: new Date("2026-04-02T08:45:00Z"), // 10:45 CEST
    };
    const occupied = [inflate(booking, 10)]; // ±10 min buffer
    const slots = computeAvailableSlots({
      date: "2026-04-02",
      openingBlocks: opening,
      occupied,
      durationMin: 45,
      now: NOW,
    });
    // 09:30 (start) ends at 10:15 → overlaps booking-buffer; must be excluded.
    const at0930 = slots.find(
      (s) => s.startsAt.toISOString() === "2026-04-02T07:30:00.000Z",
    );
    expect(at0930).toBeUndefined();
    // 11:00 (after buffer ends 10:55) is fine.
    const at1100 = slots.find(
      (s) => s.startsAt.toISOString() === "2026-04-02T09:00:00.000Z",
    );
    expect(at1100).toBeDefined();
  });

  it("produces correct local times across the spring DST transition", () => {
    // Sunday 29 March 2026: 02:00 → 03:00 CET → CEST.
    // Opening hours unchanged 09:00–17:00 local.
    const slots = computeAvailableSlots({
      date: "2026-03-29",
      openingBlocks: opening,
      occupied: [],
      durationMin: 60,
      now: new Date("2026-03-28T05:00:00Z"),
    });
    // 09:00 CEST on 29 March 2026 = 07:00 UTC.
    expect(slots[0].startsAt.toISOString()).toBe("2026-03-29T07:00:00.000Z");
    // 16:00 CEST = 14:00 UTC, ends 17:00 CEST.
    expect(slots[slots.length - 1].startsAt.toISOString()).toBe(
      "2026-03-29T14:00:00.000Z",
    );
  });

  it("respects min-lead-time", () => {
    // now = 09:30 CEST → with 2h lead, earliest start is 11:30 local.
    const slots = computeAvailableSlots({
      date: "2026-04-02",
      openingBlocks: opening,
      occupied: [],
      durationMin: 30,
      now: new Date("2026-04-02T07:30:00Z"),
    });
    // First slot ≥ 11:30 CEST = 09:30 UTC.
    expect(slots[0].startsAt.toISOString()).toBe("2026-04-02T09:30:00.000Z");
  });
});
