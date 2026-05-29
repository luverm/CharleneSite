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
    // Warm charcoal + zacht zand. Easy to tweak later.
    primaryHex: "#3A332D",
    accentHex: "#E8DCCB",
    fontDisplay: "Cormorant Garamond",
    fontBody: "Inter",
  },
} as const;
