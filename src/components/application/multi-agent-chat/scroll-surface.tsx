"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

import { useTemplateCopy } from "#/components/foundations/template-copy/template-copy";
import { cx } from "#/utils/cx";

/** The header stays outside this wrapper; each blur layer fades independently. */
export function ScrollSurface({
  children,
  className,
  contentClassName,
  surface = "secondary",
  scrollRef,
  label,
  chatId,
  fadeBottom = false,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  surface?: "primary" | "secondary" | "full";
  scrollRef?: Ref<HTMLDivElement>;
  label?: string;
  chatId?: string;
  fadeBottom?: boolean;
}) {
  const localize = useTemplateCopy();
  const [fade, setFade] = useState(0);
  const [bottomFade, setBottomFade] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(scrollRef, () => viewportRef.current!, []);
  const updateFade = useCallback(() => {
    const element = viewportRef.current;
    if (!element) return;
    setFade(Math.min(1, Math.max(0, element.scrollTop) / 24));
    if (fadeBottom)
      setBottomFade(
        Math.min(
          1,
          Math.max(0, element.scrollHeight - element.clientHeight - element.scrollTop) / 24,
        ),
      );
  }, [fadeBottom]);
  useEffect(() => {
    const element = viewportRef.current;
    if (!element || !fadeBottom) return;
    const resize = new ResizeObserver(updateFade);
    const content = new MutationObserver(updateFade);
    resize.observe(element);
    content.observe(element, { childList: true, subtree: true, characterData: true });
    const frame = requestAnimationFrame(updateFade);
    return () => {
      resize.disconnect();
      content.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [fadeBottom, updateFade]);
  const mask = "linear-gradient(to bottom, black, transparent)";
  return localize(
    <div className={cx("relative min-h-0", className)}>
      <div
        ref={viewportRef}
        data-chat-id={chatId}
        aria-label={label}
        tabIndex={label ? 0 : undefined}
        onScroll={updateFade}
        className={cx(
          "h-full [scrollbar-width:none] overflow-y-auto overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-inset",
          contentClassName,
        )}
      >
        {children}
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10">
        <div
          className="absolute inset-x-0 top-0 h-6 backdrop-blur-[1px]"
          style={{ opacity: fade, maskImage: mask }}
        />
        <div
          className="absolute inset-x-0 top-0 h-4 backdrop-blur-[4px]"
          style={{ opacity: fade, maskImage: mask }}
        />
        <div
          className="absolute inset-x-0 top-0 h-6"
          style={
            {
              opacity: fade,
              background: `linear-gradient(to bottom, var(--color-background-${surface === "full" ? "full" : `${surface}-default`}), transparent)`,
            } as CSSProperties
          }
        />
      </div>
      {fadeBottom && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
          <div
            className="absolute inset-x-0 bottom-0 h-6 backdrop-blur-[1px]"
            style={{
              opacity: bottomFade,
              maskImage: "linear-gradient(to top, black, transparent)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-4 backdrop-blur-[4px]"
            style={{
              opacity: bottomFade,
              maskImage: "linear-gradient(to top, black, transparent)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-6"
            style={
              {
                opacity: bottomFade,
                background: `linear-gradient(to top, var(--color-background-${surface === "full" ? "full" : `${surface}-default`}), transparent)`,
              } as CSSProperties
            }
          />
        </div>
      )}
    </div>,
  );
}
