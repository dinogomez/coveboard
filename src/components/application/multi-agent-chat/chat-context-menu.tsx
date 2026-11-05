"use client";

import {
  RiDeleteBinLine,
  RiFileCopyLine,
  RiGroupLine,
  RiEditLine,
  RiHashtag,
  RiPushpinLine,
} from "@remixicon/react";
import { useEffect, useRef } from "react";
import { Menu, MenuItem, Popover } from "react-aria-components";

import { AgentAvatar } from "#/components/application/agent-avatar/agent-avatar";
import { MENU_ITEM, MENU_POPOVER_SURFACE } from "#/components/base/dropdown/menu-styles";
import { useTemplateCopy } from "#/components/foundations/template-copy/template-copy";
import { cx } from "#/utils/cx";
import { useDismissOnOutsidePress } from "#/utils/use-dismiss-on-outside-press";

import type { Agent } from "./data";

export type ChatMenuTarget = { id: string; x: number; y: number; trigger: HTMLButtonElement };

/** A cursor-anchored version of the shared compact dropdown, with keyboard menu navigation. */
export function ChatContextMenu({
  target,
  agents,
  pinned,
  onClose,
  onPin,
  onRename,
  onEdit,
  onCopy,
  onCopyId,
  onRemove,
}: {
  target: ChatMenuTarget;
  agents: Agent[];
  pinned?: boolean;
  onClose: () => void;
  onPin: () => void;
  onRename: () => void;
  onCopyId: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onRemove: () => void;
}) {
  const localize = useTemplateCopy();
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  useDismissOnOutsidePress(true, onClose, [popoverRef]);
  useEffect(() => {
    const dismiss = (event: Event) => {
      if (!popoverRef.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener("resize", onClose);
    document.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("resize", onClose);
      document.removeEventListener("scroll", dismiss, true);
    };
  }, [onClose]);
  const rowClass = cx(
    MENU_ITEM,
    "px-2 py-1.5 text-body-medium data-[focused]:bg-dropdown-item-hover-background data-[hovered]:bg-dropdown-item-hover-background",
  );
  return localize(
    <>
      <div
        ref={anchorRef}
        aria-hidden
        className="pointer-events-none fixed size-px"
        style={{ left: target.x, top: target.y }}
      />
      <Popover
        isOpen
        isNonModal
        triggerRef={anchorRef}
        ref={popoverRef}
        placement="bottom start"
        offset={2}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
            target.trigger.focus();
          }
        }}
        className={cx(MENU_POPOVER_SURFACE, "z-[110] w-52 rounded-[14px] p-1")}
      >
        <Menu
          aria-label="Chat actions"
          autoFocus="first"
          className="flex flex-col gap-1 outline-none"
          onAction={(key) => {
            onClose();
            target.trigger.focus();
            if (key === "pin") onPin();
            if (key === "rename") onRename();
            if (key === "copy-id") onCopyId();
            if (key === "edit") onEdit();
            if (key === "copy") onCopy();
            if (key === "remove") onRemove();
          }}
        >
          <MenuItem id="pin" textValue={pinned ? "Unpin chat" : "Pin chat"} className={rowClass}>
            <RiPushpinLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
            {pinned ? "Unpin chat" : "Pin chat"}
          </MenuItem>
          <MenuItem id="rename" textValue="Rename chat" className={rowClass}>
            <RiEditLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
            Rename chat
          </MenuItem>
          <MenuItem
            id="edit"
            textValue={agents.length > 1 ? "Edit group" : "Edit bot"}
            className={rowClass}
          >
            {agents.length > 1 ? (
              <RiGroupLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
            ) : (
              <span className="size-5 shrink-0" aria-hidden>
                <AgentAvatar config={agents[0].avatar} size={20} />
              </span>
            )}
            {agents.length > 1 ? "Edit group" : "Edit bot"}
          </MenuItem>
          <MenuItem id="copy" textValue="Copy conversation" className={rowClass}>
            <RiFileCopyLine
              className="size-5 shrink-0 text-foreground-icon-secondary"
              aria-hidden
            />
            Copy conversation
          </MenuItem>
          <MenuItem id="copy-id" textValue="Copy conversation ID" className={rowClass}>
            <RiHashtag className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
            Copy conversation ID
          </MenuItem>
          <MenuItem
            id="remove"
            textValue="Remove chat"
            className={cx(rowClass, "text-text-destructive")}
          >
            <RiDeleteBinLine className="size-5 shrink-0" aria-hidden />
            Remove chat
          </MenuItem>
        </Menu>
      </Popover>
    </>,
  );
}
