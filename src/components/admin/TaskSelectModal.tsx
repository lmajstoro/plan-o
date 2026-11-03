import { FormEvent, useMemo, useState } from "react";
import { PaginationBar } from "./PaginationBar";
import { Modal } from "../ui/Modal";
import { usePagedRows } from "../../lib/pagination";
import { roleColor, roleName } from "../../lib/roles";
import type { JobRole, Task } from "../../types";

type Props = {
  title?: string;
  description?: string;
  tasks: Task[];
  jobRoles: JobRole[];
  initialSelectedIds: string[];
  onClose?: () => void;
  onSave: (taskIds: string[]) => void;
  embedded?: boolean;
};

function matchesQuery(task: Task, jobRoles: JobRole[], query: string): boolean {
  if (!query) return true;
  const haystack = [task.code, task.description, roleName(jobRoles, task.role)].join(" ").toLowerCase();
  return haystack.includes(query);
}

export function TaskSelectModal({
  title,
  description,
  tasks,
  jobRoles,
  initialSelectedIds,
  onClose,
  onSave,
  embedded = false,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => [...initialSelectedIds]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const rows = useMemo(
    () => [...tasks].sort((a, b) => a.code.localeCompare(b.code, "hr")),
    [tasks],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visible = useMemo(
    () => rows.filter((task) => matchesQuery(task, jobRoles, normalizedQuery)),
    [rows, jobRoles, normalizedQuery],
  );
  const paging = usePagedRows(visible);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleSelectedCount = visible.filter((task) => selectedSet.has(task.id)).length;
  const allVisibleSelected = visible.length > 0 && visibleSelectedCount === visible.length;

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((taskId) => taskId !== id) : [...current, id],
    );
    setError("");
  }

  function toggleVisible() {
    const visibleIds = visible.map((task) => task.id);
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
      setError("Odaberite barem jedan zadatak.");
      return;
    }
    onSave(selectedIds);
  }

  function discard() {
    if (onClose) onClose();
    else {
      setSelectedIds([...initialSelectedIds]);
      setError("");
    }
  }

  const form = (
      <form onSubmit={save} className={embedded ? "flex flex-col gap-3" : "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"}>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            className="input max-w-md"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              paging.setPage(1);
            }}
            placeholder="Pretraži šifru, opis ili ulogu"
            aria-label="Pretraži zadatke"
          />
          <p className="text-sm text-slate-500">
            Odabrano {selectedIds.length} od {rows.length}
            {normalizedQuery ? ` · prikazano ${visible.length}` : ""}
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Nema zadataka. Dodajte ih u šifarniku Zadaci.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
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
                  <th className="px-4 py-3 font-medium">Uloga</th>
                </tr>
              </thead>
              <tbody>
                {paging.pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Nema zadataka za taj upit.
                    </td>
                  </tr>
                ) : (
                  paging.pageRows.map((task) => (
                    <tr key={task.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(task.id)}
                          onChange={() => toggle(task.id)}
                          aria-label={task.code}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-900">{task.code}</td>
                      <td className="px-4 py-3 text-slate-700">{task.description}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: roleColor(jobRoles, task.role) }} />
                          {roleName(jobRoles, task.role)}
                        </span>
                      </td>
                    </tr>
                  ))
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
        )}
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
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
    <Modal title={title ?? "Zadaci"} size="picker" onClose={discard}>
      {form}
    </Modal>
  );
}
