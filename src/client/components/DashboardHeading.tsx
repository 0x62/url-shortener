import type { ReactNode } from "react";
import type { ShortLink } from "../types";
import { buildShortUrl } from "../lib/format";
import { CopyButton } from "./CopyButton";
import { Icon } from "./Icon";

interface DashboardHeadingProps {
  slug: string;
  link: ShortLink | null;
  children?: ReactNode;
}

export function DashboardHeading({
  slug,
  link,
  children,
}: DashboardHeadingProps) {
  const title = slug ? link?.title || slug : "Your links, at a glance.";
  const subtitle = slug
    ? `l.bl.je/${slug}`
    : "All links. Every campaign. One clear picture.";

  return (
    <div className="page-heading dashboard-heading">
      <div>
        <p className="eyebrow">TRAFFIC OVERVIEW</p>
        <div className="title-row">
          <h1>{title}</h1>
          {slug && <CopyButton value={buildShortUrl(slug)} />}
        </div>
        <p className="subtitle short-path">{subtitle}</p>
        {link && (
          <a
            className="destination destination-heading"
            href={link.destination}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link.destination}
            <Icon type="external" />
          </a>
        )}
      </div>
      {children}
    </div>
  );
}
