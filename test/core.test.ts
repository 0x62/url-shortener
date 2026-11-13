import { describe, it, expect } from "vitest";
import {
  validSlug,
  destination,
  agentInfo,
  referrer,
  dateRange,
  escapeHtml,
} from "../src/worker/core";
describe("short links", () => {
  it("accepts custom paths but reserves application routes", () => {
    expect(validSlug("cv_2027")).toBe(true);
    for (const s of ["admin", "API", "_collect", "a/b", "../a", "a b", ""])
      expect(validSlug(s)).toBe(false);
  });
  it("allows only safe external destinations", () => {
    expect(destination("https://example.com/cv?a=1", "https://l.bl.je")).toBe(
      "https://example.com/cv?a=1",
    );
    for (const s of [
      "javascript:alert(1)",
      "https://u:p@example.com",
      "https://l.bl.je/cv",
      "/local",
    ])
      expect(() => destination(s, "https://l.bl.je")).toThrow();
  });
  it("distinguishes explicit ref attribution from campaign path", () => {
    expect(
      referrer(
        new URL("https://l.bl.je/cv/candidate?ref=email&campaign=wrong"),
        "https://google.com/search?q=secret",
      ),
    ).toBe("ref: email");
    expect(
      referrer(
        new URL("https://l.bl.je/cv/candidate"),
        "https://google.com/search?q=secret",
      ),
    ).toBe("google.com");
  });
  it("classifies common browsers and bots", () => {
    expect(agentInfo("Mozilla Windows Chrome/123 Safari/537 Edg/123")).toEqual({
      browser: "Edge",
      os: "Windows",
      bot: false,
    });
    expect(agentInfo("Slackbot 1.0").bot).toBe(true);
  });
  it("uses inclusive calendar dates with bounded queries", () => {
    const r = dateRange(new URLSearchParams("from=2026-01-01&to=2026-01-02"));
    expect(r.end - r.start).toBe(2 * 86400000);
    expect(() => dateRange(new URLSearchParams("from=2026-02-30"))).toThrow();
    expect(() =>
      dateRange(new URLSearchParams("from=2024-01-01&to=2026-01-01")),
    ).toThrow();
  });
  it("escapes HTML attribute injection", () => {
    expect(escapeHtml('"<script>&')).toBe("&quot;&lt;script&gt;&amp;");
  });
});
