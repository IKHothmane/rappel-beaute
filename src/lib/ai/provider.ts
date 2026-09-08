import type { AIProviderChatInput, AIProviderChatOutput } from "@/types/ai";

export interface AIProvider {
  readonly name: string;
  chat(input: AIProviderChatInput): Promise<AIProviderChatOutput>;
}

/**
 * Provider local déterministe — pas d'appel réseau.
 * Utilisé si aucune clé API, en tests, et comme fallback.
 * Ne invente jamais de chiffres : s'appuie uniquement sur toolContext.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async chat(input: AIProviderChatInput): Promise<AIProviderChatOutput> {
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
    const question = lastUser?.content?.trim() ?? "";
    const tools = input.toolContext?.trim();

    let content: string;
    if (tools) {
      content =
        `Voici ce que disent les données de votre institut :\n\n${tools}\n\n` +
        `Ces chiffres proviennent de PostgreSQL via les services métier (pas d'estimation inventée).`;
    } else if (/permission|accès|refus/i.test(question)) {
      content =
        "Je ne peux pas répondre sans les permissions nécessaires pour cet outil.";
    } else {
      content =
        "Je n'ai pas pu charger de données pour cette question. Reformulez ou vérifiez vos droits (CA, stock, etc.).";
    }

    const promptTokens = Math.ceil(
      (input.systemPrompt.length + input.messages.reduce((s, m) => s + m.content.length, 0)) / 4,
    );
    const completionTokens = Math.ceil(content.length / 4);

    return {
      content,
      promptTokens,
      completionTokens,
      provider: this.name,
    };
  }
}

/**
 * Provider compatible OpenAI Chat Completions (optionnel).
 * Variables : AI_API_KEY, AI_BASE_URL (défaut api.openai.com), AI_MODEL.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name = "openai-compatible";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(opts?: { apiKey?: string; baseUrl?: string; model?: string; timeoutMs?: number }) {
    this.apiKey = opts?.apiKey ?? process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
    this.baseUrl = (
      opts?.baseUrl ??
      process.env.AI_BASE_URL ??
      "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    this.model = opts?.model ?? process.env.AI_MODEL ?? "gpt-4o-mini";
    this.timeoutMs = opts?.timeoutMs ?? Number(process.env.AI_TIMEOUT_MS ?? 25_000);
  }

  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(input: AIProviderChatInput): Promise<AIProviderChatOutput> {
    if (!this.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const messages = [
        { role: "system" as const, content: input.systemPrompt },
        ...input.messages,
      ];
      if (input.toolContext) {
        messages.push({
          role: "system",
          content:
            "DONNÉES RÉELLES (source unique — ne invente aucun chiffre) :\n" +
            input.toolContext,
        });
      }

      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: input.temperature ?? 0.2,
          messages,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`AI_PROVIDER_ERROR:${res.status}:${body.slice(0, 200)}`);
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) throw new Error("AI_PROVIDER_EMPTY");

      return {
        content,
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
        provider: this.name,
      };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error("AI_PROVIDER_TIMEOUT");
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function getAIProvider(): AIProvider {
  const openAi = new OpenAICompatibleProvider();
  if (openAi.configured && process.env.AI_PROVIDER !== "mock") {
    return openAi;
  }
  return new MockAIProvider();
}
