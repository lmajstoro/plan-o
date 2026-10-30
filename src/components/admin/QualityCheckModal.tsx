import { FormEvent, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { CategoryTabs } from "./CategoryTabs";
import { checklistSummary } from "../../lib/qualityChecklist";
import type { ChecklistItem, ChecklistMark, WorkOrderChecklistEntry } from "../../types";

type Props = {
  title: string;
  items: ChecklistItem[];
  initialEntries: WorkOrderChecklistEntry[];
  onClose: () => void;
  onSave: (entries: WorkOrderChecklistEntry[]) => void;
};

export function QualityCheckModal({ title, items, initialEntries, onClose, onSave }: Props) {
  const [entries, setEntries] = useState<WorkOrderChecklistEntry[]>(() => initialEntries.map((entry) => ({ ...entry })));
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const rows = entries.flatMap((entry) => {
    const item = byId.get(entry.itemId);
    return item ? [{ entry, item }] : [];
  });
  const groups = rows.reduce<Array<{ category: string; rows: typeof rows }>>((list, row) => {
    const last = list[list.length - 1];
    if (!last || last.category !== row.item.category) list.push({ category: row.item.category, rows: [row] });
    else last.rows.push(row);
    return list;
  }, []);
  const summary = checklistSummary(entries);
  const [category, setCategory] = useState(groups[0]?.category ?? "");
  const active = groups.find((group) => group.category === category) ?? groups[0];

  function setMark(itemId: string, mark: ChecklistMark) {
    setEntries((current) => current.map((entry) => (entry.itemId === itemId ? { ...entry, mark } : entry)));
  }

  function save(event: FormEvent) {
    event.preventDefault();
    onSave(entries);
  }

  return (
    <Modal title={title} size="full" onClose={onClose}>
      <form onSubmit={save} className="flex h-full min-h-0 flex-col gap-3">
        <p className="shrink-0 text-sm text-slate-500">
          Označi stavku kad je provjerena. Ako je nema na uređaju, označi to umjesto potvrde.
        </p>
        <p className="shrink-0 text-sm text-slate-500">
          Potvrđeno {summary.confirmed} od {summary.applicable}
          {summary.absent > 0 ? ` · ne postoji na uređaju: ${summary.absent}` : ""}
        </p>
        <CategoryTabs
          tabs={groups.map((group) => {
            const part = checklistSummary(group.rows.map((row) => row.entry));
            return { id: group.category, label: group.category, detail: `${part.confirmed}/${part.applicable}` };
          })}
          value={active?.category ?? ""}
          onChange={setCategory}
        />
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
          <ul>
            {(active?.rows ?? []).map(({ entry, item }) => {
              const confirmed = entry.mark === "potvrdeno";
              const absent = entry.mark === "nema";
              const rowTone = confirmed ? "bg-emerald-50" : absent ? "bg-red-50" : "bg-white";
              return (
                <li key={entry.itemId} className={`flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0 ${rowTone}`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={confirmed}
                    onChange={() => setMark(item.id, confirmed ? "prazno" : "potvrdeno")}
                    aria-label={`Potvrdi ${item.code}`}
                  />
                  <div className={`min-w-0 flex-1 text-sm ${confirmed ? "text-emerald-950" : absent ? "text-red-950" : "text-slate-700"}`}>
                    <span className="font-mono font-medium">{item.code}</span> {item.description}
                  </div>
                  <button
                    type="button"
                    aria-pressed={absent}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      absent
                        ? "bg-red-600 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    onClick={() => setMark(item.id, absent ? "prazno" : "nema")}
                  >
                    Ne postoji na uređaju
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex shrink-0 justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Odustani
          </button>
          <button type="submit" className="btn-primary">
            Spremi
          </button>
        </div>
      </form>
    </Modal>
  );
}
