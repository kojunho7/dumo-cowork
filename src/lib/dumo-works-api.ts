import { getValidToken } from "../stores/auth";
import { fetchServerModels, CoworkModel as TauriCoworkModel } from "./tauri-api";

const DUMO_WORKS_URL = "https://works.dumo.kr";

export interface CoworkModel extends TauriCoworkModel {}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Fetch available models from dumo-works server
 */
export async function fetchModels(): Promise<CoworkModel[]> {
  try {
    const token = await getValidToken();
    if (!token) {
      throw new Error("Not authenticated. Please log in.");
    }
    return await fetchServerModels(token);
  } catch (e: any) {
    if (e?.message?.includes("Not authenticated") || e?.message?.includes("Authentication expired")) {
      throw new Error("Authentication expired. Please log in again.");
    }
    throw new Error(e?.message || "Failed to fetch models");
  }
}

/**
 * Send a chat request through dumo-works server (streaming via Vercel AI SDK data stream)
 */
export async function sendCoworkChat(
  messages: ChatMessage[],
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    system?: string;
    onChunk?: (text: string) => void;
  } = {},
): Promise<string> {
  const token = await getValidToken();
  if (!token) {
    throw new Error("Not authenticated. Please log in.");
  }

  const response = await fetch(`${DUMO_WORKS_URL}/api/cowork/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages,
      model: options.model,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      system: options.system,
    }),
  });

  if (response.status === 401) {
    throw new Error("Authentication expired. Please log in again.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Server error: ${response.status}`);
  }

  // Parse the Vercel AI SDK data stream format
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;

      // Vercel AI SDK data stream format: "0:text\n" for text chunks
      // Format: <type_id>:<json_value>\n
      if (line.startsWith("0:")) {
        try {
          const text = JSON.parse(line.slice(2));
          if (typeof text === "string") {
            fullText += text;
            options.onChunk?.(fullText);
          }
        } catch {
          // Skip unparseable lines
        }
      }
      // Type 'e' or 'd' are finish/error signals
      else if (line.startsWith("e:") || line.startsWith("3:")) {
        try {
          const errorData = JSON.parse(line.slice(2));
          if (errorData && typeof errorData === "string") {
            throw new Error(errorData);
          }
        } catch {
          // Ignore parse errors on control messages
        }
      }
    }
  }

  return fullText;
}

/**
 * Simple non-streaming chat for test connections
 */
export async function testCoworkConnection(): Promise<string> {
  const token = await getValidToken();
  if (!token) {
    return "Not authenticated";
  }

  try {
    const result = await sendCoworkChat(
      [{ role: "user", content: "Hi, respond with just 'ok'" }],
      { maxTokens: 10 },
    );
    return result ? "success" : "Empty response";
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}
