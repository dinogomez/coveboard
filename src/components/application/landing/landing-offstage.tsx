"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

/**
 * Offstage discipline for the landing page's sections.
 *
 * The page is a stage full of live components — marquee cards, an assembling
 * collage, app-shell demos, seventeen charts — and left alone every one of
 * them renders, animates, and rasterizes all the time, whether or not it is
 * anywhere near the viewport. That is what the "boardui.com using 1.3GB ram"
 * screenshots are made of.
 *
 * `LandingOffstage` wraps a section and does two things while it is far from
 * the viewport:
 *
 *   - `content-visibility: auto` lets the browser skip layout and paint for
 *     the subtree entirely (the DOM stays — SSR HTML, SEO, and find-in-page
 *     are unaffected). `contain-intrinsic-size` reserves an estimated height
 *     so the scrollbar doesn't breathe; the `auto` keyword swaps in the real
 *     measured height once a section has been rendered once.
 *
 *   - `data-offstage` is set, and a global rule holds every CSS animation
 *     inside (marquee track, loader dashes, shimmer sweeps) at its current
 *     frame — the compositor otherwise keeps animating skipped content.
 *
 * JS-driven loops (motion values, timers, WebGL) can't be paused from CSS;
 * components that run one read `useOffstageNear()` and hold their own clocks.
 */

/**
 * Nearness is deliberately three-valued. `null` means "not established yet" —
 * the server render and the frames before the observer's first report. Code
 * that STOPS work should do so only on a firm `false` (never punish the
 * pre-observer window), and code that STARTS extra work should wait for a
 * firm `true` (never mount a heavy demo on a guess).
 */
export type OffstageNear = boolean | null;

const OffstageNearContext = createContext<OffstageNear>(true);

/** Nearness of the closest `LandingOffstage` ancestor; `true` outside one. */
export function useOffstageNear() {
  return useContext(OffstageNearContext);
}

/** How close (px) a section has to be before it counts as "near". Generous,
 *  so nothing is caught mid-wake by a normal scroll. */
const NEAR_MARGIN = "400px 0px 400px 0px";

/**
 * Shared observer-backed nearness hook, for pieces that need the signal on an
 * element of their own (the hero's word cycle uses it directly).
 */
export function useNearViewport<T extends Element>(ref: RefObject<T | null>): OffstageNear {
  // A browser with no IntersectionObserver can never answer, so it starts (and
  // stays) firmly on stage. Nothing renders from this value directly at
  // hydration time, so the client-only initializer can't mismatch the server.
  const [near, setNear] = useState<OffstageNear>(() =>
    typeof window !== "undefined" && typeof IntersectionObserver === "undefined" ? true : null,
  );

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => setNear(entries[entries.length - 1].isIntersecting),
      { rootMargin: NEAR_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return near;
}

export function LandingOffstage({
  estimate,
  className,
  children,
}: {
  /** Rough rendered height in px, for the scrollbar before first render. */
  estimate: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useNearViewport(ref);

  return (
    <div
      ref={ref}
      className={className}
      // Only a firm "far away" pauses the animations — never the server
      // render or the pre-observer frame, which would freeze visible content.
      data-offstage={near === false ? "" : undefined}
      style={
        {
          contentVisibility: "auto",
          containIntrinsicSize: `auto ${estimate}px`,
        } as CSSProperties
      }
    >
      <OffstageNearContext.Provider value={near}>{children}</OffstageNearContext.Provider>
    </div>
  );
}
