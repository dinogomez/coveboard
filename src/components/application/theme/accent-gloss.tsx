"use client";

import {
  type AccentChangeSource,
  type AccentHue,
  applyAccent,
} from "#/components/application/theme/accent";
import {
  AccentColorPickerWell,
  GlossLayers,
} from "#/components/application/theme/custom-color-picker";
import { useAccentSelection } from "#/components/application/theme/use-accent-selection";
import type { DropdownPopoverProps } from "#/components/base/dropdown/dropdown";
import Image from "#/components/image.tsx";
import { cx } from "#/utils/cx";

/**
 * Glossy accent swatches — the lit-sphere cells from Figma node 4341:16265,
 * shared by the landing dock and the Color page's accent card. Each cell is
 * a radial base under the GlossLayers reflection stack, sized by className;
 * the active cell carries a 2px inner ring at 30% black.
 *
 * The rainbow well wraps the same art around AccentColorPickerWell, so any
 * surface can offer the custom picker as "one more cell".
 */

/* Figma cell fills: radial gradient, center → edge. The first six are raw
 * fills from the comp (no token yet). The rest are derived from the comp's
 * measured pattern relative to each hue's Tailwind 500 in oklch — center at
 * −0.7% lightness / 84% chroma, edge at −12% lightness / 97% chroma / −4°
 * hue — so every Tailwind hue has a matching lit sphere. */
export const GLOSS_GRADIENTS = {
  red: ["#E74241", "#CF0100"],
  orange: ["#f47327", "#d83f00"],
  amber: ["#F09E38", "#E57F00"],
  yellow: ["#e7b021", "#cd8800"],
  lime: ["#88c81c", "#6aa400"],
  green: ["#36c15c", "#009f13"],
  emerald: ["#55BA82", "#009040"],
  teal: ["#27b5a2", "#00957c"],
  cyan: ["#1bb4ce", "#0093ad"],
  sky: ["#14a3e3", "#0082c6"],
  blue: ["#437EF7", "#004DE9"],
  indigo: ["#5e66ea", "#3a3bd4"],
  violet: ["#8554F6", "#3E00CD"],
  purple: ["#a257f2", "#811ade"],
  fuchsia: ["#d24bec", "#b000d8"],
  pink: ["#E34798", "#D3006D"],
  rose: ["#ee4262", "#cf0043"],
} satisfies Record<AccentHue, [string, string]>;

export type GlossHue = keyof typeof GLOSS_GRADIENTS;

/** Selection marker: a 2px inner ring at 30% black, over the gloss. */
export function ActiveRing() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_2px_rgb(0_0_0/0.30)]"
    />
  );
}

export interface GlossSwatchProps {
  /** Controlled artwork color; when supplied, does not change the site accent. */
  onSelect?: () => void;
  label?: string;
  hue: GlossHue;
  /** Cell diameter classes (default the comp's size-[26px]). */
  cellClassName?: string;
  active?: boolean;
  /** Which surface this cell lives on — reported with accent_changed. */
  source?: AccentChangeSource;
}

/** One glossy hue cell: applies the preset on click, inner ring when active. */
export function GlossSwatch({
  hue,
  cellClassName = "size-[26px]",
  active,
  source,
  onSelect,
  label,
}: GlossSwatchProps) {
  const [center, edge] = GLOSS_GRADIENTS[hue];
  return (
    <button
      type="button"
      aria-label={label ?? `${hue} accent`}
      aria-pressed={active}
      title={hue}
      onClick={() => (onSelect ? onSelect() : applyAccent({ kind: "preset", hue }, source))}
      className={cx(
        "relative shrink-0 cursor-pointer overflow-hidden rounded-full transition-transform duration-150 ease-out outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2",
        cellClassName,
      )}
      style={{
        background: `radial-gradient(closest-side circle at 50% 50%, ${center} 0%, ${edge} 100%)`,
      }}
    >
      <GlossLayers />
      {active ? <ActiveRing /> : null}
    </button>
  );
}

export interface RainbowGlossWellProps {
  /** Cell diameter classes (default the comp's size-[26px]). */
  cellClassName?: string;
  placement?: DropdownPopoverProps["placement"];
  /** Marks the well with the active ring (custom color in use). */
  active?: boolean;
  /** Which surface this well lives on — reported with accent_changed. */
  source?: AccentChangeSource;
}

/** The rainbow well's art, swapping with the theme. Both exports ship with
 *  their look baked into the file and render at full opacity, matte: no
 *  gloss reflection stack, which would wash the wheels out. */
export function RainbowGlossArt() {
  return (
    <span aria-hidden className="absolute inset-0 overflow-hidden rounded-full">
      <Image
        src="/accent-rainbow-well-light.png"
        loading="eager"
        alt=""
        fill
        // 128px, not the cell's 26px: the landing showpiece scales the pill
        // 2x on retina screens, and a 40px-sized variant upsamples soft.
        sizes="128px"
        className="theme-asset-light object-cover"
      />
      <Image
        src="/accent-rainbow-well-dark.png"
        loading="eager"
        alt=""
        fill
        // 128px, not the cell's 26px: the landing showpiece scales the pill
        // 2x on retina screens, and a 40px-sized variant upsamples soft.
        sizes="128px"
        className="theme-asset-dark object-cover"
      />
    </span>
  );
}

/** The rainbow disc: the comp's PNG wheels (public/accent-rainbow-well-light
 * / -dark.png; drop higher-res exports over those files to upgrade, no code
 * change), matte at full opacity. Opens the picker. */
export function RainbowGlossWell({
  cellClassName = "size-[26px]",
  placement = "bottom",
  active,
  source,
}: RainbowGlossWellProps) {
  return (
    <AccentColorPickerWell swatchClassName={cellClassName} placement={placement} source={source}>
      <RainbowGlossArt />
      {/* outside the 65%-opacity art so the ring keeps its full 30% black */}
      {active ? <ActiveRing /> : null}
    </AccentColorPickerWell>
  );
}

const GRID_HUES: GlossHue[] = [
  "blue",
  "violet",
  "pink",
  "red",
  "amber",
  "emerald",
  "cyan",
  "indigo",
];

export interface AccentGlossGridProps {
  className?: string;
  /** Cell diameter classes (default size-10 for the Color page card). */
  cellClassName?: string;
}

/** The Color page's row: eight glossy hues plus the rainbow disc. */
export function AccentGlossGrid({ className, cellClassName = "size-10" }: AccentGlossGridProps) {
  const selection = useAccentSelection();
  const activeHue = selection == null ? "blue" : selection.kind === "preset" ? selection.hue : null;

  return (
    <div className={cx("flex flex-wrap items-center gap-2", className)}>
      {GRID_HUES.map((hue) => (
        <GlossSwatch
          key={hue}
          hue={hue}
          cellClassName={cellClassName}
          active={hue === activeHue}
          source="color_page"
        />
      ))}
      <RainbowGlossWell
        cellClassName={cellClassName}
        placement="bottom end"
        active={selection?.kind === "custom"}
        source="color_page"
      />
    </div>
  );
}
