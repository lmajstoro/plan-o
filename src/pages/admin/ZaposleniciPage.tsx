import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDb } from "../../context/DbContext";
import { activateEmployee, emailTaken, passwordLink } from "../../lib/accounts";
import { pageName, pushAudit } from "../../lib/audit";
import { newId } from "../../lib/gantt";
import { defaultRoleId, sortJobRoles } from "../../lib/roles";
import { emailProblem, FieldError, inputClass, useFieldErrors } from "../../components/ui/field";
import { ConfirmDialog, Modal } from "../../components/ui/Modal";
import { CategoryTabs } from "../../components/admin/CategoryTabs";
import { PaginationBar } from "../../components/admin/PaginationBar";
import { PlusIcon, EditIcon, UserOffIcon, CheckIcon, KeyIcon } from "../../components/icons";
import { usePagedRows } from "../../lib/pagination";
import { isEmployeeActive } from "../../lib/employee";
import { skillLabels } from "../../lib/skills";
import type { Employee } from "../../types";

type FormTab = "osnovno" | "uloge" | "skupine";
type FormState = { name: string; email: string; roleIds: string[]; taskIds: string[]; groupIds: string[] };

const emptyForm: FormState = { name: "", email: "", roleIds: [], taskIds: [], groupIds: [] };
const FORM_TABS = [
  { id: "osnovno", label: "Osnovne informacije" },
  { id: "uloge", label: "Uloge" },
  { id: "skupine", label: "Radne skupine" },
];

function formatSentAt(iso: string) {
  const date = new Date(iso);
  const day = date.toLocaleDateString("hr-HR", { day: "numeric", month: "numeric" });
  const time = date.toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" });
  return `${day} u ${time}`;
}

export function ZaposleniciPage() {
  const { user } = useAuth();
  const { db, update } = useDb();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formTab, setFormTab] = useState<FormTab>("osnovno");
  const fields = useFieldErrors();
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [notice, setNotice] = useState<{ text: string; href?: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const rows = useMemo(
    () => [...db.employees].sort((a, b) => a.name.localeCompare(b.name, "hr")),
    [db.employees],
  );
  const paging = usePagedRows(rows);

  function openCreate() {
    const first = defaultRoleId(db.jobRoles);
    fields.clear();
    setFormTab("osnovno");
    setForm({ ...emptyForm, roleIds: first ? [first] : [] });
    setCreating(true);
  }

  function openEdit(employee: Employee) {
    fields.clear();
    setFormTab("osnovno");
    setForm({
      name: employee.name,
      email: employee.email,
      roleIds: [...employee.roleIds],
      taskIds: [...(employee.taskIds ?? [])],
      groupIds: [...employee.groupIds],
    });
    setEditing(employee);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
    fields.clear();
  }

  function tasksOf(roleId: string) {
    return db.tasks.filter((task) => task.role === roleId).sort((a, b) => a.code.localeCompare(b.code, "hr"));
  }

  function toggleRole(id: string) {
    fields.clear("roles");
    setForm((current) => {
      const on = current.roleIds.includes(id);
      const roleTaskIds = new Set(tasksOf(id).map((task) => task.id));
      return {
        ...current,
        roleIds: on ? current.roleIds.filter((roleId) => roleId !== id) : [...current.roleIds, id],
        taskIds: current.taskIds.filter((taskId) => !roleTaskIds.has(taskId)),
      };
    });
  }

  function toggleTask(roleId: string, taskId: string) {
    fields.clear("roles");
    setForm((current) => {
      const roleOn = current.roleIds.includes(roleId);
      const roleTaskIds = tasksOf(roleId).map((task) => task.id);
      if (roleOn) {
        return {
          ...current,
          roleIds: current.roleIds.filter((id) => id !== roleId),
          taskIds: [...current.taskIds.filter((id) => !roleTaskIds.includes(id)), ...roleTaskIds.filter((id) => id !== taskId)],
        };
      }
      const selected = current.taskIds.includes(taskId);
      return {
        ...current,
        taskIds: selected ? current.taskIds.filter((id) => id !== taskId) : [...current.taskIds, taskId],
      };
    });
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
    const name = form.name.trim();
    const email = form.email.trim();
    const nextErrors: Record<string, string> = {};
    if (!name) nextErrors.name = "Upiši ime i prezime.";
    const mailProblem = emailProblem(email);
    if (mailProblem) nextErrors.email = mailProblem;
    else if (emailTaken(db, email, editing?.id)) nextErrors.email = "E-mail je već zauzet.";
    if (form.roleIds.length === 0 && form.taskIds.length === 0) {
      nextErrors.roles = "Odaberi barem jednu ulogu ili zadatak.";
    }
    if (fields.reject(nextErrors)) {
      setFormTab(nextErrors.name || nextErrors.email ? "osnovno" : "uloge");
      return;
    }
    const taskIds = form.taskIds.filter((id) => {
      const task = db.tasks.find((row) => row.id === id);
      return Boolean(task && !form.roleIds.includes(task.role));
    });
    const nextForm = { ...form, name, email, taskIds };
    if (editing) {
      update((current) => ({
        ...current,
        employees: current.employees.map((row) => (row.id === editing.id ? { ...row, ...nextForm } : row)),
      }));
      closeForm();
      return;
    }
    update((current) => ({
      ...current,
      employees: [
        ...current.employees,
        {
          id: newId("emp"),
          ...nextForm,
          active: false,
          password: "",
          passwordSet: false,
          welcomed: false,
          failedLogins: 0,
          locked: false,
        },
      ],
    }));
    closeForm();
  }

  function confirmDeactivate() {
    if (!deactivateId) return;
    update((current) => {
      const next = {
        ...current,
        employees: current.employees.map((row) =>
          row.id === deactivateId
            ? {
                ...row,
                active: false,
                password: "",
                passwordSet: false,
                resetToken: undefined,
                resetTokenExpires: undefined,
                locked: false,
                failedLogins: 0,
              }
            : row,
        ),
      };
      return pushAudit(next, { account: user?.name ?? "Administrator", email: user?.email ?? "", action: "Deaktivacija", target: pageName("/administrator/zaposlenici") });
    });
    setDeactivateId(null);
  }

  function activate(row: Employee) {
    const issued = activateEmployee(row);
    update((current) => {
      const next = {
        ...current,
        employees: current.employees.map((item) => (item.id === row.id ? issued.employee : item)),
      };
      return pushAudit(next, {
        account: user?.name ?? "Administrator",
        email: user?.email ?? "",
        action: issued.welcome ? "Aktivacija" : "Ponovna aktivacija",
        target: pageName("/administrator/zaposlenici"),
      });
    });
    setNotice({
      text: issued.welcome
        ? `Poslane su upute za rad i poveznica za lozinku na ${row.email}.`
        : `Poslana je nova poveznica za lozinku na ${row.email}.`,
      href: `/postavi-lozinku/${issued.token}`,
    });
  }

  function confirmPasswordReset() {
    if (!resetTarget) return;
    const issued = passwordLink(resetTarget, true);
    update((current) => {
      const next = {
        ...current,
        employees: current.employees.map((row) => (row.id === resetTarget.id ? issued.employee : row)),
      };
      return pushAudit(next, { account: user?.name ?? "Administrator", email: user?.email ?? "", action: "Slanje poveznice za lozinku", target: pageName("/administrator/zaposlenici") });
    });
    setNotice({
      text: `Poveznica za lozinku poslana je na ${resetTarget.email}.`,
      href: `/postavi-lozinku/${issued.token}`,
    });
    setResetTarget(null);
  }

  function unlock(row: Employee) {
    update((current) => {
      const next = {
        ...current,
        employees: current.employees.map((item) => (item.id === row.id ? { ...item, locked: false, failedLogins: 0 } : item)),
      };
      return pushAudit(next, { account: user?.name ?? "Administrator", email: user?.email ?? "", action: "Otključavanje računa", target: pageName("/administrator/zaposlenici") });
    });
  }

  function exportAccounts() {
    const header = "Ime;E-mail;Aktivan;Radne uloge;Lozinka postavljena;Zadnja prijava";
    const lines = db.employees.map((row) => {
      const roles = skillLabels(row, db.jobRoles, db.tasks).map((label) => label.text).join(", ");
      const last = row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString("hr-HR") : "";
      return [row.name, row.email, row.active ? "da" : "ne", roles, row.passwordSet ? "da" : "ne", last].join(";");
    });
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "frigonex-racuni.csv";
    link.click();
    URL.revokeObjectURL(url);
    update((current) => pushAudit(current, { account: user?.name ?? "Administrator", email: user?.email ?? "", action: "Izvoz popisa računa", target: pageName("/administrator/zaposlenici") }));
  }

  const showForm = creating || editing;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Zaposlenici</h1>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={exportAccounts}>Izvezi popis</button>
          <button type="button" className="btn-primary" onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            Novi zaposlenik
          </button>
        </div>
      </div>
      {notice ? (
        <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          <p>{notice.text}</p>
          {notice.href ? (
            <Link className="mt-1 inline-block font-medium text-emerald-900 underline" to={notice.href}>
              Otvori poveznicu u mockupu
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Ime</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Uloge</th>
              <th className="px-4 py-3 font-medium">Radne skupine</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {paging.pageRows.map((row) => (
              <tr key={row.id} className={`border-b border-slate-50 last:border-0 ${isEmployeeActive(row) ? "" : "bg-slate-50 text-slate-500"}`}>
                <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {row.email}
                  {row.passwordResetSentAt ? (
                    <div className="text-xs text-slate-400">Poveznica za lozinku poslana {formatSentAt(row.passwordResetSentAt)}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {skillLabels(row, db.jobRoles, db.tasks).length === 0 ? <span className="text-slate-400">-</span> : null}
                    {skillLabels(row, db.jobRoles, db.tasks).map((label) => (
                      <span key={label.key} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                        {label.text}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.groupIds.length === 0 ? <span className="text-slate-400">-</span> : null}
                    {row.groupIds.map((id) => {
                      const group = db.workGroups.find((item) => item.id === id);
                      if (!group) return null;
                      return (
                        <span key={id} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {group.name}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      row.locked ? "bg-red-50 text-red-800" : isEmployeeActive(row) ? "bg-emerald-50 text-emerald-800" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {row.locked ? "Zaključan" : isEmployeeActive(row) ? "Aktivan" : "Neaktivan"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="icon-btn" onClick={() => openEdit(row)} title="Uredi">
                      <EditIcon className="h-4 w-4" />
                    </button>
                    {row.locked ? (
                      <button type="button" className="icon-btn" onClick={() => unlock(row)} title="Otključaj">
                        <KeyIcon className="h-4 w-4" />
                      </button>
                    ) : null}
                    {isEmployeeActive(row) ? (
                      <button type="button" className="icon-btn" onClick={() => setResetTarget(row)} title="Pošalji poveznicu za lozinku">
                        <KeyIcon className="h-4 w-4" />
                      </button>
                    ) : null}
                    {isEmployeeActive(row) ? (
                      <button type="button" className="icon-btn-danger" onClick={() => setDeactivateId(row.id)} title="Deaktiviraj">
                        <UserOffIcon className="h-4 w-4" />
                      </button>
                    ) : (
                      <button type="button" className="icon-btn" onClick={() => activate(row)} title="Aktiviraj">
                        <CheckIcon className="h-4 w-4" />
                      </button>
                    )}
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
        <Modal title={editing ? "Uredi zaposlenika" : "Novi zaposlenik"} size="form" onClose={closeForm}>
          <form noValidate onSubmit={save} className="flex min-h-0 flex-1 flex-col">
            <CategoryTabs tabs={FORM_TABS} value={formTab} onChange={(id) => setFormTab(id as FormTab)} />
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              {formTab === "osnovno" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Ime i prezime" error={fields.errors.name}>
                    <input className={inputClass(Boolean(fields.errors.name))} value={form.name} onChange={(event) => { fields.clear("name"); setForm({ ...form, name: event.target.value }); }} />
                  </Field>
                  <Field label="E-mail" error={fields.errors.email}>
                    <input type="email" className={inputClass(Boolean(fields.errors.email))} value={form.email} onChange={(event) => { fields.clear("email"); setForm({ ...form, email: event.target.value }); }} />
                  </Field>
                </div>
              ) : null}
              {formTab === "uloge" ? (
                <div>
                  <p className="mb-3 text-sm text-slate-500">
                    Kvačica uz ulogu daje sve njezine zadatke, i one koji se dodaju kasnije. Može se označiti i samo jedan zadatak.
                  </p>
                  <FieldError className="mb-3" message={fields.errors.roles} />
                  {db.jobRoles.length === 0 ? (
                    <p className="text-sm text-slate-500">Nema uloga. Dodajte ih u šifarniku Uloge.</p>
                  ) : (
                    <div className="space-y-3">
                      {sortJobRoles(db.jobRoles).map((role) => {
                        const roleOn = form.roleIds.includes(role.id);
                        const tasks = tasksOf(role.id);
                        return (
                          <div key={role.id} className="rounded-lg border border-slate-200 p-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                              <input type="checkbox" checked={roleOn} onChange={() => toggleRole(role.id)} />
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                              {role.name}
                              <span className="font-normal text-slate-500">Cijela uloga</span>
                            </label>
                            <div className="mt-2 space-y-1 pl-6">
                              {tasks.length === 0 ? <p className="text-sm text-slate-400">Nema zadataka u ovoj ulozi.</p> : null}
                              {tasks.map((task) => (
                                <label key={task.id} className="flex items-start gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={roleOn || form.taskIds.includes(task.id)}
                                    onChange={() => toggleTask(role.id, task.id)}
                                  />
                                  <span>
                                    <span className="font-medium">{task.code}</span> {task.description}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
              {formTab === "skupine" ? (
                <div className="space-y-1.5 rounded-lg border border-slate-200 p-3">
                  {db.workGroups.length === 0 ? (
                    <p className="text-sm text-slate-500">Nema radnih skupina. Dodajte ih u šifarniku.</p>
                  ) : (
                    db.workGroups.map((group) => (
                      <label key={group.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={form.groupIds.includes(group.id)} onChange={() => toggleGroup(group.id)} />
                        {group.name}
                      </label>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" className="btn-secondary" onClick={closeForm}>
                Odustani
              </button>
              <button type="submit" className="btn-primary">Spremi</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {deactivateId ? (
        <ConfirmDialog
          title="Deaktiviraj zaposlenika"
          message="Lozinka prestaje vrijediti i prijava se gasi. Osoba nestaje s plana, a upisani sati ostaju. Kasnije je možeš ponovno aktivirati."
          confirmLabel="Deaktiviraj"
          onClose={() => setDeactivateId(null)}
          onConfirm={confirmDeactivate}
        />
      ) : null}

      {resetTarget ? (
        <ConfirmDialog
          title="Promjena lozinke"
          message={`Zaposleniku ${resetTarget.name} šalje se poveznica na ${resetTarget.email}. Osoba je ne može zatražiti sama. Trenutna lozinka vrijedi dok ne postavi novu.`}
          confirmLabel="Pošalji e-mail"
          tone="primary"
          onClose={() => setResetTarget(null)}
          onConfirm={confirmPasswordReset}
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

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      <FieldError message={error} />
    </label>
  );
}
