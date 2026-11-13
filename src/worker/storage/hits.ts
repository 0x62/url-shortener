import type { Hit } from "./models";

export class HitRepository {
  constructor(private readonly sql: SqlStorage) {}

  record(hit: Hit): void {
    this.sql.exec(
      `
      INSERT INTO hits (id, slug, time, campaign, country, city, browser, os, screen, referrer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
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
  }

  enrichScreen(hitId: string, screen: string): void {
    this.sql.exec(
      `
      UPDATE hits SET screen = ? WHERE id = ? AND screen = ''
    `,
      screen,
      hitId,
    );
  }

  deleteBefore(timestamp: number): void {
    this.sql.exec("DELETE FROM hits WHERE time < ?", timestamp);
  }
}
