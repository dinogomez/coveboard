"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState, type CSSProperties, type Ref } from "react";

import { AgentAvatar } from "#/components/application/agent-avatar/agent-avatar";
import { useTemplateCopy } from "#/components/foundations/template-copy/template-copy";

import type { Agent } from "./data";

/** The same canvas survives thinking, settling, and the completed answer. */
export function ReplyHeader({
  agent,
  thinking,
  workingKey,
  avatarRef,
  arriving = false,
  onEdit,
}: {
  agent: Agent;
  thinking: boolean;
  workingKey?: number;
  avatarRef?: Ref<HTMLSpanElement>;
  arriving?: boolean;
  onEdit: () => void;
}) {
  const localize = useTemplateCopy();
  const [initialWorkingKey] = useState(thinking ? workingKey : undefined);
  const reduced = useReducedMotion();
  const transition = { duration: reduced ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] as const };
  return localize(
    <button
      type="button"
      onClick={onEdit}
      aria-label={thinking ? `${agent.name} is thinking` : agent.name}
      className="my-1 flex min-w-0 items-center gap-1 rounded-lg text-start text-body-2-medium text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
    >
      <motion.span
        ref={avatarRef}
        style={{ visibility: arriving ? "hidden" : undefined }}
        initial={false}
        animate={{ width: thinking ? 32 : 20, height: thinking ? 32 : 20 }}
        transition={transition}
        className="relative block shrink-0"
      >
        <motion.span
          initial={false}
          animate={{ scale: thinking ? 1 : 0.625 }}
          transition={transition}
          className="absolute start-0 top-0 block size-8 origin-top-left rtl:origin-top-right"
        >
          <AgentAvatar
            config={agent.avatar}
            size={32}
            workingKey={arriving ? undefined : initialWorkingKey}
            workingCycles={2}
            label={agent.name}
          />
        </motion.span>
      </motion.span>
      <span
        className="grid transition-opacity duration-200"
        style={{ opacity: arriving ? 0 : 1 }}
        role={thinking ? "status" : undefined}
      >
        <motion.span
          initial={false}
          animate={{ opacity: thinking ? 1 : 0 }}
          transition={transition}
          aria-hidden={!thinking}
          className="bui-agent-thinking-label col-start-1 row-start-1"
          style={{ "--bui-agent-thinking-tone": "var(--color-text-secondary)" } as CSSProperties}
        >
          Thinking…
        </motion.span>
        <motion.span
          initial={false}
          animate={{ opacity: thinking ? 0 : 1, x: thinking ? 4 : 0 }}
          transition={transition}
          aria-hidden={thinking}
          className="col-start-1 row-start-1"
        >
          {agent.name}
        </motion.span>
      </span>
    </button>,
  );
}
