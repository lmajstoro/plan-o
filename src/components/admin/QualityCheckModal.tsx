import { FormEvent, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
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
  const summary = checklistSummary(entries);

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
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
          <ul>
            {rows.map(({ entry, item }) => {
              const absent = entry.mark === "nema";
              return (
                <li key={entry.itemId} className="flex items-center gap-3 border-b border-slate-50 px-4 py-2.5 last:border-0">
                  <input
                    type="checkbox"
                    checked={entry.mark === "potvrdeno"}
                    onChange={() => setMark(item.id, entry.mark === "potvrdeno" ? "prazno" : "potvrdeno")}
                    aria-label={`Potvrdi ${item.code}`}
                  />
                  <div className={`min-w-0 flex-1 text-sm ${absent ? "text-slate-400" : "text-slate-700"}`}>
                    <span className="font-mono font-medium text-slate-900">{item.code}</span> {item.description}
                  </div>
                  <button
                    type="button"
                    aria-pressed={absent}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      absent ? "bg-slate-800 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
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
