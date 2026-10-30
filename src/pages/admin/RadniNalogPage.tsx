import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { QualityCheckModal } from "../../components/admin/QualityCheckModal";
import { NotesEditor } from "../../components/admin/NotesEditor";
import { TaskSelectModal } from "../../components/admin/TaskSelectModal";
import { ChevronLeftIcon } from "../../components/icons";
import { useDb } from "../../context/DbContext";
import { compactNotes } from "../../lib/notes";
import { formatHours, hourDeltaLabel, workOrderOverview, type HourPair } from "../../lib/workOrderOverview";
import {
  ERP_CODE_PATTERN,
  sortTemplates,
  templateName,
  workOrderCode,
  workOrderColor,
  WORK_ORDER_COLOR_LABELS,
  WORK_ORDER_COLORS,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUSES,
  workOrderStatusClass,
} from "../../lib/workOrders";
import type { WorkOrder, WorkOrderStatus } from "../../types";
import { Field } from "./ZaposleniciPage";

const TABS = [
  { id: "pregled", label: "Pregled" },
  { id: "informacije", label: "Informacije" },
  { id: "zadaci", label: "Zadaci" },
  { id: "kontrola", label: "Kontrola kvalitete" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTab(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export function RadniNalogPage() {
  const { orderId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { db, update } = useDb();
  const requested = params.get("tab");
  const tab: TabId = isTab(requested) ? requested : "pregled";
  const order = db.workOrders.find((row) => row.id === orderId);
  const overview = useMemo(
    () => (order ? workOrderOverview(order.id, db.assignments, db.tasks, db.jobRoles, db.employees) : null),
    [order, db.assignments, db.tasks, db.jobRoles, db.employees],
  );

  function selectTab(next: TabId) {
    const following = new URLSearchParams(params);
    if (next === "pregled") following.delete("tab");
    else following.set("tab", next);
    setParams(following, { replace: true });
  }

  if (!order || !overview) {
    return (
      <div>
        <BackLink />
        <p className="mt-6 text-slate-600">Radni nalog nije pronađen.</p>
      </div>
    );
  }

  const color = workOrderColor(order, db.workOrderTemplates);

  return (
    <div>
      <BackLink />
      <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-mono">{workOrderCode(order)}</span>
        <span className="min-w-0 truncate">{order.name}</span>
        <span className={`ml-1 inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${workOrderStatusClass(order.status, order.archived)}`}>
          {order.archived ? "Arhiviran" : WORK_ORDER_STATUS_LABELS[order.status]}
        </span>
      </h1>

      <div role="tablist" className="mt-5 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${
                selected ? "border-blue-700 text-blue-800" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => selectTab(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "pregled" ? <Pregled overview={overview} /> : null}
      {tab === "informacije" ? <Informacije order={order} /> : null}
      {tab === "zadaci" ? (
        <div className="mt-5">
          <TaskSelectModal
            embedded
            description="Zadaci se uređuju u šifarniku Zadaci. Ovdje odaberi koje ovaj nalog smije koristiti."
            tasks={db.tasks}
            jobRoles={db.jobRoles}
            initialSelectedIds={order.taskIds ?? []}
            onSave={(taskIds) => {
              update((current) => ({
                ...current,
                workOrders: current.workOrders.map((row) => (row.id === order.id ? { ...row, taskIds } : row)),
              }));
            }}
          />
        </div>
      ) : null}
      {tab === "kontrola" ? (
        <div className="mt-5">
          <QualityCheckModal
            embedded
            items={db.checklistItems}
            initialEntries={order.checklist ?? []}
            onSave={(checklist) => {
              update((current) => ({
                ...current,
                workOrders: current.workOrders.map((row) => (row.id === order.id ? { ...row, checklist } : row)),
              }));
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/administrator/radni-nalozi" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
      <ChevronLeftIcon className="h-4 w-4" />
      Radni nalozi
    </Link>
  );
}

function Pregled({ overview }: { overview: NonNullable<ReturnType<typeof workOrderOverview>> }) {
  const empty = overview.planned === 0 && overview.actual === 0;
  if (empty) {
    return (
      <p className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        Na ovom nalogu još nema planiranih ni utrošenih sati.
      </p>
    );
  }

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-5">
      <section className="rounded-xl border border-slate-200 bg-white xl:col-span-3">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Sati po ulogama</h2>
        <div className="divide-y divide-slate-100">
          {overview.roles.map((role) => (
            <div key={role.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: role.color }} />
                  <h3 className="font-medium text-slate-900">{role.name}</h3>
                </div>
                <HourFigures hours={role} />
              </div>
              <CompareBar planned={role.planned} actual={role.actual} />
              <table className="mt-3 w-full text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="py-1 font-medium">Zadatak</th>
                    <th className="py-1 text-right font-medium">Plan</th>
                    <th className="py-1 text-right font-medium">Ostvareno</th>
                    <th className="py-1 text-right font-medium">Razlika</th>
                  </tr>
                </thead>
                <tbody>
                  {role.tasks.map((task) => (
                    <tr key={task.id} className="border-t border-slate-50">
                      <td className="py-1.5 pr-3 text-slate-700">
                        {task.code ? <span className="mr-2 font-mono text-xs text-slate-500">{task.code}</span> : null}
                        {task.description}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-slate-600">{formatHours(task.planned)}</td>
                      <td className="py-1.5 text-right tabular-nums font-medium text-slate-900">{formatHours(task.actual)}</td>
                      <td className="py-1.5 text-right text-slate-500">{hourDeltaLabel(task.planned, task.actual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white xl:col-span-2">
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Ljudi na nalogu</h2>
        {overview.people.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">Još nitko nije unio sate na ovom nalogu.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {overview.people.map((person) => (
              <div key={person.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium text-slate-900">{person.name}</h3>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{formatHours(person.actual)}</span>
                </div>
                <p className="text-xs text-slate-500">Planirano {formatHours(person.planned)}</p>
                <ul className="mt-2 space-y-1.5">
                  {person.tasks.map((task) => (
                    <li key={task.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 text-slate-700">
                        {task.code ? <span className="mr-1.5 font-mono text-xs text-slate-500">{task.code}</span> : null}
                        {task.description}
                        <span className="mt-0.5 block text-xs text-slate-400">{task.roleName}</span>
                      </span>
                      <span className="shrink-0 text-right tabular-nums text-slate-600">
                        <span className="font-medium text-slate-900">{formatHours(task.actual)}</span>
                        <span className="mt-0.5 block text-xs text-slate-400">plan {formatHours(task.planned)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {overview.plannedOnly.length > 0 ? (
          <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            Planirani bez unesenih sati: {overview.plannedOnly.map((person) => `${person.name} (${formatHours(person.planned)})`).join(", ")}
          </p>
        ) : null}
      </section>
    </div>
  );
}

type InfoForm = {
  erpCode: string;
  name: string;
  description: string;
  templateId: string;
  color: string;
  status: WorkOrderStatus;
  archived: boolean;
};

function toInfoForm(order: WorkOrder): InfoForm {
  return {
    erpCode: order.erpCode,
    name: order.name,
    description: order.description,
    templateId: order.templateId,
    color: order.color,
    status: order.status,
    archived: order.archived,
  };
}

function Informacije({ order }: { order: WorkOrder }) {
  const { db, update } = useDb();
  const templates = useMemo(() => sortTemplates(db.workOrderTemplates), [db.workOrderTemplates]);
  const [form, setForm] = useState<InfoForm>(() => toInfoForm(order));
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const snapshot = `${order.id}|${order.erpCode}|${order.name}|${order.description}|${order.templateId}|${order.color}|${order.status}|${order.archived}`;

  useEffect(() => {
    setForm(toInfoForm(order));
    setFormError("");
  }, [snapshot, order]);

  function save(event: FormEvent) {
    event.preventDefault();
    if (!ERP_CODE_PATTERN.test(form.erpCode)) {
      setFormError("ERP šifra ima točno 8 znakova: slova bez dijakritika i brojke.");
      setSaved(false);
      return;
    }
    if (db.workOrders.some((row) => row.erpCode === form.erpCode && row.id !== order.id)) {
      setFormError("Nalog s tom ERP šifrom već postoji.");
      setSaved(false);
      return;
    }
    const description = compactNotes(form.description);
    update((current) => ({
      ...current,
      workOrders: current.workOrders.map((row) => (row.id === order.id ? { ...row, ...form, description } : row)),
    }));
    setFormError("");
    setSaved(true);
  }

  return (
    <form onSubmit={save} className="mt-5 max-w-3xl space-y-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Radni nalog">
          <input className="input bg-slate-50" value={workOrderCode(order)} readOnly />
        </Field>
        <Field label="Godina">
          <input className="input bg-slate-50" value={`${order.year}.`} readOnly />
        </Field>
        <Field label="ERP šifra">
          <input
            className="input font-mono"
            required
            maxLength={8}
            value={form.erpCode}
            onChange={(event) => {
              setForm({ ...form, erpCode: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") });
              setSaved(false);
            }}
          />
        </Field>
        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(event) => {
              setForm({ ...form, status: event.target.value as WorkOrderStatus });
              setSaved(false);
            }}
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
          onChange={(event) => {
            setForm({ ...form, templateId: event.target.value });
            setSaved(false);
          }}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">Trenutno: {templateName(templates, order.templateId)}. Zadaci se biraju u tabu Zadaci.</p>
      </Field>
      <Field label="Naziv">
        <input
          className="input"
          required
          value={form.name}
          onChange={(event) => {
            setForm({ ...form, name: event.target.value });
            setSaved(false);
          }}
        />
      </Field>
      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Napomene</span>
        <NotesEditor
          value={form.description}
          onChange={(description) => {
            setForm({ ...form, description });
            setSaved(false);
          }}
        />
      </div>
      <Field label={`Boja na planu${form.color ? ` · ${WORK_ORDER_COLOR_LABELS[form.color] ?? ""}` : ""}`}>
        <div className="flex flex-wrap gap-1.5">
          {WORK_ORDER_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setForm({ ...form, color });
                setSaved(false);
              }}
              className={`h-7 w-7 rounded-full border ${
                form.color === color ? "border-white ring-2 ring-offset-1 ring-slate-400" : "border-slate-200"
              }`}
              style={{ backgroundColor: color }}
              aria-label={WORK_ORDER_COLOR_LABELS[color] ?? color}
            />
          ))}
        </div>
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.archived}
          onChange={(event) => {
            setForm({ ...form, archived: event.target.checked });
            setSaved(false);
          }}
        />
        Arhiviraj nalog (ne nudi se pri unosu sati)
      </label>
      {formError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p> : null}
      <div className="flex items-center justify-end gap-3 pt-2">
        {saved ? <span className="text-sm text-emerald-700">Spremljeno</span> : null}
        <button type="button" className="btn-secondary" onClick={() => { setForm(toInfoForm(order)); setFormError(""); setSaved(false); }}>
          Odustani
        </button>
        <button type="submit" className="btn-primary">
          Spremi
        </button>
      </div>
    </form>
  );
}

function HourFigures({ hours }: { hours: HourPair }) {
  return (
    <p className="text-sm tabular-nums text-slate-600">
      Plan {formatHours(hours.planned)}
      <span className="mx-1.5 text-slate-300">/</span>
      Ostvareno {formatHours(hours.actual)}
    </p>
  );
}

function CompareBar({ planned, actual }: { planned: number; actual: number }) {
  const max = Math.max(planned, actual, 0);
  const width = (value: number) => (max === 0 ? 0 : Math.round((value / max) * 100));
  return (
    <div className="mt-2 space-y-1">
      <Bar label="Plan" width={width(planned)} className="bg-slate-300" />
      <Bar label="Ostvareno" width={width(actual)} className="bg-blue-600" />
    </div>
  );
}

function Bar({ label, width, className }: { label: string; width: number; className: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-slate-400">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${className}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
