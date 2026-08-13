export interface KeyValuePair {
  key: string;
  value: string;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
}

export interface UnifiedModel {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  apiKey: string;
  apiKeyId?: string;
  endpointPath: string;
  headers: KeyValuePair[];
  customBody: KeyValuePair[];
  jsonRawBody: string;
  bodyType: "json-params" | "json-raw";
  systemPrompt: string;
  responseTextPath: string;
  streamEnabled: boolean;
  streamTextPath: string;
  tokenUsageInputPath?: string;
  tokenUsageOutputPath?: string;
  createdTimestampPath?: string;
  maxTemperature?: number;
  maxTokensLimit?: number;
  sizeOptions?: string[];
  labels?: string[];
}

export interface ApiLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  response: any;
  rawResponse?: any;
  status: number | string;
  success: boolean;
  modelId?: string;
  latencyMs?: number;
}

export const DEFAULT_MODELS: UnifiedModel[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Default fast, efficient Google model for multi-turn chat and reasoning tasks",
    baseUrl: "https://generativetoolkit.googleapis.com/v1beta",
    apiKey: "",
    endpointPath: "",
    headers: [],
    customBody: [],
    jsonRawBody: "",
    bodyType: "json-params",
    systemPrompt: "You are a helpful, smart, and precise AI assistant.",
    responseTextPath: "candidates.0.content.parts.0.text",
    streamEnabled: false,
    streamTextPath: "candidates.0.content.parts.0.text",
    tokenUsageInputPath: "usageMetadata.promptTokenCount",
    tokenUsageOutputPath: "usageMetadata.candidatesTokenCount",
    labels: ["Text", "Fast", "Google"]
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Google Gemini 2.0 Flash Model",
    baseUrl: "https://generativetoolkit.googleapis.com/v1beta",
    apiKey: "",
    endpointPath: "",
    headers: [],
    customBody: [],
    jsonRawBody: "",
    bodyType: "json-params",
    systemPrompt: "You are a helpful assistant.",
    responseTextPath: "candidates.0.content.parts.0.text",
    streamEnabled: false,
    streamTextPath: "candidates.0.content.parts.0.text",
    labels: ["Text", "Google"]
  }
];
