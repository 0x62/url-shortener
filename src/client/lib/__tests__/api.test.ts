import { afterEach, describe, expect, it, vi } from "vitest";
import { createLink, requestJson, statsEndpoint } from "../api";

afterEach(() => {
  vi.unstubAllGlobals();
});

function respondWith(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("admin API client", () => {
  it("preserves date, shortlink, and dimension filters together", () => {
    const endpoint = statsEndpoint({
      slug: "cv",
      from: "2026-11-01",
      to: "2026-11-13",
      filters: { campaign: "recruiter-one", referrer: "(none)" },
    });
    const query = new URL(endpoint, "https://l.bl.je").searchParams;
    expect(query.get("slug")).toBe("cv");
    expect(query.get("campaign")).toBe("recruiter-one");
    expect(query.get("referrer")).toBe("(none)");
    expect(query.get("from")).toBe("2026-11-01");
    expect(query.get("to")).toBe("2026-11-13");
  });

  it("omits an empty slug for the all-links overview", () => {
    expect(
      statsEndpoint({
        slug: "",
        from: "2026-11-01",
        to: "2026-11-13",
        filters: {},
      }),
    ).not.toContain("slug=");
  });

  it.each([401, 403])(
    "explains expired or denied admin access (%s)",
    async (status) => {
      respondWith(new Response("Access denied", { status }));
      await expect(requestJson("/api/links")).rejects.toThrow(
        "Your admin session has expired or access was denied",
      );
    },
  );

  it("does not mistake a redirected login page for JSON data", async () => {
    respondWith(
      new Response("<html>Sign in</html>", {
        headers: { "content-type": "text/html" },
      }),
    );
    await expect(requestJson("/api/links")).rejects.toThrow(
      "sign in through Cloudflare Access",
    );
  });

  it("surfaces a useful API error and handles non-JSON failures", async () => {
    respondWith(
      Response.json({ error: "That slug already exists." }, { status: 409 }),
    );
    await expect(requestJson("/api/links")).rejects.toThrow(
      "That slug already exists.",
    );
    respondWith(new Response("Bad gateway", { status: 502 }));
    await expect(requestJson("/api/links")).rejects.toThrow("502");
  });

  it("creates a link using same-origin credentials and a JSON request", async () => {
    const link = {
      slug: "cv",
      title: "CV",
      destination: "https://example.com/cv",
      createdAt: 1,
    };
    const fetchMock = respondWith(Response.json({ link }));
    await expect(
      createLink({ slug: "cv", title: "CV", destination: link.destination }),
    ).resolves.toEqual(link);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/links",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
});
