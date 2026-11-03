import { FormEvent, useMemo, useState } from "react";
import { useDb } from "../../context/DbContext";
import { newId } from "../../lib/gantt";
import { defaultRoleId, roleColor, roleName, sortJobRoles } from "../../lib/roles";
import { inputClass, useFieldErrors, type FieldErrors } from "../../components/ui/field";
import { ConfirmDialog, Modal, ModalForm } from "../../components/ui/Modal";
import { EditIcon, TrashIcon } from "../../components/icons";
import { PaginationBar } from "../../components/admin/PaginationBar";
import { Field, Header } from "./ZaposleniciPage";
import { usePagedRows } from "../../lib/pagination";
import type { Task } from "../../types";

type FormState = { code: string; description: string; role: string };
const emptyForm: FormState = { code: "", description: "", role: "" };

export function ZadaciPage() {
  const { db, update } = useDb();
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const fields = useFieldErrors();
  const [removeId, setRemoveId] = useState<string | null>(null);

  const rows = useMemo(
    () => [...db.tasks].sort((a, b) => a.code.localeCompare(b.code, "hr")),
    [db.tasks],
  );
  const paging = usePagedRows(rows);

  function closeForm() {
    setCreating(false);
    setEditing(null);
    fields.clear();
  }

  function openCreate() {
    setForm({ ...emptyForm, role: defaultRoleId(db.jobRoles) });
    fields.clear();
    setCreating(true);
  }

  function openEdit(task: Task) {
    setForm({ code: task.code, description: task.description, role: task.role });
    fields.clear();
    setEditing(task);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const code = form.code.trim();
    const description = form.description.trim();
    const nextErrors: FieldErrors = {};
    if (!code) nextErrors.code = "Upiši šifru.";
    else if (db.tasks.some((row) => row.code.localeCompare(code, "hr", { sensitivity: "accent" }) === 0 && row.id !== editing?.id)) {
      nextErrors.code = "Zadatak s tom šifrom već postoji.";
    }
    if (!description) nextErrors.description = "Upiši opis.";
    if (!form.role) nextErrors.role = "Odaberi ulogu.";
    if (fields.reject(nextErrors)) return;
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
      <p className="mb-4 text-sm text-slate-500">Šifarnik zadataka. Radni nalozi samo biraju postojeće zadatke; uređivanje je ovdje.</p>
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
            {paging.pageRows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">{row.code}</td>
                <td className="px-4 py-3 text-slate-700">{row.description}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: roleColor(db.jobRoles, row.role) }} />
                    {roleName(db.jobRoles, row.role)}
                  </span>
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
        <Modal title={editing ? "Uredi zadatak" : "Novi zadatak"} size="form" onClose={closeForm}>
          <ModalForm onSubmit={save} onCancel={closeForm}>
            <Field label="Šifra" error={fields.errors.code}>
              <input className={inputClass(Boolean(fields.errors.code), "font-mono")} value={form.code} onChange={(e) => { fields.clear("code"); setForm({ ...form, code: e.target.value }); }} />
            </Field>
            <Field label="Opis" error={fields.errors.description}>
              <textarea
                className={inputClass(Boolean(fields.errors.description), "min-h-[88px]")}
                value={form.description}
                onChange={(e) => { fields.clear("description"); setForm({ ...form, description: e.target.value }); }}
              />
            </Field>
            <Field label="Uloga" error={fields.errors.role}>
              {db.jobRoles.length === 0 ? (
                <p className="text-sm text-slate-500">Nema uloga. Dodajte ih u šifarniku Uloge.</p>
              ) : (
                <select className={inputClass(Boolean(fields.errors.role))} value={form.role} onChange={(e) => { fields.clear("role"); setForm({ ...form, role: e.target.value }); }}>
                  {sortJobRoles(db.jobRoles).map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </ModalForm>
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
