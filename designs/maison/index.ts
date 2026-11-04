import type { Design } from "../registry";

export const maison: Design = {
  id: "maison",
  name: "Maison",
  tagline: { fr: "Déco, cuisine, maison", ar: "ديكور، مطبخ، منزل" },
  defaultColor: "#a16207",
  palettes: [
    { fr: "Bois", ar: "خشبي", primary: "#a16207", accent: "#422006" },
    { fr: "Olive", ar: "زيتوني", primary: "#4d7c0f", accent: "#1a2e05" },
    { fr: "Terracotta", ar: "طيني", primary: "#c2410c", accent: "#431407" },
    { fr: "Sauge", ar: "أخضر هادئ", primary: "#15803d", accent: "#14532d" },
    { fr: "Ardoise", ar: "رمادي", primary: "#475569", accent: "#0f172a" },
    { fr: "Bordeaux", ar: "عنابي", primary: "#9f1239", accent: "#4c0519" },
  ],
  options: { gallery: "square", gridCols: 2 },
};
