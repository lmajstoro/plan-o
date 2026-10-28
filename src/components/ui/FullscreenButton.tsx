import { useEffect, useState } from "react";
import { CollapseIcon, ExpandIcon } from "../icons";

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

/** Safari on iPad still only exposes the webkit-prefixed API; iPhone Safari has none, so the button hides there. */
function fullscreenElement() {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function fullscreenSupported() {
  const doc = document as WebkitDocument;
  return Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

function toggleFullscreen() {
  const doc = document as WebkitDocument;
  if (fullscreenElement()) {
    if (doc.exitFullscreen) void doc.exitFullscreen();
    else void doc.webkitExitFullscreen?.();
    return;
  }
  const root = document.documentElement as WebkitElement;
  if (root.requestFullscreen) void root.requestFullscreen();
  else void root.webkitRequestFullscreen?.();
}

export function FullscreenButton({ className }: { className: string }) {
  const [active, setActive] = useState(() => Boolean(fullscreenElement()));

  useEffect(() => {
    const onChange = () => setActive(Boolean(fullscreenElement()));
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  if (!fullscreenSupported()) return null;

  const label = active ? "Izađi iz cijelog zaslona" : "Cijeli zaslon";
  return (
    <button type="button" className={className} aria-label={label} title={label} onClick={toggleFullscreen}>
      {active ? <CollapseIcon className="h-5 w-5" /> : <ExpandIcon className="h-5 w-5" />}
    </button>
  );
}
