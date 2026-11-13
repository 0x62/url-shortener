import React, { FormEvent, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Link = {
  slug: string;
  destination: string;
  title: string;
  createdAt: number;
  hits?: number;
};
type Row = { value: string; hits: number };
type Dimension =
  "campaign" | "country" | "city" | "browser" | "os" | "screen" | "referrer";
type Stats = {
  link: Link | null;
  total: number;
  series: { date: string; hits: number }[];
  dimensions: Record<Dimension, Row[]>;
};
const labels: Record<Dimension, string> = {
  campaign: "Campaign",
  country: "Country",
  city: "City",
  browser: "Browser",
  os: "Operating system",
  screen: "Screen resolution",
  referrer: "Referrer",
};
const dimensions = Object.keys(labels) as Dimension[];
const number = (n: number) => new Intl.NumberFormat().format(n);
const date = (d: Date) => d.toISOString().slice(0, 10);
const today = () => date(new Date());
const daysAgo = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return date(d);
};
const displayValue = (v: string) =>
  !v || v === "(none)" ? "None / unknown" : v;
const shortUrl = (slug: string) => `https://l.bl.je/${slug}`;
const selectedSlug = () => {
  try {
    return decodeURIComponent(location.pathname.split("/")[2] || "");
  } catch {
    return "";
  }
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", ...init });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw new Error(
        "Your admin session has expired or access was denied. Reload to sign in again.",
      );
    const error = (await response
      .json()
      .catch(() => ({ error: `Request failed (${response.status}).` }))) as {
      error?: string;
    };
    throw new Error(error.error || "The request could not be completed.");
  }
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "Please reload this page to sign in through Cloudflare Access.",
    );
  return response.json();
}

function Icon({
  type,
}: {
  type: "link" | "plus" | "arrow" | "external" | "copy";
}) {
  const paths = {
    link: (
      <>
        <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-2 2" />
        <path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l2-2" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M19 12H5m6-6l-6 6 6 6" />,
    external: (
      <>
        <path d="M15 3h6v6m0-6L10 14" />
        <path d="M10 3H4v17h17v-6" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M16 8V3H3v13h5" />
      </>
    ),
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[type]}
    </svg>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
    }
  }
  return (
    <span className="copy-wrap">
      <button
        className="icon-button"
        aria-label={`Copy ${value}`}
        title={
          copied ? "Copied" : failed ? "Clipboard unavailable" : "Copy link"
        }
        onClick={copy}
      >
        <Icon type="copy" />
      </button>
      <span className="copy-status" role="status">
        {copied ? "Copied" : failed ? "Copy unavailable" : ""}
      </span>
    </span>
  );
}

function App() {
  const [slug, setSlug] = useState(selectedSlug);
  const [creating, setCreating] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [managing, setManaging] = useState(false);
  useEffect(() => {
    const handler = () => setSlug(selectedSlug());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  const navigate = (value: string) => {
    setManaging(false);
    history.pushState(
      null,
      "",
      value ? `/admin/${encodeURIComponent(value)}` : "/admin",
    );
    setSlug(value);
    window.scrollTo(0, 0);
  };
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              navigate("");
            }}
            className="brand"
          >
            <span className="brand-icon">
              <Icon type="link" />
            </span>
            <span>
              Shortlinks<span className="brand-domain">l.bl.je</span>
            </span>
          </a>
          <div className="header-actions">
            <button
              className="manage-button"
              onClick={() => setManaging((v) => !v)}
            >
              {managing ? "Analytics" : "Manage links"}
            </button>
            <span className="private-badge">
              <span />
              Private dashboard
            </span>
          </div>
        </div>
      </header>
      <main className="page">
        {managing ? (
          <Links
            onSelect={navigate}
            onCreate={() => setCreating(true)}
            refresh={refresh}
          />
        ) : (
          <Dashboard
            slug={slug}
            onSelect={navigate}
            onCreate={() => setCreating(true)}
            refresh={refresh}
          />
        )}
        <footer>
          Lightweight links. Useful insights.<span>Times and dates in UTC</span>
        </footer>
      </main>
      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onCreated={(link) => {
            setCreating(false);
            setRefresh((v) => v + 1);
            navigate(link.slug);
          }}
        />
      )}
    </>
  );
}

function Links({
  onSelect,
  onCreate,
  refresh,
}: {
  onSelect: (slug: string) => void;
  onCreate: () => void;
  refresh: number;
}) {
  const [links, setLinks] = useState<Link[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<{ links: Link[] }>("/api/links")
      .then((data) => {
        if (active) setLinks(data.links);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh, retry]);
  const filtered = links.filter((link) =>
    `${link.slug} ${link.title} ${link.destination}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR LINK COLLECTION</p>
          <h1>Every link, a little clearer.</h1>
          <p className="subtitle">
            Create short links and see where they take people.
          </p>
        </div>
        <button className="button primary" onClick={onCreate}>
          <Icon type="plus" />
          Create link
        </button>
      </div>
      <section className="panel links-panel">
        <div className="panel-toolbar">
          <h2>
            All links <span className="count">{links.length}</span>
          </h2>
          <input
            className="search"
            aria-label="Search links"
            placeholder="Search links…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} retry={() => setRetry((v) => v + 1)} />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table className="link-table">
              <thead>
                <tr>
                  <th>SHORT LINK</th>
                  <th>DESTINATION</th>
                  <th className="right">HITS</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((link) => (
                  <tr key={link.slug}>
                    <td>
                      <button
                        className="link-name"
                        onClick={() => onSelect(link.slug)}
                      >
                        {link.title || link.slug}
                      </button>
                      <div className="muted small">l.bl.je/{link.slug}</div>
                    </td>
                    <td>
                      <a
                        className="destination"
                        href={link.destination}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.destination}
                        <Icon type="external" />
                      </a>
                    </td>
                    <td className="right metric">{number(link.hits || 0)}</td>
                    <td>
                      <CopyButton value={shortUrl(link.slug)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <span className="empty-icon">
              <Icon type="link" />
            </span>
            <h3>
              {query ? "No matching links" : "Your first link starts here"}
            </h3>
            <p>
              {query
                ? "Try a different search."
                : "Create a memorable short link for your CV, portfolio, or next project."}
            </p>
            {!query && (
              <button className="button primary" onClick={onCreate}>
                Create a link
              </button>
            )}
          </div>
        )}
      </section>
      <div className="tip">
        <strong>One link. Many campaigns.</strong>
        <p>
          Add a campaign to the path, like <code>l.bl.je/cv/recruiter-a</code>.
          Campaigns appear automatically when the link receives traffic.
        </p>
      </div>
    </>
  );
}

function Dashboard({
  slug,
  onSelect,
  onCreate,
  refresh,
}: {
  slug: string;
  onSelect: (slug: string) => void;
  onCreate: () => void;
  refresh: number;
}) {
  const [links, setLinks] = useState<Link[]>([]);
  const [linksReady, setLinksReady] = useState(false);
  useEffect(() => {
    let active = true;
    api<{ links: Link[] }>("/api/links")
      .then((data) => {
        if (active) {
          setLinks(data.links);
          setLinksReady(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [refresh]);
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(today);
  const [preset, setPreset] = useState("30");
  const [filters, setFilters] = useState<Partial<Record<Dimension, string>>>(
    {},
  );
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [filterPicker, setFilterPicker] = useState<Dimension | " ">(" ");
  useEffect(() => {
    setData(null);
  }, [slug]);
  useEffect(() => {
    let active = true;
    if (!from || !to || from > to) {
      setError("Choose a start date on or before the end date.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ from, to, ...filters });
    if (slug) params.set("slug", slug);
    api<Stats>(`/api/stats?${params}`)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, from, to, filters, retry]);
  const addFilter = (key: Dimension, value: string) => {
    setFilters((f) => ({ ...f, [key]: value || "(none)" }));
    setFilterPicker(" ");
  };
  const removeFilter = (key: Dimension) =>
    setFilters((f) => {
      const next = { ...f };
      delete next[key];
      return next;
    });
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">TRAFFIC OVERVIEW</p>
          <div className="title-row">
            <h1>
              {slug ? data?.link?.title || slug : "Your links, at a glance."}
            </h1>
            {slug && <CopyButton value={shortUrl(slug)} />}
          </div>
          <p className="subtitle short-path">
            {slug
              ? `l.bl.je/${slug}`
              : "All links. Every campaign. One clear picture."}
          </p>
          {data?.link && (
            <a
              className="destination destination-heading"
              href={data.link.destination}
              target="_blank"
              rel="noopener noreferrer"
            >
              {data.link.destination}
              <Icon type="external" />
            </a>
          )}
        </div>
        <div className="date-range">
          <label>
            From
            <input
              type="date"
              value={from}
              max={to || today()}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
            />
          </label>
          <span>→</span>
          <label>
            To
            <input
              type="date"
              value={to}
              min={from}
              max={today()}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
            />
          </label>
        </div>
      </div>
      <div className="filter-bar">
        <div className="filter-tools">
          <select
            aria-label="Filter by shortlink"
            value={slug}
            onChange={(e) => onSelect(e.target.value)}
          >
            <option value="">All shortlinks</option>
            {links.map((link) => (
              <option key={link.slug} value={link.slug}>
                {link.title ? `${link.title} (/${link.slug})` : `/${link.slug}`}
              </option>
            ))}
          </select>
          <select
            aria-label="Quick date range"
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              if (e.target.value !== "custom") {
                setFrom(daysAgo(Number(e.target.value) - 1));
                setTo(today());
              }
            }}
          >
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom dates</option>
          </select>
          <select
            aria-label="Choose a filter"
            value={filterPicker}
            onChange={(e) => setFilterPicker(e.target.value as Dimension | " ")}
          >
            <option value=" ">＋ Add filter</option>
            {dimensions.map((d) => (
              <option key={d} value={d}>
                {labels[d]}
              </option>
            ))}
          </select>
          {filterPicker !== " " && (
            <select
              aria-label={`Filter by ${labels[filterPicker]}`}
              defaultValue=""
              key={filterPicker}
              onChange={(e) => {
                if (e.target.value) addFilter(filterPicker, e.target.value);
              }}
            >
              <option value="">
                Choose {labels[filterPicker].toLowerCase()}
              </option>
              {(data?.dimensions[filterPicker] || []).map((row) => (
                <option key={row.value} value={row.value || "(none)"}>
                  {displayValue(row.value)}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          className="refresh"
          onClick={() => setRetry((v) => v + 1)}
          disabled={loading}
        >
          {loading ? "Updating…" : "Refresh data"}
        </button>
      </div>
      {Object.keys(filters).length > 0 && (
        <div className="active-filters">
          {Object.entries(filters).map(([key, value]) => (
            <button
              key={key}
              className="filter-chip"
              onClick={() => removeFilter(key as Dimension)}
              aria-label={`Remove ${labels[key as Dimension]} filter`}
            >
              {labels[key as Dimension]}:{" "}
              <strong>{displayValue(value || "")}</strong>
              <span>×</span>
            </button>
          ))}
          <button className="clear" onClick={() => setFilters({})}>
            Clear all
          </button>
        </div>
      )}
      {linksReady && !links.length && !loading && !error && (
        <div className="onboarding">
          <div>
            <strong>Make your first connection.</strong>
            <p>Create a short link to start collecting traffic insights.</p>
          </div>
          <button className="button primary" onClick={onCreate}>
            <Icon type="plus" />
            Create link
          </button>
        </div>
      )}
      {error ? (
        <ErrorBox error={error} retry={() => setRetry((v) => v + 1)} />
      ) : !data ? (
        <Loading />
      ) : (
        <div
          aria-busy={loading}
          className={loading ? "analytics updating" : "analytics"}
        >
          <section className="panel chart-panel">
            <div className="chart-summary">
              <div>
                <p className="eyebrow">TOTAL HITS</p>
                <div className="big-number">{number(data.total)}</div>
                <p className="muted small">
                  Redirect requests · not unique visitors
                </p>
              </div>
              <span className="chart-legend">
                <span />
                Hits
              </span>
            </div>
            <Chart series={data.series} />
            {data.total === 0 && (
              <p className="chart-empty">
                No hits for this period and these filters.
              </p>
            )}
          </section>
          <div className="dimension-grid">
            {dimensions.map((key) => (
              <DimensionCard
                key={key}
                dimension={key}
                rows={data.dimensions[key] || []}
                total={data.total}
                onFilter={(value) => addFilter(key, value)}
              />
            ))}
          </div>
          <p className="data-note">
            Campaigns come from the second path segment. Referrers include
            explicit ?ref= values. Location is approximate; browser and OS are
            inferred. Screen size is available only when the browser reports it.
          </p>
        </div>
      )}
    </>
  );
}

function Chart({ series }: { series: { date: string; hits: number }[] }) {
  const max = Math.max(1, ...series.map((p) => p.hits));
  const width = 960,
    height = 210,
    left = 42,
    right = 15,
    top = 15,
    bottom = 30;
  const w = width - left - right,
    h = height - top - bottom;
  const x = (i: number) =>
    left + (series.length > 1 ? i / (series.length - 1) : 0.5) * w;
  const y = (v: number) => top + h - (v / max) * h;
  const line = series
    .map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.hits)}`)
    .join(" ");
  const area = series.length
    ? `${line} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
    : "";
  const formatDate = (value: string) =>
    new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return (
    <div className="chart">
      <svg
        role="img"
        aria-label="Daily redirect hits over the selected period"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4169e1" stopOpacity=".16" />
            <stop offset="100%" stopColor="#4169e1" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((n) => (
          <g key={n}>
            <line
              x1={left}
              x2={width - right}
              y1={y(max * n)}
              y2={y(max * n)}
              stroke="#e8edf3"
              strokeDasharray="3 4"
            />
            <text
              x={left - 10}
              y={y(max * n) + 4}
              textAnchor="end"
              fill="#8b95a5"
              fontSize="11"
            >
              {number(Math.round(max * n))}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#chart-fill)" />
        <path
          d={line}
          fill="none"
          stroke="#4169e1"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {series.map((p, i) => (
          <circle
            key={p.date}
            cx={x(i)}
            cy={y(p.hits)}
            r={series.length === 1 ? 4 : 5}
            fill="#4169e1"
            className={series.length === 1 ? "chart-dot single" : "chart-dot"}
          >
            <title>
              {formatDate(p.date)}: {number(p.hits)} hits
            </title>
          </circle>
        ))}
        {series.length > 0 && (
          <>
            <text x={left} y={height - 5} fill="#8b95a5" fontSize="11">
              {formatDate(series[0].date)}
            </text>
            <text
              x={width - right}
              y={height - 5}
              fill="#8b95a5"
              fontSize="11"
              textAnchor="end"
            >
              {formatDate(series[series.length - 1].date)}
            </text>
          </>
        )}
      </svg>
      <details className="chart-data">
        <summary>View daily totals</summary>
        <div className="daily-data">
          {series.map((p) => (
            <span key={p.date}>
              {p.date}
              <strong>{number(p.hits)}</strong>
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}

function DimensionCard({
  dimension,
  rows,
  total,
  onFilter,
}: {
  dimension: Dimension;
  rows: Row[];
  total: number;
  onFilter: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, 6);
  return (
    <section className="panel dimension-panel">
      <div className="dimension-header">
        <h2>
          {dimension === "campaign"
            ? "Campaigns"
            : dimension === "country"
              ? "Countries"
              : dimension === "city"
                ? "Cities"
                : dimension === "browser"
                  ? "Browsers"
                  : dimension === "os"
                    ? "Operating systems"
                    : dimension === "screen"
                      ? "Screen resolutions"
                      : "Referrers"}
        </h2>
        <span>Hits</span>
      </div>
      {visible.length ? (
        <div className="dimension-rows">
          {visible.map((row) => (
            <button
              className="dimension-row"
              key={row.value}
              onClick={() => onFilter(row.value)}
              title={`Filter by ${displayValue(row.value)}`}
            >
              <span
                className="row-bar"
                style={{
                  width: `${total ? Math.min(100, (row.hits / total) * 100) : 0}%`,
                }}
              />
              <span className="row-label">{displayValue(row.value)}</span>
              <strong>{number(row.hits)}</strong>
            </button>
          ))}
        </div>
      ) : (
        <p className="dimension-empty">No data yet</p>
      )}
      {rows.length > 6 && (
        <button className="show-all" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : `Show all ${rows.length}`}
        </button>
      )}
    </section>
  );
}

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (link: Link) => void;
}) {
  const [destination, setDestination] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [random, setRandom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<Link | { link: Link }>("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          title,
          slug: random ? undefined : slug.trim() || undefined,
        }),
      });
      onCreated("link" in result ? result.link : result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create link.");
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="create-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current && !busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">A SHORTER WAY THERE</p>
            <h2 id="create-title">Create a link</h2>
          </div>
          <button
            type="button"
            className="close"
            aria-label="Close create link"
            onClick={onClose}
            disabled={busy}
          >
            ×
          </button>
        </div>
        <label className="field">
          Destination URL
          <input
            autoFocus
            type="url"
            placeholder="https://your-website.com/page"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="field">
          Title <span className="optional">optional</span>
          <input
            placeholder="My portfolio"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
          />
        </label>
        <div className="field">
          <label htmlFor="slug">Short link</label>
          <div className="slug-input">
            <span>l.bl.je/</span>
            <input
              id="slug"
              placeholder={random ? "Generated automatically" : "e.g. cv"}
              value={random ? "" : slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={busy || random}
              maxLength={64}
              pattern="[A-Za-z0-9_-]+"
            />
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={random}
              onChange={(e) => setRandom(e.target.checked)}
              disabled={busy}
            />
            Generate a random short link
          </label>
        </div>
        <p className="modal-help">
          Add a campaign path when sharing, for example{" "}
          <code>/cv/recruiter-a</code>. No setup required.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            className="button secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy} type="submit">
            {busy ? "Creating…" : "Create link"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Loading your links…
    </div>
  );
}
function ErrorBox({ error, retry }: { error: string; retry: () => void }) {
  return (
    <div className="error-box" role="alert">
      <p>{error}</p>
      <button className="button secondary" onClick={retry}>
        Try again
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
