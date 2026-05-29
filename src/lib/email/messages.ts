import { business } from "@/content/business";
import { formatHumanDateTime, format } from "@/lib/time";
import {
  renderEmailTemplate,
  type RenderedEmail,
} from "@/lib/email/templates";

/** Drop unfilled `{{PLACEHOLDER}}` content values. */
function real(value: string): string | null {
  return value && !value.startsWith("{{") ? value : null;
}

function contactLine(): string {
  const email = real(business.email);
  const phone = real(business.phone);
  if (email && phone) return `Verhinderd? Mail ${email} of bel ${phone}.`;
  if (email) return `Verhinderd? Mail ${email}.`;
  if (phone) return `Verhinderd? Bel ${phone}.`;
  return "Verhinderd? Laat het ons even weten.";
}

function locationLine(): string {
  const street = real(business.address.street);
  if (!street) return "";
  return `Locatie: ${street}, ${business.address.postcode} ${business.address.city}`;
}

function helpLine(): string {
  const email = real(business.email);
  const phone = real(business.phone);
  if (email && phone) return `Vragen? Mail ${email} of bel ${phone}.`;
  if (email) return `Vragen? Mail ${email}.`;
  if (phone) return `Vragen? Bel ${phone}.`;
  return "Vragen? Laat het ons gerust weten.";
}

function dutchDate(date: string): string {
  try {
    return format(new Date(`${date}T00:00:00`), "EEEE d MMMM yyyy");
  } catch {
    return date;
  }
}

/* ─── Customer-facing e-mails (editable in Instellingen → Mailteksten) ─── */

export function bookingConfirmationEmail(args: {
  customerName: string;
  serviceName: string;
  startsAt: Date;
  calendarUrl?: string;
  cancelUrl?: string;
}): Promise<RenderedEmail> {
  return renderEmailTemplate("booking_confirmation", {
    naam: args.customerName,
    bedrijf: business.name,
    eigenaar: business.ownerName,
    dienst: args.serviceName,
    wanneer: formatHumanDateTime(args.startsAt),
    locatie: locationLine(),
    agendalink: args.calendarUrl ?? "",
    annuleerlink: args.cancelUrl ?? "",
    contact: contactLine(),
  });
}

export function bookingRescheduledEmail(args: {
  customerName: string;
  serviceName: string;
  startsAt: Date;
  calendarUrl?: string;
  cancelUrl?: string;
}): Promise<RenderedEmail> {
  return renderEmailTemplate("booking_rescheduled", {
    naam: args.customerName,
    bedrijf: business.name,
    eigenaar: business.ownerName,
    dienst: args.serviceName,
    wanneer: formatHumanDateTime(args.startsAt),
    locatie: locationLine(),
    agendalink: args.calendarUrl ?? "",
    annuleerlink: args.cancelUrl ?? "",
    contact: contactLine(),
  });
}

export function bookingCancelledEmail(args: {
  customerName: string;
  serviceName: string;
  startsAt: Date;
}): Promise<RenderedEmail> {
  return renderEmailTemplate("booking_cancelled", {
    naam: args.customerName,
    bedrijf: business.name,
    eigenaar: business.ownerName,
    dienst: args.serviceName,
    wanneer: formatHumanDateTime(args.startsAt),
    contact: helpLine(),
  });
}

export function bookingReminderEmail(args: {
  customerName: string;
  serviceName: string;
  startsAt: Date;
  cancelUrl?: string;
}): Promise<RenderedEmail> {
  return renderEmailTemplate("booking_reminder", {
    naam: args.customerName,
    bedrijf: business.name,
    eigenaar: business.ownerName,
    dienst: args.serviceName,
    wanneer: formatHumanDateTime(args.startsAt),
    locatie: locationLine(),
    contact: args.cancelUrl
      ? `Niet meer nodig? Verzetten of annuleren: ${args.cancelUrl}`
      : contactLine(),
  });
}

export function rebookingNudgeEmail(args: {
  customerName: string;
  lastServiceName: string;
  bookingUrl: string;
}): Promise<RenderedEmail> {
  return renderEmailTemplate("rebooking_nudge", {
    naam: args.customerName,
    bedrijf: business.name,
    eigenaar: business.ownerName,
    dienst: args.lastServiceName,
    boeklink: args.bookingUrl,
    contact: contactLine(),
  });
}

export function waitlistConfirmationEmail(args: {
  fullName: string;
  serviceName?: string | null;
  preferredDate?: string | null;
}): Promise<RenderedEmail> {
  const samenvatting =
    (args.serviceName || "een afspraak") +
    (args.preferredDate ? ` op ${dutchDate(args.preferredDate)}` : "");
  return renderEmailTemplate("waitlist_confirmation", {
    naam: args.fullName,
    bedrijf: business.name,
    eigenaar: business.ownerName,
    samenvatting,
    contact: helpLine(),
  });
}

export function waitlistOpeningEmail(args: {
  customerName: string;
  serviceName: string;
  freedAt: Date;
  bookingUrl: string;
}): Promise<RenderedEmail> {
  return renderEmailTemplate("waitlist_opening", {
    naam: args.customerName,
    bedrijf: business.name,
    eigenaar: business.ownerName,
    dienst: args.serviceName,
    wanneer: formatHumanDateTime(args.freedAt),
    boeklink: args.bookingUrl,
  });
}

export function reviewRequestEmail(args: {
  customerName: string;
  serviceName: string;
  reviewUrl: string;
}): Promise<RenderedEmail> {
  return renderEmailTemplate("review_request", {
    naam: args.customerName,
    bedrijf: business.name,
    eigenaar: business.ownerName,
    dienst: args.serviceName,
    reviewlink: args.reviewUrl,
  });
}

/* ─── Chat links (fixed text) ─── */

export function chatResumeText(args: {
  customerName: string | null;
  chatUrl: string;
}): string {
  return [
    `Hoi${args.customerName ? ` ${args.customerName}` : ""},`,
    "",
    `Hier is de link naar je gesprek met ${business.name}:`,
    "",
    args.chatUrl,
    "",
    "Open 'm op elk apparaat om je chat verder te lezen of te reageren.",
    "",
    "Tot snel,",
    business.ownerName,
  ].join("\n");
}

export function chatReplyText(args: {
  customerName: string | null;
  chatUrl: string;
}): string {
  return [
    `Hoi${args.customerName ? ` ${args.customerName}` : ""},`,
    "",
    `${business.ownerName} heeft gereageerd op je bericht in de chat.`,
    "",
    `Bekijk en reageer hier: ${args.chatUrl}`,
    "",
    "Tot snel,",
    business.ownerName,
  ].join("\n");
}

/** Google Calendar "add event" template link. */
export function googleCalendarUrl(args: {
  title: string;
  startsAt: Date;
  endsAt: Date;
  details?: string;
  location?: string;
}): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: args.title,
    dates: `${fmt(args.startsAt)}/${fmt(args.endsAt)}`,
  });
  if (args.details) params.set("details", args.details);
  if (args.location) params.set("location", args.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

