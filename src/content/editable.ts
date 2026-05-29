// Registry of website text blocks Charlène can edit from the admin
// (Instellingen → Teksten). Each block carries its built-in default;
// the DB only stores overrides, so the site works before migration
// 0020 is applied.

import { landing } from "@/content/landing";
import { faq } from "@/content/faq";
import { business } from "@/content/business";

export type EditableBlock = {
  key: string;
  label: string;
  defaultValue: string;
  multiline: boolean;
};

export type EditableGroup = {
  title: string;
  blocks: EditableBlock[];
};

/** Default voor de /diensten introtekst (apart bewerkbaar). */
export const DIENSTEN_INTRO_DEFAULT =
  "Plan je afspraak online in. Geen telefoontje nodig.";

const t = (
  key: string,
  label: string,
  defaultValue: string,
  multiline = false,
): EditableBlock => ({ key, label, defaultValue, multiline });

export const CONTENT_GROUPS: EditableGroup[] = [
  {
    title: "Homepage",
    blocks: [
      t("home.hero.eyebrow", "Hero — boventekst", landing.hero.eyebrow),
      t("home.hero.title", "Hero — titel", landing.hero.title),
      t("home.hero.subtitle", "Hero — ondertitel", landing.hero.subtitle, true),
      t("home.hero.cta1", "Hero — knop 1", landing.hero.primaryCta.label),
      t("home.hero.cta2", "Hero — knop 2", landing.hero.secondaryCta.label),
      t("home.services.title", "Diensten-blok — kop", "Diensten"),
      t("home.portfolio.title", "Portfolio-blok — kop", "Portfolio"),
      t("home.about.title", "Over — kop", landing.about.title),
      t("home.about.body", "Over — tekst", landing.about.body, true),
      t("home.reviews.title", "Reviews-blok — kop", "Reviews"),
    ],
  },
  {
    title: "Diensten",
    blocks: [
      t("diensten.intro", "Diensten — introtekst", DIENSTEN_INTRO_DEFAULT, true),
    ],
  },
  {
    title: "Portfolio",
    blocks: [
      t(
        "portfolio.intro",
        "Portfolio — introtekst",
        "Een selectie van mijn werk.",
        true,
      ),
    ],
  },
  {
    title: "Footer",
    blocks: [
      t(
        "site.tagline",
        "Footer — korte omschrijving (boven het adres)",
        business.tagline,
        true,
      ),
    ],
  },
  {
    title: "Veelgestelde vragen",
    blocks: faq.items.flatMap((it, i) => [
      t(`faq.${i}.q`, `Vraag ${i + 1}`, it.q),
      t(`faq.${i}.a`, `Antwoord ${i + 1}`, it.a, true),
    ]),
  },
];

export const ALL_BLOCKS: EditableBlock[] = CONTENT_GROUPS.flatMap(
  (g) => g.blocks,
);

/** Map of every key to its built-in default value. */
export function contentDefaults(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const b of ALL_BLOCKS) out[b.key] = b.defaultValue;
  return out;
}
