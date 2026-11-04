import type { Lang } from "./types";

/** 5200 -> "5,200 DA" / "5,200 دج". Wrap the result in <bdi> inside RTL text. */
export function formatDA(n: number, lang: Lang = "fr"): string {
  return `${Math.round(n).toLocaleString("en-US")} ${lang === "ar" ? "دج" : "DA"}`;
}
