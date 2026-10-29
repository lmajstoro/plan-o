import { FormEvent, useMemo, useState } from "react";
import { useDb } from "../../context/DbContext";
import { newId } from "../../lib/gantt";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { EditIcon, TrashIcon } from "../../components/icons";
import { PaginationBar } from "../../components/admin/PaginationBar";
import { Field, Header } from "./ZaposleniciPage";
import { usePagedRows } from "../../lib/pagination";
import type { ChecklistItem } from "../../types";

type FormState = { code: string; description: string };
const emptyForm: FormState = { code: "", description: "" };

export function ChecklistePage() {
  const { db, update } = useDb();
  const [editing, setEditing] = useState<ChecklistItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);

  const rows = useMemo(
    () => [...db.checklistItems].sort((a, b) => a.code.localeCompare(b.code, "hr")),
    [db.checklistItems],
  );
  const paging = usePagedRows(rows);

  function closeForm() {
    setCreating(false);
    setEditing(null);
    setFormError("");
  }

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setCreating(true);
  }

  function openEdit(item: ChecklistItem) {
    setForm({ code: item.code, description: item.description });
    setFormError("");
    setEditing(item);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const code = form.code.trim();
    const description = form.description.trim();
    if (!code || !description) {
      setFormError("Unesite šifru i opis.");
      return;
    }
    const taken = db.checklistItems.some(
      (row) => row.code.localeCompare(code, "hr", { sensitivity: "accent" }) === 0 && row.id !== editing?.id,
    );
    if (taken) {
      setFormError("Stavka s tom šifrom već postoji.");
      return;
    }
    const next = { code, description };
    if (editing) {
      update((current) => ({
        ...current,
        checklistItems: current.checklistItems.map((row) => (row.id === editing.id ? { ...row, ...next } : row)),
      }));
      setEditing(null);
      return;
    }
    update((current) => ({
      ...current,
      checklistItems: [...current.checklistItems, { id: newId("chk"), ...next }],
    }));
    setCreating(false);
  }

  function confirmRemove() {
    if (!removeId) return;
    update((current) => ({
      ...current,
      checklistItems: current.checklistItems.filter((row) => row.id !== removeId),
      workOrders: current.workOrders.map((order) => ({
        ...order,
        checklist: (order.checklist ?? []).filter((entry) => entry.itemId !== removeId),
      })),
    }));
    setRemoveId(null);
  }

  const showForm = creating || editing;

  return (
    <div>
      <Header title="Kontrola kvalitete" actionLabel="Nova stavka" onAction={openCreate} />
      <p className="mb-4 text-slate-500">
        Šifarnik stavki kontrole kvalitete. Svaki novi radni nalog preuzima cijelu listu praznu. Na nalogu se stavka potvrđuje kad je provjerena, ili se označi da ne postoji na uređaju.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Šifra</th>
              <th className="px-4 py-3 font-medium">Opis</th>
              <th className="px-4 py-3 font-medium text-right">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {paging.pageRows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">{row.code}</td>
                <td className="px-4 py-3 text-slate-700">{row.description}</td>
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
        <Modal title={editing ? "Uredi stavku" : "Nova stavka"} onClose={closeForm}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Šifra">
              <input
                className="input"
                required
                value={form.code}
                onChange={(e) => {
                  setForm({ ...form, code: e.target.value });
                  setFormError("");
                }}
              />
            </Field>
            <Field label="Opis">
              <textarea
                className="input min-h-[88px]"
                required
                value={form.description}
                onChange={(e) => {
                  setForm({ ...form, description: e.target.value });
                  setFormError("");
                }}
              />
            </Field>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={closeForm}>
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
          title="Obriši stavku"
          message="Stavka će se ukloniti iz šifarnika i s radnih naloga."
          onClose={() => setRemoveId(null)}
          onConfirm={confirmRemove}
        />
      ) : null}
    </div>
  );
}
