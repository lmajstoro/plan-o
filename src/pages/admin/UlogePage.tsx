import { FormEvent, useMemo, useState } from "react";
import { useDb } from "../../context/DbContext";
import { newId } from "../../lib/gantt";
import { roleUsage, sortJobRoles } from "../../lib/roles";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { EditIcon, TrashIcon } from "../../components/icons";
import { Field, Header } from "./ZaposleniciPage";
import type { JobRole } from "../../types";

type FormState = { name: string };
const emptyForm: FormState = { name: "" };

export function UlogePage() {
  const { db, update } = useDb();
  const [editing, setEditing] = useState<JobRole | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [blockedRemove, setBlockedRemove] = useState("");

  const rows = useMemo(() => sortJobRoles(db.jobRoles), [db.jobRoles]);

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setCreating(true);
  }

  function openEdit(role: JobRole) {
    setForm({ name: role.name });
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
        jobRoles: current.jobRoles.map((row) => (row.id === editing.id ? { ...row, name } : row)),
      }));
      setEditing(null);
      return;
    }
    update((current) => ({
      ...current,
      jobRoles: [...current.jobRoles, { id: newId("role"), name }],
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
      <p className="mb-4 text-slate-500">Šifarnik uloga za zaposlenike i zadatke. Naziv se vidi na planu rada i u ostalim šifarnicima.</p>
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
            {rows.map((row) => {
              const usage = roleUsage(row.id, db.employees, db.tasks);
              return (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
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
      </div>

      {showForm ? (
        <Modal title={editing ? "Uredi ulogu" : "Nova uloga"} onClose={closeForm}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Naziv">
              <input className="input" required value={form.name} onChange={(e) => { setForm({ name: e.target.value }); setFormError(""); }} />
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
