// Store templates: everything a new store starts with, per design (see designs/shared/template-base.ts)
import { bebeTemplate } from "./bebe/template";
import { glowTemplate } from "./glow/template";
import { maisonTemplate } from "./maison/template";
import type { StoreTemplate } from "./shared/template-base";
import { styleTemplate } from "./style/template";
import { techTemplate } from "./tech/template";

export const TEMPLATES: Record<string, StoreTemplate> = {
  glow: glowTemplate,
  maison: maisonTemplate,
  style: styleTemplate,
  bebe: bebeTemplate,
  tech: techTemplate,
};

export function getTemplate(design: string): StoreTemplate {
  return TEMPLATES[design] ?? glowTemplate;
}
