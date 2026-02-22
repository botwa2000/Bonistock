const regionFlags: Record<string, string> = {
  us: "\u{1F1FA}\u{1F1F8}",
  europe: "\u{1F1EA}\u{1F1FA}",
  em: "\u{1F30D}",
  global: "\u{1F310}",
};

export function getRegionFlag(region: string): string {
  return regionFlags[region.toLowerCase()] ?? "\u{1F310}";
}

const sectorIcons: Record<string, string> = {
  "Technology": "\u{1F4BB}",
  "Healthcare": "\u{1F3E5}",
  "Financial Services": "\u{1F3E6}",
  "Consumer Cyclical": "\u{1F6D2}",
  "Industrials": "\u{1F3ED}",
  "Communication Services": "\u{1F4E1}",
  "Energy": "\u26A1",
  "Real Estate": "\u{1F3E2}",
  "Basic Materials": "\u26CF\uFE0F",
  "Consumer Defensive": "\u{1F6E1}\uFE0F",
  "Utilities": "\u{1F4A1}",
  "Semiconductors": "\u{1F52C}",
  "Software": "\u{1F5A5}\uFE0F",
  "Cybersecurity": "\u{1F512}",
  "Defense": "\u{1F6E1}\uFE0F",
  "Insurance": "\u{1F3E6}",
  "Telecom": "\u{1F4F1}",
  "E-Commerce": "\u{1F6CD}\uFE0F",
};

export function getSectorIcon(sector: string): string {
  return sectorIcons[sector] ?? "\u{1F4CA}";
}
