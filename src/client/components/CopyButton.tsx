import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  async function copy() {
    setFailed(false);
    if (resetTimer.current !== null) {
      clearTimeout(resetTimer.current);
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      resetTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
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
