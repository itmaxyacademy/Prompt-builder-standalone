/**
 * Safe JSON sanitizer and placeholder resolver
 */

export function cleanJsonString(str: string): string {
  // Remove single line comments
  let cleaned = str.replace(/\/\/.*/g, "");
  // Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[\]}])/g, "$1");
  return cleaned.trim();
}

interface ResolveContext {
  modelId: string;
  systemPrompt: string;
  messages: any[];
  apiKey: string;
  deepThinking: boolean;
  temperature: number;
  maxTokens: number;
  size: string;
  customParams?: Record<string, any>;
}

// String substitution for arrays (handles both with and without quotes)
const replaceArrayPlaceholder = (str: string, placeholder: string, arr: any[]) => {
  const arrStr = JSON.stringify(arr);
  const escapedPlaceholder = placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = new RegExp(`"?${escapedPlaceholder}"?`, 'g');
  return str.replace(pattern, arrStr);
};

// String substitution for primitives (numbers & booleans)
const replacePrimitivePlaceholder = (str: string, placeholder: string, val: any) => {
  const escapedPlaceholder = placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = new RegExp(`"?${escapedPlaceholder}"?`, 'g');
  return str.replace(pattern, JSON.stringify(val));
};

// String substitution for strings
const replaceStringPlaceholder = (str: string, placeholder: string, val: string) => {
  const escapedPlaceholder = placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = new RegExp(escapedPlaceholder, 'g');
  return str.replace(pattern, val);
};

export function resolveJsonRawBody(
  rawBodyStr: string,
  context: ResolveContext
): any {
  let text = rawBodyStr;

  text = cleanJsonString(text);

  // Pre-process messages formatting
  const messagesGemini = context.messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const messagesAnthropic = context.messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

  // Ensure system prompt is injected into OpenAI-style messages array if it exists
  const hasSystem = context.messages.some((m: any) => m.role === "system");
  const messagesStandard = hasSystem
    ? context.messages.map((m: any) => ({ role: m.role, content: m.content }))
    : context.systemPrompt
    ? [{ role: "system", content: context.systemPrompt }, ...context.messages.filter((m: any) => m.role !== "system").map((m: any) => ({ role: m.role, content: m.content }))]
    : context.messages.filter((m: any) => m.role !== "system").map((m: any) => ({ role: m.role, content: m.content }));

  const messagesNoSystem = context.messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => ({ role: m.role, content: m.content }));

  text = replaceArrayPlaceholder(text, "{{messages}}", messagesStandard);
  text = replaceArrayPlaceholder(text, "{{messages_gemini}}", messagesGemini);
  text = replaceArrayPlaceholder(text, "{{messages_anthropic}}", messagesAnthropic);
  text = replaceArrayPlaceholder(text, "{{messages_no_system}}", messagesNoSystem);

  text = replacePrimitivePlaceholder(text, "{{temperature}}", context.temperature);
  text = replacePrimitivePlaceholder(text, "{{maxTokens}}", context.maxTokens);
  text = replacePrimitivePlaceholder(text, "{{deepThinking}}", context.deepThinking);
  text = replacePrimitivePlaceholder(text, "{{size}}", context.size);

  if (context.customParams) {
    Object.entries(context.customParams).forEach(([key, val]) => {
      if (key === "temperature" || key === "maxTokens" || key === "deepThinking" || key === "size") {
        return;
      }
      if (Array.isArray(val)) {
        text = replaceArrayPlaceholder(text, `{{${key}}}`, val);
      } else if (typeof val === "boolean" || typeof val === "number") {
        text = replacePrimitivePlaceholder(text, `{{${key}}}`, val);
      } else {
        const strVal = String(val);
        const escapedVal = strVal.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        text = replaceStringPlaceholder(text, `{{${key}}}`, escapedVal);
      }
    });
  }

  text = replaceStringPlaceholder(text, "{{modelId}}", context.modelId);
  const escapedPrompt = context.systemPrompt
    ? context.systemPrompt.replace(/\\/g, '\\\\').replace(/"/g, '\\\"').replace(/\n/g, '\\n')
    : "";
  text = replaceStringPlaceholder(text, "{{systemPrompt}}", escapedPrompt);

  const lastUserMsg = context.messages
    ? [...context.messages].reverse().find((m) => m.role === "user")
    : null;
  const lastUserText = lastUserMsg ? lastUserMsg.content : "";
  const escapedMessagePrompt = lastUserText
    ? lastUserText.replace(/\\/g, '\\\\').replace(/"/g, '\\\"').replace(/\n/g, '\\n')
    : "";
  text = replaceStringPlaceholder(text, "{{message_prompt}}", escapedMessagePrompt);

  const escapedApiKey = context.apiKey
    ? context.apiKey.replace(/\\/g, '\\\\').replace(/"/g, '\\\"').replace(/\n/g, '\\n')
    : "";
  text = replaceStringPlaceholder(text, "{{apiKey}}", escapedApiKey);

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("[Safe JSON Parser Error on resolved body]", err);
    try {
      return JSON.parse(cleanJsonString(rawBodyStr));
    } catch {
      return {
        model: context.modelId,
        messages: messagesStandard,
      };
    }
  }
}
