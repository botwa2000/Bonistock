/**
 * Display metadata for known regions (labels + flag emoji).
 * Both the region-switcher and settings page import this.
 * When a new Region enum value is added to Prisma, add it here too.
 */
export const REGION_META: Record<string, { label: string; flag: string }> = {
  GLOBAL: { label: "Global", flag: "\u{1F30D}" },
  DE: { label: "Germany", flag: "\u{1F1E9}\u{1F1EA}" },
};

/** Fallback for regions not yet in REGION_META */
export function getRegionMeta(code: string): { label: string; flag: string } {
  return REGION_META[code] ?? { label: code, flag: "\u{1F30D}" };
}
