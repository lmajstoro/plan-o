import { FormEvent, useMemo, useState } from "react";
import { useDb } from "../../context/DbContext";
import { newId } from "../../lib/gantt";
import {
  sortWorkOrders,
  taskRoleGroups,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUSES,
  workOrderStatusClass,
} from "../../lib/workOrders";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { ArchiveIcon, EditIcon, TrashIcon } from "../../components/icons";
import { Field, Header } from "./ZaposleniciPage";
import type { WorkOrder, WorkOrderStatus } from "../../types";

const COLORS = ["#2563eb", "#7c3aed", "#0d9488", "#d97706", "#e11d48", "#0284c7", "#65a30d", "#c026d3"];

type FormState = {
  code: string;
  name: string;
  description: string;
  color: string;
  status: WorkOrderStatus;
  archived: boolean;
  taskIds: string[];
};

const emptyForm: FormState = {
  code: "",
  name: "",
  description: "",
  color: COLORS[0],
  status: "otvoren",
  archived: false,
  taskIds: [],
};

export function RadniNaloziPage() {
  const { db, update } = useDb();
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);

  const rows = useMemo(() => sortWorkOrders(db.workOrders), [db.workOrders]);
  const taskGroups = useMemo(() => taskRoleGroups(db.tasks), [db.tasks]);

  function openCreate() {
    setForm({ ...emptyForm, color: COLORS[db.workOrders.length % COLORS.length] });
    setFormError("");
    setCreating(true);
  }

  function openEdit(order: WorkOrder) {
    setForm({
      code: order.code,
      name: order.name,
      description: order.description,
      color: order.color,
      status: order.status ?? "otvoren",
      archived: Boolean(order.archived),
      taskIds: [...(order.taskIds ?? [])],
    });
    setFormError("");
    setEditing(order);
  }

  function toggleTask(id: string) {
    setForm((current) => ({
      ...current,
      taskIds: current.taskIds.includes(id)
        ? current.taskIds.filter((taskId) => taskId !== id)
        : [...current.taskIds, id],
    }));
  }

  function toggleArchived(order: WorkOrder) {
    update((current) => ({
      ...current,
      workOrders: current.workOrders.map((row) =>
        row.id === order.id ? { ...row, archived: !row.archived } : row,
      ),
    }));
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (form.taskIds.length === 0) {
      setFormError("Odaberi barem jedan zadatak koji se smije raditi na ovom nalogu.");
      return;
    }
    if (editing) {
      update((current) => ({
        ...current,
        workOrders: current.workOrders.map((row) => (row.id === editing.id ? { ...row, ...form } : row)),
      }));
      setEditing(null);
      return;
    }
    update((current) => ({
      ...current,
      workOrders: [...current.workOrders, { id: newId("wo"), ...form }],
    }));
    setCreating(false);
  }

  function confirmRemove() {
    if (!removeId) return;
    update((current) => ({
      ...current,
      workOrders: current.workOrders.filter((row) => row.id !== removeId),
      assignments: current.assignments.filter((row) => row.workOrderId !== removeId),
    }));
    setRemoveId(null);
  }

  const showForm = creating || editing;

  return (
    <div>
      <Header title="Radni nalozi" actionLabel="Novi radni nalog" onAction={openCreate} />
      <p className="mb-4 text-slate-500">
        Status prati život naloga. Arhivirani nalozi idu na dno i ne nude se pri unosu sati.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Šifra</th>
              <th className="px-4 py-3 font-medium">Naziv</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Zadaci</th>
              <th className="px-4 py-3 font-medium text-right">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={`border-b border-slate-50 last:border-0 ${row.archived ? "bg-slate-50 text-slate-500" : ""}`}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-mono font-medium text-slate-900">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                    {row.code}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{row.name}</div>
                  <div className="text-xs text-slate-500">{row.description}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${workOrderStatusClass(row.status ?? "otvoren", Boolean(row.archived))}`}>
                    {row.archived ? "Arhiviran" : (WORK_ORDER_STATUS_LABELS[row.status] ?? "Otvoren")}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{row.taskIds?.length ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => toggleArchived(row)}
                      title={row.archived ? "Vrati iz arhive" : "Arhiviraj"}
                    >
                      <ArchiveIcon className="h-4 w-4" />
                    </button>
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
        <Modal
          title={editing ? "Uredi radni nalog" : "Novi radni nalog"}
          wide
          onClose={() => {
            setCreating(false);
            setEditing(null);
            setFormError("");
          }}
        >
          <form onSubmit={save} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Šifra">
                <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </Field>
              <Field label="Status">
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as WorkOrderStatus })}
                >
                  {WORK_ORDER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {WORK_ORDER_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Naziv">
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Opis">
              <textarea className="input min-h-[88px]" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Boja na planu">
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
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Dostupni zadaci</span>
              <p className="mb-2 text-xs text-slate-500">Samo ovi zadaci mogu se planirati i prijaviti na ovom nalogu.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {taskGroups.map((group) => (
                  <div key={group.role} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</div>
                    <div className="space-y-1.5">
                      {group.tasks.map((task) => (
                        <label key={task.id} className="flex items-start gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={form.taskIds.includes(task.id)}
                            onChange={() => toggleTask(task.id)}
                          />
                          <span>
                            <span className="font-mono text-slate-500">{task.code}</span> {task.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.archived}
                onChange={(event) => setForm({ ...form, archived: event.target.checked })}
              />
              Arhiviraj nalog (ne nudi se pri unosu sati)
            </label>
            {formError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                  setFormError("");
                }}
              >
                Odustani
              </button>
              <button type="submit" className="btn-primary">
                Spremi
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {removeId ? (
        <ConfirmDialog
          title="Obriši radni nalog"
          message="Nalog će se ukloniti i iz postojećih planova rada."
          onClose={() => setRemoveId(null)}
          onConfirm={confirmRemove}
        />
      ) : null}
    </div>
  );
}
