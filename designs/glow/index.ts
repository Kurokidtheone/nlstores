import type { Design } from "../registry";

export const glow: Design = {
  id: "glow",
  name: "Glow",
  tagline: { fr: "Beauté, cosmétiques, parfums", ar: "تجميل، عناية، عطور" },
  defaultColor: "#db2777",
  palettes: [
    { fr: "Rose", ar: "وردي", primary: "#db2777", accent: "#831843" },
    { fr: "Corail", ar: "مرجاني", primary: "#f43f5e", accent: "#881337" },
    { fr: "Prune", ar: "برقوقي", primary: "#a21caf", accent: "#3b0764" },
    { fr: "Pêche", ar: "خوخي", primary: "#ea580c", accent: "#7c2d12" },
    { fr: "Lavande", ar: "لافندر", primary: "#7c3aed", accent: "#2e1065" },
    { fr: "Nude", ar: "بيج", primary: "#b45309", accent: "#451a03" },
  ],
  options: { gallery: "square", gridCols: 2 },
};
