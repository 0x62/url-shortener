export function Loading({
  message = "Loading your links…",
}: {
  message?: string;
}) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {message}
    </div>
  );
}

export function ErrorBox({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <p>{error}</p>
      <button className="button secondary" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
