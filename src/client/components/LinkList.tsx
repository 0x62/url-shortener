import { useState } from "react";
import { useLinks } from "../hooks/useLinks";
import { formatNumber, buildShortUrl } from "../lib/format";
import { Icon } from "./Icon";
import { CopyButton } from "./CopyButton";
import { Loading, ErrorBox } from "./Feedback";

export function LinkList({
  onSelect,
  onCreate,
  refresh,
}: {
  onSelect: (slug: string) => void;
  onCreate: () => void;
  refresh: number;
}) {
  const { links, loading, error, retry } = useLinks(refresh);
  const [query, setQuery] = useState("");
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
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} retry={retry} />
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
                    <td className="right metric">
                      {formatNumber(link.hits || 0)}
                    </td>
                    <td>
                      <CopyButton value={buildShortUrl(link.slug)} />
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
