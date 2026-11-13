import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ShortLink } from "../types";
import { createLink, errorMessage } from "../lib/api";

export function CreateLinkDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (link: ShortLink) => void;
}) {
  const [destination, setDestination] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [generateRandomSlug, setGenerateRandomSlug] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialogElement = dialogRef.current;
    dialogElement?.showModal();
    return () => dialogElement?.close();
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const createdLink = await createLink({
        destination,
        title,
        slug: generateRandomSlug ? undefined : slug.trim() || undefined,
      });
      onCreated(createdLink);
    } catch (requestError) {
      setError(errorMessage(requestError, "Could not create link."));
      setIsSubmitting(false);
    }
  }
  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="create-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) {
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !isSubmitting) {
          onClose();
        }
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
            disabled={isSubmitting}
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
            onChange={(event) => setDestination(event.target.value)}
            disabled={isSubmitting}
          />
        </label>
        <label className="field">
          Title <span className="optional">optional</span>
          <input
            placeholder="My portfolio"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSubmitting}
          />
        </label>
        <div className="field">
          <label htmlFor="slug">Short link</label>
          <div className="slug-input">
            <span>l.bl.je/</span>
            <input
              id="slug"
              placeholder={
                generateRandomSlug ? "Generated automatically" : "e.g. cv"
              }
              value={generateRandomSlug ? "" : slug}
              onChange={(event) => setSlug(event.target.value)}
              disabled={isSubmitting || generateRandomSlug}
              maxLength={64}
              pattern="[A-Za-z0-9_-]+"
            />
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={generateRandomSlug}
              onChange={(event) => setGenerateRandomSlug(event.target.checked)}
              disabled={isSubmitting}
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
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating…" : "Create link"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
