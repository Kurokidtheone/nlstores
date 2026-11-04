// Storefront fonts, self-hosted (next/font/local, font-display: swap). Loaded by a design only when
// its CSS uses the variable: e.g. [data-design="glow"] uses all three. No preload, so stores on
// other designs never download them.
// Licences: SIL Open Font License 1.1 (LICENSE-*.txt in this folder), files from @fontsource 5.3.0.
import localFont from "next/font/local";

// next/font only accepts literal option values: the unicode ranges are written out in each call

/** IBM Plex Sans Arabic, Arabic letters only (downloaded only on pages with Arabic text) */
export const plexArabic = localFont({
  src: [
    { path: "./ibm-plex-sans-arabic-arabic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./ibm-plex-sans-arabic-arabic-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plex-arabic",
  display: "swap",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC" }],
});

/** IBM Plex Sans Arabic, Latin letters and digits (prices, French text) */
export const plexLatin = localFont({
  src: [
    { path: "./ibm-plex-sans-arabic-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./ibm-plex-sans-arabic-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plex-latin",
  display: "swap",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" }],
});

/** Playfair Display: luxury serif for Latin titles (Arabic titles fall back to Plex Arabic bold) */
export const playfair = localFont({
  src: [{ path: "./playfair-display-latin-700-normal.woff2", weight: "700", style: "normal" }],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" }],
});

/** Class names that define the CSS variables on the store root */
export const storeFontVars = `${plexArabic.variable} ${plexLatin.variable} ${playfair.variable}`;
