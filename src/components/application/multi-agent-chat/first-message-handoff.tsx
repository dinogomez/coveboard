"use client";

import { motion } from "motion/react";
import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

import type { AvatarHandoff } from "./group-avatar-handoff";

export type FirstMessageHandoffState = AvatarHandoff & { responderId: string };
type Rect = { x: number; y: number; width: number; height: number };
export const REPLY_ARRIVAL_MS = 800;

/** Lift the cluster out of the disappearing empty state; land behind the badge. */
export function FirstMessageHandoff({
  handoff,
  badgeRef,
  replyRef,
  onArrive,
  onFinish,
}: {
  handoff: FirstMessageHandoffState;
  badgeRef: RefObject<HTMLButtonElement | null>;
  replyRef: RefObject<HTMLSpanElement | null>;
  onArrive: (id: string) => void;
  onFinish: () => void;
}) {
  const [targets, setTargets] = useState<{ badge: Rect; reply: Rect } | null>(null);
  useLayoutEffect(() => {
    let frame = 0,
      attempts = 0;
    const measure = () => {
      const badge = badgeRef.current?.getBoundingClientRect();
      const reply = replyRef.current?.getBoundingClientRect();
      if (!badge || !reply) {
        if (++attempts < 60) frame = requestAnimationFrame(measure);
        else onFinish();
        return;
      }
      setTargets({
        badge: {
          x: badge.left + 12,
          y: badge.top + (badge.height - 14) / 2,
          width: 14,
          height: 14,
        },
        reply: { x: reply.left, y: reply.top, width: reply.width, height: reply.height },
      });
    };
    // Let the first message, scroll position, and thinking row finish their layout.
    frame = requestAnimationFrame(measure);
    window.addEventListener("resize", onFinish);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onFinish);
    };
  }, [badgeRef, replyRef, onFinish]);

  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30" data-first-message-flight>
      {handoff.avatars
        .filter((avatar) => !handoff.arrived.includes(avatar.id))
        .map((avatar) => {
          const answering = avatar.id === handoff.responderId;
          const target = targets && (answering ? targets.reply : targets.badge);
          if (!target)
            return (
              <motion.img
                key={avatar.id}
                initial={false}
                src={avatar.image}
                alt=""
                className="absolute max-w-none"
                style={{
                  left: avatar.from.x,
                  top: avatar.from.y,
                  width: avatar.from.width,
                  height: avatar.from.height,
                }}
              />
            );
          const from = avatar.from;
          const distance = Math.hypot(target.x - from.x, target.y - from.y);
          // A quadratic arc bows upward first, then eases down into its destination.
          const control = {
            x: from.x + (target.x - from.x) * 0.3,
            y: Math.min(from.y, target.y) - Math.min(110, distance * 0.22),
          };
          const steps = Array.from({ length: 61 }, (_, index) => {
            const t = index / 60;
            return t * t * (3 - 2 * t);
          });
          const along = (axis: "x" | "y") =>
            steps.map(
              (t) =>
                (1 - t) ** 2 * from[axis] + 2 * (1 - t) * t * control[axis] + t ** 2 * target[axis],
            );
          const waitingIndex = handoff.avatars
            .filter((a) => a.id !== handoff.responderId)
            .findIndex((a) => a.id === avatar.id);
          return (
            <motion.img
              key={`${avatar.id}-flight`}
              src={avatar.image}
              alt=""
              draggable={false}
              data-flying-agent={avatar.id}
              className="absolute top-0 left-0 max-w-none"
              initial={{ ...from, opacity: 1 }}
              animate={{
                x: along("x"),
                y: along("y"),
                width: steps.map((t) => from.width + (target.width - from.width) * t),
                height: steps.map((t) => from.height + (target.height - from.height) * t),
                opacity: steps.map((t) =>
                  answering ? 1 : t < 0.78 ? 1 : Math.max(0, (1 - t) / 0.22),
                ),
              }}
              transition={{
                duration: answering ? REPLY_ARRIVAL_MS / 1000 : 0.95,
                delay: answering ? 0 : waitingIndex * 0.12,
                ease: "linear",
              }}
              onAnimationComplete={() => onArrive(avatar.id)}
            />
          );
        })}
    </div>,
    document.body,
  );
}
