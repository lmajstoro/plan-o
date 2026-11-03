import { WORK_ORDER_COLOR_LABELS, WORK_ORDER_COLORS } from "../../lib/workOrders";

export function ColorDots({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WORK_ORDER_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`h-7 w-7 rounded-full border ${
            value === color ? "border-white ring-2 ring-offset-1 ring-slate-400" : "border-slate-200"
          }`}
          style={{ backgroundColor: color }}
          aria-label={WORK_ORDER_COLOR_LABELS[color] ?? color}
        />
      ))}
    </div>
  );
}
