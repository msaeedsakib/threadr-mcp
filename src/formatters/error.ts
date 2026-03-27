import { ErrorCode } from "../types/index.js";
import type { ToolResponse } from "../types/index.js";

export function formatError(
  code: ErrorCode,
  message: string,
  recoveryHint?: string
): ToolResponse {
  const lines = [
    "[Error]",
    `code: ${code}`,
    `message: ${message}`,
  ];

  if (recoveryHint) {
    lines.push(`recovery_hint: ${recoveryHint}`);
  }

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    isError: true,
  };
}
