export function FrigoMark({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 235 272" className={className} aria-hidden="true">
      <path fill="#39B54A" d="M40 0H235V36A44 44 0 0 1 191 80H0V40A40 40 0 0 1 40 0Z" />
      <path fill="#2169AE" d="M20 96H179V132A44 44 0 0 1 135 176H0V116A20 20 0 0 1 20 96Z" />
      <path fill="#E01D44" d="M20 192H84V228A44 44 0 0 1 40 272H0V212A20 20 0 0 1 20 192Z" />
    </svg>
  );
}

export const APP_NAME = "FRIGONEX";

export function FrigoWordmark({ large = false, className = "" }: { large?: boolean; className?: string }) {
  return (
    <span className={`font-display leading-none tracking-[0.08em] text-frigo-900 ${large ? "text-3xl" : "text-lg"} ${className}`}>
      {APP_NAME}
    </span>
  );
}

export function FrigoLockup({
  size = "md",
  heading = false,
}: {
  size?: "md" | "lg";
  heading?: boolean;
}) {
  const large = size === "lg";
  const Title = heading ? "h1" : "div";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <FrigoMark className={`${large ? "h-11" : "h-8"} w-auto shrink-0`} />
      <div className="flex min-w-0 items-center gap-3">
        <div className={`${large ? "h-8" : "h-6"} w-px shrink-0 bg-slate-300`} />
        <Title>
          <FrigoWordmark large={large} />
        </Title>
      </div>
    </div>
  );
}
