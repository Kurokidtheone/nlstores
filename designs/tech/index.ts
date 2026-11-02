import type { Design } from "../registry";

export const tech: Design = {
  id: "tech",
  name: "Tech",
  tagline: { fr: "Gadgets, électronique, accessoires", ar: "إلكترونيات، إكسسوارات" },
  defaultColor: "#2563eb",
  palettes: [
    { fr: "Bleu", ar: "أزرق", primary: "#2563eb", accent: "#0f172a" },
    { fr: "Cyan", ar: "سماوي", primary: "#0891b2", accent: "#083344" },
    { fr: "Vert", ar: "أخضر", primary: "#16a34a", accent: "#052e16" },
    { fr: "Violet", ar: "بنفسجي", primary: "#7c3aed", accent: "#1e1b4b" },
    { fr: "Orange", ar: "برتقالي", primary: "#ea580c", accent: "#1c1917" },
    { fr: "Rouge", ar: "أحمر", primary: "#dc2626", accent: "#111827" },
  ],
  options: { gallery: "square", gridCols: 1 },
};
