import { FormEvent, useMemo, useState } from "react";
import { useDb } from "../../context/DbContext";
import { newId } from "../../lib/gantt";
import { defaultRoleId, roleName, sortJobRoles } from "../../lib/roles";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { EditIcon, TrashIcon } from "../../components/icons";
import { Field, Header } from "./ZaposleniciPage";
import type { Task } from "../../types";

type FormState = { code: string; description: string; role: string };
const emptyForm: FormState = { code: "", description: "", role: "" };

export function ZadaciPage() {
  const { db, update } = useDb();
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);

  const rows = useMemo(
    () => [...db.tasks].sort((a, b) => a.code.localeCompare(b.code, "hr")),
    [db.tasks],
  );

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setFormError("");
  }

  function openCreate() {
    setForm({ ...emptyForm, role: defaultRoleId(db.jobRoles) });
    setFormError("");
    setCreating(true);
  }

  function openEdit(task: Task) {
    setForm({ code: task.code, description: task.description, role: task.role });
    setFormError("");
    setEditing(task);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const code = form.code.trim();
    const description = form.description.trim();
    if (!form.role || !code || !description) {
      setFormError("Unesite šifru, opis i ulogu.");
      return;
    }
    const taken = db.tasks.some(
      (row) => row.code.localeCompare(code, "hr", { sensitivity: "accent" }) === 0 && row.id !== editing?.id,
    );
    if (taken) {
      setFormError("Zadatak s tom šifrom već postoji.");
      return;
    }
    const next = { code, description, role: form.role };
    if (editing) {
      update((current) => ({
        ...current,
        tasks: current.tasks.map((row) => (row.id === editing.id ? { ...row, ...next } : row)),
      }));
      setEditing(null);
      return;
    }
    update((current) => ({
      ...current,
      tasks: [...current.tasks, { id: newId("task"), ...next }],
    }));
    setCreating(false);
  }

  function confirmRemove() {
    if (!removeId) return;
    update((current) => ({
      ...current,
      tasks: current.tasks.filter((row) => row.id !== removeId),
      assignments: current.assignments.filter((row) => row.taskId !== removeId),
      workOrders: current.workOrders.map((order) => ({
        ...order,
        taskIds: (order.taskIds ?? []).filter((id) => id !== removeId),
      })),
      workOrderTemplates: current.workOrderTemplates.map((template) => ({
        ...template,
        taskIds: template.taskIds.filter((id) => id !== removeId),
      })),
    }));
    setRemoveId(null);
  }

  const showForm = creating || editing;

  return (
    <div>
      <Header title="Zadaci" actionLabel="Novi zadatak" onAction={openCreate} />
      <p className="mb-4 text-slate-500">Šifarnik zadataka. Radni nalozi samo biraju postojeće zadatke; uređivanje je ovdje.</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Šifra</th>
              <th className="px-4 py-3 font-medium">Opis</th>
              <th className="px-4 py-3 font-medium">Uloga</th>
              <th className="px-4 py-3 font-medium text-right">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">{row.code}</td>
                <td className="px-4 py-3 text-slate-700">{row.description}</td>
                <td className="px-4 py-3">{roleName(db.jobRoles, row.role)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="icon-btn" onClick={() => openEdit(row)} title="Uredi">
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <button type="button" className="icon-btn-danger" onClick={() => setRemoveId(row.id)} title="Obriši">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <Modal title={editing ? "Uredi zadatak" : "Novi zadatak"} onClose={closeForm}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Šifra">
              <input className="input" required value={form.code} onChange={(e) => { setForm({ ...form, code: e.target.value }); setFormError(""); }} />
            </Field>
            <Field label="Opis">
              <textarea
                className="input min-h-[88px]"
                required
                value={form.description}
                onChange={(e) => { setForm({ ...form, description: e.target.value }); setFormError(""); }}
              />
            </Field>
            <Field label="Uloga">
              {db.jobRoles.length === 0 ? (
                <p className="text-sm text-slate-500">Nema uloga. Dodajte ih u šifarniku Uloge.</p>
              ) : (
                <select className="input" required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {sortJobRoles(db.jobRoles).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              )}
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
          title="Obriši zadatak"
          message="Zadatak će se ukloniti iz šifarnika, radnih naloga i postojećih planova rada."
          onClose={() => setRemoveId(null)}
          onConfirm={confirmRemove}
        />
      ) : null}
    </div>
  );
}
