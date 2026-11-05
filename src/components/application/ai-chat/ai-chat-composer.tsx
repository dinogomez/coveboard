"use client";

import {
  RiArrowDropDownLine,
  RiArrowUpLine,
  RiGitMergeLine,
  RiInfinityLine,
  RiMic2Line,
} from "@remixicon/react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";

import {
  AddMenu,
  ModelMenu,
  ProjectFolderMenu,
} from "#/components/application/ai-chat/ai-chat-menus";
import {
  LIQUID_GLASS_RESET,
  LiquidGlassChip,
  LiquidGlassSurface,
} from "#/components/application/landing/liquid-glass";
import { useThemeMode } from "#/components/application/theme/theme-toggle";
import { useTemplateCopy } from "#/components/foundations/template-copy/template-copy";
import { cx } from "#/utils/cx";

/**
 * The AI chat composer, extracted from the chat container as its own PRO
 * block: the pill input (attachment menu, model picker, voice and send
 * controls), the status bar underneath (branch, project, agent mode,
 * context meter), and the liquid-glass loading treatment for the controls.
 *
 * `AiChatComposerPreview` is the assembled composer + status bar; pair
 * `GlassComposer` with `ComposerLoader` and `AgentThinking` for the full
 * agent-working state:
 *
 *   {working && <AgentThinking variant="infinity" />}
 *   <ComposerLoader active={working}>
 *     <GlassComposer glass={working} />
 *   </ComposerLoader>
 */

/* ---------------------------------------------------------------- composer */

/** The listening equalizer: staggered clocks and heights so the bars read
 *  as live audio rather than a synchronized loop. */
const MIC_BARS = [
  { height: 8, duration: "0.9s", delay: "-0.4s" },
  { height: 15, duration: "0.7s", delay: "-0.15s" },
  { height: 11, duration: "1.05s", delay: "-0.6s" },
  { height: 14, duration: "0.8s", delay: "-0.3s" },
];

const COMPACT_QUERY = "(max-width: 639px)";

const subscribeCompact = (onChange: () => void) => {
  const query = window.matchMedia(COMPACT_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/* Glass wants the control it sits under to stop painting its own surface,
 * which is a descendant of a component we do not own the internals of — so it
 * is done with a scoped rule rather than by threading a prop through every
 * menu trigger. Same approach GlassComposer already uses for the pill. */
const GLASS_CONTROLS_CSS = `
.bui-glass-controls .lg-host button {
  background-color: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
/* The landing chips read as glass because they sit on a colourful shader.
   The composer is a flat near-white pill, so there is nothing to refract and
   the default 6% tint just shows the grey through. Declaring the tint on the
   layer itself beats the surface's inherited inline value, and keeps the
   hover variable working. */
.bui-glass-controls .lg-tint {
  --lg-tint: rgba(255, 255, 255, 0.88);
  --lg-tint-hover: rgba(255, 255, 255, 1);
}
.dark .bui-glass-controls .lg-tint {
  --lg-tint: rgba(255, 255, 255, 0.1);
  --lg-tint-hover: rgba(255, 255, 255, 0.16);
}
`;

export interface ComposerProps {
  className?: string;
  /** Controlled field value. Left out, the input manages its own text. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Fires on the send button and on Enter. Without it the composer is inert,
   *  which is what the marketing surfaces want. */
  onSubmit?: (value: string) => void;
  /** Greys out send while a turn is in flight. */
  disabled?: boolean;
  /**
   * Puts the add and model controls on liquid glass, the same chips the landing
   * header uses. Opt-in: the filter is not free, and the flat treatment is the
   * right default everywhere the composer sits on a plain surface.
   */
  glassControls?: boolean;
  /** The field itself, for focus or a scripted demo. */
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function Composer({
  className,
  value,
  onValueChange,
  onSubmit,
  disabled = false,
  glassControls = false,
  inputRef,
}: ComposerProps = {}) {
  const localize = useTemplateCopy();
  // The full placeholder clips inside the narrow mobile pill; shorten it
  // under the sm breakpoint. (Placeholders can't respond to CSS, so this is
  // a media-query subscription rather than a class.)
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false,
  );
  // Voice input active state: the mic swaps to dancing equalizer bars until
  // it's clicked again.
  const [listening, setListening] = useState(false);
  return localize(
    <div
      className={cx(
        "flex h-[52px] w-full items-center gap-2.5 rounded-full bg-background-primary-default py-2 ps-2 pe-2 shadow-xs",
        glassControls && "bui-glass-controls",
        className,
      )}
    >
      {glassControls ? <style>{GLASS_CONTROLS_CSS}</style> : null}
      {glassControls ? (
        <LiquidGlassChip radius="full" className="rounded-full">
          {/* The chip paints its surface first and relies on the child sitting
              above it; without the reset's `relative z-10` the glass swallows
              the control it is meant to sit under. */}
          <span className={cx("inline-flex", LIQUID_GLASS_RESET)}>
            <AddMenu />
          </span>
        </LiquidGlassChip>
      ) : (
        <AddMenu />
      )}

      <input
        ref={inputRef}
        type="text"
        aria-label="Message"
        {...(value === undefined
          ? {}
          : { value, onChange: (event) => onValueChange?.(event.target.value) })}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || disabled) return;
          event.preventDefault();
          onSubmit?.(event.currentTarget.value);
        }}
        placeholder={compact ? "Ask me" : "Ask me anything"}
        // Text longer than the field otherwise ends on a hard vertical cut
        // against the model picker. The mask softens the last 32px into the
        // pill. It lifts on focus so the caret is never faded out while
        // typing at the end of a long line.
        className="h-5 min-w-0 flex-1 bg-transparent text-body-regular text-text-primary caret-accent-500 outline-none placeholder:text-text-tertiary [&:not(:focus)]:[mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent_100%)] rtl:[&:not(:focus)]:[mask-image:linear-gradient(to_left,#000_calc(100%-32px),transparent_100%)]"
      />

      {glassControls ? (
        <LiquidGlassChip radius={12}>
          <span className={cx("inline-flex", LIQUID_GLASS_RESET)}>
            <ModelMenu />
          </span>
        </LiquidGlassChip>
      ) : (
        <ModelMenu />
      )}

      <div className="flex shrink-0 items-center gap-2 ps-1.5">
        <button
          type="button"
          aria-label="Voice input"
          aria-pressed={listening}
          onClick={() => setListening((on) => !on)}
          className="ease flex size-9 cursor-pointer items-center justify-center rounded-full border border-border-button-default bg-background-primary-default p-2 shadow-xs transition-colors duration-150 hover:bg-background-primary-hover"
        >
          {listening ? (
            <span aria-hidden className="flex h-5 items-center justify-center gap-[2.5px]">
              {MIC_BARS.map((bar, i) => (
                <span
                  key={i}
                  className="bui-composer-mic-bar w-[2.5px] rounded-full bg-accent-500"
                  style={{
                    height: bar.height,
                    animationDuration: bar.duration,
                    animationDelay: bar.delay,
                  }}
                />
              ))}
            </span>
          ) : (
            <RiMic2Line className="size-5 text-foreground-icon-primary" aria-hidden />
          )}
        </button>
        <button
          type="button"
          aria-label="Send message"
          disabled={disabled}
          onClick={() => onSubmit?.(value ?? "")}
          className={cx(
            "ease bg-button-primary flex size-9 cursor-pointer items-center justify-center rounded-full p-2 transition-opacity duration-200",
            disabled && "cursor-not-allowed opacity-40",
          )}
        >
          <RiArrowUpLine className="size-5 text-white" aria-hidden />
        </button>
      </div>
    </div>,
  );
}

/* ---------------------------------------------------------- glass composer */

const GLASS_COMPOSER_CSS = `
.bui-glass-pill > button,
.bui-glass-pill button[aria-label="Voice input"] {
  transition:
    background-color 480ms ease,
    border-color 480ms ease,
    box-shadow 480ms ease !important;
}
.bui-glass-on .bui-glass-pill > button,
.bui-glass-on .bui-glass-pill button[aria-label="Voice input"] {
  background-color: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
`;

/**
 * The composer with liquid-glass chips measured under its add / model / mic
 * controls. While `glass` is on the controls drop their own paint so the
 * glass — and any ComposerLoader light passing behind it — shows through;
 * everything transitions back when it turns off. Pair with `ComposerLoader`:
 *
 *   <ComposerLoader active={working}>
 *     <GlassComposer glass={working} />
 *   </ComposerLoader>
 */
export function GlassComposer({ glass }: { glass: boolean }) {
  const localize = useTemplateCopy();
  // On white surfaces the default 6% white tint nearly vanishes; lift it a
  // touch so the chips read as a material. Dark mode keeps its config.
  const lightMode = useThemeMode() === "light";
  const pillRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<
    { left: number; top: number; width: number; height: number; radius: number }[]
  >([]);
  // Ancestor transform scale, measured so the glass can adapt: the
  // refraction layer drops out under any scale (Chromium userSpaceOnUse
  // mismatch paints its square map region), and the frost blur compensates
  // for upscaling (backdrop blur radii don't scale with transforms, so at 2×
  // the glass would look half as frosty and the light behind reads as
  // painted on top of the controls).
  const [scaleRatio, setScaleRatio] = useState(1);

  useEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;
    // Layout-space (offset*) measurement, not getBoundingClientRect: the
    // template preview renders inside scaled frames, where client rects are
    // post-transform but the absolute chips position in layout pixels.
    const offsetWithin = (el: HTMLElement) => {
      let left = 0;
      let top = 0;
      let node: HTMLElement | null = el;
      while (node && node !== pill) {
        left += node.offsetLeft;
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return { left, top };
    };
    const measure = () => {
      setScaleRatio(pill.getBoundingClientRect().width / Math.max(1, pill.offsetWidth));
      const buttons = [...pill.querySelectorAll<HTMLButtonElement>("button")];
      const add = buttons.find((b) => b.getAttribute("aria-label") === "Add attachment");
      const mic = buttons.find((b) => b.getAttribute("aria-label") === "Voice input");
      const model = buttons.find((b) => !b.getAttribute("aria-label"));
      setRects(
        [add, model, mic]
          .filter((b): b is HTMLButtonElement => !!b)
          .map((b) => ({
            ...offsetWithin(b),
            width: b.offsetWidth,
            height: b.offsetHeight,
            radius: b === model ? 12 : b.offsetHeight / 2,
          })),
      );
    };

    const observer = new ResizeObserver(measure);
    observer.observe(pill);
    // Each control is observed as well, not just the pill. Picking a longer
    // model name ("Composer 2.5" over "Fable 5") widens that button without
    // changing the pill, so watching only the pill left the glass chip at its
    // previous width and the label spilled out of it.
    for (const button of pill.querySelectorAll<HTMLButtonElement>("button")) {
      observer.observe(button);
    }
    return () => observer.disconnect();
  }, []);

  return localize(
    <div ref={pillRef} className={cx("relative", glass && "bui-glass-on")}>
      <style>{GLASS_COMPOSER_CSS}</style>
      <span aria-hidden className="pointer-events-none absolute inset-0">
        {rects.map((rect, i) => (
          <span
            key={i}
            className="absolute"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              borderRadius: rect.radius,
              opacity: glass ? 1 : 0,
              transition: "opacity 480ms ease",
            }}
          >
            <LiquidGlassSurface
              radius={rect.radius >= rect.height / 2 ? "full" : rect.radius}
              refract={Math.abs(scaleRatio - 1) <= 0.02}
              className="rounded-[inherit]"
              {...(scaleRatio > 1.05 ? { frost: Math.round(6 * scaleRatio) } : {})}
              {...(lightMode ? { tintOpacity: 0.12 } : {})}
            />
          </span>
        ))}
      </span>
      {/* dark:bg-transparent is belt-and-braces: the pill now paints from a
          single un-prefixed bg class that `bg-transparent` replaces cleanly,
          but a dark-variant bg added here later would survive tailwind-merge
          and paint over the ComposerLoader light. */}
      <Composer className="bui-glass-pill relative bg-transparent shadow-none dark:bg-transparent" />
    </div>,
  );
}

/* -------------------------------------------------------------- status bar */

/** 16px circular context meter at `pct` percent. */
function ContextRing({ pct }: { pct: number }) {
  const localize = useTemplateCopy();
  const r = 6;
  const c = 2 * Math.PI * r;
  return localize(
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className="shrink-0 -rotate-90">
      <circle cx="8" cy="8" r={r} fill="none" stroke="var(--color-neutral-300)" strokeWidth="2.5" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke="var(--color-neutral-500)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
      />
    </svg>,
  );
}

function StatusItem({
  icon,
  label,
  dropdown = false,
}: {
  icon: ReactNode;
  label: string;
  dropdown?: boolean;
}) {
  const localize = useTemplateCopy();
  return localize(
    <button type="button" className="flex cursor-pointer items-center gap-1">
      {icon}
      <span className="flex items-center">
        <span className="text-body-2-medium whitespace-nowrap text-text-secondary">{label}</span>
        {dropdown && (
          <RiArrowDropDownLine
            className="size-4 shrink-0 text-foreground-icon-secondary"
            aria-hidden
          />
        )}
      </span>
    </button>,
  );
}

export function StatusBar() {
  const localize = useTemplateCopy();
  return localize(
    <div className="flex h-[26px] w-full items-center justify-between">
      <div className="flex items-center gap-3">
        <StatusItem
          icon={
            <RiGitMergeLine
              className="size-4 shrink-0 -scale-y-100 text-foreground-icon-secondary"
              aria-hidden
            />
          }
          label="Main"
        />
        <ProjectFolderMenu />
      </div>
      <div className="flex items-center gap-3">
        <StatusItem
          icon={
            <RiInfinityLine
              className="size-4 shrink-0 text-foreground-icon-secondary"
              aria-hidden
            />
          }
          label="Agent"
          dropdown
        />
        <div className="flex items-center gap-1 rounded-[40px] bg-background-tertiary-default py-1 ps-1.5 pe-2">
          <ContextRing pct={57} />
          <span className="text-body-2-medium whitespace-nowrap text-text-secondary">57%</span>
        </div>
      </div>
    </div>,
  );
}

/** The production composer and status row as a standalone block for compact
 * previews and embedded agent surfaces. */
export function AiChatComposerPreview() {
  const localize = useTemplateCopy();
  return localize(
    <div className="flex w-full flex-col gap-2.5">
      <Composer />
      <StatusBar />
    </div>,
  );
}
