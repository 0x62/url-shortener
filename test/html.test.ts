import { describe, expect, it } from "vitest";
import { escapeHtml } from "../src/worker/views/html";

describe("HTML escaping", () => {
  it("escapes characters that could break out of an attribute or text node", () => {
    expect(escapeHtml('"<script>&')).toBe("&quot;&lt;script&gt;&amp;");
  });
});
