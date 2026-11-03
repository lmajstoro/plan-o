type Tone = "color" | "mono";

const COLORS = {
  color: ["#0e4a32", "#1f8a4c", "#5dde6a"],
  mono: ["#0d1f17", "#0d1f17", "#0d1f17"],
} as const;

export function ToktaMark({ className = "h-8 w-auto", tone = "color" }: { className?: string; tone?: Tone }) {
  const [dark, mid, bright] = COLORS[tone];
  return (
    <svg viewBox="0 0 44 32" className={className} aria-hidden="true">
      <rect x="1" y="22" width="22" height="8" rx="2.6" fill={dark} />
      <rect x="11" y="12" width="22" height="8" rx="2.6" fill={mid} />
      <rect x="21" y="2" width="22" height="8" rx="2.6" fill={bright} />
    </svg>
  );
}

export function ToktaLockup({
  size = "md",
  subtitle = true,
  heading = false,
}: {
  size?: "md" | "lg";
  subtitle?: boolean;
  heading?: boolean;
}) {
  const large = size === "lg";
  const Title = heading ? "h1" : "div";
  return (
    <div className={`flex min-w-0 gap-3 ${subtitle ? "items-start" : "items-center"}`}>
      <ToktaMark className={`${large ? "h-11" : "h-8"} w-auto shrink-0 ${subtitle ? "mt-1" : ""}`} />
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className={`${large ? "h-8" : "h-6"} w-px shrink-0 bg-slate-300`} />
          <Title className={`font-extrabold leading-none tracking-wide text-tokta-900 ${large ? "text-3xl" : "text-lg"}`}>
            TOKTA
          </Title>
        </div>
        {subtitle ? (
          <p className={`text-slate-500 ${large ? "mt-1.5 text-sm leading-snug" : "mt-1 truncate text-xs"}`}>
            Planiranje, nalozi i izvedba za čilere i dizalice topline
          </p>
        ) : null}
      </div>
    </div>
  );
}
