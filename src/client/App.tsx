import { useState } from "react";
import { useAdminNavigation } from "./hooks/useAdminNavigation";
import { Icon } from "./components/Icon";
import { LinkList } from "./components/LinkList";
import { Dashboard } from "./components/Dashboard";
import { CreateLinkDialog } from "./components/CreateLinkDialog";

export function App() {
  const { slug, managing, navigate, toggleManagement } = useAdminNavigation();
  const [creating, setCreating] = useState(false);
  const [refresh, setRefresh] = useState(0);
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a
            href="/admin"
            onClick={(event) => {
              event.preventDefault();
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
            <button className="manage-button" onClick={toggleManagement}>
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
          <LinkList
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
        <CreateLinkDialog
          onClose={() => setCreating(false)}
          onCreated={(link) => {
            setCreating(false);
            setRefresh((revision) => revision + 1);
            navigate(link.slug);
          }}
        />
      )}
    </>
  );
}
