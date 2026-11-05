"use client";

import {
  RiGlobalLine,
  RiNotification3Line,
  RiPlayMiniFill,
  RiVolumeUpLine,
} from "@remixicon/react";
import { useEffect, useState } from "react";

import { SettingsCard } from "#/components/application/settings/settings-rows";
import { Button } from "#/components/base/buttons/button";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "#/components/base/segmented-control/segmented-control";
import { Select, SelectItem } from "#/components/base/select/select";
import { Switch } from "#/components/base/switch/switch";
import { useTemplateCopy } from "#/components/foundations/template-copy/template-copy";

import {
  AGENT_LANGUAGES,
  AGENT_SPEECH_RATES,
  normalizeAgentPreferences,
  type Agent,
  type AgentPreferences,
} from "./data";

const PREVIEW_TEXT: Record<AgentPreferences["language"], string> = {
  auto: "Hello! Ready when you are.",
  en: "Hello! Ready when you are.",
  tr: "Merhaba! Hazır olduğunda başlayabiliriz.",
  es: "¡Hola! Podemos empezar cuando quieras.",
  fr: "Bonjour ! Nous pouvons commencer quand vous voulez.",
  de: "Hallo! Wir können anfangen, wenn du bereit bist.",
  ja: "こんにちは！準備ができたら始めましょう。",
  pt: "Olá! Podemos começar quando quiser.",
};

/** Uses device voices for preview; preferences also travel with the agent to onRespond. */
export function AgentPreferencesPanel({
  agent,
  onChange,
}: {
  agent: Agent;
  onChange: (agent: Agent) => void;
}) {
  const localize = useTemplateCopy();
  const preferences = normalizeAgentPreferences(agent.preferences ?? null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [canPreview, setCanPreview] = useState(false);
  const update = (patch: Partial<AgentPreferences>) =>
    onChange({ ...agent, preferences: { ...preferences, ...patch } });

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const refresh = () => {
      setCanPreview(true);
      setVoices(synth.getVoices().filter((voice) => voice.localService));
    };
    // Subscribe to the browser's asynchronously populated voice catalog.
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => {
      synth.removeEventListener("voiceschanged", refresh);
      synth.cancel();
    };
  }, []);

  const matchingVoices = voices.filter(
    (voice) =>
      preferences.language === "auto" || voice.lang.toLowerCase().startsWith(preferences.language),
  );
  const selectedVoice = voices.find((voice) =>
    preferences.voice === "alice"
      ? voice.name.toLowerCase() === "alice"
      : voice.voiceURI === preferences.voice,
  );
  const selectedVoiceKey =
    preferences.voice === "alice"
      ? (selectedVoice?.voiceURI ?? "system")
      : preferences.voice || "off";
  const choices = matchingVoices.slice(0, 12);
  if (selectedVoice && !choices.includes(selectedVoice)) choices.push(selectedVoice);
  const preview = () => {
    if (!canPreview || !preferences.voice) return;
    const utterance = new SpeechSynthesisUtterance(PREVIEW_TEXT[preferences.language]);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = preferences.speed;
    utterance.lang =
      preferences.language === "auto"
        ? (selectedVoice?.lang ?? navigator.language)
        : preferences.language;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return localize(
    <div className="mt-4 flex flex-col gap-3 pb-3">
      <SettingsCard className="px-3">
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-separator-border py-3">
          <span className="flex items-center gap-2 text-body-medium text-text-primary">
            <RiGlobalLine className="size-5 text-foreground-icon-secondary" aria-hidden />
            Language
          </span>
          <Select
            aria-label="Agent language"
            size="sm"
            selectedKey={preferences.language}
            onSelectionChange={(key) => update({ language: key as AgentPreferences["language"] })}
            popoverClassName="w-48"
          >
            {AGENT_LANGUAGES.map((language) => (
              <SelectItem key={language.id} id={language.id}>
                {language.label}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-3 py-3">
          <RiNotification3Line
            className="size-5 shrink-0 text-foreground-icon-secondary"
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-body-medium text-text-primary">Notifications</span>
            <p className="text-caption-1-regular text-text-secondary">
              Show a notice when a reply is ready.
            </p>
          </div>
          <Switch
            aria-label="Notify when this agent finishes"
            size="sm"
            isSelected={preferences.notifications}
            onChange={(notifications) => update({ notifications })}
          />
        </div>
      </SettingsCard>
      <SettingsCard className="gap-3 p-3 pt-2">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-body-medium text-text-primary">
            <RiVolumeUpLine className="size-5 text-foreground-icon-secondary" aria-hidden />
            Voice
          </span>
          <div className="flex min-w-0 items-center gap-1">
            {preferences.voice && (
              <Button
                size="small"
                variant="ghost"
                iconOnly
                leadingIcon={RiPlayMiniFill}
                aria-label="Preview voice"
                disabled={!canPreview}
                className="bg-transparent text-text-secondary hover:bg-background-tertiary-default hover:text-text-primary active:bg-background-tertiary-hover active:text-text-primary"
                onClick={preview}
              />
            )}
            <Select
              aria-label="Agent voice"
              size="sm"
              selectedKey={selectedVoiceKey}
              onSelectionChange={(key) => update({ voice: key === "off" ? "" : String(key) })}
              className="max-w-36 min-w-0"
              popoverClassName="w-60"
              isDisabled={!canPreview}
            >
              <SelectItem id="off">Off</SelectItem>
              <SelectItem id="system">System voice</SelectItem>
              {choices.map((voice) => (
                <SelectItem key={voice.voiceURI} id={voice.voiceURI} textValue={voice.name}>
                  {voice.name}
                </SelectItem>
              ))}
              {preferences.voice &&
                preferences.voice !== "system" &&
                preferences.voice !== "alice" &&
                !selectedVoice && <SelectItem id={preferences.voice}>Saved voice</SelectItem>}
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-caption-1-regular text-text-secondary">Playback speed</span>
          <SegmentedControl
            aria-label="Playback speed"
            className="w-full bg-background-tertiary-default dark:bg-segmented-control-background"
            selectedKeys={[String(preferences.speed)]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (key !== undefined) update({ speed: Number(key) });
            }}
          >
            {AGENT_SPEECH_RATES.map((speed) => (
              <SegmentedControlItem key={speed} id={String(speed)} className="min-w-0 flex-1 px-1">
                {speed}×
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
      </SettingsCard>
    </div>,
  );
}
