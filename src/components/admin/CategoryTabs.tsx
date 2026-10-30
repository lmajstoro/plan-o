type Tab = {
  id: string;
  label: string;
  detail?: string;
};

type Props = {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
};

export function CategoryTabs({ tabs, value, onChange }: Props) {
  return (
    <div role="tablist" className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`rounded-lg px-3 py-1.5 text-left text-sm font-medium ${
              selected ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {tab.detail ? <span className={`ml-2 tabular-nums ${selected ? "text-blue-100" : "text-slate-400"}`}>{tab.detail}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
