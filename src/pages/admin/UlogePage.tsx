import { FormEvent, useMemo, useState } from "react";
import { useDb } from "../../context/DbContext";
import { newId } from "../../lib/gantt";
import { roleUsage, sortJobRoles } from "../../lib/roles";
import { WORK_ORDER_COLOR_LABELS, WORK_ORDER_COLORS } from "../../lib/workOrders";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { EditIcon, TrashIcon } from "../../components/icons";
import { PaginationBar } from "../../components/admin/PaginationBar";
import { Field, Header } from "./ZaposleniciPage";
import { usePagedRows } from "../../lib/pagination";
import type { JobRole } from "../../types";

type FormState = { name: string; color: string };
const emptyForm: FormState = { name: "", color: WORK_ORDER_COLORS[0] };

export function UlogePage() {
  const { db, update } = useDb();
  const [editing, setEditing] = useState<JobRole | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [blockedRemove, setBlockedRemove] = useState("");

  const rows = useMemo(() => sortJobRoles(db.jobRoles), [db.jobRoles]);
  const paging = usePagedRows(rows);

  function openCreate() {
    const used = new Set(db.jobRoles.map((row) => row.color));
    const color = WORK_ORDER_COLORS.find((item) => !used.has(item)) ?? WORK_ORDER_COLORS[db.jobRoles.length % WORK_ORDER_COLORS.length];
    setForm({ ...emptyForm, color });
    setFormError("");
    setCreating(true);
  }

  function openEdit(role: JobRole) {
    setForm({ name: role.name, color: role.color });
    setFormError("");
    setEditing(role);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setFormError("");
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFormError("Unesite naziv uloge.");
      return;
    }
    const taken = db.jobRoles.some(
      (row) => row.name.localeCompare(name, "hr", { sensitivity: "accent" }) === 0 && row.id !== editing?.id,
    );
    if (taken) {
      setFormError("Uloga s tim nazivom već postoji.");
      return;
    }
    if (editing) {
      update((current) => ({
        ...current,
        jobRoles: current.jobRoles.map((row) => (row.id === editing.id ? { ...row, name, color: form.color } : row)),
      }));
      setEditing(null);
      return;
    }
    update((current) => ({
      ...current,
      jobRoles: [...current.jobRoles, { id: newId("role"), name, color: form.color }],
    }));
    setCreating(false);
  }

  function requestRemove(role: JobRole) {
    const usage = roleUsage(role.id, db.employees, db.tasks);
    if (usage.employees > 0 || usage.tasks > 0) {
      setBlockedRemove("Uloga se koristi na zaposlenicima ili zadacima i ne može se obrisati.");
      return;
    }
    setRemoveId(role.id);
  }

  function confirmRemove() {
    if (!removeId) return;
    update((current) => ({
      ...current,
      jobRoles: current.jobRoles.filter((row) => row.id !== removeId),
    }));
    setRemoveId(null);
  }

  const showForm = creating || editing;

  return (
    <div>
      <Header title="Uloge" actionLabel="Nova uloga" onAction={openCreate} />
      <p className="mb-4 text-slate-500">Šifarnik uloga za zaposlenike i zadatke. Boja se vidi na planu rada i u ostalim šifarnicima.</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Naziv</th>
              <th className="px-4 py-3 font-medium">Zaposlenika</th>
              <th className="px-4 py-3 font-medium">Zadataka</th>
              <th className="px-4 py-3 font-medium text-right">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {paging.pageRows.map((row) => {
              const usage = roleUsage(row.id, db.employees, db.tasks);
              return (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                      {row.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{usage.employees}</td>
                  <td className="px-4 py-3 text-slate-600">{usage.tasks}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="icon-btn" onClick={() => openEdit(row)} title="Uredi">
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button type="button" className="icon-btn-danger" onClick={() => requestRemove(row)} title="Obriši">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
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

      {showForm ? (
        <Modal title={editing ? "Uredi ulogu" : "Nova uloga"} onClose={closeForm}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Naziv">
              <input className="input" required value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormError(""); }} />
            </Field>
            <Field label="Boja">
              <div className="flex flex-wrap gap-2">
                {WORK_ORDER_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className={`flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium ${
                      form.color === color ? "border-slate-400 ring-2 ring-offset-1 ring-slate-400" : "border-slate-200"
                    }`}
                    style={{ backgroundColor: color, color: "#fff" }}
                    aria-label={WORK_ORDER_COLOR_LABELS[color] ?? color}
                  >
                    {WORK_ORDER_COLOR_LABELS[color] ?? color}
                  </button>
                ))}
              </div>
            </Field>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={closeForm}>
                Odustani
              </button>
              <button type="submit" className="btn-primary">Spremi</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {removeId ? (
        <ConfirmDialog
          title="Obriši ulogu"
          message="Uloga će se ukloniti iz šifarnika."
          onClose={() => setRemoveId(null)}
          onConfirm={confirmRemove}
        />
      ) : null}

      {blockedRemove ? (
        <Modal title="Uloga se ne može obrisati" onClose={() => setBlockedRemove("")}>
          <p className="text-slate-600">{blockedRemove}</p>
          <div className="mt-5 flex justify-end">
            <button type="button" className="btn-primary" onClick={() => setBlockedRemove("")}>
              U redu
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
