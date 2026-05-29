// Shared, client-safe agenda colour palette. Admins assign a colour per
// service; the agenda time grid uses it to colour appointment blocks.

export type AgendaColorKey =
  | "emerald"
  | "sky"
  | "violet"
  | "pink"
  | "amber"
  | "rose"
  | "lime";

export type AgendaColor = {
  key: AgendaColorKey;
  label: string;
  /** Solid swatch class for the picker. */
  swatch: string;
  /** Left-border + background classes for an agenda block. */
  block: string;
};

export const AGENDA_COLORS: readonly AgendaColor[] = [
  { key: "emerald", label: "Groen", swatch: "bg-emerald-500", block: "border-l-emerald-500 bg-emerald-50" },
  { key: "lime", label: "Limegroen", swatch: "bg-lime-500", block: "border-l-lime-500 bg-lime-50" },
  { key: "sky", label: "Blauw", swatch: "bg-sky-500", block: "border-l-sky-500 bg-sky-50" },
  { key: "violet", label: "Paars", swatch: "bg-violet-500", block: "border-l-violet-500 bg-violet-50" },
  { key: "pink", label: "Roze", swatch: "bg-pink-500", block: "border-l-pink-500 bg-pink-50" },
  { key: "rose", label: "Rood", swatch: "bg-rose-500", block: "border-l-rose-500 bg-rose-50" },
  { key: "amber", label: "Oranje", swatch: "bg-amber-500", block: "border-l-amber-500 bg-amber-50" },
];

const BLOCK_BY_KEY = new Map(AGENDA_COLORS.map((c) => [c.key, c.block]));

export function isAgendaColorKey(v: unknown): v is AgendaColorKey {
  return typeof v === "string" && BLOCK_BY_KEY.has(v as AgendaColorKey);
}

/** Block classes for a stored colour key, or null when unset/unknown. */
export function agendaBlockClass(color: string | undefined): string | null {
  if (!color) return null;
  return BLOCK_BY_KEY.get(color as AgendaColorKey) ?? null;
}
