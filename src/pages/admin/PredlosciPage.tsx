import { FormEvent, useMemo, useState } from "react";
import { useDb } from "../../context/DbContext";
import { newId } from "../../lib/gantt";
import { sortTemplates, templateUsage, WORK_ORDER_COLOR_LABELS, WORK_ORDER_COLORS } from "../../lib/workOrders";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { TaskSelectModal } from "../../components/admin/TaskSelectModal";
import { PaginationBar } from "../../components/admin/PaginationBar";
import { EditIcon, ListChecksIcon, TrashIcon } from "../../components/icons";
import { Field, Header } from "./ZaposleniciPage";
import { usePagedRows } from "../../lib/pagination";
import type { WorkOrderTemplate } from "../../types";

type FormState = { name: string; color: string };
const emptyForm: FormState = { name: "", color: WORK_ORDER_COLORS[0] };

export function PredlosciPage() {
  const { db, update } = useDb();
  const [editing, setEditing] = useState<WorkOrderTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [blockedRemove, setBlockedRemove] = useState("");
  const [tasksTemplate, setTasksTemplate] = useState<WorkOrderTemplate | null>(null);

  const rows = useMemo(() => sortTemplates(db.workOrderTemplates), [db.workOrderTemplates]);
  const paging = usePagedRows(rows);

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
    setForm({ name: template.name, color: template.color });
    setFormError("");
    setEditing(template);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setFormError("Unesite naziv predloška.");
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
          row.id === editing.id ? { ...row, name, color: form.color } : row,
        ),
      }));
      setEditing(null);
      return;
    }
    update((current) => ({
      ...current,
      workOrderTemplates: [...current.workOrderTemplates, { id: newId("tpl"), name, color: form.color, taskIds: [] }],
    }));
    setCreating(false);
  }

  function saveTasks(taskIds: string[]) {
    if (!tasksTemplate) return;
    update((current) => ({
      ...current,
      workOrderTemplates: current.workOrderTemplates.map((row) =>
        row.id === tasksTemplate.id ? { ...row, taskIds } : row,
      ),
    }));
    setTasksTemplate(null);
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
        Tipovi uređaja iz kojih se kreira radni nalog. Novi nalog naslijedi boju i zadatke predloška, pa ih možeš naknadno promijeniti na nalogu.
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
            {paging.pageRows.map((row) => (
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
                    <button type="button" className="icon-btn" onClick={() => setTasksTemplate(row)} title="Uredi zadatke">
                      <ListChecksIcon className="h-4 w-4" />
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
        <Modal title={editing ? "Uredi predložak" : "Novi predložak"} onClose={closeForm}>
          <form onSubmit={save} className="space-y-3">
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
            {formError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={closeForm}>Odustani</button>
              <button type="submit" className="btn-primary">Spremi</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {tasksTemplate ? (
        <TaskSelectModal
          title={`Zadaci predloška ${tasksTemplate.name}`}
          description="Zadaci se uređuju u šifarniku Zadaci. Ovdje odaberi koje novi nalog iz ovog predloška nasljeđuje."
          tasks={db.tasks}
          jobRoles={db.jobRoles}
          initialSelectedIds={tasksTemplate.taskIds}
          onClose={() => setTasksTemplate(null)}
          onSave={saveTasks}
        />
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
