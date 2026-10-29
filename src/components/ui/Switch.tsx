export function Switch({
  checked,
  label,
  onToggle,
  className = "",
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full font-medium ${className}`}
      onClick={onToggle}
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-blue-700" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
      {label}
    </button>
  );
}
