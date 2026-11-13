import { DurableObject } from "cloudflare:workers";
import { dateRange, dimensions } from "./core";
export type Link = {
  slug: string;
  destination: string;
  title: string;
  createdAt: number;
};
export interface Hit {
  id: string;
  slug: string;
  time: number;
  campaign: string;
  country: string;
  city: string;
  browser: string;
  os: string;
  screen: string;
  referrer: string;
}
export class LinkStore extends DurableObject<Record<string, unknown>> {
  constructor(ctx: DurableObjectState, env: Record<string, unknown>) {
    super(ctx, env);
    ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS links(slug TEXT PRIMARY KEY,destination TEXT NOT NULL,title TEXT NOT NULL,createdAt INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS hits(id TEXT PRIMARY KEY,slug TEXT NOT NULL,time INTEGER NOT NULL,campaign TEXT NOT NULL,country TEXT NOT NULL,city TEXT NOT NULL,browser TEXT NOT NULL,os TEXT NOT NULL,screen TEXT NOT NULL,referrer TEXT NOT NULL); CREATE INDEX IF NOT EXISTS hits_time ON hits(time); CREATE INDEX IF NOT EXISTS hits_slug_time ON hits(slug,time);`,
    );
  }
  async list() {
    return this.ctx.storage.sql
      .exec<Link & { hits: number }>(
        `SELECT l.*, (SELECT COUNT(*) FROM hits h WHERE h.slug=l.slug) hits FROM links l ORDER BY createdAt DESC`,
      )
      .toArray();
  }
  async get(slug: string) {
    return (
      this.ctx.storage.sql
        .exec<Link>("SELECT * FROM links WHERE slug=?", slug)
        .toArray()[0] || null
    );
  }
  async create(link: Link) {
    return (
      this.ctx.storage.sql
        .exec<Link>(
          "INSERT OR IGNORE INTO links VALUES(?,?,?,?) RETURNING *",
          link.slug,
          link.destination,
          link.title,
          link.createdAt,
        )
        .toArray().length === 1
    );
  }
  async record(hit: Hit, retention: number) {
    this.ctx.storage.sql.exec(
      "INSERT INTO hits VALUES(?,?,?,?,?,?,?,?,?,?)",
      hit.id,
      hit.slug,
      hit.time,
      hit.campaign,
      hit.country,
      hit.city,
      hit.browser,
      hit.os,
      hit.screen,
      hit.referrer,
    );
    await this.ctx.storage.put("retention", retention);
    if (!(await this.ctx.storage.getAlarm())) {
      await this.ctx.storage.setAlarm(Date.now() + 86400000);
    }
  }
  async enrich(id: string, screen: string) {
    this.ctx.storage.sql.exec(
      "UPDATE hits SET screen=? WHERE id=? AND screen=''",
      screen,
      id,
    );
  }
  async alarm() {
    const days = (await this.ctx.storage.get<number>("retention")) || 365;
    this.ctx.storage.sql.exec(
      "DELETE FROM hits WHERE time<?",
      Date.now() - days * 86400000,
    );
    await this.ctx.storage.setAlarm(Date.now() + 86400000);
  }
  async stats(query: string) {
    const p = new URLSearchParams(query);
    const range = dateRange(p);
    const clauses = ["time>=?", "time<?"];
    const values: (string | number)[] = [range.start, range.end];
    const slug = p.get("slug");
    if (slug) {
      clauses.push("slug=?");
      values.push(slug);
    }
    for (const d of dimensions) {
      const v = p.get(d);
      if (v) {
        clauses.push(`${d}=?`);
        values.push(v === "(none)" ? "" : v);
      }
    }
    const where = clauses.join(" AND ");
    const sql = this.ctx.storage.sql;
    const total = sql
      .exec<{ n: number }>(
        `SELECT COUNT(*) n FROM hits WHERE ${where}`,
        ...values,
      )
      .one().n;
    const series = sql
      .exec<{ date: string; hits: number }>(
        `SELECT strftime('%Y-%m-%d',time/1000,'unixepoch') date,COUNT(*) hits FROM hits WHERE ${where} GROUP BY date ORDER BY date`,
        ...values,
      )
      .toArray();
    const buckets = new Map(series.map((x) => [x.date, x.hits]));
    const complete = [];
    for (let t = range.start; t < range.end; t += 86400000) {
      const date = new Date(t).toISOString().slice(0, 10);
      complete.push({ date, hits: buckets.get(date) || 0 });
    }
    const breakdown: Record<string, { value: string; hits: number }[]> = {};
    for (const d of dimensions) {
      breakdown[d] = sql
        .exec<{ value: string; hits: number }>(
          `SELECT ${d} value, COUNT(*) hits FROM hits WHERE ${where} GROUP BY ${d} ORDER BY hits DESC, ${d} ASC LIMIT 100`,
          ...values,
        )
        .toArray();
    }
    return {
      link: slug ? await this.get(slug) : null,
      total,
      series: complete,
      dimensions: breakdown,
    };
  }
}
