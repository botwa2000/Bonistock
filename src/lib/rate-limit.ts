import { db } from "./db";

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowMs);

  const result = await db.$queryRaw<[{ count: number; reset_at: Date }]>`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (${key}, 1, ${windowEnd})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.reset_at < ${now} THEN 1
        ELSE rate_limits.count + 1
      END,
      reset_at = CASE
        WHEN rate_limits.reset_at < ${now} THEN ${windowEnd}
        ELSE rate_limits.reset_at
      END
    RETURNING count, reset_at
  `;

  const entry = result[0];
  const count = Number(entry.count);
  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: entry.reset_at.getTime(),
  };
}
