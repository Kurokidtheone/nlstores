import type { Design } from "../registry";

export const style: Design = {
  id: "style",
  name: "Style",
  tagline: { fr: "Mode, vêtements, chaussures", ar: "موضة، ملابس، أحذية" },
  defaultColor: "#111827",
  palettes: [
    { fr: "Noir", ar: "أسود", primary: "#111827", accent: "#b91c1c" },
    { fr: "Marine", ar: "كحلي", primary: "#1e3a8a", accent: "#111827" },
    { fr: "Camel", ar: "جملي", primary: "#a16207", accent: "#111827" },
    { fr: "Kaki", ar: "كاكي", primary: "#3f6212", accent: "#111827" },
    { fr: "Bordeaux", ar: "عنابي", primary: "#7f1d1d", accent: "#111827" },
    { fr: "Graphite", ar: "رصاصي", primary: "#374151", accent: "#a16207" },
  ],
  options: { gallery: "portrait", gridCols: 2 },
};
