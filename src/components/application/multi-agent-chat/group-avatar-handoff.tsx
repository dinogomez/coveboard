"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

type AvatarRect = { x: number; y: number; width: number; height: number };
type TravelingAvatar = { id: string; image: string; from: AvatarRect };
export type AvatarHandoff = { chatId: string; avatars: TravelingAvatar[]; arrived: string[] };
const rectOf = (element: Element): AvatarRect => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
};

/** Preserve the exact rendered face and texture when lifting an avatar off the modal. */
export function captureGroupAvatars(root: HTMLDivElement | null): TravelingAvatar[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>("[data-group-avatar]")).flatMap(
    (element) => {
      const canvas = element.querySelector("canvas");
      if (!canvas) return [];
      try {
        return [
          { id: element.dataset.groupAvatar!, image: canvas.toDataURL(), from: rectOf(canvas) },
        ];
      } catch {
        return [];
      }
    },
  );
}

/** Fly above both surfaces so neither the modal nor the chat scroller clips the journey. */
export function GroupAvatarHandoff({
  handoff,
  targetRef,
  onArrive,
  onFinish,
}: {
  handoff: AvatarHandoff;
  targetRef: RefObject<HTMLDivElement | null>;
  onArrive: (id: string) => void;
  onFinish: () => void;
}) {
  const [destinations, setDestinations] = useState<Record<string, AvatarRect>>({});
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const root = targetRef.current;
    if (!root) {
      onFinish();
      return;
    }
    const measure = () => {
      const next: Record<string, AvatarRect> = {};
      root.querySelectorAll<HTMLElement>("[data-group-avatar]").forEach((element) => {
        const canvas = element.querySelector("canvas");
        if (canvas) next[element.dataset.groupAvatar!] = rectOf(canvas);
      });
      setDestinations((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    // Follow the chat width while its editor rail closes, and adapt to window resizing.
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    const chat = root.closest("main");
    if (chat) resize.observe(chat);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      resize.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [targetRef, onFinish]);

  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[120]">
      {handoff.avatars
        .filter((avatar) => !handoff.arrived.includes(avatar.id))
        .map((avatar) => {
          const index = handoff.avatars.indexOf(avatar);
          const destination = destinations[avatar.id];
          if (!destination)
            return (
              <motion.img
                initial={false}
                key={avatar.id}
                src={avatar.image}
                alt=""
                draggable={false}
                className="absolute max-w-none"
                style={{
                  left: avatar.from.x,
                  top: avatar.from.y,
                  width: avatar.from.width,
                  height: avatar.from.height,
                }}
              />
            );
          return (
            <motion.img
              key={`${avatar.id}-travel`}
              src={avatar.image}
              alt=""
              draggable={false}
              className="absolute top-0 left-0 max-w-none origin-center"
              initial={avatar.from}
              animate={destination}
              transition={{
                duration: reduced ? 0 : 0.7,
                delay: reduced ? 0 : index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              onAnimationComplete={() => onArrive(avatar.id)}
            />
          );
        })}
    </div>,
    document.body,
  );
}
