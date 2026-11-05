import { createFileRoute } from "@tanstack/react-router";

import { AiChatShell } from "#/components/application/ai-chat/ai-chat-shell";

export const Route = createFileRoute("/_auth/app/")({
  component: AiChatShell,
});
