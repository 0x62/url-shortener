import { describe, expect, it } from "vitest";
import {
  validateDestination,
  isValidSlug,
} from "../src/worker/links/validation";

const SHORTENER_ORIGIN = "https://l.bl.je";

describe("short-link validation", () => {
  it("accepts custom paths but reserves application routes", () => {
    expect(isValidSlug("cv_2027")).toBe(true);
    const invalidSlugs = ["admin", "API", "_collect", "a/b", "../a", "a b", ""];
    for (const slug of invalidSlugs) {
      expect(isValidSlug(slug)).toBe(false);
    }
  });

  it("allows safe external destinations without changing their query", () => {
    const target = "https://example.com/cv?a=1";
    expect(validateDestination(target, SHORTENER_ORIGIN)).toBe(target);
  });

  it("rejects script, credential-bearing, recursive and relative destinations", () => {
    const invalidDestinations = [
      "javascript:alert(1)",
      "https://u:p@example.com",
      "https://l.bl.je/cv",
      "/local",
    ];
    for (const target of invalidDestinations) {
      expect(() => validateDestination(target, SHORTENER_ORIGIN)).toThrow();
    }
  });
});
