import "server-only";
import { getSiteValue } from "@/lib/db/site-content";

/**
 * Editable e-mail templates. Defaults live here; admin overrides are
 * stored in `site_content` under `email.<key>.subject` / `.body`.
 * `{tokens}` are filled in with the actual values when the mail is sent.
 */
export type EmailTemplateDef = {
  key: string;
  label: string;
  description: string;
  /** Token names available in this template, for the admin UI. */
  tokens: string[];
  defaultSubject: string;
  defaultBody: string;
};

export const EMAIL_TEMPLATES: readonly EmailTemplateDef[] = [
  {
    key: "booking_confirmation",
    label: "Bevestiging van een afspraak",
    description: "Naar de klant zodra een online afspraak is geboekt.",
    tokens: [
      "naam",
      "bedrijf",
      "eigenaar",
      "dienst",
      "wanneer",
      "locatie",
      "agendalink",
      "annuleerlink",
      "contact",
    ],
    defaultSubject: "Afspraak bevestigd — {dienst}",
    defaultBody: `Hoi {naam},

Je afspraak bij {bedrijf} is bevestigd.

Dienst: {dienst}
Wanneer: {wanneer}
{locatie}

Zet in je agenda: {agendalink}
Verzetten of annuleren? {annuleerlink}

{contact}

Tot snel,
{eigenaar}`,
  },
  {
    key: "booking_rescheduled",
    label: "Afspraak verzet",
    description: "Naar de klant als jij een afspraak naar een andere tijd verzet.",
    tokens: [
      "naam",
      "bedrijf",
      "eigenaar",
      "dienst",
      "wanneer",
      "locatie",
      "agendalink",
      "annuleerlink",
      "contact",
    ],
    defaultSubject: "Afspraak verzet — {dienst}",
    defaultBody: `Hoi {naam},

Je afspraak bij {bedrijf} is verzet naar een nieuw tijdstip:

Dienst: {dienst}
Wanneer: {wanneer}
{locatie}

Zet in je agenda: {agendalink}
Verzetten of annuleren? {annuleerlink}

{contact}

Tot snel,
{eigenaar}`,
  },
  {
    key: "booking_cancelled",
    label: "Afspraak geannuleerd",
    description: "Naar de klant als een afspraak wordt geannuleerd.",
    tokens: ["naam", "bedrijf", "eigenaar", "dienst", "wanneer", "contact"],
    defaultSubject: "Afspraak geannuleerd — {dienst}",
    defaultBody: `Hoi {naam},

Je afspraak bij {bedrijf} is geannuleerd:

Dienst: {dienst}
Was gepland op: {wanneer}

Wil je een nieuwe afspraak? Boek gerust opnieuw online.

{contact}

Tot snel,
{eigenaar}`,
  },
  {
    key: "booking_reminder",
    label: "Herinnering aan een afspraak",
    description: "Automatische herinnering kort voor de afspraak.",
    tokens: [
      "naam",
      "bedrijf",
      "eigenaar",
      "dienst",
      "wanneer",
      "locatie",
      "contact",
    ],
    defaultSubject: "Herinnering aan je afspraak",
    defaultBody: `Hoi {naam},

Kleine herinnering aan je afspraak bij {bedrijf}:

Dienst: {dienst}
Wanneer: {wanneer}
{locatie}

{contact}

Tot snel,
{eigenaar}`,
  },
  {
    key: "rebooking_nudge",
    label: "Terugkom-mail",
    description:
      "Naar klanten die al een tijd niet zijn geweest, met een boeklink.",
    tokens: ["naam", "bedrijf", "eigenaar", "dienst", "boeklink", "contact"],
    defaultSubject: "Tijd voor een nieuwe afspraak?",
    defaultBody: `Hoi {naam},

Het is alweer even geleden sinds je laatste afspraak ({dienst}) bij {bedrijf}. Tijd om weer eens bij te laten werken?

Een nieuwe afspraak plan je zo in: {boeklink}

{contact}

Tot snel,
{eigenaar}`,
  },
  {
    key: "waitlist_confirmation",
    label: "Bevestiging wachtlijst",
    description: "Naar de klant zodra die zich op de wachtlijst aanmeldt.",
    tokens: ["naam", "bedrijf", "eigenaar", "samenvatting", "contact"],
    defaultSubject: "Je staat op de wachtlijst",
    defaultBody: `Hoi {naam},

Je staat op de wachtlijst voor {samenvatting} bij {bedrijf}.

Komt er een plek vrij, dan krijg je automatisch een e-mail met een boeklink. Wie het eerst boekt, heeft de plek.

{contact}

Tot snel,
{eigenaar}`,
  },
  {
    key: "waitlist_opening",
    label: "Plek vrijgekomen (wachtlijst)",
    description: "Naar wachtlijst-klanten als er een plek vrijkomt.",
    tokens: ["naam", "bedrijf", "eigenaar", "dienst", "wanneer", "boeklink"],
    defaultSubject: "Er is een plek vrijgekomen",
    defaultBody: `Hoi {naam},

Goed nieuws — er is een plek vrijgekomen bij {bedrijf} waar je op de wachtlijst voor staat:

Dienst: {dienst}
Vrijgekomen moment: {wanneer}

Wie het eerst boekt, krijgt de plek: {boeklink}

Net te laat of niet het juiste moment? Geen zorgen — je blijft gewoon op de wachtlijst staan voor een volgende keer.

Tot snel,
{eigenaar}`,
  },
  {
    key: "review_request",
    label: "Vraag om een review",
    description: "Naar de klant na een afgelopen afspraak.",
    tokens: ["naam", "bedrijf", "eigenaar", "dienst", "reviewlink"],
    defaultSubject: "Hoe was je afspraak?",
    defaultBody: `Hoi {naam},

Bedankt voor je bezoek aan {bedrijf} ({dienst})! Ik hoop dat je er blij mee bent.

Zou je een korte review willen achterlaten? Het kost een halve minuut en helpt anderen enorm:
{reviewlink}

Alvast bedankt,
{eigenaar}`,
  },
];

export function emailTemplateDef(key: string): EmailTemplateDef | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}

function substitute(tpl: string, values: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? "");
}

/** Trim trailing spaces and collapse the gaps left by empty tokens. */
function tidy(body: string): string {
  return body
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type RenderedEmail = { subject: string; text: string };

/**
 * Renders an e-mail: admin override from `site_content` if present,
 * otherwise the built-in default, with `{tokens}` filled in.
 */
export async function renderEmailTemplate(
  key: string,
  values: Record<string, string>,
): Promise<RenderedEmail> {
  const def = emailTemplateDef(key);
  if (!def) throw new Error(`Unknown e-mail template: ${key}`);
  const [overrideSubject, overrideBody] = await Promise.all([
    getSiteValue(`email.${key}.subject`),
    getSiteValue(`email.${key}.body`),
  ]);
  return {
    subject: tidy(substitute(overrideSubject || def.defaultSubject, values)),
    text: tidy(substitute(overrideBody || def.defaultBody, values)),
  };
}

/** Current subject + body per template (override or default) for the admin UI. */
export async function listEmailTemplateValues(): Promise<
  Array<EmailTemplateDef & { subject: string; body: string }>
> {
  const out: Array<EmailTemplateDef & { subject: string; body: string }> = [];
  for (const def of EMAIL_TEMPLATES) {
    const [s, b] = await Promise.all([
      getSiteValue(`email.${def.key}.subject`),
      getSiteValue(`email.${def.key}.body`),
    ]);
    out.push({
      ...def,
      subject: s || def.defaultSubject,
      body: b || def.defaultBody,
    });
  }
  return out;
}
