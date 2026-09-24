import { FormEvent, useMemo, useState } from "react";
import { useDb } from "../../context/DbContext";
import { ROLE_LABELS, ROLES } from "../../lib/dates";
import { newId } from "../../lib/gantt";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { EditIcon, TrashIcon } from "../../components/icons";
import { Field, Header } from "./ZaposleniciPage";
import type { Role, Task } from "../../types";

type FormState = { code: string; name: string; role: Role };
const emptyForm: FormState = { code: "", name: "", role: "montazer" };

export function ZadaciPage() {
  const { db, update } = useDb();
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const rows = useMemo(
    () => [...db.tasks].sort((a, b) => a.code.localeCompare(b.code, "hr")),
    [db.tasks],
  );

  function openCreate() {
    setForm(emptyForm);
    setCreating(true);
  }

  function openEdit(task: Task) {
    setForm({ code: task.code, name: task.name, role: task.role });
    setEditing(task);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (editing) {
      update((current) => ({
        ...current,
        tasks: current.tasks.map((row) => (row.id === editing.id ? { ...row, ...form } : row)),
      }));
      setEditing(null);
      return;
    }
    update((current) => ({
      ...current,
      tasks: [...current.tasks, { id: newId("task"), ...form }],
    }));
    setCreating(false);
  }

  function confirmRemove() {
    if (!removeId) return;
    update((current) => ({
      ...current,
      tasks: current.tasks.filter((row) => row.id !== removeId),
      assignments: current.assignments.filter((row) => row.taskId !== removeId),
    }));
    setRemoveId(null);
  }

  const showForm = creating || editing;

  return (
    <div>
      <Header title="Zadaci" actionLabel="Novi zadatak" onAction={openCreate} />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Šifra</th>
              <th className="px-4 py-3 font-medium">Naziv</th>
              <th className="px-4 py-3 font-medium">Uloga</th>
              <th className="px-4 py-3 font-medium text-right">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">{row.code}</td>
                <td className="px-4 py-3 text-slate-700">{row.name}</td>
                <td className="px-4 py-3">{ROLE_LABELS[row.role]}</td>
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
        <Modal title={editing ? "Uredi zadatak" : "Novi zadatak"} onClose={() => { setCreating(false); setEditing(null); }}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Šifra">
              <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Naziv">
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Uloga">
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => { setCreating(false); setEditing(null); }}>
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
          message="Zadatak će se ukloniti i iz postojećih planova rada."
          onClose={() => setRemoveId(null)}
          onConfirm={confirmRemove}
        />
      ) : null}
    </div>
  );
}
