import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  smoothStream,
  streamText,
  toUIMessageStream,
} from "ai";

import { resolveProvider } from "#/lib/ai/provider.server.ts";

/**
 * The streaming chat endpoint BoardUI's agent screens install against
 * (`agent-runtime` contract 1): GET probes the configuration, POST takes
 * `{ messages }` as AI SDK UI messages and streams a UI-message response.
 *
 * COST: requests bill to whoever owns the key. Put a rate limit in front of
 * this route before exposing a deployment with a live key to the public.
 */

/** Bumped when the contract changes in a way templates can depend on. */
const RUNTIME_CONTRACT = 1;

const INSTRUCTIONS = [
  "You are the assistant inside this app's chat screen.",
  "Answer in plain language, a short paragraph or a few sentences. Use markdown only when it genuinely helps.",
].join("\n");

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      GET: () => {
        const { provider, reason } = resolveProvider();
        return Response.json({
          configured: provider !== null,
          provider: provider?.id ?? null,
          providerLabel: provider?.label ?? null,
          model: provider?.modelId ?? null,
          reason: reason ?? null,
          contract: RUNTIME_CONTRACT,
        });
      },
      POST: async ({ request }) => {
        const { provider, reason } = resolveProvider();
        if (!provider) {
          return Response.json({ error: "missing_api_key", message: reason }, { status: 503 });
        }

        const badBody = Response.json(
          { error: "invalid_body", message: "Expected JSON with a messages array." },
          { status: 400 },
        );

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badBody;
        }

        const submitted =
          typeof body === "object" && body !== null && "messages" in body
            ? body.messages
            : undefined;
        if (!Array.isArray(submitted)) return badBody;

        // Validate before converting: `convertToModelMessages` throws outside
        // any stream on malformed input, which would escape as a bare 500.
        const validated = await safeValidateUIMessages({ messages: submitted });
        if (!validated.success) {
          return Response.json(
            { error: "invalid_messages", message: validated.error.message },
            { status: 400 },
          );
        }

        const result = streamText({
          model: provider.model,
          instructions: INSTRUCTIONS,
          messages: await convertToModelMessages(validated.data),
          // Release whole words on a steady tick so streamed text reads as a flow.
          experimental_transform: smoothStream({ delayInMs: 18, chunking: "word" }),
          // Stop generating (and billing) when the reader presses Stop.
          abortSignal: request.signal,
        });

        return createUIMessageStreamResponse({
          stream: toUIMessageStream({ stream: result.stream }),
        });
      },
    },
  },
});
