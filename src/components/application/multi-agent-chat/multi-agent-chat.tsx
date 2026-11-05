"use client";

import {
  RiAddLine,
  RiCheckLine,
  RiCustomerService2Line,
  RiEditLine,
  RiFileCopyLine,
  RiGroupLine,
  RiMenuLine,
  RiMoreFill,
  RiPushpinLine,
  RiSearchLine,
  RiSettings3Line,
  RiShare2Line,
  RiStore2Line,
  RiThumbDownLine,
  RiThumbUpLine,
} from "@remixicon/react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type Ref,
} from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";

import { AgentAvatar } from "#/components/application/agent-avatar/agent-avatar";
import { FOLD_CONFIG } from "#/components/application/agent-avatar/model";
import { WORKING_SECONDS } from "#/components/application/agent-avatar/working";
import { StreamedText } from "#/components/application/agent-chat/agent-chat-message";
import { ComposerPanel } from "#/components/application/composer-panel/composer-panel";
import { DashboardTeamMenu } from "#/components/application/dashboard/dashboard-team-menu";
import { LiquidGlassChip, LIQUID_GLASS_RESET } from "#/components/application/landing/liquid-glass";
import { Button } from "#/components/base/buttons/button";
import { CloseButton } from "#/components/base/buttons/close-button";
import { IconButton } from "#/components/base/buttons/icon-button";
import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "#/components/base/dropdown/dropdown";
import { Input } from "#/components/base/input/input";
import { useDirection } from "#/components/foundations/direction/direction";
import { useTemplateCopy } from "#/components/foundations/template-copy/template-copy";
import { cx } from "#/utils/cx";

import { AgentEditor } from "./agent-editor";
import { ChatContextMenu, type ChatMenuTarget } from "./chat-context-menu";
import {
  conversationFor,
  updateConversationAgents,
  removeConversation,
  nextAgentIdentity,
  demoReply,
  formatDemoReply,
  INITIAL_WORKSPACE,
  restoreWorkspace,
  type Agent,
  type Conversation,
  type Message,
  type Workspace,
} from "./data";
import {
  FirstMessageHandoff,
  REPLY_ARRIVAL_MS,
  type FirstMessageHandoffState,
} from "./first-message-handoff";
import {
  captureGroupAvatars,
  GroupAvatarHandoff,
  type AvatarHandoff,
} from "./group-avatar-handoff";
import { Marketplace } from "./marketplace";
import { addMarketplaceBot, DEFAULT_PLUGINS, MARKETPLACE_ITEMS } from "./marketplace-data";
import { ReplyHeader } from "./reply-header";
import { ScrollSurface } from "./scroll-surface";
import { streamReply, waitForReply } from "./stream-reply";

const subscribeCompact = (listener: () => void) => {
  const m = window.matchMedia("(max-width: 1099px)");
  m.addEventListener("change", listener);
  return () => m.removeEventListener("change", listener);
};
const compactSnapshot = () => window.matchMedia("(max-width: 1099px)").matches;
const serverSnapshot = () => false;
const MotionModalOverlay = motion.create(ModalOverlay);
const MotionModal = motion.create(Modal);
const editorEase = [0.22, 1, 0.36, 1] as const;
const NEW_BOT_AVATAR = { ...FOLD_CONFIG, hue: 254, saturation: 66 };
const focusClass = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring";

type Editor = { draft: Agent; original: Agent | null };
export type MultiAgentChatProps = {
  /** Optional host integration. Without it, this template returns labeled sample replies. */
  onRespond?: (agent: Agent, messages: Message[], signal: AbortSignal) => Promise<string>;
  /** Starting content for embedded previews or a host-provided workspace. */
  initialWorkspace?: Workspace;
  /** Open an agent’s editor initially; null starts with the conversation alone. */
  defaultEditorId?: string | null;
  /** Pass null to disable browser persistence. */
  storageKey?: string | null;
};

function AgentStack({ agents, size = 40 }: { agents: Agent[]; size?: number }) {
  const localize = useTemplateCopy();
  if (agents.length === 1)
    return localize(<AgentAvatar config={agents[0].avatar} size={size} label={agents[0].name} />);
  return localize(
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-label={agents.map((a) => a.name).join(", ")}
    >
      {agents.slice(0, 3).map((a, i) => (
        <div
          key={a.id}
          className="absolute"
          style={{
            left: i === 1 ? size * 0.4 : i === 2 ? size * 0.2 : 0,
            top: i === 2 ? size * 0.4 : 0,
          }}
        >
          <AgentAvatar config={a.avatar} size={size * 0.65} label={a.name} />
        </div>
      ))}
    </div>,
  );
}

/** Keep the preview stable while each selected teammate joins the cluster. */
function SelectedAgentPreview({
  agents,
  showCaption = true,
  previewRef,
  hiddenAvatars = [],
}: {
  agents: Agent[];
  showCaption?: boolean;
  previewRef?: Ref<HTMLDivElement>;
  hiddenAvatars?: string[];
}) {
  const localize = useTemplateCopy();
  const reduced = useReducedMotion();
  const count = agents.length;
  const avatarSize = count === 1 ? 80 : count <= 3 ? 62 : 48;
  return localize(
    <div
      ref={previewRef}
      className={cx("flex shrink-0 flex-col items-center gap-2", showCaption && "pb-5")}
    >
      <div
        className="relative h-28 w-40"
        role="img"
        aria-label={
          count
            ? `Selected agents: ${agents.map((a) => a.name).join(", ")}`
            : "Choose your teammates"
        }
      >
        {!count && (
          <div className="flex h-full items-center justify-center">
            <RiGroupLine className="size-12 text-foreground-icon-tertiary" aria-hidden />
          </div>
        )}
        <AnimatePresence initial={false}>
          {agents.map((agent, index) => {
            const angle = (index * Math.PI * 2) / count - Math.PI / 2;
            const x =
              count === 1
                ? 40
                : count <= 3
                  ? index === 1
                    ? 76
                    : index === 2
                      ? 49
                      : 22
                  : 56 + Math.cos(angle) * 38;
            const y =
              count === 1
                ? 16
                : count <= 3
                  ? count === 3 && index === 2
                    ? 46
                    : 8
                  : 32 + Math.sin(angle) * 30;
            return (
              <motion.div
                key={agent.id}
                data-group-avatar={agent.id}
                className="absolute top-0 left-0"
                aria-hidden
                style={{ visibility: hiddenAvatars.includes(agent.id) ? "hidden" : undefined }}
                initial={{ opacity: 0, scale: 0.5, x, y: y + 16 }}
                animate={{ opacity: 1, scale: 1, x, y }}
                exit={{ opacity: 0, scale: 0.5, y: y + 12 }}
                transition={{ duration: reduced ? 0 : 0.3, ease: editorEase }}
              >
                <AgentAvatar config={agent.avatar} size={avatarSize} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {showCaption && (
        <p className="text-body-regular text-text-secondary">
          Choose who’s joining the conversation.
        </p>
      )}
    </div>,
  );
}

function DialogShell({
  title,
  children,
  preview,
  footer,
  wide,
  leaving = false,
  onExited,
  onClose,
}: {
  title: string;
  children: ReactNode;
  preview?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  leaving?: boolean;
  onExited?: () => void;
  onClose: () => void;
}) {
  const localize = useTemplateCopy();
  const direction = useDirection();
  return localize(
    <MotionModalOverlay
      dir={direction}
      isOpen
      isDismissable={!leaving}
      initial={false}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.24 }}
      onAnimationComplete={() => {
        if (leaving) onExited?.();
      }}
      onOpenChange={(open) => !open && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <Modal className={cx("w-full outline-none", wide ? "max-w-[520px]" : "max-w-[440px]")}>
        <Dialog
          aria-label={title}
          className="flex max-h-[85dvh] flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-lg outline-none"
        >
          <header className="mb-4 flex shrink-0 items-center justify-between">
            <Heading slot="title" className="text-headline-medium text-text-primary">
              {title}
            </Heading>
            <CloseButton aria-label={`Close ${title.toLowerCase()}`} size="sm" onClick={onClose} />
          </header>
          {preview}
          <ScrollSurface
            className="flex min-h-0 flex-auto flex-col"
            contentClassName="h-auto min-h-0 flex-auto p-1"
            surface="primary"
            label={`${title} content`}
          >
            {children}
          </ScrollSurface>
          {footer && <footer className="mt-4 shrink-0">{footer}</footer>}
        </Dialog>
      </Modal>
    </MotionModalOverlay>,
  );
}

/** Animate the full occupied width, including the gutter, so the chat never jumps. */
function EditorRail({ children }: { children: ReactNode }) {
  const localize = useTemplateCopy();
  const direction = useDirection();
  const present = useIsPresent();
  const reduced = useReducedMotion();
  const transition = { duration: reduced ? 0 : 0.36, ease: editorEase };
  return localize(
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: 356 }}
      exit={{ width: 0 }}
      transition={transition}
      aria-hidden={!present || undefined}
      inert={!present}
      className="min-h-0 shrink-0 overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, x: direction === "rtl" ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction === "rtl" ? -20 : 20 }}
        transition={transition}
        className="h-full w-[356px] ps-4"
      >
        {children}
      </motion.div>
    </motion.div>,
  );
}

export function MultiAgentChat({
  onRespond,
  storageKey = "boardui:multi-agent-chat:v1",
  initialWorkspace = INITIAL_WORKSPACE,
  defaultEditorId = "security",
}: MultiAgentChatProps) {
  const localize = useTemplateCopy();
  const direction = useDirection();
  const [workspace, update] = useReducer(
    (state: Workspace, action: Workspace | ((s: Workspace) => Workspace)) =>
      typeof action === "function" ? action(state) : action,
    initialWorkspace,
  );
  const [editor, setEditor] = useState<Editor | null>(() => {
    const agent = initialWorkspace.agents.find((a) => a.id === defaultEditorId);
    return agent ? { draft: agent, original: agent } : null;
  });
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const [dialog, setDialog] = useState<
    "newchat" | "library" | "marketplace" | "settings" | "support" | "renamechat" | null
  >(null);
  const [marketplaceItem, setMarketplaceItem] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [handoff, setHandoff] = useState<AvatarHandoff | null>(null);
  const [sendHandoff, setSendHandoff] = useState<FirstMessageHandoffState | null>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const replyAvatarRef = useRef<HTMLSpanElement>(null);
  const finishSendHandoff = useCallback(() => setSendHandoff(null), []);
  const arriveSendAvatar = useCallback(
    (id: string) =>
      setSendHandoff((current) => {
        if (!current || current.arrived.includes(id)) return current;
        const arrived = [...current.arrived, id];
        return arrived.length === current.avatars.length ? null : { ...current, arrived };
      }),
    [],
  );
  const [pickerLeaving, setPickerLeaving] = useState(false);
  const pickerPreviewRef = useRef<HTMLDivElement>(null);
  const chatPreviewRef = useRef<HTMLDivElement>(null);
  const finishHandoff = useCallback(() => setHandoff(null), []);
  const arriveAvatar = useCallback(
    (id: string) =>
      setHandoff((current) => {
        if (!current || current.arrived.includes(id)) return current;
        const arrived = [...current.arrived, id];
        return arrived.length === current.avatars.length ? null : { ...current, arrived };
      }),
    [],
  );
  const [renamingChat, setRenamingChat] = useState<{ id: string; name: string } | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [chatMenu, setChatMenu] = useState<ChatMenuTarget | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, number>>({});
  const [thinking, setThinking] = useState<Record<string, Message>>({});
  const [streaming, setStreaming] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const [notice, setNotice] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);
  const jobs = useRef(new Map<string, AbortController>());
  const reducedMotion = useReducedMotion();
  const compact = useSyncExternalStore(subscribeCompact, compactSnapshot, serverSnapshot);
  const chat: Conversation = workspace.chats.find((c) => c.id === workspace.activeId) ??
    workspace.chats[0] ?? {
      id: "draft-chat",
      title: "",
      agentIds: [workspace.agents[0].id],
      messages: [],
    };
  const contextChat = chatMenu && workspace.chats.find((c) => c.id === chatMenu.id);
  const participants = chat.agentIds.flatMap(
    (id) => workspace.agents.find((agent) => agent.id === id) ?? [],
  );

  useEffect(() => {
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        const restored = raw && restoreWorkspace(raw);
        if (restored) {
          update(restored);
          const agent = restored.agents.find((a) => a.id === defaultEditorId);
          setEditor(agent ? { draft: agent, original: agent } : null);
        }
      } catch {
        /* Storage may be unavailable in private embeds. */
      }
    }
    const item = new URL(window.location.href).searchParams.get("marketplace");
    if (item && MARKETPLACE_ITEMS.some((entry) => entry.id === item)) {
      setMarketplaceItem(item);
      setDialog("marketplace");
    }
    loaded.current = true;
    const activeJobs = jobs.current;
    return () => {
      for (const controller of activeJobs.values()) controller.abort();
      activeJobs.clear();
    };
  }, [storageKey, defaultEditorId]);
  useEffect(() => {
    if (loaded.current && storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(workspace));
      } catch {
        /* The current session still works without persistence. */
      }
    }
  }, [workspace, storageKey]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.id]);

  function edit(agent: Agent) {
    setEditor({ draft: structuredClone(agent), original: agent });
    setDialog(null);
    setMobileNav(false);
    setMore(false);
  }
  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    requestAnimationFrame(() => searchButtonRef.current?.focus());
  }
  function createAgent() {
    setSendHandoff(null);
    const agent: Agent = {
      id: crypto.randomUUID(),
      ...nextAgentIdentity(workspace.agents),
      label: "",
      description: "",
    };
    const created = conversationFor([agent], [agent.id], crypto.randomUUID());
    update((s) => ({
      ...s,
      agents: [...s.agents, agent],
      chats: [created, ...s.chats],
      activeId: created.id,
    }));
    setEditor({ draft: agent, original: agent });
    setMenu(false);
    setDialog(null);
    setMobileNav(false);
  }
  function closeEditor() {
    setEditor(null);
  }
  function changeAgent(draft: Agent) {
    setEditor({ draft, original: draft });
    const agent = { ...draft, name: draft.name.trim() || "New bot" };
    update((s) => {
      const previous = s.agents.find((a) => a.id === agent.id);
      return {
        ...s,
        agents: s.agents.map((a) => (a.id === agent.id ? agent : a)),
        chats: s.chats.map((c) =>
          c.agentIds.length === 1 &&
          c.agentIds[0] === agent.id &&
          (c.title === previous?.name || c.title === previous?.label)
            ? { ...c, title: agent.name }
            : c,
        ),
      };
    });
  }
  function openChatPicker(ids: string[] = [], chatId: string | null = null) {
    setSendHandoff(null);
    setHandoff(null);
    setPickerLeaving(false);
    setEditingChatId(chatId);
    setSelected(ids);
    setDialog("newchat");
    setMenu(false);
    setMore(false);
    setMobileNav(false);
  }
  function startChat(ids: string[]) {
    if (!ids.length) return;
    if (editingChatId) {
      jobs.current.get(editingChatId)?.abort();
      jobs.current.delete(editingChatId);
      clearGeneration(editingChatId);
      update((s) => ({
        ...updateConversationAgents(s, editingChatId, ids),
        activeId: editingChatId,
      }));
      setDialog(null);
      setEditingChatId(null);
      return;
    }
    if (pickerLeaving) return;
    const created = conversationFor(workspace.agents, ids, crypto.randomUUID());
    const avatars =
      dialog === "newchat" && ids.length > 1 && !reducedMotion
        ? captureGroupAvatars(pickerPreviewRef.current)
        : [];
    if (avatars.length) {
      setHandoff({ chatId: created.id, avatars, arrived: [] });
      setPickerLeaving(true);
    } else {
      setHandoff(null);
      setDialog(null);
    }
    update((s) => {
      const existing =
        ids.length === 1
          ? s.chats.find((c) => c.agentIds.length === 1 && c.agentIds[0] === ids[0])
          : undefined;
      if (existing) return { ...s, activeId: existing.id };
      return { ...s, chats: [created, ...s.chats], activeId: created.id };
    });
    setMobileNav(false);
  }
  function removeChat(id: string) {
    jobs.current.get(id)?.abort();
    jobs.current.delete(id);
    clearGeneration(id);
    update((s) => removeConversation(s, id));
    setDrafts((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
    setNotice("Chat removed");
  }
  async function copy(text: string, success: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(success);
    } catch {
      setNotice(
        "Copy isn’t available in this browser. You can select the message text to copy it.",
      );
    }
  }
  function clearGeneration(id: string) {
    setPending((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
    setThinking((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
    setStreaming((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
  }
  async function send(text: string) {
    if (!text.trim() || jobs.current.has(chat.id)) return;
    setHandoff(null);
    const departing =
      !chat.messages.length && participants.length > 1 && !reducedMotion
        ? captureGroupAvatars(chatPreviewRef.current)
        : [];
    setSendHandoff(
      departing.length
        ? { chatId: chat.id, responderId: participants[0].id, avatars: departing, arrived: [] }
        : null,
    );
    const id = chat.id,
      controller = new AbortController();
    jobs.current.set(id, controller);
    const message: Message = { id: crypto.randomUUID(), role: "user", text: text.trim() };
    const history = [...chat.messages, message];
    update((s) => ({
      ...s,
      activeId: id,
      chats: s.chats.some((c) => c.id === id)
        ? s.chats.map((c) => (c.id === id ? { ...c, messages: [...c.messages, message] } : c))
        : [
            { ...chat, title: participants.map((a) => a.name).join(" + "), messages: [message] },
            ...s.chats,
          ],
    }));
    setDrafts((s) => ({ ...s, [id]: "" }));
    setPending((s) => ({ ...s, [id]: Date.now() }));
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
    try {
      // Give each agent its own uninterrupted reply, in conversation order.
      for (const agent of participants) {
        if (controller.signal.aborted) break;
        const reply: Message = {
          id: crypto.randomUUID(),
          role: "agent",
          agentId: agent.id,
          text: "",
        };
        setThinking((s) => ({ ...s, [id]: reply }));
        try {
          // Two complete turns, plus a brief front-facing settle before revealing text.
          const [response] = await Promise.all([
            onRespond
              ? onRespond(agent, history, controller.signal)
              : Promise.resolve(
                  demoReply(agent, history.filter((m) => m.role === "user").length - 1),
                ),
            waitForReply(
              WORKING_SECONDS * 2000 +
                350 +
                (departing.length && agent.id === participants[0].id ? REPLY_ARRIVAL_MS : 0),
              controller.signal,
            ),
          ]);
          if (controller.signal.aborted) return;
          const el = scrollRef.current;
          const follow =
            el?.dataset.chatId === id && el.scrollHeight - el.scrollTop - el.clientHeight < 100;
          update((s) => ({
            ...s,
            chats: s.chats.map((c) =>
              c.id === id ? { ...c, messages: [...c.messages, reply] } : c,
            ),
          }));
          setThinking((s) => {
            const next = { ...s };
            delete next[id];
            return next;
          });
          if (follow)
            requestAnimationFrame(() => {
              if (el?.dataset.chatId === id) el.scrollTop = el.scrollHeight;
            });
          setStreaming((s) => ({ ...s, [id]: reply.id }));
          await waitForReply(180, controller.signal);
          await streamReply(response, controller.signal, (visible) => {
            const el = scrollRef.current;
            const follow =
              el?.dataset.chatId === id && el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            update((s) => ({
              ...s,
              chats: s.chats.map((c) =>
                c.id === id
                  ? {
                      ...c,
                      messages: c.messages.some((m) => m.id === reply.id)
                        ? c.messages.map((m) => (m.id === reply.id ? { ...m, text: visible } : m))
                        : [...c.messages, { ...reply, text: visible }],
                    }
                  : c,
              ),
            }));
            if (follow)
              requestAnimationFrame(() => {
                if (el?.dataset.chatId === id) el.scrollTop = el.scrollHeight;
              });
          });
        } catch {
          if (!controller.signal.aborted)
            setNotice(`${agent.name} couldn’t respond. Please try again.`);
        }
        if (!controller.signal.aborted) {
          setThinking((s) => {
            const next = { ...s };
            delete next[id];
            return next;
          });
          setStreaming((s) => {
            const next = { ...s };
            delete next[id];
            return next;
          });
        }
      }
    } finally {
      if (jobs.current.get(id) === controller) {
        jobs.current.delete(id);
        if (!controller.signal.aborted) clearGeneration(id);
      }
    }
  }

  const visibleChats = workspace.chats
    .filter((c) =>
      `${c.customTitle ?? c.title} ${workspace.agents
        .filter((a) => c.agentIds.includes(a.id))
        .map((a) => `${a.name} ${a.label}`)
        .join(" ")} ${c.messages.at(-1)?.text ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const sidebar = (
    <aside
      aria-label="Conversations"
      className="flex h-full min-h-0 w-[260px] shrink-0 flex-col rounded-3xl border border-border-button-white bg-background-secondary-default p-[7px] shadow-sidebar"
    >
      <div className="relative h-9 shrink-0">
        <div className="grid h-full grid-cols-3 gap-2">
          <div aria-hidden="true" />
          <div
            inert={searchOpen}
            aria-hidden={searchOpen}
            className={cx(
              "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
              searchOpen ? "pointer-events-none translate-x-2 scale-95 opacity-0" : "opacity-100",
            )}
          >
            <Button
              variant="secondary"
              iconOnly
              leadingIcon={RiStore2Line}
              aria-label="Marketplace"
              className="w-full min-w-0 rounded-full border-0 bg-background-tertiary-default text-foreground-icon-secondary shadow-none hover:bg-background-tertiary-hover active:bg-background-tertiary-hover"
              onClick={() => {
                setMarketplaceItem(null);
                setDialog("marketplace");
                setMobileNav(false);
              }}
            />
          </div>
          <div
            inert={searchOpen}
            aria-hidden={searchOpen}
            className={cx(
              "flex transition-[opacity,transform] duration-200 motion-reduce:transition-none",
              searchOpen ? "pointer-events-none translate-x-2 scale-95 opacity-0" : "opacity-100",
            )}
          >
            <Dropdown isOpen={menu} onOpenChange={setMenu}>
              <DropdownTrigger
                aria-label="Create bot or chat"
                className="bg-button-primary flex w-full min-w-0 items-center justify-center rounded-full text-text-white"
              >
                <RiAddLine className="size-5" />
              </DropdownTrigger>
              <DropdownPopover
                aria-label="Create"
                placement="bottom start"
                className="w-[323px] rounded-[20px] p-1.5"
              >
                <DropdownGroup>
                  <DropdownItem onSelect={createAgent} className="rounded-[14px] p-2">
                    <span className="size-8 shrink-0" aria-hidden>
                      <AgentAvatar config={NEW_BOT_AVATAR} size={32} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body-medium text-text-primary">Create a new bot</span>
                      <span className="text-body-2-medium text-text-tertiary">
                        Customize a new teammate.
                      </span>
                    </span>
                  </DropdownItem>
                  <DropdownItem onSelect={() => openChatPicker()} className="rounded-[14px] p-2">
                    <span className="size-8 shrink-0" aria-hidden>
                      <AgentStack agents={workspace.agents.slice(0, 3)} size={32} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body-medium text-text-primary">
                        Chat with your agents
                      </span>
                      <span className="text-body-2-medium text-text-tertiary">
                        Bring your agents into one chat.
                      </span>
                    </span>
                  </DropdownItem>
                </DropdownGroup>
              </DropdownPopover>
            </Dropdown>
          </div>
        </div>
        <div
          className="absolute inset-y-0 start-0 z-10 overflow-hidden rounded-full bg-background-tertiary-default transition-[width] duration-300 ease-in-out motion-reduce:transition-none"
          style={{ width: searchOpen ? "100%" : "calc((100% - 16px) / 3)" }}
        >
          <Button
            ref={searchButtonRef}
            variant="secondary"
            iconOnly
            leadingIcon={RiSearchLine}
            aria-label="Search conversations"
            aria-expanded={searchOpen}
            aria-hidden={searchOpen}
            tabIndex={searchOpen ? -1 : 0}
            className={cx(
              "absolute inset-0 w-full min-w-0 rounded-full border-0 bg-background-tertiary-default text-foreground-icon-secondary shadow-none transition-opacity duration-150 hover:bg-background-tertiary-hover active:bg-background-tertiary-hover motion-reduce:transition-none",
              searchOpen && "pointer-events-none opacity-0",
            )}
            onClick={() => {
              setSearchOpen(true);
              setMenu(false);
              requestAnimationFrame(() => searchInputRef.current?.focus());
            }}
          />
          <div
            inert={!searchOpen}
            aria-hidden={!searchOpen}
            className={cx(
              "relative transition-opacity duration-150 motion-reduce:transition-none",
              searchOpen ? "opacity-100 delay-100" : "pointer-events-none opacity-0",
            )}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeSearch();
              }
            }}
          >
            <Input
              ref={searchInputRef}
              aria-label="Search conversations"
              placeholder="Search conversations…"
              value={query}
              onChange={setQuery}
              leadingIcon={RiSearchLine}
              fieldClassName="h-9 rounded-full ps-3 pe-9 ring-0"
            />
            <CloseButton
              aria-label="Close search"
              size="xs"
              className="absolute end-2 top-2 hover:bg-background-tertiary-hover"
              onClick={closeSearch}
            />
          </div>
        </div>
      </div>
      <ScrollSurface
        className="mt-3 flex-1"
        contentClassName="flex flex-col gap-2"
        label="Chat list"
        fadeBottom
      >
        {visibleChats.map((c) => {
          const agents = workspace.agents.filter((a) => c.agentIds.includes(a.id));
          const last = c.messages.at(-1);
          return (
            <button
              key={c.id}
              type="button"
              aria-haspopup="menu"
              aria-expanded={chatMenu?.id === c.id}
              onContextMenu={(event) => {
                event.preventDefault();
                setMenu(false);
                setMore(false);
                setChatMenu({
                  id: c.id,
                  x: event.clientX,
                  y: event.clientY,
                  trigger: event.currentTarget,
                });
              }}
              onKeyDown={(event) => {
                if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                  event.preventDefault();
                  const rect = event.currentTarget.getBoundingClientRect();
                  setChatMenu({
                    id: c.id,
                    x: rect.left + 24,
                    y: rect.bottom,
                    trigger: event.currentTarget,
                  });
                }
              }}
              aria-current={chat.id === c.id ? "page" : undefined}
              onClick={() => {
                setSendHandoff(null);
                setHandoff(null);
                update((s) => ({ ...s, activeId: c.id }));
                setMobileNav(false);
              }}
              className={cx(
                "flex h-[54px] shrink-0 items-center gap-2.5 rounded-xl p-1.5 text-start",
                focusClass,
                chat.id === c.id
                  ? "bg-background-tertiary-default"
                  : "hover:bg-background-secondary-hover",
              )}
            >
              <AgentStack agents={agents} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-body-medium text-text-primary">
                  {c.customTitle || (agents.length === 1 ? agents[0].name : c.title)}
                </span>
                <span className="truncate text-body-regular text-text-tertiary">
                  {pending[c.id]
                    ? "Thinking together…"
                    : last
                      ? last.text.split(/\n\s*\n/)[0]
                      : "Start a conversation"}
                </span>
              </span>
              {c.pinned && (
                <RiPushpinLine
                  aria-label="Pinned chat"
                  className="me-1 size-3.5 shrink-0 text-foreground-icon-tertiary"
                />
              )}
            </button>
          );
        })}
        {!visibleChats.length && (
          <p className="px-2 py-6 text-body-regular text-text-secondary">No conversations found.</p>
        )}
      </ScrollSurface>
      <footer className="mt-3 flex shrink-0 flex-col gap-1">
        <Button
          variant="ghost"
          leadingIcon={RiCustomerService2Line}
          className="justify-start bg-transparent text-text-secondary hover:bg-background-secondary-hover active:bg-background-secondary-hover"
          onClick={() => setDialog("support")}
        >
          Support
        </Button>
        <Button
          variant="ghost"
          leadingIcon={RiSettings3Line}
          className="justify-start bg-transparent text-text-secondary hover:bg-background-secondary-hover active:bg-background-secondary-hover"
          onClick={() => {
            setMobileNav(false);
            setMarketplaceItem(null);
            setDialog("settings");
          }}
        >
          Settings
        </Button>
        <div className="mt-2">
          <DashboardTeamMenu showThemeToggle />
        </div>
      </footer>
    </aside>
  );

  const editorPanel = editor && (
    <AgentEditor
      key={editor.draft.id}
      agent={editor.draft}
      onChange={changeAgent}
      onClose={closeEditor}
    />
  );

  return localize(
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background-full p-3 text-text-primary">
      <div className="me-4 hidden min-h-0 shrink-0 md:block">{sidebar}</div>
      <main
        aria-label="Agent conversation"
        className="flex min-h-0 min-w-0 flex-1 flex-col rounded-3xl bg-background-secondary-default"
      >
        <header className="flex h-[55px] shrink-0 items-start gap-2 px-3 pt-3">
          <IconButton
            icon={RiMenuLine}
            aria-label="Open conversations"
            size="small"
            className="-ms-2 border-0 bg-transparent shadow-none md:hidden"
            onClick={() => setMobileNav(true)}
          />
          <div className="flex min-w-0 flex-1">
            <LiquidGlassChip
              radius="full"
              className="relative z-40 max-w-full min-w-0 rounded-full"
            >
              <button
                ref={badgeRef}
                type="button"
                onClick={() =>
                  participants.length === 1 ? edit(participants[0]) : openChatPicker(chat.agentIds)
                }
                className={cx(
                  "flex h-[31px] max-w-full min-w-0 items-center gap-2 rounded-full px-2 pe-3 text-body-2-medium text-text-secondary",
                  LIQUID_GLASS_RESET,
                  focusClass,
                )}
              >
                <AgentStack agents={participants} size={20} />
                <span className="truncate">
                  {participants.length === 1
                    ? participants[0].name
                    : participants
                        .slice(0, 3)
                        .map((agent) => agent.label || agent.name)
                        .join(" + ")}
                </span>
                {participants.length > 3 && (
                  <span className="shrink-0">+{participants.length - 3}</span>
                )}
              </button>
            </LiquidGlassChip>
          </div>
          <button
            type="button"
            aria-label="Copy conversation"
            title="Copy conversation"
            onClick={() =>
              copy(
                chat.messages
                  .map(
                    (m) =>
                      `${m.role === "user" ? "You" : workspace.agents.find((a) => a.id === m.agentId)?.name}: ${m.text}`,
                  )
                  .join("\n\n"),
                "Conversation copied",
              )
            }
            className={cx("rounded p-1 text-foreground-icon-secondary", focusClass)}
          >
            <RiShare2Line className="size-4" />
          </button>
          <Dropdown isOpen={more} onOpenChange={setMore}>
            <DropdownTrigger
              aria-label="Conversation options"
              className="rounded p-1 text-foreground-icon-secondary"
            >
              <RiMoreFill className="size-4" />
            </DropdownTrigger>
            <DropdownPopover
              aria-label="Conversation options"
              placement="bottom end"
              className="rounded-[14px] p-1"
            >
              <DropdownGroup label="In this conversation">
                {participants.map((a) => (
                  <DropdownItem
                    key={a.id}
                    onSelect={() => edit(a)}
                    className="px-2 py-1.5 text-body-medium"
                  >
                    <span className="size-5 shrink-0" aria-hidden>
                      <AgentAvatar config={a.avatar} size={20} />
                    </span>
                    <span className="truncate">Edit {a.name}</span>
                  </DropdownItem>
                ))}
                <DropdownItem
                  onSelect={() => openChatPicker(chat.agentIds)}
                  className="px-2 py-1.5 text-body-medium"
                >
                  <RiGroupLine className="size-4" />
                  Start a group chat
                </DropdownItem>
              </DropdownGroup>
            </DropdownPopover>
          </Dropdown>
        </header>
        <ScrollSurface
          className="flex-1"
          contentClassName={
            chat.messages.length ? "pb-4 pt-2" : "flex items-center justify-center p-4"
          }
          scrollRef={scrollRef}
          chatId={chat.id}
          label="Messages"
        >
          {chat.messages.length === 0 && (
            <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-8 text-center">
              <SelectedAgentPreview
                key={chat.id}
                agents={participants}
                showCaption={false}
                previewRef={chatPreviewRef}
                hiddenAvatars={
                  handoff?.chatId === chat.id
                    ? handoff.avatars
                        .filter((avatar) => !handoff.arrived.includes(avatar.id))
                        .map((avatar) => avatar.id)
                    : []
                }
              />
              <div className="flex flex-col items-center gap-1.5">
                <h1 className="text-title-3-semibold">
                  {participants.length > 1
                    ? "A few minds. One conversation."
                    : `Say hello to ${participants[0].name}`}
                </h1>
                <p className="max-w-[420px] text-body-regular text-text-secondary">
                  {participants.length > 1
                    ? `${participants.map((a) => a.name).join(", ")} are here. Send a message to get everyone’s perspective.`
                    : participants[0].description}
                </p>
              </div>
            </div>
          )}
          {chat.messages.length > 0 && (
            <div className="mt-3 mb-4 flex justify-center">
              <span className="rounded-full bg-background-tertiary-default px-[7px] py-1 text-body-2-medium text-text-secondary">
                Today
              </span>
            </div>
          )}
          {[...chat.messages, ...(thinking[chat.id] ? [thinking[chat.id]] : [])].map((message) => {
            const agent = workspace.agents.find((a) => a.id === message.agentId);
            return message.role === "user" ? (
              <div
                key={message.id}
                className="ms-auto me-3 mt-3 w-fit max-w-[min(520px,calc(100%-24px))] rounded-[var(--radius-2-5xl)] bg-background-primary-default p-3 text-start text-body-regular break-words whitespace-pre-wrap"
              >
                {message.text}
              </div>
            ) : (
              <article
                key={message.id}
                className="group/reply mx-3 mt-3 w-fit max-w-[min(520px,calc(100%-24px))] text-body-regular"
              >
                {message.text && (
                  <div className="rounded-[var(--radius-2-5xl)] bg-background-tertiary-default p-3">
                    <StreamedText text={formatDemoReply(message.text)} paragraphs />
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 px-3">
                  {agent && (
                    <ReplyHeader
                      agent={agent}
                      thinking={thinking[chat.id]?.id === message.id}
                      workingKey={pending[chat.id]}
                      avatarRef={thinking[chat.id]?.id === message.id ? replyAvatarRef : undefined}
                      arriving={
                        sendHandoff?.chatId === chat.id &&
                        sendHandoff.responderId === agent.id &&
                        !sendHandoff.arrived.includes(agent.id)
                      }
                      onEdit={() => edit(agent)}
                    />
                  )}
                  {thinking[chat.id]?.id !== message.id && streaming[chat.id] !== message.id && (
                    <div
                      className="mt-1 flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-focus-within/reply:opacity-100 group-hover/reply:opacity-100"
                      aria-label="Message actions"
                    >
                      {(["up", "down"] as const).map((direction) => {
                        const Icon = direction === "up" ? RiThumbUpLine : RiThumbDownLine;
                        return (
                          <button
                            key={direction}
                            type="button"
                            aria-label={
                              direction === "up" ? "Helpful response" : "Unhelpful response"
                            }
                            aria-pressed={feedback[message.id] === direction}
                            onClick={() => setFeedback((s) => ({ ...s, [message.id]: direction }))}
                            className={cx(
                              "flex size-[22px] items-center justify-center rounded-md bg-background-tertiary-default",
                              focusClass,
                              feedback[message.id] === direction
                                ? "text-accent-600"
                                : "text-foreground-icon-tertiary",
                            )}
                          >
                            <Icon className="size-3" />
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        aria-label="Copy response"
                        onClick={() => copy(formatDemoReply(message.text), "Response copied")}
                        className={cx(
                          "flex size-[22px] items-center justify-center rounded-md bg-background-tertiary-default text-foreground-icon-tertiary",
                          focusClass,
                        )}
                      >
                        <RiFileCopyLine className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </ScrollSurface>
        {/* Concentric corners: 24px container − 4px inset = 20px composer. */}
        <div className="shrink-0 p-1">
          <ComposerPanel
            cardClassName="rounded-[var(--radius-2-5xl)]"
            value={drafts[chat.id] ?? ""}
            onValueChange={(value) => setDrafts((s) => ({ ...s, [chat.id]: value }))}
            onSubmit={send}
            disabled={!!pending[chat.id]}
            placeholder="Hi, what do you need today?"
            status={null}
            defaultPermission="bypass"
            defaultModel="anthropic/fable-5"
          />
        </div>
      </main>
      <AnimatePresence initial={false}>
        {editor && !compact && <EditorRail key="agent-editor">{editorPanel}</EditorRail>}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {editor && compact && !dialog && !mobileNav && (
          <MotionModalOverlay
            dir={direction}
            key="agent-editor-drawer"
            isOpen
            isDismissable
            onOpenChange={(open) => !open && closeEditor()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.28, ease: editorEase }}
            className="fixed inset-0 z-40 flex justify-end bg-background-secondary-default/70 backdrop-blur-sm"
          >
            <MotionModal
              initial={{ x: direction === "rtl" ? -32 : 32 }}
              animate={{ x: 0 }}
              exit={{ x: direction === "rtl" ? -32 : 32 }}
              transition={{ duration: reducedMotion ? 0 : 0.28, ease: editorEase }}
              className="h-full w-[356px] max-w-full bg-background-full p-2 outline-none"
            >
              <Dialog aria-label="Edit agent" className="h-full outline-none">
                {editorPanel}
              </Dialog>
            </MotionModal>
          </MotionModalOverlay>
        )}
      </AnimatePresence>
      {mobileNav && (
        <ModalOverlay
          dir={direction}
          isOpen
          isDismissable
          onOpenChange={setMobileNav}
          className="fixed inset-0 z-40 flex bg-background-secondary-default/70 p-3 backdrop-blur-sm"
        >
          <Modal className="relative h-full outline-none">
            <Dialog aria-label="Conversations" className="h-full outline-none">
              {sidebar}
              <CloseButton
                aria-label="Close conversations"
                className="absolute -end-10 top-2"
                onClick={() => setMobileNav(false)}
              />
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
      <AnimatePresence>
        {(dialog === "marketplace" || dialog === "settings") && (
          <Marketplace
            key="marketplace"
            defaultPage={dialog === "settings" ? "general" : "marketplace"}
            agents={workspace.agents}
            installedPlugins={workspace.installedPlugins ?? DEFAULT_PLUGINS}
            initialItem={marketplaceItem}
            onClose={() => setDialog(null)}
            onCopy={copy}
            onChat={(id) => startChat([id])}
            onAddBot={(item) => update((s) => addMarketplaceBot(s, item))}
            onTogglePlugin={(id) =>
              update((s) => {
                const installed = s.installedPlugins ?? DEFAULT_PLUGINS;
                return {
                  ...s,
                  installedPlugins: installed.includes(id)
                    ? installed.filter((value) => value !== id)
                    : [...installed, id],
                };
              })
            }
          />
        )}
      </AnimatePresence>
      {sendHandoff?.chatId === chat.id && (
        <FirstMessageHandoff
          handoff={sendHandoff}
          badgeRef={badgeRef}
          replyRef={replyAvatarRef}
          onArrive={arriveSendAvatar}
          onFinish={finishSendHandoff}
        />
      )}
      {handoff && (
        <GroupAvatarHandoff
          handoff={handoff}
          targetRef={chatPreviewRef}
          onArrive={arriveAvatar}
          onFinish={finishHandoff}
        />
      )}
      {chatMenu && contextChat && (
        <ChatContextMenu
          target={chatMenu}
          agents={contextChat.agentIds.flatMap(
            (id) => workspace.agents.find((agent) => agent.id === id) ?? [],
          )}
          onClose={() => setChatMenu(null)}
          pinned={contextChat.pinned}
          onPin={() =>
            update((s) => ({
              ...s,
              chats: s.chats.map((c) =>
                c.id === contextChat.id ? { ...c, pinned: !c.pinned } : c,
              ),
            }))
          }
          onRename={() => {
            setRenamingChat({
              id: contextChat.id,
              name:
                contextChat.customTitle ||
                (contextChat.agentIds.length === 1
                  ? workspace.agents.find((a) => a.id === contextChat.agentIds[0])!.name
                  : contextChat.title),
            });
            setDialog("renamechat");
            setMobileNav(false);
          }}
          onCopyId={() => copy(contextChat.id, "Conversation ID copied")}
          onEdit={() =>
            contextChat.agentIds.length > 1
              ? openChatPicker(contextChat.agentIds, contextChat.id)
              : edit(workspace.agents.find((agent) => agent.id === contextChat.agentIds[0])!)
          }
          onCopy={() =>
            copy(
              contextChat.messages
                .map(
                  (message) =>
                    `${message.role === "user" ? "You" : workspace.agents.find((agent) => agent.id === message.agentId)?.name}: ${message.text}`,
                )
                .join("\n\n"),
              "Conversation copied",
            )
          }
          onRemove={() => removeChat(contextChat.id)}
        />
      )}
      {dialog === "renamechat" && renamingChat && (
        <DialogShell
          title="Rename chat"
          onClose={() => {
            setDialog(null);
            setRenamingChat(null);
          }}
          footer={
            <Button
              type="submit"
              form="rename-chat-form"
              className="w-full rounded-full"
              disabled={!renamingChat.name.trim()}
            >
              Save name
            </Button>
          }
        >
          <form
            id="rename-chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              const name = renamingChat.name.trim();
              if (!name) return;
              update((s) => ({
                ...s,
                chats: s.chats.map((c) =>
                  c.id === renamingChat.id ? { ...c, customTitle: name } : c,
                ),
              }));
              setDialog(null);
              setRenamingChat(null);
            }}
          >
            <Input
              label="Chat name"
              autoFocus
              maxLength={100}
              value={renamingChat.name}
              onChange={(name) => setRenamingChat({ ...renamingChat, name })}
            />
          </form>
        </DialogShell>
      )}
      {dialog === "newchat" && (
        <DialogShell
          wide
          leaving={pickerLeaving}
          onExited={() => {
            setDialog(null);
            setPickerLeaving(false);
          }}
          title={editingChatId ? "Edit group" : "Chat with your agents"}
          onClose={() => setDialog(null)}
          preview={
            <SelectedAgentPreview
              agents={selected.flatMap((id) => workspace.agents.find((a) => a.id === id) ?? [])}
              previewRef={pickerPreviewRef}
              hiddenAvatars={pickerLeaving ? selected : []}
            />
          }
          footer={
            <Button
              className="w-full rounded-full"
              disabled={pickerLeaving || !selected.length}
              onClick={() => startChat(selected)}
            >
              {editingChatId ? "Save changes" : "Start chat"}
              {selected.length
                ? ` · ${selected.length} agent${selected.length === 1 ? "" : "s"}`
                : ""}
            </Button>
          }
        >
          <div
            className="flex flex-wrap justify-center gap-2"
            role="group"
            aria-label="Choose agents"
          >
            {workspace.agents.map((a) => {
              const picked = selected.includes(a.id);
              return (
                <Button
                  key={a.id}
                  variant="secondary"
                  aria-label={a.name}
                  aria-pressed={picked}
                  onClick={() =>
                    setSelected((ids) =>
                      picked ? ids.filter((id) => id !== a.id) : [...ids, a.id],
                    )
                  }
                  className={cx(
                    "h-10 max-w-full rounded-full border px-2 shadow-none transition-colors hover:bg-background-tertiary-default active:bg-background-tertiary-hover",
                    picked
                      ? "border-foreground-icon-secondary bg-background-tertiary-default text-text-primary dark:bg-background-tertiary-hover dark:hover:bg-background-tertiary-hover dark:active:bg-background-tertiary-hover"
                      : "border-transparent bg-background-secondary-default text-text-secondary",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-6 shrink-0" aria-hidden>
                      <AgentAvatar config={a.avatar} size={24} />
                    </span>
                    <span className="truncate">{a.name}</span>
                  </span>
                </Button>
              );
            })}
          </div>
        </DialogShell>
      )}

      {dialog === "library" && (
        <DialogShell
          title="Your agents"
          onClose={() => setDialog(null)}
          footer={
            <Button leadingIcon={RiAddLine} onClick={createAgent} className="w-full">
              Create a new bot
            </Button>
          }
        >
          <div className="flex flex-col gap-2">
            {workspace.agents.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-xl bg-background-secondary-default p-2"
              >
                <AgentAvatar config={a.avatar} size={40} label={a.name} />
                <button
                  type="button"
                  onClick={() => startChat([a.id])}
                  className={cx("min-w-0 flex-1 rounded text-start", focusClass)}
                >
                  <span className="block truncate text-body-medium">{a.name}</span>
                  <span className="text-caption-1-regular text-text-secondary">{a.label}</span>
                </button>
                <IconButton
                  icon={RiEditLine}
                  aria-label={`Edit ${a.name}`}
                  size="small"
                  className="border-0 bg-transparent shadow-none"
                  onClick={() => edit(a)}
                />
              </div>
            ))}
          </div>
        </DialogShell>
      )}

      {dialog === "support" && (
        <DialogShell title="A little help" onClose={() => setDialog(null)}>
          <div className="space-y-4 text-body-regular text-text-secondary">
            <p>
              Use <strong className="text-text-primary">+</strong> to create a bot or start a
              conversation with several agents.
            </p>
            <p>
              Open the <strong className="text-text-primary">Marketplace</strong> to explore plugins
              and bots. Use a conversation’s menu to edit its bot’s appearance and details. Choose
              an expression from the emotion wheel. Scroll or drag the shape arc, or use its arrow
              keys, to explore the shapes.
            </p>
            <p>
              Send with Enter. Use Shift + Enter for a new line. Your changes stay in this browser.
            </p>
          </div>
        </DialogShell>
      )}

      <div
        role="status"
        aria-live="polite"
        className={cx(
          "pointer-events-none fixed bottom-5 left-1/2 z-[110] max-w-[calc(100%-32px)] -translate-x-1/2 rounded-xl border border-border-button-default bg-background-primary-default px-4 py-3 text-body-regular shadow-lg transition-opacity",
          notice ? "opacity-100" : "opacity-0",
        )}
      >
        {notice && (
          <span className="flex items-center gap-2">
            <RiCheckLine className="size-4 shrink-0 text-foreground-icon-secondary" />
            {notice}
          </span>
        )}
      </div>
    </div>,
  );
}
