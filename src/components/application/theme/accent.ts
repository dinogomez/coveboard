/**
 * Accent engine — the runtime half of the accent ramp in styles/theme.css.
 *
 * theme.css defines --color-accent-50…950 (defaulting to the blue primitives)
 * and every interactive/selection surface references those instead of a raw
 * hue. This module re-tints the whole system by overriding the eleven ramp
 * variables inline on <html>:
 *
 *  - preset: any Tailwind hue — applied as literal OKLCH values, because
 *    Tailwind v4 tree-shakes primitives no utility uses, so var() references
 *    to another hue's ramp may point at variables the built CSS never emits.
 *  - custom: an arbitrary hex — it lands exactly on accent-500 (BRAND_SHADE,
 *    where primary buttons start their gradient) and the other ten stops are
 *    generated in OKLCH around it, keeping blue's lightness/chroma shape with
 *    the picked hue and chroma scaled by how saturated the pick is.
 *
 * Persisted in localStorage as { selection, ramp } — the computed ramp is
 * stored too so the pre-paint bootstrap script in app/layout.tsx can apply it
 * without knowing any color math. Picking blue (the default) clears the
 * override entirely instead of writing one.
 */

import { track } from "#/lib/analytics";

export const ACCENT_STORAGE_KEY = "boardui:accent";
export const ACCENT_CHANGE_EVENT = "boardui:accent-change";

export const ACCENT_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type AccentShade = (typeof ACCENT_SHADES)[number];

/* Tailwind v4's default OKLCH ramps (node_modules/tailwindcss/theme.css),
 * rainbow order. Grays are omitted — a gray CTA reads as disabled. */
export const TAILWIND_RAMPS = {
  red: {
    50: "oklch(97.1% 0.013 17.38)",
    100: "oklch(93.6% 0.032 17.717)",
    200: "oklch(88.5% 0.062 18.334)",
    300: "oklch(80.8% 0.114 19.571)",
    400: "oklch(70.4% 0.191 22.216)",
    500: "oklch(63.7% 0.237 25.331)",
    600: "oklch(57.7% 0.245 27.325)",
    700: "oklch(50.5% 0.213 27.518)",
    800: "oklch(44.4% 0.177 26.899)",
    900: "oklch(39.6% 0.141 25.723)",
    950: "oklch(25.8% 0.092 26.042)",
  },
  orange: {
    50: "oklch(98% 0.016 73.684)",
    100: "oklch(95.4% 0.038 75.164)",
    200: "oklch(90.1% 0.076 70.697)",
    300: "oklch(83.7% 0.128 66.29)",
    400: "oklch(75% 0.183 55.934)",
    500: "oklch(70.5% 0.213 47.604)",
    600: "oklch(64.6% 0.222 41.116)",
    700: "oklch(55.3% 0.195 38.402)",
    800: "oklch(47% 0.157 37.304)",
    900: "oklch(40.8% 0.123 38.172)",
    950: "oklch(26.6% 0.079 36.259)",
  },
  amber: {
    50: "oklch(98.7% 0.022 95.277)",
    100: "oklch(96.2% 0.059 95.617)",
    200: "oklch(92.4% 0.12 95.746)",
    300: "oklch(87.9% 0.169 91.605)",
    400: "oklch(82.8% 0.189 84.429)",
    500: "oklch(76.9% 0.188 70.08)",
    600: "oklch(66.6% 0.179 58.318)",
    700: "oklch(55.5% 0.163 48.998)",
    800: "oklch(47.3% 0.137 46.201)",
    900: "oklch(41.4% 0.112 45.904)",
    950: "oklch(27.9% 0.077 45.635)",
  },
  yellow: {
    50: "oklch(98.7% 0.026 102.212)",
    100: "oklch(97.3% 0.071 103.193)",
    200: "oklch(94.5% 0.129 101.54)",
    300: "oklch(90.5% 0.182 98.111)",
    400: "oklch(85.2% 0.199 91.936)",
    500: "oklch(79.5% 0.184 86.047)",
    600: "oklch(68.1% 0.162 75.834)",
    700: "oklch(55.4% 0.135 66.442)",
    800: "oklch(47.6% 0.114 61.907)",
    900: "oklch(42.1% 0.095 57.708)",
    950: "oklch(28.6% 0.066 53.813)",
  },
  lime: {
    50: "oklch(98.6% 0.031 120.757)",
    100: "oklch(96.7% 0.067 122.328)",
    200: "oklch(93.8% 0.127 124.321)",
    300: "oklch(89.7% 0.196 126.665)",
    400: "oklch(84.1% 0.238 128.85)",
    500: "oklch(76.8% 0.233 130.85)",
    600: "oklch(64.8% 0.2 131.684)",
    700: "oklch(53.2% 0.157 131.589)",
    800: "oklch(45.3% 0.124 130.933)",
    900: "oklch(40.5% 0.101 131.063)",
    950: "oklch(27.4% 0.072 132.109)",
  },
  green: {
    50: "oklch(98.2% 0.018 155.826)",
    100: "oklch(96.2% 0.044 156.743)",
    200: "oklch(92.5% 0.084 155.995)",
    300: "oklch(87.1% 0.15 154.449)",
    400: "oklch(79.2% 0.209 151.711)",
    500: "oklch(72.3% 0.219 149.579)",
    600: "oklch(62.7% 0.194 149.214)",
    700: "oklch(52.7% 0.154 150.069)",
    800: "oklch(44.8% 0.119 151.328)",
    900: "oklch(39.3% 0.095 152.535)",
    950: "oklch(26.6% 0.065 152.934)",
  },
  emerald: {
    50: "oklch(97.9% 0.021 166.113)",
    100: "oklch(95% 0.052 163.051)",
    200: "oklch(90.5% 0.093 164.15)",
    300: "oklch(84.5% 0.143 164.978)",
    400: "oklch(76.5% 0.177 163.223)",
    500: "oklch(69.6% 0.17 162.48)",
    600: "oklch(59.6% 0.145 163.225)",
    700: "oklch(50.8% 0.118 165.612)",
    800: "oklch(43.2% 0.095 166.913)",
    900: "oklch(37.8% 0.077 168.94)",
    950: "oklch(26.2% 0.051 172.552)",
  },
  teal: {
    50: "oklch(98.4% 0.014 180.72)",
    100: "oklch(95.3% 0.051 180.801)",
    200: "oklch(91% 0.096 180.426)",
    300: "oklch(85.5% 0.138 181.071)",
    400: "oklch(77.7% 0.152 181.912)",
    500: "oklch(70.4% 0.14 182.503)",
    600: "oklch(60% 0.118 184.704)",
    700: "oklch(51.1% 0.096 186.391)",
    800: "oklch(43.7% 0.078 188.216)",
    900: "oklch(38.6% 0.063 188.416)",
    950: "oklch(27.7% 0.046 192.524)",
  },
  cyan: {
    50: "oklch(98.4% 0.019 200.873)",
    100: "oklch(95.6% 0.045 203.388)",
    200: "oklch(91.7% 0.08 205.041)",
    300: "oklch(86.5% 0.127 207.078)",
    400: "oklch(78.9% 0.154 211.53)",
    500: "oklch(71.5% 0.143 215.221)",
    600: "oklch(60.9% 0.126 221.723)",
    700: "oklch(52% 0.105 223.128)",
    800: "oklch(45% 0.085 224.283)",
    900: "oklch(39.8% 0.07 227.392)",
    950: "oklch(30.2% 0.056 229.695)",
  },
  sky: {
    50: "oklch(97.7% 0.013 236.62)",
    100: "oklch(95.1% 0.026 236.824)",
    200: "oklch(90.1% 0.058 230.902)",
    300: "oklch(82.8% 0.111 230.318)",
    400: "oklch(74.6% 0.16 232.661)",
    500: "oklch(68.5% 0.169 237.323)",
    600: "oklch(58.8% 0.158 241.966)",
    700: "oklch(50% 0.134 242.749)",
    800: "oklch(44.3% 0.11 240.79)",
    900: "oklch(39.1% 0.09 240.876)",
    950: "oklch(29.3% 0.066 243.157)",
  },
  blue: {
    50: "oklch(97% 0.014 254.604)",
    100: "oklch(93.2% 0.032 255.585)",
    200: "oklch(88.2% 0.059 254.128)",
    300: "oklch(80.9% 0.105 251.813)",
    400: "oklch(70.7% 0.165 254.624)",
    500: "oklch(62.3% 0.214 259.815)",
    600: "oklch(54.6% 0.245 262.881)",
    700: "oklch(48.8% 0.243 264.376)",
    800: "oklch(42.4% 0.199 265.638)",
    900: "oklch(37.9% 0.146 265.522)",
    950: "oklch(28.2% 0.091 267.935)",
  },
  indigo: {
    50: "oklch(96.2% 0.018 272.314)",
    100: "oklch(93% 0.034 272.788)",
    200: "oklch(87% 0.065 274.039)",
    300: "oklch(78.5% 0.115 274.713)",
    400: "oklch(67.3% 0.182 276.935)",
    500: "oklch(58.5% 0.233 277.117)",
    600: "oklch(51.1% 0.262 276.966)",
    700: "oklch(45.7% 0.24 277.023)",
    800: "oklch(39.8% 0.195 277.366)",
    900: "oklch(35.9% 0.144 278.697)",
    950: "oklch(25.7% 0.09 281.288)",
  },
  violet: {
    50: "oklch(96.9% 0.016 293.756)",
    100: "oklch(94.3% 0.029 294.588)",
    200: "oklch(89.4% 0.057 293.283)",
    300: "oklch(81.1% 0.111 293.571)",
    400: "oklch(70.2% 0.183 293.541)",
    500: "oklch(60.6% 0.25 292.717)",
    600: "oklch(54.1% 0.281 293.009)",
    700: "oklch(49.1% 0.27 292.581)",
    800: "oklch(43.2% 0.232 292.759)",
    900: "oklch(38% 0.189 293.745)",
    950: "oklch(28.3% 0.141 291.089)",
  },
  purple: {
    50: "oklch(97.7% 0.014 308.299)",
    100: "oklch(94.6% 0.033 307.174)",
    200: "oklch(90.2% 0.063 306.703)",
    300: "oklch(82.7% 0.119 306.383)",
    400: "oklch(71.4% 0.203 305.504)",
    500: "oklch(62.7% 0.265 303.9)",
    600: "oklch(55.8% 0.288 302.321)",
    700: "oklch(49.6% 0.265 301.924)",
    800: "oklch(43.8% 0.218 303.724)",
    900: "oklch(38.1% 0.176 304.987)",
    950: "oklch(29.1% 0.149 302.717)",
  },
  fuchsia: {
    50: "oklch(97.7% 0.017 320.058)",
    100: "oklch(95.2% 0.037 318.852)",
    200: "oklch(90.3% 0.076 319.62)",
    300: "oklch(83.3% 0.145 321.434)",
    400: "oklch(74% 0.238 322.16)",
    500: "oklch(66.7% 0.295 322.15)",
    600: "oklch(59.1% 0.293 322.896)",
    700: "oklch(51.8% 0.253 323.949)",
    800: "oklch(45.2% 0.211 324.591)",
    900: "oklch(40.1% 0.17 325.612)",
    950: "oklch(29.3% 0.136 325.661)",
  },
  pink: {
    50: "oklch(97.1% 0.014 343.198)",
    100: "oklch(94.8% 0.028 342.258)",
    200: "oklch(89.9% 0.061 343.231)",
    300: "oklch(82.3% 0.12 346.018)",
    400: "oklch(71.8% 0.202 349.761)",
    500: "oklch(65.6% 0.241 354.308)",
    600: "oklch(59.2% 0.249 0.584)",
    700: "oklch(52.5% 0.223 3.958)",
    800: "oklch(45.9% 0.187 3.815)",
    900: "oklch(40.8% 0.153 2.432)",
    950: "oklch(28.4% 0.109 3.907)",
  },
  rose: {
    50: "oklch(96.9% 0.015 12.422)",
    100: "oklch(94.1% 0.03 12.58)",
    200: "oklch(89.2% 0.058 10.001)",
    300: "oklch(81% 0.117 11.638)",
    400: "oklch(71.2% 0.194 13.428)",
    500: "oklch(64.5% 0.246 16.439)",
    600: "oklch(58.6% 0.253 17.585)",
    700: "oklch(51.4% 0.222 16.935)",
    800: "oklch(45.5% 0.188 13.697)",
    900: "oklch(41% 0.159 10.272)",
    950: "oklch(27.1% 0.105 12.094)",
  },
} as const;

export type AccentHue = keyof typeof TAILWIND_RAMPS;
export const ACCENT_HUES = Object.keys(TAILWIND_RAMPS) as AccentHue[];

/** The hue the system ships with — selecting it means "no override". */
export const DEFAULT_ACCENT_HUE: AccentHue = "blue";

export type AccentSelection = { kind: "preset"; hue: AccentHue } | { kind: "custom"; hex: string };

export type AccentRamp = Record<AccentShade, string>;

/* ------------------------------------------------------------ color math */

type Oklch = { l: number; c: number; h: number };

function parseOklch(str: string): Oklch {
  const m = str.match(/oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)/);
  if (!m) throw new Error(`unparseable oklch: ${str}`);
  return { l: Number(m[1]) / 100, c: Number(m[2]), h: Number(m[3]) };
}

/** Blue's ramp shape — the lightness/chroma curve every generated ramp keeps. */
const BLUE_SHAPE: Record<AccentShade, Oklch> = Object.fromEntries(
  ACCENT_SHADES.map((s) => [s, parseOklch(TAILWIND_RAMPS.blue[s])]),
) as Record<AccentShade, Oklch>;

function srgbToLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function hexToOklch(hex: string): Oklch | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const [r, g, b] = [0, 2, 4].map((i) => srgbToLinear(parseInt(m[1].slice(i, i + 2), 16) / 255));
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(a, bb);
  const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

/**
 * The stop a custom color lands on exactly. Primary buttons start their
 * gradient on it (500 → 600, hover 400 → 500), focus rings and links use it,
 * and the color picker seeds from it, so a brand hex shows up verbatim.
 */
export const BRAND_SHADE = 500 satisfies AccentShade;

/** "#7C3AED" or "7c3aed" → "#7c3aed"; null for anything else. */
function normalizeHex(hex: string): string | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  return m ? `#${m[1].toLowerCase()}` : null;
}

/**
 * Generate a full ramp from one picked color. The pick itself is accent-500,
 * written as its hex so it stays exact. The other ten stops keep blue's shape
 * around it: lightness is re-spread so 500 meets the pick while 50 and 950
 * stay where blue has them (a pick lighter or darker than those ends becomes
 * the end itself), chroma scales with how saturated the pick is relative to
 * blue-500, and hue follows blue's slight shade-to-shade rotation, re-centred
 * on the pick.
 */
export function buildCustomRamp(hex: string): AccentRamp | null {
  const picked = hexToOklch(hex);
  const exact = normalizeHex(hex);
  if (!picked || !exact) return null;
  const ref500 = BLUE_SHAPE[BRAND_SHADE];
  const lightest = Math.max(BLUE_SHAPE[50].l, picked.l);
  const darkest = Math.min(BLUE_SHAPE[950].l, picked.l);
  const chromaScale = Math.min(picked.c / ref500.c, 1.5);
  const entries = ACCENT_SHADES.map((s) => {
    if (s === BRAND_SHADE) return [s, exact];
    const ref = BLUE_SHAPE[s];
    const lightness =
      ref.l > ref500.l
        ? picked.l + ((ref.l - ref500.l) / (BLUE_SHAPE[50].l - ref500.l)) * (lightest - picked.l)
        : picked.l - ((ref500.l - ref.l) / (ref500.l - BLUE_SHAPE[950].l)) * (picked.l - darkest);
    const l = +(lightness * 100).toFixed(1);
    const c = +(ref.c * chromaScale).toFixed(4);
    const h = +((((picked.h + (ref.h - ref500.h)) % 360) + 360) % 360).toFixed(3);
    return [s, `oklch(${l}% ${c} ${h})`];
  });
  return Object.fromEntries(entries) as AccentRamp;
}

export function rampFor(selection: AccentSelection): AccentRamp | null {
  // Literal OKLCH values, not var(--color-{hue}-{n}) references: Tailwind v4
  // tree-shakes primitives no utility uses, so e.g. --color-pink-600 may not
  // exist in the built CSS at all — theirs or ours.
  if (selection.kind === "preset") return { ...TAILWIND_RAMPS[selection.hue] };
  return buildCustomRamp(selection.hex);
}

/* ------------------------------------------------------- apply + persist */

/** Which surface changed the accent — the analytics `source` vocabulary. */
export type AccentChangeSource =
  | "landing_dock"
  | "landing_loader"
  | "docs_loader"
  | "docs_picker"
  | "color_page";

/* The custom picker emits a hex per drag frame; one event per tweaking pause
 * is the signal worth counting, so custom selections report on a trailing
 * debounce. Presets and resets are single clicks and fire immediately. */
let customTrackTimer: ReturnType<typeof setTimeout> | undefined;

function trackAccentChange(selection: AccentSelection | null, source?: AccentChangeSource) {
  if (!source) return;
  clearTimeout(customTrackTimer);
  if (selection?.kind === "custom") {
    const hex = selection.hex;
    customTrackTimer = setTimeout(
      () => track("accent_changed", { source, selection: "custom", hex }),
      800,
    );
  } else if (selection) {
    track("accent_changed", { source, selection: "preset", hue: selection.hue });
  } else {
    track("accent_changed", { source, selection: "reset" });
  }
}

function isDefault(selection: AccentSelection | null): boolean {
  return !selection || (selection.kind === "preset" && selection.hue === DEFAULT_ACCENT_HUE);
}

export function applyAccent(selection: AccentSelection | null, source?: AccentChangeSource) {
  const root = document.documentElement;
  if (isDefault(selection)) {
    cachedSelection = null;
    for (const s of ACCENT_SHADES) root.style.removeProperty(`--color-accent-${s}`);
    root.removeAttribute("data-accent");
    try {
      localStorage.removeItem(ACCENT_STORAGE_KEY);
    } catch {}
    trackAccentChange(null, source);
    window.dispatchEvent(new CustomEvent(ACCENT_CHANGE_EVENT, { detail: null }));
    return;
  }
  const ramp = rampFor(selection!);
  if (!ramp) return;
  cachedSelection = selection;
  for (const s of ACCENT_SHADES) root.style.setProperty(`--color-accent-${s}`, ramp[s]);
  root.setAttribute("data-accent", "");
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, JSON.stringify({ selection, ramp }));
  } catch {}
  trackAccentChange(selection, source);
  window.dispatchEvent(new CustomEvent(ACCENT_CHANGE_EVENT, { detail: selection }));
}

export function readStoredAccent(): AccentSelection | null {
  try {
    const raw = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const sel = parsed?.selection;
    if (sel?.kind === "preset" && sel.hue in TAILWIND_RAMPS) return sel;
    if (sel?.kind === "custom" && typeof sel.hex === "string") return sel;
    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------ CSS export */

/**
 * The copy-paste theme override for customer projects. Always literal values
 * (OKLCH, plus the picked hex on accent-500 for a custom color) — Tailwind
 * tree-shakes unused primitives out of built CSS, so var() references to
 * another hue's ramp would break in most projects.
 */
export function accentCssSnippet(selection: AccentSelection): string | null {
  const ramp = rampFor(selection);
  if (!ramp) return null;
  const label = selection.kind === "preset" ? selection.hue : selection.hex;
  const lines = ACCENT_SHADES.map((s) => `  ${`--color-accent-${s}:`.padEnd(20)} ${ramp[s]};`).join(
    "\n",
  );
  return [
    `/* BoardUI accent — ${label}.`,
    ...(selection.kind === "custom"
      ? [
          ` * ${ramp[BRAND_SHADE]} is exact on accent-${BRAND_SHADE}, where primary buttons start; the other stops are built around it.`,
        ]
      : []),
    ` * Paste anywhere after importing styles/theme.css. */`,
    `:root {`,
    lines,
    `}`,
    ``,
  ].join("\n");
}

/* -------------------------------------------------- React sync helpers */

/* Module-level cache so useSyncExternalStore gets a stable snapshot
 * reference (readStoredAccent would allocate a fresh object per call). */
let cachedSelection: AccentSelection | null | undefined;

export function getAccentSelection(): AccentSelection | null {
  if (cachedSelection === undefined) cachedSelection = readStoredAccent();
  return cachedSelection;
}

export function subscribeAccent(onChange: () => void) {
  window.addEventListener(ACCENT_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(ACCENT_CHANGE_EVENT, onChange);
}

/* ------------------------------------------------------------- hex seeds */

function linearToSrgb(c: number) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** oklch("L% C H") → #rrggbb, gamut-clamped. Inverse of hexToOklch. */
export function oklchToHex(str: string): string | null {
  let parsed: Oklch;
  try {
    parsed = parseOklch(str);
  } catch {
    return null;
  }
  const { l: L, c: C, h: H } = parsed;
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return (
    "#" +
    rgb
      .map((c) =>
        Math.round(linearToSrgb(Math.min(1, Math.max(0, c))) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Where a color picker should open: the current accent's 500 stop as hex. */
export function accentSeedHex(selection: AccentSelection | null): string {
  if (selection?.kind === "custom") return selection.hex;
  const hue = selection?.kind === "preset" ? selection.hue : DEFAULT_ACCENT_HUE;
  return oklchToHex(TAILWIND_RAMPS[hue][500]) ?? "#2b7fff";
}
