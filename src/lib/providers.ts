export const KEY_CAP = 100;

export type ProviderId =
  | "xai"
  | "openai"
  | "groq"
  | "openrouter"
  | "together"
  | "fireworks"
  | "google"
  | "mistral"
  | "deepseek"
  | "huggingface"
  | "cerebras"
  | "sambanova"
  | "custom";

export type ProviderMeta = {
  id: ProviderId;
  label: string;
  hint: string;
  base: string;
  chatModel: string;
  imageModel?: string;
};

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "xai",
    label: "xAI / Grok",
    hint: "Chat + Imagine. Platform key is used as a fallback.",
    base: "https://api.x.ai/v1",
    chatModel: "grok-4.5",
    imageModel: "grok-imagine-image",
  },
  {
    id: "openai",
    label: "OpenAI",
    hint: "GPT + image models.",
    base: "https://api.openai.com/v1",
    chatModel: "gpt-4.1-mini",
    imageModel: "gpt-image-1",
  },
  {
    id: "groq",
    label: "Groq",
    hint: "Fast free-tier Llama / Mixtral chat.",
    base: "https://api.groq.com/openai/v1",
    chatModel: "llama-3.3-70b-versatile",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    hint: "One key, many models. Best way to power 500 tools.",
    base: "https://openrouter.ai/api/v1",
    chatModel: "openrouter/auto",
  },
  {
    id: "together",
    label: "Together AI",
    hint: "Open models, including image-capable Flux endpoints.",
    base: "https://api.together.xyz/v1",
    chatModel: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
  },
  {
    id: "fireworks",
    label: "Fireworks",
    hint: "Open-model inference.",
    base: "https://api.fireworks.ai/inference/v1",
    chatModel: "accounts/fireworks/models/llama-v3p1-70b-instruct",
  },
  {
    id: "google",
    label: "Google Gemini",
    hint: "Gemini via the OpenAI-compatible endpoint.",
    base: "https://generativelanguage.googleapis.com/v1beta/openai",
    chatModel: "gemini-2.0-flash",
  },
  {
    id: "mistral",
    label: "Mistral",
    hint: "Mistral Small / Large chat.",
    base: "https://api.mistral.ai/v1",
    chatModel: "mistral-small-latest",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    hint: "DeepSeek chat models.",
    base: "https://api.deepseek.com/v1",
    chatModel: "deepseek-chat",
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    hint: "Router for open models. Generous free credits.",
    base: "https://router.huggingface.co/v1",
    chatModel: "meta-llama/Llama-3.3-70B-Instruct",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    hint: "Very fast Llama free tier.",
    base: "https://api.cerebras.ai/v1",
    chatModel: "llama-3.3-70b",
  },
  {
    id: "sambanova",
    label: "SambaNova",
    hint: "Llama free-tier inference.",
    base: "https://api.sambanova.ai/v1",
    chatModel: "Meta-Llama-3.3-70B-Instruct",
  },
  {
    id: "custom",
    label: "Custom OpenAI-compatible",
    hint: "Any /v1 chat-completions host. Paste the base URL.",
    base: "",
    chatModel: "",
  },
];

export function providerMeta(id: string): ProviderMeta {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[PROVIDERS.length - 1]!;
}

export function resolveEndpoint(provider: string, baseUrl?: string | null) {
  const meta = providerMeta(provider);
  const base = (baseUrl || meta.base).replace(/\/$/, "");
  return {
    base,
    chat: `${base}/chat/completions`,
    images: `${base}/images/generations`,
    videos: `${base}/videos/generations`,
    chatModel: meta.chatModel,
    imageModel: meta.imageModel,
  };
}
