/** Idempotent schema setup. Keep column names stable for existing SQLite objects. */
export function initializeSchema(sql: SqlStorage): void {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS links (
      slug TEXT PRIMARY KEY,
      destination TEXT NOT NULL,
      title TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hits (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      time INTEGER NOT NULL,
      campaign TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      browser TEXT NOT NULL,
      os TEXT NOT NULL,
      screen TEXT NOT NULL,
      referrer TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS hits_time ON hits(time);
    CREATE INDEX IF NOT EXISTS hits_slug_time ON hits(slug, time);
  `);
}
