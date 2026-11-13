import { useEffect, useState } from "react";

function slugFromLocation(): string {
  try {
    return decodeURIComponent(window.location.pathname.split("/")[2] || "");
  } catch {
    return "";
  }
}

export function useAdminNavigation() {
  const [slug, setSlug] = useState(slugFromLocation);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    function handleHistoryChange() {
      setSlug(slugFromLocation());
      setManaging(false);
    }
    window.addEventListener("popstate", handleHistoryChange);
    return () => window.removeEventListener("popstate", handleHistoryChange);
  }, []);

  function navigate(selectedSlug: string) {
    const path = selectedSlug
      ? `/admin/${encodeURIComponent(selectedSlug)}`
      : "/admin";
    window.history.pushState(null, "", path);
    setSlug(selectedSlug);
    setManaging(false);
    window.scrollTo(0, 0);
  }

  function toggleManagement() {
    setManaging((currentlyManaging) => !currentlyManaging);
  }

  return { slug, managing, navigate, toggleManagement };
}
