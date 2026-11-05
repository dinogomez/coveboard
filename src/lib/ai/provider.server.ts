import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createGateway, type LanguageModel } from "ai";
import { ENV } from "varlock/env";

/**
 * Model provider for the chat routes, ported from BoardUI's `agent-runtime`
 * (its Next.js `app/api/chat/route.ts`). Bring your own key: `AI_API_KEY` is
 * read off its own prefix, `AI_PROVIDER` names providers whose keys have no
 * recognisable shape, and `AI_BASE_URL` + `CHAT_MODEL` reach any
 * OpenAI-compatible server (Ollama, LM Studio, vLLM). See `.env.schema`.
 *
 * The key is read server-side only; keep this module out of client code.
 */

type KnownProviderId =
  | "anthropic"
  | "openrouter"
  | "openai"
  | "google"
  | "gateway"
  | "groq"
  | "xai"
  | "mistral"
  | "deepseek";
/** "custom" is any OpenAI-compatible server named by AI_BASE_URL alone. */
type ProviderId = KnownProviderId | "custom";

interface ProviderSpec {
  label: string;
  /** Prefix the provider mints its keys with. Absent when AI_PROVIDER must say. */
  prefix?: string;
  defaultModel: string;
  /** Chat-completions endpoint for providers spoken to over the OpenAI wire format. */
  baseURL?: string;
}

// "sk-ant-" and "sk-or-" must be tried before the plain "sk-" OpenAI shape they extend.
const PROVIDERS: Record<KnownProviderId, ProviderSpec> = {
  anthropic: { label: "Anthropic", prefix: "sk-ant-", defaultModel: "claude-haiku-4-5" },
  openrouter: {
    label: "OpenRouter",
    prefix: "sk-or-",
    defaultModel: "openai/gpt-5-nano",
    baseURL: "https://openrouter.ai/api/v1",
  },
  openai: { label: "OpenAI", prefix: "sk-", defaultModel: "gpt-5.4-mini" },
  google: { label: "Google", prefix: "AIza", defaultModel: "gemini-2.5-flash" },
  gateway: { label: "Vercel AI Gateway", prefix: "vck_", defaultModel: "openai/gpt-5-nano" },
  groq: {
    label: "Groq",
    prefix: "gsk_",
    defaultModel: "llama-3.3-70b-versatile",
    baseURL: "https://api.groq.com/openai/v1",
  },
  xai: {
    label: "xAI",
    prefix: "xai-",
    defaultModel: "grok-4-fast-non-reasoning",
    baseURL: "https://api.x.ai/v1",
  },
  mistral: {
    label: "Mistral",
    defaultModel: "mistral-small-latest",
    baseURL: "https://api.mistral.ai/v1",
  },
  deepseek: {
    label: "DeepSeek",
    defaultModel: "deepseek-chat",
    baseURL: "https://api.deepseek.com/v1",
  },
};

const PROVIDER_IDS = Object.keys(PROVIDERS) as KnownProviderId[];

export interface Provider {
  id: ProviderId;
  /** Surfaced to the UI so it can show what is answering. */
  label: string;
  modelId: string;
  model: LanguageModel;
}

/** Either a usable provider or the one sentence explaining why there is none. */
export type ProviderResolution =
  | { provider: Provider; reason?: undefined }
  | { provider: null; reason: string };

/** Blank values count as unset; a deploy wizard's empty field should not read as a key. */
function trimmed(value: string | undefined) {
  const text = value?.trim();
  return text ? text : undefined;
}

function buildModel(
  id: ProviderId,
  apiKey: string,
  modelId: string,
  baseURL?: string,
): LanguageModel {
  switch (id) {
    case "openai":
      return createOpenAI({ apiKey, baseURL })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey, baseURL })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey, baseURL })(modelId);
    case "gateway":
      return createGateway({ apiKey, baseURL })(modelId);
    default:
      // Everyone else speaks OpenAI's chat-completions format. `.chat` is
      // deliberate: the bare provider call targets the Responses API, which
      // most compatible servers do not serve.
      return createOpenAI({
        apiKey,
        baseURL: baseURL ?? (id === "custom" ? undefined : PROVIDERS[id].baseURL),
      }).chat(modelId);
  }
}

export function resolveProvider(): ProviderResolution {
  const apiKey = trimmed(ENV.AI_API_KEY);
  const named = trimmed(ENV.AI_PROVIDER)?.toLowerCase();
  const baseURL = trimmed(ENV.AI_BASE_URL);
  const modelOverride = trimmed(ENV.CHAT_MODEL);

  const build = (id: ProviderId, key: string, defaultModel: string, label: string) => {
    const modelId = modelOverride ?? defaultModel;
    return { provider: { id, label, modelId, model: buildModel(id, key, modelId, baseURL) } };
  };

  // 1. Named outright: the only way to reach a provider whose keys carry no prefix.
  if (named) {
    if (named === "custom") {
      if (!baseURL) {
        return {
          provider: null,
          reason: "AI_PROVIDER=custom needs AI_BASE_URL to say where the server is.",
        };
      }
    } else if (!(named in PROVIDERS)) {
      return {
        provider: null,
        reason: `Unknown AI_PROVIDER "${named}". Use one of: ${PROVIDER_IDS.join(", ")}, custom.`,
      };
    } else {
      const id = named as KnownProviderId;
      if (!apiKey) {
        return { provider: null, reason: `AI_PROVIDER is ${named} but AI_API_KEY is not set.` };
      }
      return build(id, apiKey, PROVIDERS[id].defaultModel, PROVIDERS[id].label);
    }
  }

  // 2. The single key, read by its shape.
  if (apiKey && !named) {
    for (const id of PROVIDER_IDS) {
      const prefix = PROVIDERS[id].prefix;
      if (prefix && apiKey.startsWith(prefix)) {
        return build(id, apiKey, PROVIDERS[id].defaultModel, PROVIDERS[id].label);
      }
    }
  }

  // 3. Any OpenAI-compatible server by URL. Local ones take no key at all,
  //    so a placeholder keeps the SDK from demanding one.
  if (baseURL) {
    if (!modelOverride) {
      return {
        provider: null,
        reason: "AI_BASE_URL is set but CHAT_MODEL is not. Name the model the server should run.",
      };
    }
    return build("custom", apiKey ?? "none", modelOverride, "Custom endpoint");
  }

  if (apiKey) {
    return {
      provider: null,
      reason:
        "AI_API_KEY is set but its shape is not one this project recognises. Add AI_PROVIDER to name the provider.",
    };
  }
  return {
    provider: null,
    reason:
      "No model provider key found. Set AI_API_KEY to a key from OpenAI, Anthropic, Google, OpenRouter, Groq, xAI, or Vercel AI Gateway.",
  };
}
