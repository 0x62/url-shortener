import { DurableObject } from "cloudflare:workers";
import { initializeSchema } from "./storage/schema";
import { LinkRepository } from "./storage/links";
import { HitRepository } from "./storage/hits";
import { AnalyticsRepository } from "./storage/analytics";
import type { Link, Hit } from "./storage/models";
export type { Link, Hit } from "./storage/models";

const DAY_MS = 86_400_000;
const DEFAULT_RETENTION_DAYS = 365;

/** RPC boundary and alarm lifecycle. SQL lives in the focused repositories. */
export class LinkStore extends DurableObject<Record<string, unknown>> {
  private readonly links: LinkRepository;
  private readonly hits: HitRepository;
  private readonly analytics: AnalyticsRepository;

  constructor(context: DurableObjectState, env: Record<string, unknown>) {
    super(context, env);
    const sql = context.storage.sql;
    initializeSchema(sql);
    this.links = new LinkRepository(sql);
    this.hits = new HitRepository(sql);
    this.analytics = new AnalyticsRepository(sql);
  }

  async list() {
    return this.links.list();
  }
  async get(slug: string) {
    return this.links.find(slug);
  }
  async create(link: Link) {
    return this.links.create(link);
  }

  async record(hit: Hit, retentionDays: number) {
    this.hits.record(hit);
    await this.ctx.storage.put("retention", retentionDays);
    if (!(await this.ctx.storage.getAlarm())) {
      await this.ctx.storage.setAlarm(Date.now() + DAY_MS);
    }
  }

  async enrich(hitId: string, screen: string) {
    this.hits.enrichScreen(hitId, screen);
  }

  async stats(query: string) {
    const { slug, ...summary } = this.analytics.summarize(query);
    return { link: slug ? this.links.find(slug) : null, ...summary };
  }

  async alarm() {
    const retentionDays =
      (await this.ctx.storage.get<number>("retention")) ||
      DEFAULT_RETENTION_DAYS;
    this.hits.deleteBefore(Date.now() - retentionDays * DAY_MS);
    await this.ctx.storage.setAlarm(Date.now() + DAY_MS);
  }
}
