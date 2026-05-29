export const landing = {
  hero: {
    eyebrow: "Kapsalon",
    title: "Knippen in een ontspannen sfeer",
    subtitle:
      "Knippen voor dames, heren en kinderen. Online een afspraak inplannen die past in jouw agenda.",
    primaryCta: { label: "Boek afspraak", href: "/boeken" },
    secondaryCta: { label: "Bekijk diensten", href: "/diensten" },
  },
  about: {
    title: "Over de salon",
    body: "Hier komt jouw eigen verhaal. Vertel kort wie je bent, waar je salon staat, wat klanten kunnen verwachten en waarom ze juist bij jou aan het juiste adres zijn.\n\nDeze tekst pas je zelf aan via Instellingen → Teksten in het admin paneel.",
  },
  // Reviews zijn leeg bij start — de homepage valt terug op een Instagram CTA
  // tot er reviews zijn goedgekeurd via het dashboard.
  reviews: [] as ReadonlyArray<{ quote: string; author: string }>,
} as const;
