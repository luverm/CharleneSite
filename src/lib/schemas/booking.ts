import { z } from "zod";
import { uuidString } from "@/lib/schemas/uuid";

const phoneRegex = /^[+0-9()\s-]{6,20}$/;

// Contact details all optional — used for admin-created bookings, where
// Jeanine may add an appointment without the customer's details.
export const customerInputSchema = z.object({
  fullName: z.string().trim().max(120).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ongeldig e-mailadres")
    .max(254)
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Ongeldig telefoonnummer")
    .max(20)
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

// Public online bookings: a customer must identify themselves, so
// Jeanine never gets a nameless appointment. Notes stay optional.
export const publicCustomerSchema = z.object({
  fullName: z.string().trim().min(2, "Vul je naam in").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Vul een geldig e-mailadres in")
    .max(254),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "Vul een geldig telefoonnummer in")
    .max(20),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const bookingInputSchema = z.object({
  serviceId: uuidString(),
  staffId: uuidString(),
  // ISO 8601 (UTC) timestamps emitted by the form
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  idempotencyKey: uuidString(),
  customer: publicCustomerSchema,
  // Honeypot — must be empty
  website: z.string().max(0).optional().or(z.literal("")),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;
export type CustomerInput = z.infer<typeof customerInputSchema>;
export type PublicCustomerInput = z.infer<typeof publicCustomerSchema>;
