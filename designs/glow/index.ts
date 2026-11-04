import type { Design } from "../registry";

// Premium beauty / skincare: blush ivory background, serif titles (Playfair for Latin, IBM Plex
// Sans Arabic bold for Arabic), soft framed product photos, gradient pill buttons.
export const glow: Design = {
  id: "glow",
  name: "Glow",
  tagline: { fr: "Beauté, soins, cosmétiques, parfums", ar: "تجميل، عناية بالبشرة، عطور" },
  defaultColor: "#b83268",
  palettes: [
    { fr: "Rose poudré", ar: "وردي بودرة", primary: "#b83268", accent: "#3d1426" },
    { fr: "Nude", ar: "بيج", primary: "#a8714f", accent: "#3b261b" },
    { fr: "Prune", ar: "برقوقي", primary: "#7d2e68", accent: "#2a1023" },
    { fr: "Corail", ar: "مرجاني", primary: "#c94a45", accent: "#4a1714" },
    { fr: "Or rose", ar: "ذهبي وردي", primary: "#a85d69", accent: "#3a1f25" },
    { fr: "Lavande", ar: "لافندر", primary: "#6f52aa", accent: "#271b40" },
  ],
  options: { gallery: "square", gridCols: 2, layout: "formFirst", hero: "framed", homeHero: true },
};
