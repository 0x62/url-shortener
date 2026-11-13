import { describe, expect, it } from "vitest";
import { inferAgent, referrer } from "../src/worker/analytics/attribution";

describe("traffic attribution", () => {
  it("gives explicit ref attribution precedence over the referring hostname", () => {
    const incomingUrl = new URL(
      "https://l.bl.je/cv/candidate?ref=email&campaign=wrong",
    );
    const referringUrl = "https://google.com/search?q=secret";
    expect(referrer(incomingUrl, referringUrl)).toBe("ref: email");
  });

  it("retains only the referring hostname, not its path or query", () => {
    const incomingUrl = new URL("https://l.bl.je/cv/candidate");
    expect(referrer(incomingUrl, "https://google.com/search?q=secret")).toBe(
      "google.com",
    );
  });

  it("recognizes Edge before Chrome in a browser user agent", () => {
    expect(inferAgent("Mozilla Windows Chrome/123 Safari/537 Edg/123")).toEqual(
      {
        browser: "Edge",
        os: "Windows",
        bot: false,
      },
    );
  });

  it("recognizes known preview bots", () => {
    expect(inferAgent("Slackbot 1.0").bot).toBe(true);
  });
});
