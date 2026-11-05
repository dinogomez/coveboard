"use client";

import {
  RiArrowLeftLine,
  RiArrowRightSLine,
  RiGlobalLine,
  RiCheckLine,
  RiCodeBoxLine,
  RiLinkM,
  RiPlugLine,
  RiSearchLine,
  RiStore2Line,
} from "@remixicon/react";
import { usePresence } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { AgentAvatar } from "#/components/application/agent-avatar/agent-avatar";
import { SettingsModal } from "#/components/application/settings/settings-modal";
import {
  SettingsCard,
  SettingsSectionLabel,
} from "#/components/application/settings/settings-rows";
import { Button, ButtonLink } from "#/components/base/buttons/button";
import { CloseButton } from "#/components/base/buttons/close-button";
import { Input } from "#/components/base/input/input";
import { SOCIAL_COLOR_LOGOS } from "#/components/base/social-button/social-color-logos";
import { PillTab, PillTabList } from "#/components/base/tabs/pill-tab";
import { useTemplateCopy } from "#/components/foundations/template-copy/template-copy";
import { cx } from "#/utils/cx";

import type { Agent } from "./data";
import {
  filterMarketplace,
  MARKETPLACE_ITEMS,
  marketplaceAgentId,
  type MarketplaceItem,
} from "./marketplace-data";
import { MARKETPLACE_LOGOS } from "./marketplace-logos";
import { ScrollSurface } from "./scroll-surface";

const focus = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring";
type View = "discover" | "plugin" | "bot" | "installed";
const categories = [
  { id: "discover", label: "Discover" },
  { id: "plugin", label: "Plugins" },
  { id: "bot", label: "Bots" },
  { id: "installed", label: "Installed" },
] as const;

function ItemIcon({ item, size = 44 }: { item: MarketplaceItem; size?: number }) {
  const localize = useTemplateCopy();
  if (item.avatar)
    return localize(
      <span className="shrink-0">
        <AgentAvatar config={item.avatar} size={size} label={item.name} />
      </span>,
    );
  const key = item.logo!;
  const logo =
    key in MARKETPLACE_LOGOS
      ? MARKETPLACE_LOGOS[key as keyof typeof MARKETPLACE_LOGOS]
      : SOCIAL_COLOR_LOGOS[key as keyof typeof SOCIAL_COLOR_LOGOS];
  return localize(
    <span
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      className="flex shrink-0 items-center justify-center border border-separator-border bg-background-secondary-default"
    >
      {logo && (
        <svg
          aria-hidden="true"
          viewBox={logo.viewBox}
          className={cx(
            "h-[60%] w-[60%]",
            (key === "github" || key === "linear") && "dark:invert",
            key === "aws" && "dark:[&_path:first-child]:fill-text-primary",
          )}
          dangerouslySetInnerHTML={{ __html: logo.body }}
        />
      )}
    </span>,
  );
}

function Section({
  title,
  children,
  onViewAll,
}: {
  title: string;
  children: ReactNode;
  onViewAll?: () => void;
}) {
  const localize = useTemplateCopy();
  return localize(
    <section className="flex flex-col gap-1">
      <div className="flex h-8 items-center justify-between px-2">
        <h2 className="text-body-medium text-text-primary">{title}</h2>
        {onViewAll && (
          <Button
            variant="ghost"
            size="small"
            className="bg-transparent text-text-secondary hover:bg-background-secondary-default active:bg-background-tertiary-default"
            trailingIcon={RiArrowRightSLine}
            onClick={onViewAll}
          >
            View all
          </Button>
        )}
      </div>
      {children}
    </section>,
  );
}

export function Marketplace({
  agents,
  installedPlugins,
  onTogglePlugin,
  onAddBot,
  onChat,
  onClose,
  onCopy,
  initialItem,
  defaultPage = "marketplace",
}: {
  agents: Agent[];
  installedPlugins: string[];
  onTogglePlugin: (id: string) => void;
  onAddBot: (item: MarketplaceItem) => void;
  onChat: (id: string) => void;
  onClose: () => void;
  onCopy: (text: string, message: string) => void;
  initialItem?: string | null;
  defaultPage?: "general" | "marketplace";
}) {
  const localize = useTemplateCopy();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("discover");
  const [detail, setDetail] = useState<MarketplaceItem | null>(
    () => MARKETPLACE_ITEMS.find((item) => item.id === initialItem) ?? null,
  );
  const titleRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isPresent, safeToRemove] = usePresence();
  useEffect(() => {
    if (isPresent) return;
    const timer = setTimeout(() => safeToRemove?.(), 340);
    return () => clearTimeout(timer);
  }, [isPresent, safeToRemove]);
  const isAdded = (item: MarketplaceItem) =>
    item.kind === "plugin"
      ? installedPlugins.includes(item.id)
      : agents.some((agent) => agent.id === marketplaceAgentId(item.id));
  const results = filterMarketplace(
    query,
    view === "plugin" || view === "bot" ? view : "all",
  ).filter((item) => view !== "installed" || isAdded(item));
  const openDetail = (item: MarketplaceItem) => {
    setDetail(item);
    requestAnimationFrame(() => titleRef.current?.focus());
  };
  const browse = (next: View) => {
    setView(next);
    setQuery("");
  };
  const add = (item: MarketplaceItem) =>
    item.kind === "plugin" ? onTogglePlugin(item.id) : onAddBot(item);
  const share = (item: MarketplaceItem) => {
    const url = new URL(window.location.href);
    url.searchParams.set("marketplace", item.id);
    onCopy(url.toString(), "Marketplace link copied");
  };
  const grid = (items: MarketplaceItem[]) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <SettingsCard
          key={item.id}
          className="group min-w-0 gap-3 p-3 transition-colors hover:bg-background-secondary-hover"
        >
          <button
            type="button"
            aria-label={`View ${item.name}`}
            onClick={() => openDetail(item)}
            className={cx("flex min-w-0 items-center gap-3 rounded-xl text-start", focus)}
          >
            <ItemIcon item={item} size={36} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-body-medium text-text-primary">{item.name}</span>
              <span className="text-caption-1-regular text-text-tertiary">{item.category}</span>
            </span>
          </button>
          <p className="text-body-2-regular text-text-secondary">{item.description}</p>
          <Button
            size="small"
            variant="secondary"
            className="mt-auto w-full shrink-0 rounded-full"
            aria-label={isAdded(item) ? `View added ${item.name}` : `Add ${item.name}`}
            onClick={() => (isAdded(item) ? openDetail(item) : add(item))}
            leadingIcon={isAdded(item) ? RiCheckLine : undefined}
          >
            {isAdded(item) ? "Added" : "Add"}
          </Button>
        </SettingsCard>
      ))}
    </div>
  );
  const botStrip = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {MARKETPLACE_ITEMS.filter((item) => item.kind === "bot")
        .slice(0, 4)
        .map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={`View ${item.name}`}
            onClick={() => openDetail(item)}
            className={cx(
              "flex min-w-0 flex-col items-center gap-2 rounded-2xl bg-background-secondary-default px-2 py-4 text-center transition-colors hover:bg-background-tertiary-default",
              focus,
            )}
          >
            <ItemIcon item={item} size={52} />
            <span className="flex flex-col gap-1">
              <span className="text-body-2-medium text-text-primary">{item.name}</span>
              <span className="text-caption-1-regular text-text-secondary">{item.category}</span>
            </span>
          </button>
        ))}
    </div>
  );

  return localize(
    <SettingsModal
      isOpen={isPresent}
      onClose={onClose}
      defaultPage={defaultPage}
      planArtSrc="/templates/settings-plan-art.png"
      marketplace={
        <>
          <header className="flex shrink-0 items-center justify-between gap-3 px-4 pt-8 pb-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-2">
              {detail && (
                <Button
                  variant="ghost"
                  size="small"
                  className="bg-transparent text-text-secondary hover:bg-background-secondary-default active:bg-background-tertiary-default"
                  iconOnly
                  leadingIcon={RiArrowLeftLine}
                  aria-label="Back to marketplace"
                  onClick={() => {
                    setDetail(null);
                    requestAnimationFrame(() => searchRef.current?.focus());
                  }}
                />
              )}
              <h2 className="text-title-3-medium text-text-primary">Marketplace</h2>
            </div>
            <CloseButton aria-label="Close marketplace" size="sm" onClick={onClose} />
          </header>
          {detail ? (
            <ScrollSurface
              key={detail.id}
              surface="full"
              className="flex-1"
              contentClassName="px-5 pb-8 sm:px-8"
              label={`${detail.name} details`}
            >
              <div className="flex flex-col gap-5 pt-1">
                <SettingsCard className="items-center gap-4 p-5 text-center">
                  <ItemIcon item={detail} size={72} />
                  <div className="flex flex-col items-center gap-1">
                    <h2
                      ref={titleRef}
                      tabIndex={-1}
                      className="text-title-3-semibold text-text-primary outline-none"
                    >
                      {detail.name}
                    </h2>
                    <span className="text-body-2-regular text-text-secondary">
                      {detail.category} · by {detail.developer}
                    </span>
                  </div>
                  <p className="max-w-md text-body-regular text-text-secondary">{detail.detail}</p>
                  <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
                    {detail.kind === "bot" && isAdded(detail) ? (
                      <Button
                        className="w-full rounded-full"
                        onClick={() => onChat(marketplaceAgentId(detail.id))}
                      >
                        Start chat
                      </Button>
                    ) : (
                      <Button
                        className="w-full rounded-full"
                        variant={isAdded(detail) ? "secondary" : "primary"}
                        leadingIcon={isAdded(detail) ? RiCheckLine : undefined}
                        onClick={() => add(detail)}
                      >
                        {isAdded(detail) ? "Remove" : "Add"}
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      className="w-full rounded-full"
                      leadingIcon={RiLinkM}
                      onClick={() => share(detail)}
                    >
                      Share
                    </Button>
                    <ButtonLink
                      href={detail.website}
                      target="_blank"
                      rel="noreferrer"
                      variant="secondary"
                      className="col-span-2 row-start-2 w-full rounded-full sm:col-span-1 sm:row-start-auto"
                      leadingIcon={RiGlobalLine}
                    >
                      Website
                    </ButtonLink>
                  </div>
                </SettingsCard>
                <section className="flex flex-col gap-1">
                  <SettingsSectionLabel>Skills · {detail.skills.length}</SettingsSectionLabel>
                  <div className="flex flex-col gap-2">
                    {detail.skills.map((skill) => (
                      <SettingsCard key={skill.name} className="flex-row items-center gap-3 p-3">
                        <RiCodeBoxLine
                          className="size-5 shrink-0 text-foreground-icon-secondary"
                          aria-hidden
                        />
                        <div className="flex min-w-0 flex-col gap-1">
                          <h3 className="text-body-medium text-text-primary">{skill.name}</h3>
                          <p className="text-body-2-regular text-text-secondary">
                            {skill.description}
                          </p>
                        </div>
                      </SettingsCard>
                    ))}
                  </div>
                </section>
                {!!detail.apps.length && (
                  <section className="flex flex-col gap-1">
                    <SettingsSectionLabel>Apps · {detail.apps.length}</SettingsSectionLabel>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {detail.apps.map((app) => (
                        <SettingsCard key={app} className="flex-row items-center gap-3 p-3">
                          <RiPlugLine
                            className="size-5 shrink-0 text-foreground-icon-secondary"
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <h3 className="text-body-medium text-text-primary">{app}</h3>
                            <p className="text-caption-1-regular text-text-secondary">Connector</p>
                          </div>
                        </SettingsCard>
                      ))}
                    </div>
                  </section>
                )}
                <section className="flex flex-col gap-1">
                  <SettingsSectionLabel>Details</SettingsSectionLabel>
                  <SettingsCard className="gap-4 p-4">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                      {[
                        ["Developer", detail.developer],
                        ["Category", detail.category],
                        [
                          "Includes",
                          `${detail.apps.length ? `${detail.apps.length} app${detail.apps.length === 1 ? "" : "s"}, ` : ""}${detail.skills.length} skill${detail.skills.length === 1 ? "" : "s"}`,
                        ],
                        ["Availability", "Public"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex min-w-0 flex-col gap-1">
                          <dt className="text-caption-1-regular text-text-secondary">{label}</dt>
                          <dd className="text-body-medium text-text-primary">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </SettingsCard>
                </section>
                {detail.kind === "plugin" && (
                  <p className="px-3 text-caption-1-regular text-text-tertiary">
                    Demo integration. Adding saves it to this browser; no external account is
                    connected.
                  </p>
                )}
              </div>
            </ScrollSurface>
          ) : (
            <div className="flex min-h-0 flex-1">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="flex shrink-0 flex-col gap-3 px-4 pb-4 sm:px-8">
                  <Input
                    ref={searchRef}
                    aria-label="Search marketplace"
                    placeholder="Find your next tool or teammate"
                    leadingIcon={RiSearchLine}
                    value={query}
                    onChange={setQuery}
                    fieldClassName="rounded-xl bg-background-secondary-default shadow-none"
                  />
                  <PillTabList
                    aria-label="Marketplace categories"
                    className="w-fit max-w-full flex-wrap"
                  >
                    {categories.map(({ id, label }) => (
                      <PillTab
                        key={id}
                        variant="gray"
                        isSelected={view === id}
                        onSelect={() => browse(id)}
                      >
                        {label}
                      </PillTab>
                    ))}
                  </PillTabList>
                </div>
                <ScrollSurface
                  key={`${view}-${query}`}
                  surface="full"
                  className="flex-1"
                  contentClassName="px-4 pb-6 sm:px-8"
                  label="Marketplace listings"
                >
                  <div className="flex flex-col gap-5 pt-1">
                    {query.trim() || view !== "discover" ? (
                      <Section
                        title={
                          query.trim()
                            ? `${results.length} result${results.length === 1 ? "" : "s"}`
                            : view === "installed"
                              ? "Added to your workspace"
                              : view === "plugin"
                                ? "Explore plugins"
                                : "Find your next teammate"
                        }
                      >
                        {results.length ? (
                          grid(results)
                        ) : (
                          <div className="flex flex-col items-center gap-2 py-16 text-center">
                            <RiStore2Line className="mb-2 size-8 text-foreground-icon-tertiary" />
                            <p className="text-body-medium text-text-primary">
                              {view === "installed" && !query
                                ? "A little room for something new"
                                : "No matches yet"}
                            </p>
                            <p className="text-body-regular text-text-secondary">
                              {view === "installed" && !query
                                ? "Explore plugins and bots to build your team."
                                : "Try another name, category, or keyword."}
                            </p>
                            <Button
                              variant="ghost"
                              size="small"
                              onClick={() => {
                                setQuery("");
                                setView("discover");
                              }}
                            >
                              Explore marketplace
                            </Button>
                          </div>
                        )}
                      </Section>
                    ) : (
                      <>
                        <Section title="Meet your next teammate" onViewAll={() => browse("bot")}>
                          {botStrip}
                        </Section>
                        <Section title="Tools for your workflow" onViewAll={() => browse("plugin")}>
                          {grid(MARKETPLACE_ITEMS.slice(0, 4))}
                        </Section>
                        <Section title="Everyday essentials">
                          {grid(MARKETPLACE_ITEMS.slice(4, 8))}
                        </Section>
                      </>
                    )}
                  </div>
                </ScrollSurface>
              </div>
            </div>
          )}
        </>
      }
    />,
  );
}
