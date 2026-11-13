type AgentRule = { pattern: RegExp; name: string };

const BROWSER_RULES: AgentRule[] = [
  { pattern: /Edg\//, name: "Edge" },
  { pattern: /OPR\//, name: "Opera" },
  { pattern: /Firefox\//, name: "Firefox" },
  { pattern: /Chrome\/|CriOS\//, name: "Chrome" },
  { pattern: /Safari\//, name: "Safari" },
];
const OS_RULES: AgentRule[] = [
  { pattern: /Android/, name: "Android" },
  { pattern: /iPhone|iPad|iPod/, name: "iOS" },
  { pattern: /Windows/, name: "Windows" },
  { pattern: /Macintosh/, name: "macOS" },
  { pattern: /Linux/, name: "Linux" },
];
const KNOWN_BOT =
  /bot|crawler|spider|preview|facebookexternalhit|slackbot|headless/i;

function matchAgent(userAgent: string, rules: AgentRule[]): string {
  return rules.find((rule) => rule.pattern.test(userAgent))?.name || "Other";
}

export function inferAgent(userAgent: string) {
  return {
    browser: matchAgent(userAgent, BROWSER_RULES),
    os: matchAgent(userAgent, OS_RULES),
    bot: KNOWN_BOT.test(userAgent),
  };
}

export function referrer(url: URL, refererHeader: string | null): string {
  const explicitRef = url.searchParams.get("ref");
  if (explicitRef) return `ref: ${explicitRef.slice(0, 120)}`;
  if (!refererHeader) return "";
  try {
    // Discard path/query to avoid retaining personal data from referring URLs.
    return new URL(refererHeader).hostname.slice(0, 253);
  } catch {
    return "";
  }
}
