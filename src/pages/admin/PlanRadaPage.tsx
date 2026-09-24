import { useEffect, useMemo, useState } from "react";
import { GanttBoard } from "../../components/gantt/GanttBoard";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, LayersIcon } from "../../components/icons";
import { useDb } from "../../context/DbContext";
import {
  addWorkDays,
  formatCroatianDate,
  formatDateKey,
  parseDateKey,
  todayWorkDate,
} from "../../lib/dates";

const SOPNICA_GROUP_ID = "wg-sopnica";
const SOPNICA_LOAD_MS = 1000;
const SOPNICA_LOAD_MESSAGES = [
  "Učitavam zaposlenike",
  "Raspodjeljujem zadatke",
  "Usklađujem satnicu",
  "Pripremam plan rada",
];

export function PlanRadaPage() {
  const { db, update, reset } = useDb();
  const [date, setDate] = useState(() => formatDateKey(todayWorkDate()));
  const [groupFilter, setGroupFilter] = useState<string[]>([]);
  const [legendOpen, setLegendOpen] = useState(false);
  const [sopnicaStep, setSopnicaStep] = useState(0);
  const [sopnicaReady, setSopnicaReady] = useState(false);
  const current = parseDateKey(date);
  const sopnicaOnly = groupFilter.length === 1 && groupFilter[0] === SOPNICA_GROUP_ID;
  const sopnicaLoading = sopnicaOnly && !sopnicaReady;

  useEffect(() => {
    const yesterday = formatDateKey(addWorkDays(todayWorkDate(), -1));
    if (!db.assignments.some((row) => row.date === yesterday && row.kind === "actual")) {
      reset();
    }
  }, [db.assignments, reset]);

  useEffect(() => {
    if (!sopnicaOnly) {
      setSopnicaReady(false);
      setSopnicaStep(0);
      return;
    }

    setSopnicaReady(false);
    setSopnicaStep(0);
    const timers = SOPNICA_LOAD_MESSAGES.slice(1).map((_, index) =>
      window.setTimeout(() => setSopnicaStep(index + 1), (index + 1) * SOPNICA_LOAD_MS),
    );
    const done = window.setTimeout(() => setSopnicaReady(true), SOPNICA_LOAD_MESSAGES.length * SOPNICA_LOAD_MS);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(done);
    };
  }, [sopnicaOnly]);

  const allEmployees = useMemo(
    () => [...db.employees].sort((a, b) => a.name.localeCompare(b.name, "hr")),
    [db.employees],
  );

  const employees = useMemo(() => {
    if (groupFilter.length === 0) return allEmployees;
    return allEmployees.filter((employee) => employee.groupIds.some((id) => groupFilter.includes(id)));
  }, [allEmployees, groupFilter]);

  const dayHasActuals = db.assignments.some((row) => row.date === date && row.kind === "actual");

  function go(delta: number) {
    setDate(formatDateKey(addWorkDays(current, delta)));
  }

  function toggleGroup(id: string) {
    setGroupFilter((currentFilter) =>
      currentFilter.includes(id) ? currentFilter.filter((item) => item !== id) : [...currentFilter, id],
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Plan rada</h1>
          <p className="text-slate-500">Montaža i servis čilera i dizalica topline.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => go(-1)} title="Prethodni radni dan">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <div className="min-w-[220px] text-center">
            <div className="font-semibold text-slate-900">{formatCroatianDate(current)}</div>
          </div>
          <button type="button" className="btn-secondary" onClick={() => go(1)} title="Sljedeći radni dan">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <button type="button" className="btn-secondary" onClick={() => setDate(formatDateKey(todayWorkDate()))}>
            Danas
          </button>
        </div>
      </div>

      {dayHasActuals ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Ovaj dan ima korekcije zaposlenika: <span className="font-semibold">gornji red je plan</span>, <span className="font-semibold">donji red je ostvareno</span>.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
          Korekcije plana vidiš na prethodnim radnim danima (strelica ulijevo). Danas je prikazan samo zadani plan.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Filter radnih skupina</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              groupFilter.length === 0 ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            onClick={() => setGroupFilter([])}
          >
            Sve
          </button>
          {db.workGroups.map((group) => {
            const active = groupFilter.includes(group.id);
            return (
              <button
                key={group.id}
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  active ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                onClick={() => toggleGroup(group.id)}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                {group.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="relative min-w-0 flex-1">
          {sopnicaLoading ? (
            <div
              className="relative min-h-[28rem] overflow-hidden rounded-xl border border-slate-200 bg-white"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="flex h-10 border-b border-slate-200 bg-slate-50">
                <div className="flex w-[300px] shrink-0 items-center border-r border-slate-200 px-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Zaposlenik
                </div>
                <div className="flex min-w-0 flex-1">
                  {Array.from({ length: 18 }).map((_, index) => (
                    <div key={index} className="flex-1 border-r border-slate-200 last:border-r-0" />
                  ))}
                </div>
              </div>
              <div className="pointer-events-none">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex h-[76px] border-b border-slate-100">
                    <div className="w-[300px] shrink-0 border-r border-slate-100 bg-slate-50/80" />
                    <div className="flex min-w-0 flex-1 bg-white">
                      {Array.from({ length: 18 }).map((_, hour) => (
                        <div key={hour} className="flex-1 border-r border-slate-50 last:border-r-0" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 bg-white/25 backdrop-blur-[3px]" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-slate-50/35 to-white/55" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/85 px-8 py-6 shadow-lg ring-1 ring-slate-200/80">
                  <div
                    className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-700"
                    aria-hidden
                  />
                  <p key={sopnicaStep} className="animate-fade-in text-base font-semibold text-slate-800">
                    {SOPNICA_LOAD_MESSAGES[sopnicaStep]}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <GanttBoard
              date={date}
              employees={employees}
              copySources={allEmployees}
              tasks={db.tasks}
              workOrders={db.workOrders}
              assignments={db.assignments}
              onCommitEmployeeDay={(employeeId, next) => {
                update((currentDb) => ({
                  ...currentDb,
                  assignments: [
                    ...currentDb.assignments.filter(
                      (row) => !(row.employeeId === employeeId && row.date === date && row.kind !== "actual"),
                    ),
                    ...next.map((row) => ({ ...row, kind: "planned" as const })),
                  ],
                }));
              }}
            />
          )}
        </div>

        {legendOpen ? (
          <aside className="sticky top-4 w-72 shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <LayersIcon className="h-5 w-5" />
                Legenda
              </div>
              <button type="button" className="icon-btn" onClick={() => setLegendOpen(false)} aria-label="Zatvori legendu">
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {db.workOrders
                .filter((order) => !order.archived)
                .map((order) => (
                <div key={order.id} className="flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: order.color }} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      <span className="font-mono text-slate-500">{order.code}</span> {order.name}
                    </div>
                    <div className="text-xs leading-snug text-slate-500">{order.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        ) : (
          <button
            type="button"
            className="sticky top-4 flex h-36 w-10 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => setLegendOpen(true)}
            aria-label="Otvori legendu"
          >
            <LayersIcon className="h-5 w-5" />
            <span className="text-xs font-semibold tracking-wide" style={{ writingMode: "vertical-rl" }}>
              Legenda
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
