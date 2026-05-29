// Working defaults — Charlène vult later via /instellingen/bedrijfsgegevens
// haar echte naam, adres, KvK, social en kleuren in. Placeholders die met
// `{{` beginnen worden in mailteksten en op de website verborgen tot ze
// zijn ingevuld.
export const business = {
  name: "Charlène",
  ownerName: "Charlène",
  tagline: "Kapsalon — knippen in een ontspannen sfeer.",
  email: "{{ZAKELIJK_EMAIL}}",
  phone: "{{TELEFOON}}",
  whatsapp: "{{WHATSAPP_LINK}}",
  address: {
    street: "{{STRAAT_HUISNR}}",
    postcode: "{{POSTCODE}}",
    city: "{{STAD}}",
  },
  kvk: "{{KVK_NUMMER}}",
  btw: "{{BTW_NUMMER}}",
  iban: "{{IBAN}}",
  socials: {
    instagram: "{{INSTAGRAM_HANDLE}}",
    instagramUrl: "{{INSTAGRAM_URL}}",
    tiktok: "",
  },
  brand: {
    // Editorial sage: forest-green primary, terracotta accent, ivory background.
    primaryHex: "#2D4F3F",
    accentHex: "#C2735C",
    fontDisplay: "Fraunces",
    fontBody: "Inter",
  },
} as const;
