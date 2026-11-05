import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { generateText, type ModelMessage } from "ai";
import { z } from "zod";

import { resolveProvider } from "#/lib/ai/provider.server.ts";
import { authMiddleware } from "#/lib/auth/middleware.ts";

/** Whether a model provider is configured; drives the chat screens' live vs. sample replies. */
export const $getChatRuntime = createServerFn({ method: "GET" }).handler(() => {
  const { provider, reason } = resolveProvider();
  return {
    configured: provider !== null,
    providerLabel: provider?.label ?? null,
    model: provider?.modelId ?? null,
    reason: reason ?? null,
  };
});

const respondInput = z.object({
  agent: z.object({
    id: z.string(),
    name: z.string().max(200),
    label: z.string().max(200),
    description: z.string().max(2000),
  }),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "agent"]),
        agentId: z.string().optional(),
        text: z.string().max(20_000),
      }),
    )
    .max(200),
});

export type RespondInput = z.infer<typeof respondInput>;

/**
 * One agent's reply in a multi-agent conversation. The agent's own earlier
 * turns become assistant messages; everything else (the user and the other
 * agents) is presented as user turns, attributed by name.
 */
export const $respondAsAgent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(respondInput)
  .handler(async ({ data }) => {
    const { provider, reason } = resolveProvider();
    if (!provider) throw new Error(reason);

    const { agent } = data;
    const messages: ModelMessage[] = data.messages.map((message) =>
      message.role === "agent" && message.agentId === agent.id
        ? { role: "assistant", content: message.text }
        : {
            role: "user",
            content: message.role === "agent" ? `[Another agent]: ${message.text}` : message.text,
          },
    );

    const { text } = await generateText({
      model: provider.model,
      instructions: [
        `You are ${agent.name}, the ${agent.label} agent in a shared workspace chat.`,
        agent.description,
        "Other agents may reply in the same conversation; only answer for yourself. Keep replies short and conversational.",
      ].join("\n"),
      messages,
      // Stop generating (and billing) when the client aborts the call.
      abortSignal: getRequest().signal,
    });

    return { text };
  });
