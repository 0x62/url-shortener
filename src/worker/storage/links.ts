import type { Link } from "./models";

export class LinkRepository {
  constructor(private readonly sql: SqlStorage) {}

  list() {
    return this.sql
      .exec<Link & { hits: number }>(
        `
      SELECT links.*,
        (SELECT COUNT(*) FROM hits WHERE hits.slug = links.slug) AS hits
      FROM links
      ORDER BY createdAt DESC
    `,
      )
      .toArray();
  }

  find(slug: string): Link | null {
    return (
      this.sql
        .exec<Link>("SELECT * FROM links WHERE slug = ?", slug)
        .toArray()[0] || null
    );
  }

  create(link: Link): boolean {
    // Atomic uniqueness check: concurrent creates never overwrite an existing slug.
    const inserted = this.sql
      .exec<Link>(
        `
      INSERT OR IGNORE INTO links (slug, destination, title, createdAt)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `,
        link.slug,
        link.destination,
        link.title,
        link.createdAt,
      )
      .toArray();
    return inserted.length === 1;
  }
}
