import { useEffect, useState } from "react";
import { AUTOSAVE_MS, useDb } from "../../context/DbContext";
import { CheckIcon } from "../icons";

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function SaveStatus({ compact = false }: { compact?: boolean }) {
  const { save, dirtySince, lastSavedAt, saving } = useDb();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (dirtySince === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [dirtySince]);

  const dirty = dirtySince !== null;
  const secondsLeft = dirty ? Math.max(0, Math.ceil((dirtySince + AUTOSAVE_MS - now) / 1000)) : 0;

  let status;
  if (saving) {
    status = <span className="text-slate-600">Spremam...</span>;
  } else if (dirty) {
    status = (
      <span className="inline-flex items-center gap-1.5 text-amber-700">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
        {compact ? `Nespremljeno · ${secondsLeft} s` : `Nespremljene promjene · automatsko spremanje za ${secondsLeft} s`}
      </span>
    );
  } else {
    status = (
      <span className="inline-flex items-center gap-1.5 text-emerald-700">
        <CheckIcon className="h-4 w-4 shrink-0" />
        {lastSavedAt ? `Spremljeno u ${formatTime(lastSavedAt)}` : "Sve je spremljeno"}
      </span>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 text-sm">
      <span className="whitespace-nowrap font-medium tabular-nums" aria-live="polite">
        {status}
      </span>
      <button
        type="button"
        className={`btn-primary disabled:cursor-not-allowed disabled:opacity-40 ${compact ? "h-11 px-4 text-base" : ""}`}
        disabled={!dirty || saving}
        onClick={save}
      >
        Spremi promjene
      </button>
    </div>
  );
}
