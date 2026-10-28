import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "../icons";

type Option = { value: string; label: string };

/** In-page replacement for <select>: iPad Safari drops out of fullscreen whenever a native picker opens. */
export function PickerSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={rootRef}>
      <button
        type="button"
        className="input flex h-11 items-center justify-between gap-2 text-left text-base"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{selected?.label ?? ""}</span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="mt-1 max-h-60 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white py-1 shadow-sm" data-allow-scroll>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-base ${
                  active ? "bg-blue-50 font-medium text-blue-800" : "text-slate-800 active:bg-slate-100"
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="truncate">{option.label}</span>
                {active ? <CheckIcon className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
