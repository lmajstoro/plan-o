import { FormEvent, useMemo, useState } from "react";
import { useDb } from "../../context/DbContext";
import { newId } from "../../lib/gantt";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { EditIcon, TrashIcon } from "../../components/icons";
import { Field, Header } from "./ZaposleniciPage";
import type { WorkGroup } from "../../types";

const COLORS = ["#2563eb", "#0d9488", "#d97706", "#7c3aed", "#e11d48", "#0284c7", "#65a30d"];

type FormState = { name: string; color: string };
const emptyForm: FormState = { name: "", color: COLORS[0] };

export function RadneSkupinePage() {
  const { db, update } = useDb();
  const [editing, setEditing] = useState<WorkGroup | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const rows = useMemo(
    () => [...db.workGroups].sort((a, b) => a.name.localeCompare(b.name, "hr")),
    [db.workGroups],
  );

  function openCreate() {
    setForm({ ...emptyForm, color: COLORS[db.workGroups.length % COLORS.length] });
    setCreating(true);
  }

  function openEdit(group: WorkGroup) {
    setForm({ name: group.name, color: group.color });
    setEditing(group);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (editing) {
      update((current) => ({
        ...current,
        workGroups: current.workGroups.map((row) => (row.id === editing.id ? { ...row, ...form } : row)),
      }));
      setEditing(null);
      return;
    }
    update((current) => ({
      ...current,
      workGroups: [...current.workGroups, { id: newId("wg"), ...form }],
    }));
    setCreating(false);
  }

  function confirmRemove() {
    if (!removeId) return;
    update((current) => ({
      ...current,
      workGroups: current.workGroups.filter((row) => row.id !== removeId),
      employees: current.employees.map((row) => ({
        ...row,
        groupIds: row.groupIds.filter((id) => id !== removeId),
      })),
    }));
    setRemoveId(null);
  }

  const showForm = creating || editing;

  return (
    <div>
      <Header title="Radne skupine" actionLabel="Nova radna skupina" onAction={openCreate} />
      <p className="mb-4 text-slate-500">Oznake za filtriranje zaposlenika. Jedan radnik može pripadati više skupina.</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Naziv</th>
              <th className="px-4 py-3 font-medium">Zaposlenika</th>
              <th className="px-4 py-3 font-medium text-right">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                    {row.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {db.employees.filter((employee) => employee.groupIds.includes(row.id)).length}
                </td>
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
        <Modal title={editing ? "Uredi radnu skupinu" : "Nova radna skupina"} onClose={() => { setCreating(false); setEditing(null); }}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Naziv">
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Boja">
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className={`h-8 w-8 rounded-full ${form.color === color ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                  />
                ))}
              </div>
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
          title="Obriši radnu skupinu"
          message="Skupina će se ukloniti sa svih zaposlenika. Rasporedi ostaju."
          onClose={() => setRemoveId(null)}
          onConfirm={confirmRemove}
        />
      ) : null}
    </div>
  );
}
