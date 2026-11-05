"use client";

import { RiCheckLine } from "@remixicon/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import {
  type AccentChangeSource,
  accentSeedHex,
  applyAccent,
  hexToOklch,
} from "#/components/application/theme/accent";
import { useAccentSelection } from "#/components/application/theme/use-accent-selection";
import {
  Dropdown,
  DropdownPopover,
  DropdownTrigger,
  type DropdownPopoverProps,
} from "#/components/base/dropdown/dropdown";
import { useTemplateCopy } from "#/components/foundations/template-copy/template-copy";
import { cx } from "#/utils/cx";

/**
 * CustomColorPicker — BoardUI's own color picker, replacing the native
 * `<input type="color">`. A saturation/brightness field and a hue rail, both
 * with the slider component's white embossed thumb, over the input recipe's
 * soft tertiary surfaces. Fully controlled: emits a `#rrggbb` on every drag
 * frame (rAF-throttled) so the accent engine can re-tint the page live.
 *
 * State lives in HSV, not hex: hex is lossy at the edges (any fully
 * desaturated or black color collapses hue to 0), and a picker that forgets
 * its hue the moment you touch the corner feels broken. The prop value only
 * re-seeds internal state when it differs from what we last emitted.
 *
 * `AccentColorPickerWell` is the ready-made rainbow well + popover wired to
 * the accent engine, shared by the Color page grid and the landing dock.
 */

/* ------------------------------------------------------------ color math */

type Hsv = { h: number; s: number; v: number };

function hexToHsv(hex: string): Hsv | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/* -------------------------------------------------------- drag machinery */

/** Pointer-capture drag over a track: reports normalized 0..1 coordinates. */
function useTrackDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);

  const handleFromEvent = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      onMove(
        clamp01((event.clientX - rect.left) / rect.width),
        clamp01((event.clientY - rect.top) / rect.height),
      );
    },
    [onMove],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      ref.current?.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture(event.pointerId);
      handleFromEvent(event);
    },
    [handleFromEvent],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      handleFromEvent(event);
    },
    [handleFromEvent],
  );

  return { ref, onPointerDown, onPointerMove };
}

/** The slider component's white embossed thumb, sized for the picker. */
const THUMB =
  "pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white/0 " +
  "shadow-[0_2px_4px_rgb(0_0_0/0.18),inset_0_0_0_1px_rgb(0_0_0/0.06)]";

/* ---------------------------------------------------------------- picker */

export interface CustomColorPickerProps {
  /** Current color as #rrggbb. */
  value: string;
  /** Fires with a #rrggbb on every change, rAF-throttled while dragging. */
  onChange: (hex: string) => void;
  className?: string;
}

export function CustomColorPicker({ value, onChange, className }: CustomColorPickerProps) {
  const localize = useTemplateCopy();
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value) ?? { h: 259, s: 0.83, v: 1 });
  const [hexDraft, setHexDraft] = useState(() => value.toLowerCase());
  const [seenValue, setSeenValue] = useState(() => value.toLowerCase());
  const [lastEmitted, setLastEmitted] = useState(() => value.toLowerCase());
  const frame = useRef(0);

  /* Re-seed only on genuinely external changes (e.g. a preset swatch was
   * clicked while the picker is open) — never from our own echo. Done by
   * adjusting state during render, the React-sanctioned derived-state form. */
  const nextValue = value.toLowerCase();
  if (nextValue !== seenValue) {
    setSeenValue(nextValue);
    if (nextValue !== lastEmitted) {
      const parsed = hexToHsv(nextValue);
      if (parsed) {
        setLastEmitted(nextValue);
        setHsv(parsed);
        setHexDraft(nextValue);
      }
    }
  }

  const emit = useCallback(
    (next: Hsv) => {
      setHsv(next);
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const hex = hsvToHex(next);
        setLastEmitted(hex);
        setHexDraft(hex);
        onChange(hex);
      });
    },
    [onChange],
  );

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const field = useTrackDrag((x, y) => emit({ ...hsv, s: x, v: 1 - y }));
  const rail = useTrackDrag((x) => emit({ ...hsv, h: Math.min(x * 360, 359.9) }));

  const onFieldKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const moves: Record<string, Partial<Hsv>> = {
      ArrowLeft: { s: clamp01(hsv.s - step) },
      ArrowRight: { s: clamp01(hsv.s + step) },
      ArrowUp: { v: clamp01(hsv.v + step) },
      ArrowDown: { v: clamp01(hsv.v - step) },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    emit({ ...hsv, ...move });
  };

  const onRailKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 15 : 3;
    const delta =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? -step
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? step
          : null;
    if (delta === null) return;
    event.preventDefault();
    emit({ ...hsv, h: Math.min(Math.max(hsv.h + delta, 0), 359.9) });
  };

  const commitHexDraft = () => {
    const parsed = hexToHsv(hexDraft);
    if (!parsed) {
      setHexDraft(lastEmitted);
      return;
    }
    const hex = hsvToHex(parsed);
    setLastEmitted(hex);
    setHsv(parsed);
    setHexDraft(hex);
    onChange(hex);
  };

  const hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const current = hsvToHex(hsv);

  return localize(
    <div className={cx("flex flex-col gap-2.5", className)}>
      {/* Saturation / brightness field */}
      <div
        {...field}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.v * 100)}
        aria-valuetext={`saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        onKeyDown={onFieldKeyDown}
        className="relative aspect-[3/2] w-full cursor-crosshair touch-none rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
          backgroundBlendMode: "normal",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06),inset_0_1px_0_rgb(255_255_255/0.12)]"
        />
        <span
          aria-hidden
          className={THUMB}
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: current }}
        />
      </div>

      {/* Hue rail */}
      <div
        {...rail}
        role="slider"
        tabIndex={0}
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        onKeyDown={onRailKeyDown}
        className="relative h-3 w-full cursor-pointer touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2"
        style={{
          background:
            "linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]"
        />
        <span
          aria-hidden
          className={cx(THUMB, "top-1/2")}
          style={{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }}
        />
      </div>

      {/* Hex row */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="relative size-8 shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]"
          style={{ background: current }}
        >
          <GlossLayers />
        </span>
        <input
          type="text"
          dir="ltr"
          value={hexDraft}
          spellCheck={false}
          aria-label="Hex color"
          onChange={(event) => setHexDraft(event.target.value)}
          onBlur={commitHexDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitHexDraft();
            }
          }}
          className="ease h-8 w-full min-w-0 rounded-2lg bg-background-tertiary-default px-2.5 font-mono text-[13px] text-text-primary uppercase ring-2 ring-transparent transition-[background-color,box-shadow] duration-150 outline-none ring-inset placeholder:text-text-placeholder focus:bg-background-primary-default focus:ring-border-focus-ring"
        />
      </div>
    </div>,
  );
}

/* ------------------------------------------------- accent-engine wiring */

/** CustomColorPicker pre-wired to the accent engine: seeds from the current
 * accent's 500 stop and re-tints the site live on every change. */
export function AccentColorPickerPanel({
  className,
  source,
}: {
  className?: string;
  /** Which surface hosts the panel — reported with accent_changed. */
  source?: AccentChangeSource;
}) {
  const localize = useTemplateCopy();
  const selection = useAccentSelection();
  // Seed once per mount — the popover unmounts on close, so each open starts
  // from whatever the accent currently is.
  const [seed] = useState(() => accentSeedHex(selection));
  const value = selection?.kind === "custom" ? selection.hex : seed;

  return localize(
    <CustomColorPicker
      className={className}
      value={value}
      onChange={(hex) => {
        if (hexToOklch(hex)) applyAccent({ kind: "custom", hex }, source);
      }}
    />,
  );
}

/**
 * The glossy-sphere reflection stack from the landing dock's Figma cells
 * (node 4341:16265): bottom sheen, blurred top reflection dome with a tighter
 * hotspot, and a wide bounce light rising from the bottom edge. Geometry is
 * the 26px comp converted to percentages so any round swatch can wear it —
 * mount inside an `overflow-hidden rounded-full` element.
 */
export function GlossLayers() {
  const localize = useTemplateCopy();
  return localize(
    <>
      {/* sheen: white 0 → 30% toward the bottom */}
      <span
        aria-hidden
        className="absolute inset-0 bg-linear-to-b from-[#ffffff00] to-[#ffffff4d]"
      />
      {/* top reflection dome: 22×10 at (2,0) on the 26px comp, blur 0.5 */}
      <span
        aria-hidden
        className="absolute top-0 left-[7.7%] h-[38.5%] w-[84.6%] rounded-[50%] bg-linear-to-b from-[#ffffff80] to-[#ffffff00] blur-[0.5px]"
      />
      {/* hotspot: 8×3 at (9,0), blur 1 */}
      <span
        aria-hidden
        className="absolute top-0 left-[34.6%] h-[11.5%] w-[30.8%] rounded-[50%] bg-linear-to-b from-[#ffffff80] to-[#ffffff00] blur-[1px]"
      />
      {/* bounce light: 36×14 at (-6,19), blur 0.5 */}
      <span
        aria-hidden
        className="absolute top-[73.1%] left-[-23.1%] h-[53.8%] w-[138.5%] rounded-[50%] bg-linear-to-b from-[#ffffff00] to-[#ffffff80] blur-[0.5px]"
      />
    </>,
  );
}

const RAINBOW_WELL =
  "conic-gradient(from 180deg, #f43f5e, #f59e0b, #84cc16, #10b981, #0ea5e9, #6366f1, #a855f7, #f43f5e)";

export interface AccentColorPickerWellProps {
  /** Well diameter classes (default size-7, matching the swatch grid). */
  swatchClassName?: string;
  /** Check-mark size when a custom color is active (default size-4). */
  checkClassName?: string;
  placement?: DropdownPopoverProps["placement"];
  /** Which surface hosts the well — reported with accent_changed. */
  source?: AccentChangeSource;
  /** Custom trigger art. When set, it replaces the default rainbow fill and
   * active check entirely — the caller owns the well's appearance (e.g. the
   * landing dock's glossy Figma cell). */
  children?: ReactNode;
}

/** The rainbow well: shows the active custom color, opens the picker. */
export function AccentColorPickerWell({
  swatchClassName = "size-7",
  checkClassName = "size-4",
  placement = "bottom",
  source,
  children,
}: AccentColorPickerWellProps) {
  const localize = useTemplateCopy();
  const selection = useAccentSelection();
  const isCustom = selection?.kind === "custom";

  return localize(
    <Dropdown>
      <DropdownTrigger
        aria-label="Custom color"
        className={cx(
          "relative flex shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110",
          swatchClassName,
          !children && isCustom && "scale-110",
        )}
        style={children ? undefined : { background: isCustom ? selection.hex : RAINBOW_WELL }}
      >
        {children ??
          (isCustom ? <RiCheckLine className={cx(checkClassName, "text-white")} /> : null)}
      </DropdownTrigger>
      <DropdownPopover
        aria-label="Custom accent color"
        placement={placement}
        className="w-[248px] rounded-3xl p-2.5"
      >
        <AccentColorPickerPanel source={source} />
      </DropdownPopover>
    </Dropdown>,
  );
}
