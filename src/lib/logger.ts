/**
 * Environment-aware logger.
 * - Dev (NEXT_PUBLIC_APP_URL contains "dev." or NODE_ENV=development): verbose logging
 * - Prod: errors only
 */

const isDev =
  process.env.NODE_ENV === "development" ||
  (process.env.NEXT_PUBLIC_APP_URL ?? "").includes("dev.");

function timestamp(): string {
  return new Date().toISOString();
}

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 0) : String(a)))
    .join(" ");
}

export const log = {
  /** Always logged (dev + prod) */
  error(context: string, ...args: unknown[]) {
    console.error(`[${timestamp()}] ERROR [${context}]`, ...args);
  },

  /** Always logged (dev + prod) */
  warn(context: string, ...args: unknown[]) {
    console.warn(`[${timestamp()}] WARN  [${context}]`, ...args);
  },

  /** Logged on dev only */
  info(context: string, ...args: unknown[]) {
    if (isDev) {
      console.log(`[${timestamp()}] INFO  [${context}]`, ...args);
    }
  },

  /** Logged on dev only — for detailed request/response tracing */
  debug(context: string, ...args: unknown[]) {
    if (isDev) {
      console.log(`[${timestamp()}] DEBUG [${context}]`, ...args);
    }
  },

  /** Log API request (dev: full detail, prod: errors only via other methods) */
  request(method: string, path: string, extra?: Record<string, unknown>) {
    if (isDev) {
      const parts = [`${method} ${path}`];
      if (extra) parts.push(formatArgs([extra]));
      console.log(`[${timestamp()}] REQ   [api]`, parts.join(" "));
    }
  },

  /** Log API response (dev only) */
  response(method: string, path: string, status: number, durationMs?: number) {
    if (isDev) {
      const dur = durationMs != null ? ` (${durationMs}ms)` : "";
      console.log(`[${timestamp()}] RES   [api] ${method} ${path} → ${status}${dur}`);
    }
  },
};
