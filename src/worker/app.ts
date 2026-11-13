import { Hono } from "hono";
import type { AppEnvironment } from "./types";
import { HttpError } from "./http/errors";
import { json } from "./http/responses";
import { requireAccess } from "./middleware/access";
import { protectWrites } from "./middleware/origin";
import { adminRoutes } from "./routes/admin";
import { linksRoutes } from "./routes/links";
import { statsRoutes } from "./routes/stats";
import { collectRoutes } from "./routes/collect";
import { redirectRoutes } from "./routes/redirects";

export const app = new Hono<AppEnvironment>();

// Protect route roots as well as descendants, including static admin assets.
app.use("/admin", requireAccess);
app.use("/admin/*", requireAccess);
app.use("/api", requireAccess);
app.use("/api/*", requireAccess);
app.use("/api/*", protectWrites);

app.route("/admin", adminRoutes);
app.route("/api/links", linksRoutes);
app.route("/api/stats", statsRoutes);
app.all("/api/*", () => json({ error: "Not found." }, 404));
app.all("/api", () => json({ error: "Not found." }, 404));
app.route("/_collect", collectRoutes);
app.get("/robots.txt", (context) =>
  context.text("User-agent: *\nDisallow: /\n"),
);
app.route("/", redirectRoutes);

app.notFound((context) => {
  if (!["GET", "HEAD"].includes(context.req.method)) {
    return context.text("Method not allowed", 405);
  }
  return context.text("Link not found", 404);
});

app.onError((error) => {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  if (error instanceof SyntaxError || error instanceof URIError) {
    return json({ error: "Invalid request." }, 400);
  }
  console.error("Request failed");
  return json({ error: "Request failed. Please try again." }, 500);
});
