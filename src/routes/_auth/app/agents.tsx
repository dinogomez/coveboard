import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import {
  MultiAgentChat,
  type MultiAgentChatProps,
} from "#/components/application/multi-agent-chat/multi-agent-chat";
import { $respondAsAgent } from "#/lib/ai/functions.ts";
import { chatRuntimeQueryOptions } from "#/lib/ai/queries.ts";

export const Route = createFileRoute("/_auth/app/agents")({
  component: AgentsPage,
});

const respond: NonNullable<MultiAgentChatProps["onRespond"]> = async (agent, messages, signal) => {
  const { text } = await $respondAsAgent({
    data: {
      agent: {
        id: agent.id,
        name: agent.name,
        label: agent.label,
        description: agent.description,
      },
      messages: messages.map(({ role, agentId, text }) => ({ role, agentId, text })),
    },
    signal,
  });
  return text;
};

function AgentsPage() {
  const runtime = useQuery(chatRuntimeQueryOptions());

  // Without a configured model provider the template answers with its own
  // sample replies, so the screen stays usable on a fresh checkout.
  return <MultiAgentChat onRespond={runtime.data?.configured ? respond : undefined} />;
}
