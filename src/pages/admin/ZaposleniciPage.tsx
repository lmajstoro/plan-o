import { FormEvent, useMemo, useState, type ReactNode } from "react";
import { useDb } from "../../context/DbContext";
import { ROLE_LABELS, ROLES } from "../../lib/dates";
import { newId } from "../../lib/gantt";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { PlusIcon, TrashIcon, EditIcon } from "../../components/icons";
import type { Employee, Role } from "../../types";

type FormState = { name: string; email: string; role: Role; groupIds: string[] };

const emptyForm: FormState = { name: "", email: "", role: "montazer", groupIds: [] };

export function ZaposleniciPage() {
  const { db, update } = useDb();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const rows = useMemo(
    () => [...db.employees].sort((a, b) => a.name.localeCompare(b.name, "hr")),
    [db.employees],
  );

  function openCreate() {
    setForm(emptyForm);
    setCreating(true);
  }

  function openEdit(employee: Employee) {
    setForm({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      groupIds: [...employee.groupIds],
    });
    setEditing(employee);
  }

  function toggleGroup(id: string) {
    setForm((current) => ({
      ...current,
      groupIds: current.groupIds.includes(id)
        ? current.groupIds.filter((groupId) => groupId !== id)
        : [...current.groupIds, id],
    }));
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (editing) {
      update((current) => ({
        ...current,
        employees: current.employees.map((row) => (row.id === editing.id ? { ...row, ...form } : row)),
      }));
      setEditing(null);
      return;
    }
    update((current) => ({
      ...current,
      employees: [...current.employees, { id: newId("emp"), ...form }],
    }));
    setCreating(false);
  }

  function confirmRemove() {
    if (!removeId) return;
    update((current) => ({
      ...current,
      employees: current.employees.filter((row) => row.id !== removeId),
      assignments: current.assignments.filter((row) => row.employeeId !== removeId),
      dayStatuses: current.dayStatuses.filter((row) => row.employeeId !== removeId),
    }));
    setRemoveId(null);
  }

  const showForm = creating || editing;

  return (
    <div>
      <Header title="Zaposlenici" actionLabel="Novi zaposlenik" onAction={openCreate} />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Ime</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Uloga</th>
              <th className="px-4 py-3 font-medium">Radne skupine</th>
              <th className="px-4 py-3 font-medium text-right">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                <td className="px-4 py-3 text-slate-600">{row.email}</td>
                <td className="px-4 py-3">{ROLE_LABELS[row.role]}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.groupIds.length === 0 ? <span className="text-slate-400">-</span> : null}
                    {row.groupIds.map((id) => {
                      const group = db.workGroups.find((item) => item.id === id);
                      if (!group) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: group.color }} />
                          {group.name}
                        </span>
                      );
                    })}
                  </div>
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
        <Modal title={editing ? "Uredi zaposlenika" : "Novi zaposlenik"} onClose={() => { setCreating(false); setEditing(null); }}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Ime i prezime">
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Radne skupine</span>
              <div className="space-y-1.5 rounded-lg border border-slate-200 p-3">
                {db.workGroups.length === 0 ? (
                  <p className="text-sm text-slate-500">Nema radnih skupina. Dodajte ih u šifarniku.</p>
                ) : (
                  db.workGroups.map((group) => (
                    <label key={group.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.groupIds.includes(group.id)}
                        onChange={() => toggleGroup(group.id)}
                      />
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: group.color }} />
                      {group.name}
                    </label>
                  ))
                )}
              </div>
            </div>
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
          title="Obriši zaposlenika"
          message="Brisanje uklanja i raspored rada tog zaposlenika."
          onClose={() => setRemoveId(null)}
          onConfirm={confirmRemove}
        />
      ) : null}
    </div>
  );
}

export function Header({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <button type="button" className="btn-primary" onClick={onAction}>
        <PlusIcon className="h-4 w-4" />
        {actionLabel}
      </button>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
