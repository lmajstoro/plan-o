import { FormEvent, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import type { ChecklistItem } from "../../types";

type Props = {
  title: string;
  description?: string;
  items: ChecklistItem[];
  initialSelectedIds: string[];
  onClose: () => void;
  onSave: (itemIds: string[]) => void;
};

function matchesQuery(item: ChecklistItem, query: string): boolean {
  if (!query) return true;
  return `${item.code} ${item.description}`.toLowerCase().includes(query);
}

export function ChecklistSelectModal({
  title,
  description,
  items,
  initialSelectedIds,
  onClose,
  onSave,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => [...initialSelectedIds]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const rows = useMemo(
    () => [...items].sort((a, b) => a.code.localeCompare(b.code, "hr")),
    [items],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visible = useMemo(
    () => rows.filter((item) => matchesQuery(item, normalizedQuery)),
    [rows, normalizedQuery],
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleSelectedCount = visible.filter((item) => selectedSet.has(item.id)).length;
  const allVisibleSelected = visible.length > 0 && visibleSelectedCount === visible.length;

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));
    setError("");
  }

  function toggleVisible() {
    const visibleIds = visible.map((item) => item.id);
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      const next = new Set(current);
      for (const id of visibleIds) next.add(id);
      return [...next];
    });
    setError("");
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (selectedIds.length === 0) {
      setError("Odaberite barem jednu stavku.");
      return;
    }
    onSave(selectedIds);
  }

  return (
    <Modal title={title} size="full" onClose={onClose}>
      <form onSubmit={save} className="flex h-full min-h-0 flex-col gap-3">
        {description ? <p className="shrink-0 text-sm text-slate-500">{description}</p> : null}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <input
            className="input max-w-md"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pretraži šifru ili opis"
            aria-label="Pretraži stavke kontrole kvalitete"
          />
          <p className="text-sm text-slate-500">
            Odabrano {selectedIds.length} od {rows.length}
            {normalizedQuery ? ` · prikazano ${visible.length}` : ""}
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="shrink-0 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Nema stavki. Dodajte ih u šifarniku Checkliste.
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 border-b border-slate-100 bg-slate-50 text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleVisible}
                      disabled={visible.length === 0}
                      aria-label="Odaberi sve prikazane"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Šifra</th>
                  <th className="px-4 py-3 font-medium">Opis</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                      Nema stavki za taj upit.
                    </td>
                  </tr>
                ) : (
                  visible.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(item.id)}
                          onChange={() => toggle(item.id)}
                          aria-label={item.code}
                        />
                      </td>
                      <td className="px-4 py-2.5 font-mono font-medium text-slate-900">{item.code}</td>
                      <td className="px-4 py-2.5 text-slate-700">{item.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {error ? <p className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
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
