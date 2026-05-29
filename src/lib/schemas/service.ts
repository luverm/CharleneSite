import { z } from "zod";
import { uuidString } from "@/lib/schemas/uuid";

const slugRegex = /^[a-z0-9](-?[a-z0-9])*$/;

export const serviceUpsertSchema = z.object({
  id: uuidString().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(slugRegex, "Slug bevat alleen kleine letters, cijfers en koppeltekens"),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  kind: z.enum(["regular", "bridal"]),
  duration_min: z.number().int().min(15).max(480),
  buffer_min: z.number().int().min(0).max(120),
  price_cents: z.number().int().min(0).max(1_000_000),
  is_online_bookable: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(10_000),
});

export type ServiceUpsertInput = z.infer<typeof serviceUpsertSchema>;
