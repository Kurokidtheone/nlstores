// A design = options + CSS (app/globals.css [data-design="<id>"]), never new page code.
// Shared sections in designs/shared render every design, so a new feature there reaches all of them.
import { bebe } from "./bebe";
import { glow } from "./glow";
import { maison } from "./maison";
import { style } from "./style";
import { tech } from "./tech";

/** primary = buttons, prices, links. accent = announcement bar, badges, footer (white text on it). */
export type Palette = { fr: string; ar: string; primary: string; accent: string };

export type Design = {
  id: string;
  name: string;
  /** one-line description for the design picker */
  tagline: { fr: string; ar: string };
  defaultColor: string;
  /** 6 ready-made color pairs; the first one is the default */
  palettes: Palette[];
  options: {
    /** product photo shape */
    gallery: "square" | "portrait";
    /** show the product grid in 1 or 2 columns on phones */
    gridCols: 1 | 2;
    /** formFirst: the order form comes right after the price (description and benefits below) */
    layout?: "classic" | "formFirst";
    /** framed: product photos in a soft frame with the discount badge on the photo */
    hero?: "plain" | "framed";
    /** a welcome banner (store name + promise) above the product grid on the home page */
    homeHero?: boolean;
  };
};

export const DESIGNS: Design[] = [glow, maison, style, bebe, tech];

export function getDesign(id: string): Design {
  return DESIGNS.find((d) => d.id === id) ?? glow;
}
