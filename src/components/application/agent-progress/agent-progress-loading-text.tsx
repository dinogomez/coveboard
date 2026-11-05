"use client";

import { useTemplateCopy } from "#/components/foundations/template-copy/template-copy";
import { cx } from "#/utils/cx";

type AgentProgressLoadingTextProps = {
  children: string;
  className?: string;
};

/** Reusable loading label with a soft highlight traveling across the text. */
export function AgentProgressLoadingText({ children, className }: AgentProgressLoadingTextProps) {
  const localize = useTemplateCopy();
  return localize(
    <span
      aria-label={children}
      className={cx("agent-progress-loading-text inline-block", className)}
    >
      {children}
    </span>,
  );
}
