"use client";

import { useId } from "react";

import { AgentAvatar } from "#/components/application/agent-avatar/agent-avatar";
import { type AvatarConfig } from "#/components/application/agent-avatar/model";
import {
  GlossSwatch,
  RainbowGlossArt,
  type GlossHue,
} from "#/components/application/theme/accent-gloss";
import { CustomColorPicker } from "#/components/application/theme/custom-color-picker";
import { CloseButton } from "#/components/base/buttons/close-button";
import { Dropdown, DropdownPopover, DropdownTrigger } from "#/components/base/dropdown/dropdown";
import { Input } from "#/components/base/input/input";
import { Textarea } from "#/components/base/textarea/textarea";
import { useTemplateCopy } from "#/components/foundations/template-copy/template-copy";

import { AgentPreferencesPanel } from "./agent-preferences";
import type { Agent } from "./data";
import { EmotionPicker } from "./emotion-picker";
import { ScrollSurface } from "./scroll-surface";
import { ShapeArc } from "./shape-arc";

const COLORS = [
  [220, 85, "Blue"],
  [181, 49, "Teal"],
  [259, 75, "Violet"],
  [321, 74, "Pink"],
  [0, 78, "Red"],
  [31, 89, "Orange"],
  [193, 78, "Cyan"],
  [78, 72, "Lime"],
  [145, 51, "Green"],
] as const;

function avatarHex(c: AvatarConfig) {
  const light = (c.lightness ?? 76) / 100,
    a = (c.saturation / 100) * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const k = (n + c.hue / 30) % 12;
    return Math.round(255 * (light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}
function hexAppearance(hex: string): Partial<AvatarConfig> {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min,
    light = (max + min) / 2;
  let hue = 0;
  if (delta)
    hue =
      max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return {
    hue: hue * 60,
    saturation: delta ? (delta / (1 - Math.abs(2 * light - 1))) * 100 : 0,
    lightness: light * 100,
    lightEyes: light < 0.35,
  };
}

export type AgentCreatorProps = {
  agent: Agent;
  onChange: (agent: Agent) => void;
  onClose?: () => void;
};

/** Controlled creator block; the host owns saving and the surrounding panel. */
export function AgentCreator({ agent, onChange, onClose }: AgentCreatorProps) {
  const localize = useTemplateCopy();
  const id = useId();
  const c = agent.avatar;
  const appearance = (patch: Partial<AvatarConfig>) =>
    onChange({ ...agent, avatar: { ...c, ...patch, lookAt: "wander" } });
  return localize(
    <section
      aria-label="Agent editor"
      className="flex h-full min-h-0 flex-col bg-background-full ps-1 pe-2"
    >
      <header className="relative flex h-8 shrink-0 items-start justify-center pt-4">
        <h2 className="max-w-[260px] truncate text-body-medium text-text-primary">
          {agent.name || "New bot"}
        </h2>
        {onClose && (
          <CloseButton
            size="xs"
            aria-label="Close agent editor"
            className="absolute end-0 top-3.5 text-foreground-icon-tertiary"
            onClick={onClose}
          />
        )}
      </header>
      <ScrollSurface
        className="flex-1"
        contentClassName="pb-4"
        surface="full"
        label="Agent appearance and details"
        fadeBottom
      >
        <div className="relative h-[360px] overflow-hidden">
          <div className="pointer-events-none absolute top-[30px] left-1/2 z-10 -translate-x-1/2">
            <EmotionPicker key={agent.id} config={c} onChange={(eyes) => appearance({ eyes })} />
          </div>
          <div className="pointer-events-none absolute top-[83px] left-1/2 -translate-x-1/2">
            <AgentAvatar
              config={{ ...c, lookAt: "wander" }}
              size={162}
              label={`${agent.name || "New agent"}, live avatar preview`}
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            <ShapeArc
              key={agent.id}
              config={c}
              onChange={(foldShape) => appearance({ foldShape })}
            />
          </div>
        </div>
        <div className="mt-[15px] flex justify-center">
          <div
            role="group"
            aria-label="Avatar color"
            className="flex h-[38px] shrink-0 items-center gap-1 rounded-full border border-border-button-default bg-background-primary-default p-[5px] shadow-xs"
          >
            {COLORS.map(([hue, saturation, name]) => (
              <GlossSwatch
                key={name}
                hue={name.toLowerCase() as GlossHue}
                label={`${name} avatar`}
                active={c.hue === hue && c.saturation === saturation && c.lightness === undefined}
                onSelect={() =>
                  appearance({ hue, saturation, lightness: undefined, lightEyes: false })
                }
              />
            ))}
            <Dropdown>
              <DropdownTrigger
                aria-label="Custom avatar color"
                className="relative size-[26px] shrink-0 overflow-hidden rounded-full"
              >
                <RainbowGlossArt />
              </DropdownTrigger>
              <DropdownPopover
                aria-label="Custom avatar color"
                placement="bottom end"
                className="w-[248px] rounded-3xl p-2.5"
              >
                <CustomColorPicker
                  value={avatarHex(c)}
                  onChange={(hex) => appearance(hexAppearance(hex))}
                />
              </DropdownPopover>
            </Dropdown>
          </div>
        </div>
        <div className="mt-[15px] overflow-hidden rounded-2xl bg-background-secondary-default ps-3">
          <div className="grid h-[52px] grid-cols-[96px_minmax(0,1fr)] items-center border-b border-border-button-default pe-2.5 dark:border-border-button-default/35">
            <label htmlFor={`${id}-name`} className="text-body-regular text-text-primary">
              Name
            </label>
            <Input
              id={`${id}-name`}
              aria-label="Agent name"
              size="small"
              maxLength={48}
              value={agent.name}
              onChange={(name) => onChange({ ...agent, name })}
              placeholder="Michael Scott"
            />
          </div>
          <div className="grid h-[52px] grid-cols-[96px_minmax(0,1fr)] items-center border-b border-border-button-default pe-2.5 dark:border-border-button-default/35">
            <label htmlFor={`${id}-label`} className="text-body-regular text-text-primary">
              Label
            </label>
            <Input
              id={`${id}-label`}
              aria-label="Agent label"
              size="small"
              maxLength={60}
              value={agent.label}
              onChange={(label) => onChange({ ...agent, label })}
              placeholder="Manager, marketing, painter"
            />
          </div>
          <div className="grid h-[82px] grid-cols-[96px_minmax(0,1fr)] items-start py-2.5 pe-2.5">
            <label
              htmlFor={`${id}-description`}
              className="pt-1 text-body-regular text-text-primary"
            >
              Description
            </label>
            <Textarea
              id={`${id}-description`}
              aria-label="Agent description"
              size="small"
              rows={2}
              resize="none"
              maxLength={500}
              fieldClassName="h-[62px]"
              value={agent.description}
              onChange={(description) => onChange({ ...agent, description })}
              placeholder="Details for the agent"
            />
          </div>
        </div>
        <AgentPreferencesPanel agent={agent} onChange={onChange} />
      </ScrollSurface>
    </section>,
  );
}

/** Kept for existing template imports. */
export const AgentEditor = AgentCreator;
