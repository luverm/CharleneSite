import { describe, expect, it, vi, beforeEach } from "vitest";
import { v4 as uuidv4 } from "uuid";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const STAFF_ID = "22222222-2222-4222-8222-222222222222";

const startsAt = "2026-04-02T07:00:00.000Z";
const endsAt = "2026-04-02T07:45:00.000Z";

function buildInput(idempotencyKey: string) {
  return {
    serviceId: SERVICE_ID,
    staffId: STAFF_ID,
    startsAt,
    endsAt,
    idempotencyKey,
    customer: {
      fullName: "Test Klant",
      email: "test@example.com",
      phone: "+31612345678",
      notes: "",
    },
    website: "",
  };
}

// In-memory state shared across mocks for one test run.
type Booking = {
  id: string;
  idempotency_key: string;
  starts_at: string;
  ends_at: string;
  service_id: string;
  customer_id: string;
};
const state: { bookings: Booking[]; nextInsertThrows: unknown } = {
  bookings: [],
  nextInsertThrows: null,
};

vi.mock("@/lib/db/bookings", () => ({
  isExclusionViolation: (e: unknown) => {
    if (typeof e !== "object" || e === null) return false;
    return (e as { code?: string }).code === "23P01";
  },
  findBookingByIdempotencyKey: vi.fn(async (key: string) => {
    return state.bookings.find((b) => b.idempotency_key === key) ?? null;
  }),
  insertBooking: vi.fn(async (input: { idempotencyKey: string; serviceId: string; customerId: string; startsAt: string; endsAt: string }) => {
    if (state.nextInsertThrows) {
      const err = state.nextInsertThrows;
      state.nextInsertThrows = null;
      throw err;
    }
    const row: Booking = {
      id: uuidv4(),
      idempotency_key: input.idempotencyKey,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      service_id: input.serviceId,
      customer_id: input.customerId,
    };
    state.bookings.push(row);
    return row;
  }),
  writeAuditLog: vi.fn(async () => {}),
  cancelBooking: vi.fn(async () => {}),
}));

vi.mock("@/lib/db/customers", () => ({
  upsertCustomerByEmail: vi.fn(async (input: { email: string }) => ({
    id: uuidv4(),
    email: input.email,
    full_name: "x",
    phone: null,
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: SERVICE_ID,
              name: "Knippen",
              duration_min: 45,
              kind: "regular",
              is_active: true,
              is_online_bookable: true,
            },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn(async () => ({ id: "stub-email" })),
}));

vi.mock("@/lib/request-ip", () => ({
  getClientIp: async () => "10.0.0.1",
}));

// The server-side availability re-check offers exactly the test slot.
vi.mock("@/lib/db/availability", () => ({
  getAvailableSlots: async () => [
    { startsAt: new Date(startsAt), endsAt: new Date(endsAt) },
  ],
}));

import { createBooking } from "@/actions/booking";
import { _resetRateLimitStore } from "@/lib/rate-limit";

beforeEach(() => {
  state.bookings.length = 0;
  state.nextInsertThrows = null;
  _resetRateLimitStore();
  vi.clearAllMocks();
});

describe("createBooking", () => {
  it("returns the same booking id when called twice with the same idempotency key", async () => {
    const key = uuidv4();
    const first = await createBooking(buildInput(key));
    expect(first.ok).toBe(true);
    const second = await createBooking(buildInput(key));
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.bookingId).toBe(first.bookingId);
    }
    expect(state.bookings.length).toBe(1);
  });

  it("returns SLOT_TAKEN when the DB raises an exclusion violation", async () => {
    state.nextInsertThrows = { code: "23P01", message: "exclusion violation" };
    const result = await createBooking(buildInput(uuidv4()));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SLOT_TAKEN");
    }
  });

  it("simulates a race: two parallel attempts on the same slot — one succeeds, one fails", async () => {
    // First insert succeeds; second insert throws exclusion-violation.
    let calls = 0;
    const { insertBooking } = await import("@/lib/db/bookings");
    (insertBooking as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (input: { idempotencyKey: string; serviceId: string; customerId: string; startsAt: string; endsAt: string }) => {
        calls += 1;
        if (calls === 2) {
          throw { code: "23P01" };
        }
        const row: Booking = {
          id: uuidv4(),
          idempotency_key: input.idempotencyKey,
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          service_id: input.serviceId,
          customer_id: input.customerId,
        };
        state.bookings.push(row);
        return row;
      },
    );

    const [a, b] = await Promise.all([
      createBooking(buildInput(uuidv4())),
      createBooking(buildInput(uuidv4())),
    ]);

    const successes = [a, b].filter((r) => r.ok);
    const failures = [a, b].filter((r) => !r.ok);
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    if (!failures[0].ok) {
      expect(failures[0].code).toBe("SLOT_TAKEN");
    }
  });
});
