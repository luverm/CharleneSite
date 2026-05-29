"use server";

import { z } from "zod";
import { getAvailableSlots, getDaySlotStatuses } from "@/lib/db/availability";
import { uuidString } from "@/lib/schemas/uuid";

const argsSchema = z.object({
  staffId: uuidString(),
  serviceId: uuidString(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type SlotDto = { startsAt: string; endsAt: string };

export async function fetchAvailableSlots(input: unknown): Promise<SlotDto[]> {
  const args = argsSchema.parse(input);
  const slots = await getAvailableSlots(args);
  return slots.map((s) => ({
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
  }));
}

export type DaySlotDto = {
  startsAt: string;
  endsAt: string;
  available: boolean;
};

export async function fetchDaySlots(input: unknown): Promise<DaySlotDto[]> {
  const args = argsSchema.parse(input);
  const statuses = await getDaySlotStatuses(args);
  return statuses.map((s) => ({
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    available: s.available,
  }));
}
