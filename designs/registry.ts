// A design = options + CSS (app/globals.css [data-design="<id>"]), never new page code.
// Shared sections in designs/shared render every design, so a new feature there reaches all of them.
import { bebe } from "./bebe";
import { glow } from "./glow";
import { maison } from "./maison";
import { style } from "./style";
import { tech } from "./tech";

export type Design = {
  id: string;
  name: string;
  defaultColor: string;
  options: {
    /** product photo shape */
    gallery: "square" | "portrait";
    /** show the product grid in 1 or 2 columns on phones */
    gridCols: 1 | 2;
  };
};

export const DESIGNS: Design[] = [glow, maison, style, bebe, tech];

export function getDesign(id: string): Design {
  return DESIGNS.find((d) => d.id === id) ?? glow;
}
