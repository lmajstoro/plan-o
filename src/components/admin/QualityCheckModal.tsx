import { FormEvent, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { CategoryTabs } from "./CategoryTabs";
import { PaginationBar } from "./PaginationBar";
import { checklistSummary } from "../../lib/qualityChecklist";
import { usePagedRows } from "../../lib/pagination";
import type { ChecklistItem, ChecklistMark, WorkOrderChecklistEntry } from "../../types";

type Props = {
  title?: string;
  items: ChecklistItem[];
  initialEntries: WorkOrderChecklistEntry[];
  onClose?: () => void;
  onSave: (entries: WorkOrderChecklistEntry[]) => void;
  embedded?: boolean;
};

export function QualityCheckModal({ title, items, initialEntries, onClose, onSave, embedded = false }: Props) {
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
  const paging = usePagedRows(active?.rows ?? []);

  function setMark(itemId: string, mark: ChecklistMark) {
    setEntries((current) => current.map((entry) => (entry.itemId === itemId ? { ...entry, mark } : entry)));
  }

  function save(event: FormEvent) {
    event.preventDefault();
    onSave(entries);
  }

  function discard() {
    if (onClose) onClose();
    else setEntries(initialEntries.map((entry) => ({ ...entry })));
  }

  const form = (
      <form onSubmit={save} className={embedded ? "flex flex-col gap-3" : "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"}>
        <p className="text-sm text-slate-500">
          Označi stavku kad je provjerena. Ako je nema na uređaju, označi to umjesto potvrde.
        </p>
        <p className="text-sm text-slate-500">
          Potvrđeno {summary.confirmed} od {summary.applicable}
          {summary.absent > 0 ? ` · ne postoji na uređaju: ${summary.absent}` : ""}
        </p>
        <CategoryTabs
          tabs={groups.map((group) => {
            const part = checklistSummary(group.rows.map((row) => row.entry));
            return { id: group.category, label: group.category, detail: `${part.confirmed}/${part.applicable}` };
          })}
          value={active?.category ?? ""}
          onChange={(next) => {
            setCategory(next);
            paging.setPage(1);
          }}
        />
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3 font-medium">
                  <span className="sr-only">Potvrda</span>
                </th>
                <th className="px-4 py-3 font-medium">Šifra</th>
                <th className="px-4 py-3 font-medium">Opis</th>
                <th className="px-4 py-3 text-right font-medium">Uređaj</th>
              </tr>
            </thead>
            <tbody>
              {paging.pageRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Nema stavki u ovoj kategoriji.
                  </td>
                </tr>
              ) : (
                paging.pageRows.map(({ entry, item }) => {
                  const confirmed = entry.mark === "potvrdeno";
                  const absent = entry.mark === "nema";
                  const rowTone = confirmed ? "bg-emerald-50" : absent ? "bg-red-50" : "bg-white";
                  return (
                    <tr key={entry.itemId} className={`border-b border-slate-50 last:border-0 ${rowTone}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-emerald-600"
                          checked={confirmed}
                          onChange={() => setMark(item.id, confirmed ? "prazno" : "potvrdeno")}
                          aria-label={`Potvrdi ${item.code}`}
                        />
                      </td>
                      <td className={`px-4 py-3 font-mono font-medium ${confirmed ? "text-emerald-950" : absent ? "text-red-950" : "text-slate-900"}`}>
                        {item.code}
                      </td>
                      <td className={`px-4 py-3 ${confirmed ? "text-emerald-950" : absent ? "text-red-950" : "text-slate-700"}`}>
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          aria-pressed={absent}
                          className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-medium leading-none ${
                            absent
                              ? "bg-red-600 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                          onClick={() => setMark(item.id, absent ? "prazno" : "nema")}
                        >
                          Ne postoji na uređaju
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <PaginationBar
            page={paging.page}
            totalPages={paging.totalPages}
            from={paging.from}
            to={paging.to}
            total={paging.total}
            onPage={paging.setPage}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={discard}>
            Odustani
          </button>
          <button type="submit" className="btn-primary">
            Spremi
          </button>
        </div>
      </form>
  );

  if (embedded) return <div className="h-full overflow-y-auto">{form}</div>;
  return (
    <Modal title={title ?? "Kontrola kvalitete"} size="picker" onClose={discard}>
      {form}
    </Modal>
  );
}
