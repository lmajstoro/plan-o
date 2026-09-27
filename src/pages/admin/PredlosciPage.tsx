import { FormEvent, useMemo, useState } from "react";
import { useDb } from "../../context/DbContext";
import { newId } from "../../lib/gantt";
import { sortTemplates, templateUsage, WORK_ORDER_COLORS } from "../../lib/workOrders";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { TaskPicker } from "../../components/admin/TaskPicker";
import { EditIcon, TrashIcon } from "../../components/icons";
import { Field, Header } from "./ZaposleniciPage";
import type { WorkOrderTemplate } from "../../types";

type FormState = { name: string; color: string; taskIds: string[] };
const emptyForm: FormState = { name: "", color: WORK_ORDER_COLORS[0], taskIds: [] };

export function PredlosciPage() {
  const { db, update } = useDb();
  const [editing, setEditing] = useState<WorkOrderTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [blockedRemove, setBlockedRemove] = useState("");

  const rows = useMemo(() => sortTemplates(db.workOrderTemplates), [db.workOrderTemplates]);

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setFormError("");
  }

  function openCreate() {
    setForm({
      ...emptyForm,
      color: WORK_ORDER_COLORS[db.workOrderTemplates.length % WORK_ORDER_COLORS.length],
    });
    setFormError("");
    setCreating(true);
  }

  function openEdit(template: WorkOrderTemplate) {
    setForm({ name: template.name, color: template.color, taskIds: [...template.taskIds] });
    setFormError("");
    setEditing(template);
  }

  function toggleTask(id: string) {
    setForm((current) => ({
      ...current,
      taskIds: current.taskIds.includes(id)
        ? current.taskIds.filter((taskId) => taskId !== id)
        : [...current.taskIds, id],
    }));
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFormError("Unesite naziv predloška.");
      return;
    }
    if (form.taskIds.length === 0) {
      setFormError("Odaberite barem jedan zadatak koji novi nalog nasljeđuje.");
      return;
    }
    const taken = db.workOrderTemplates.some(
      (row) => row.name.localeCompare(name, "hr", { sensitivity: "accent" }) === 0 && row.id !== editing?.id,
    );
    if (taken) {
      setFormError("Predložak s tim nazivom već postoji.");
      return;
    }
    if (editing) {
      update((current) => ({
        ...current,
        workOrderTemplates: current.workOrderTemplates.map((row) =>
          row.id === editing.id ? { ...row, name, color: form.color, taskIds: form.taskIds } : row,
        ),
      }));
      setEditing(null);
      return;
    }
    update((current) => ({
      ...current,
      workOrderTemplates: [...current.workOrderTemplates, { id: newId("tpl"), name, color: form.color, taskIds: form.taskIds }],
    }));
    setCreating(false);
  }

  function requestRemove(template: WorkOrderTemplate) {
    if (templateUsage(template.id, db.workOrders) > 0) {
      setBlockedRemove("Predložak se koristi na radnim nalozima i ne može se obrisati.");
      return;
    }
    setRemoveId(template.id);
  }

  function confirmRemove() {
    if (!removeId) return;
    update((current) => ({
      ...current,
      workOrderTemplates: current.workOrderTemplates.filter((row) => row.id !== removeId),
    }));
    setRemoveId(null);
  }

  const showForm = creating || editing;

  return (
    <div>
      <Header title="Predlošci" actionLabel="Novi predložak" onAction={openCreate} />
      <p className="mb-4 text-slate-500">
        Tipovi uređaja iz kojih se kreira radni nalog. Boja na planu dolazi s predloška, npr. svaki CO2 je narančast.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Naziv</th>
              <th className="px-4 py-3 font-medium">Zadataka</th>
              <th className="px-4 py-3 font-medium">Naloga</th>
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
                <td className="px-4 py-3 text-slate-600">{row.taskIds.length}</td>
                <td className="px-4 py-3 text-slate-600">{templateUsage(row.id, db.workOrders)}</td>
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
            ))}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <Modal title={editing ? "Uredi predložak" : "Novi predložak"} wide onClose={closeForm}>
          <form onSubmit={save} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <Field label="Naziv">
              <input className="input" required value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormError(""); }} />
            </Field>
            <Field label="Boja na planu">
              <div className="flex flex-wrap gap-2">
                {WORK_ORDER_COLORS.map((color) => (
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
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Zadaci koje nalog nasljeđuje</span>
              <p className="mb-2 text-xs text-slate-500">Zadaci se uređuju u šifarniku Zadaci. Ovdje odaberi zadane zadatke predloška.</p>
              <TaskPicker tasks={db.tasks} jobRoles={db.jobRoles} selectedIds={form.taskIds} onToggle={toggleTask} />
            </div>
            {formError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={closeForm}>Odustani</button>
              <button type="submit" className="btn-primary">Spremi</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {removeId ? (
        <ConfirmDialog
          title="Obriši predložak"
          message="Predložak će se ukloniti iz šifarnika. Postojeći nalozi ostaju."
          onClose={() => setRemoveId(null)}
          onConfirm={confirmRemove}
        />
      ) : null}

      {blockedRemove ? (
        <Modal title="Predložak se ne može obrisati" onClose={() => setBlockedRemove("")}>
          <p className="text-slate-600">{blockedRemove}</p>
          <div className="mt-5 flex justify-end">
            <button type="button" className="btn-primary" onClick={() => setBlockedRemove("")}>U redu</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
