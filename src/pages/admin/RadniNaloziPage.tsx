import { FormEvent, useMemo, useState } from "react";
import { useDb } from "../../context/DbContext";
import { newId } from "../../lib/gantt";
import {
  nextWorkOrderCode,
  sortTemplates,
  sortWorkOrders,
  templateName,
  workOrderColor,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUSES,
  workOrderStatusClass,
} from "../../lib/workOrders";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { TaskPicker } from "../../components/admin/TaskPicker";
import { PaginationBar } from "../../components/admin/PaginationBar";
import { ArchiveIcon, EditIcon, ListChecksIcon, TrashIcon } from "../../components/icons";
import { Field, Header } from "./ZaposleniciPage";
import { usePagedRows } from "../../lib/pagination";
import type { WorkOrder, WorkOrderStatus } from "../../types";

type FormState = {
  code: string;
  name: string;
  description: string;
  templateId: string;
  status: WorkOrderStatus;
  archived: boolean;
};

const emptyForm: FormState = {
  code: "",
  name: "",
  description: "",
  templateId: "",
  status: "otvoren",
  archived: false,
};

export function RadniNaloziPage() {
  const { db, update } = useDb();
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<WorkOrder | null>(null);
  const [tasksOrder, setTasksOrder] = useState<WorkOrder | null>(null);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [taskError, setTaskError] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const templates = useMemo(() => sortTemplates(db.workOrderTemplates), [db.workOrderTemplates]);
  const selectedTemplate = templates.find((row) => row.id === form.templateId);
  const rows = useMemo(() => {
    const sorted = sortWorkOrders(db.workOrders);
    return showArchived ? sorted : sorted.filter((row) => !row.archived);
  }, [db.workOrders, showArchived]);
  const paging = usePagedRows(rows);
  const archivedCount = db.workOrders.filter((row) => row.archived).length;

  function openCreate() {
    const first = templates[0];
    setForm({
      ...emptyForm,
      code: nextWorkOrderCode(db.workOrders),
      templateId: first?.id ?? "",
    });
    setFormError("");
    setCreating(true);
  }

  function openEdit(order: WorkOrder) {
    setForm({
      code: order.code,
      name: order.name,
      description: order.description,
      templateId: order.templateId,
      status: order.status ?? "otvoren",
      archived: Boolean(order.archived),
    });
    setFormError("");
    setEditing(order);
  }

  function openTasks(order: WorkOrder) {
    setTaskIds([...(order.taskIds ?? [])]);
    setTaskError("");
    setTasksOrder(order);
  }

  function closeTasks() {
    setTasksOrder(null);
    setTaskError("");
  }

  function toggleTask(id: string) {
    setTaskIds((current) =>
      current.includes(id) ? current.filter((taskId) => taskId !== id) : [...current, id],
    );
    setTaskError("");
  }

  function saveTasks(event: FormEvent) {
    event.preventDefault();
    if (!tasksOrder) return;
    if (taskIds.length === 0) {
      setTaskError("Odaberite barem jedan zadatak koji se smije raditi na ovom nalogu.");
      return;
    }
    update((current) => ({
      ...current,
      workOrders: current.workOrders.map((row) => (row.id === tasksOrder.id ? { ...row, taskIds } : row)),
    }));
    closeTasks();
  }

  function requestArchiveToggle(order: WorkOrder) {
    if (order.archived) {
      toggleArchived(order);
      return;
    }
    setArchiveTarget(order);
  }

  function confirmArchive() {
    if (!archiveTarget) return;
    toggleArchived(archiveTarget);
    setArchiveTarget(null);
  }

  function toggleArchived(order: WorkOrder) {
    update((current) => ({
      ...current,
      workOrders: current.workOrders.map((row) =>
        row.id === order.id ? { ...row, archived: !row.archived } : row,
      ),
    }));
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setFormError("");
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (!form.templateId) {
      setFormError("Odaberite predložak. Boja i zadaci dolaze s predloška.");
      return;
    }
    const color = selectedTemplate?.color ?? "#334155";
    if (editing) {
      update((current) => ({
        ...current,
        workOrders: current.workOrders.map((row) =>
          row.id === editing.id ? { ...row, ...form, color } : row,
        ),
      }));
      setEditing(null);
      return;
    }
    const inheritedTaskIds = [...(selectedTemplate?.taskIds ?? [])];
    if (inheritedTaskIds.length === 0) {
      setFormError("Predložak nema zadataka. Dodajte ih na predlošku pa kreirajte nalog.");
      return;
    }
    update((current) => ({
      ...current,
      workOrders: [
        ...current.workOrders,
        { id: newId("wo"), ...form, color, taskIds: inheritedTaskIds },
      ],
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-500">
          Novi nalog se kreira iz predloška i dobiva broj RN. Zadaci se uređuju zasebno na nalogu.
        </p>
        <button
          type="button"
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
            showArchived ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
          onClick={() => setShowArchived((current) => !current)}
        >
          {showArchived ? "Sakrij arhivirane" : `Prikaži arhivirane${archivedCount ? ` (${archivedCount})` : ""}`}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Radni nalog</th>
              <th className="px-4 py-3 font-medium">Naziv</th>
              <th className="px-4 py-3 font-medium">Predložak</th>
              <th className="px-4 py-3 font-medium">Napomene</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Zadaci</th>
              <th className="px-4 py-3 font-medium text-right">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {paging.pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Nema naloga za prikaz.
                </td>
              </tr>
            ) : (
              paging.pageRows.map((row) => (
              <tr key={row.id} className={`border-b border-slate-50 last:border-0 ${row.archived ? "bg-slate-50 text-slate-500" : ""}`}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-mono font-medium text-slate-900">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: workOrderColor(row, db.workOrderTemplates) }} />
                    {row.code}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                <td className="px-4 py-3 text-slate-600">{templateName(db.workOrderTemplates, row.templateId)}</td>
                <td className="max-w-xs px-4 py-3 text-slate-600">{row.description || ""}</td>
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
                      onClick={() => requestArchiveToggle(row)}
                      title={row.archived ? "Vrati iz arhive" : "Arhiviraj"}
                    >
                      <ArchiveIcon className="h-4 w-4" />
                    </button>
                    <button type="button" className="icon-btn" onClick={() => openTasks(row)} title="Uredi zadatke">
                      <ListChecksIcon className="h-4 w-4" />
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

      {showForm ? (
        <Modal title={editing ? "Uredi radni nalog" : "Novi radni nalog"} onClose={closeForm}>
          <form onSubmit={save} className="space-y-3">
            {templates.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Nema predložaka. Dodajte ih u šifarniku Predlošci pa onda kreirajte nalog.
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Radni nalog">
                <input className="input bg-slate-50" required value={form.code} readOnly />
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
            <Field label="Predložak">
              <select
                className="input"
                required
                value={form.templateId}
                onChange={(e) => setForm({ ...form, templateId: e.target.value })}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Naziv">
              <input className="input" required placeholder="npr. Flexi P8" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Napomene">
              <textarea className="input min-h-[88px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="h-5 w-5 rounded-full" style={{ backgroundColor: selectedTemplate?.color ?? "#cbd5e1" }} />
              Boja na planu dolazi s predloška.
              {creating ? " Novi nalog naslijedi zadatke predloška." : " Zadaci se uređuju zasebnom akcijom."}
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
              <button type="button" className="btn-secondary" onClick={closeForm}>
                Odustani
              </button>
              <button type="submit" className="btn-primary" disabled={templates.length === 0}>
                Spremi
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {tasksOrder ? (
        <Modal title={`Zadaci naloga ${tasksOrder.code}`} wide onClose={closeTasks}>
          <form onSubmit={saveTasks} className="space-y-3">
            <p className="text-sm text-slate-500">
              Zadaci se uređuju u šifarniku Zadaci. Ovdje odaberi koje nalog {tasksOrder.name} smije koristiti.
            </p>
            <TaskPicker tasks={db.tasks} jobRoles={db.jobRoles} selectedIds={taskIds} onToggle={toggleTask} />
            {taskError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{taskError}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={closeTasks}>
                Odustani
              </button>
              <button type="submit" className="btn-primary">
                Spremi
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {archiveTarget ? (
        <ConfirmDialog
          title="Arhiviraj radni nalog"
          message="Arhivirani nalog više se ne nudi pri unosu sati. Možeš ga kasnije vratiti iz arhive."
          confirmLabel="Arhiviraj"
          onClose={() => setArchiveTarget(null)}
          onConfirm={confirmArchive}
        />
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
