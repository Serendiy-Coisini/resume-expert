import type { ZodType } from "zod";
import { getAIConfig, type AIConfig } from "@/lib/ai/config";
import { LLMError } from "@/lib/ai/errors";
import { parseJSONFromMessage } from "@/lib/ai/parse-json";

export { LLMError } from "@/lib/ai/errors";

interface ChatCompletionOptions {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  /** Optional Zod schema for runtime validation of the parsed JSON. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema?: ZodType<any>;
}

interface ChatMessage {
  content?: string | null;
  reasoning_content?: string | null;
}

export async function chatCompletionJSON<T>(
  options: ChatCompletionOptions,
  customConfig?: AIConfig
): Promise<T> {
  try {
    return await requestChatCompletionJSON<T>(options, customConfig);
  } catch (error) {
    if (error instanceof LLMError) throw error;
    throw new LLMError(error instanceof Error ? error.message : "大模型请求异常");
  }
}

async function requestChatCompletionJSON<T>(
  options: ChatCompletionOptions,
  customConfig?: AIConfig
): Promise<T> {
  const config = customConfig ?? getAIConfig();
  if (!config.apiKey) throw new LLMError("未配置 API Key");

  const data = await callChatCompletions(config, options);
  const choice = data.choices?.[0];
  const contents = extractMessageContents(choice?.message);

  try {
    return parseJSONFromMessage<T>(contents, options.schema);
  } catch (parseError) {
    const raw = contents.join("\n\n");
    if (!raw) throw new LLMError("大模型返回内容为空");

    const fixed = await callChatCompletions(config, {
      ...options,
      temperature: 0,
      system: "你是 JSON 修复器。将输入修复为合法 JSON，只输出 JSON，不要任何解释。",
      user: `修复以下 JSON：\n${raw.slice(0, 14000)}`,
    });

    const fixedContents = extractMessageContents(fixed.choices?.[0]?.message);
    try {
      return parseJSONFromMessage<T>(fixedContents, options.schema);
    } catch {
      if (choice?.finish_reason === "length") {
        throw new LLMError("大模型输出被截断，请缩短 JD/简历内容后重试");
      }
      throw parseError instanceof LLMError ? parseError : new LLMError("大模型返回的 JSON 无法解析");
    }
  }
}

async function callChatCompletions(
  config: ReturnType<typeof getAIConfig>,
  options: ChatCompletionOptions
) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    let userFriendlyMsg = "";
    if (
      response.status === 429 ||
      detail.includes("insufficient_quota") ||
      detail.includes("quota") ||
      detail.includes("Allocated quota exceeded")
    ) {
      userFriendlyMsg = "AI 大模型 API Key 额度已用尽 (HTTP 429 Insufficient Quota)。请前往右上方「AI 配置」更换有效 Key，或点击下方重置为 Mock 免费模式。";
    } else if (response.status === 401 || detail.includes("invalid_api_key")) {
      userFriendlyMsg = "AI 大模型 API Key 无效或未授权 (HTTP 401 Unauthorized)。请前往右上方「AI 配置」重新检查密钥。";
    } else {
      userFriendlyMsg = detail
        ? `大模型请求失败 (${response.status}): ${detail.slice(0, 200)}`
        : `大模型请求失败 (${response.status})`;
    }
    throw new LLMError(userFriendlyMsg, response.status);
  }

  return (await response.json()) as {
    choices?: Array<{
      finish_reason?: string;
      message?: ChatMessage;
    }>;
  };
}

function extractMessageContents(message?: ChatMessage): string[] {
  const results: string[] = [];
  const content = message?.content?.trim();
  if (content) results.push(content);

  const reasoning = message?.reasoning_content?.trim();
  if (reasoning) {
    const jsonMatch = reasoning.match(/\{[\s\S]*\}/);
    if (jsonMatch?.[0]) results.push(jsonMatch[0]);
  }

  return results;
}
