export function Icon({
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
