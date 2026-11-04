import type { Design } from "../registry";

export const bebe: Design = {
  id: "bebe",
  name: "Bébé",
  tagline: { fr: "Enfants, jouets, puériculture", ar: "أطفال، ألعاب، مستلزمات الرضع" },
  defaultColor: "#0ea5e9",
  palettes: [
    { fr: "Ciel", ar: "سماوي", primary: "#0ea5e9", accent: "#0c4a6e" },
    { fr: "Menthe", ar: "نعناعي", primary: "#10b981", accent: "#064e3b" },
    { fr: "Rose bébé", ar: "وردي فاتح", primary: "#ec4899", accent: "#831843" },
    { fr: "Lilas", ar: "ليلكي", primary: "#8b5cf6", accent: "#4c1d95" },
    { fr: "Soleil", ar: "أصفر", primary: "#d97706", accent: "#78350f" },
    { fr: "Corail", ar: "مرجاني", primary: "#fb7185", accent: "#9f1239" },
  ],
  options: { gallery: "square", gridCols: 2 },
};
