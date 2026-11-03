import { useState } from "react";
import { GanttBoard } from "../../components/gantt/GanttBoard";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, LayersIcon } from "../../components/icons";
import { formatCroatianDate } from "../../lib/dates";
import { sortJobRoles } from "../../lib/roles";
import { workOrderCode, workOrderColor } from "../../lib/workOrders";
import { toggleNoteTodo } from "../../lib/notes";
import { usePlanDay } from "../../lib/usePlanDay";
import { NotesView } from "../../components/admin/NotesView";
import { FullscreenButton } from "../../components/ui/FullscreenButton";
import { SaveStatus } from "../../components/ui/SaveStatus";

export function PlanRadaPage() {
  const {
    db,
    update,
    date,
    current,
    go,
    goToday,
    groupFilter,
    roleFilter,
    clearGroups,
    clearRoles,
    toggleGroup,
    toggleRole,
    allEmployees,
    employees,
    dayHasActuals,
    confirmedEmployeeIds,
    commitEmployeeDay,
  } = usePlanDay();
  const [legendOpen, setLegendOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Plan rada</h1>
          <p className="text-slate-500">Planiranje, nalozi i izvedba za čilere i dizalice topline.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          <SaveStatus />
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
            <button type="button" className="btn-secondary" onClick={goToday}>
              Danas
            </button>
            <FullscreenButton className="btn-secondary px-2.5" />
          </div>
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

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Filter uloga</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                roleFilter.length === 0 ? "bg-frigo-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={clearRoles}
            >
              Sve
            </button>
            {sortJobRoles(db.jobRoles).map((role) => {
              const active = roleFilter.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${
                    active ? "bg-frigo-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  onClick={() => toggleRole(role.id)}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                  {role.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t border-slate-100 pt-3">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Filter radnih skupina</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                groupFilter.length === 0 ? "bg-frigo-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={clearGroups}
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
                    active ? "bg-frigo-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  onClick={() => toggleGroup(group.id)}
                >
                  {group.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="relative min-w-0 flex-1">
          <GanttBoard
            date={date}
            employees={employees}
            copySources={allEmployees}
            tasks={db.tasks}
            workOrders={db.workOrders}
            workOrderTemplates={db.workOrderTemplates}
            jobRoles={db.jobRoles}
            assignments={db.assignments}
            confirmedEmployeeIds={confirmedEmployeeIds}
            onCommitEmployeeDay={commitEmployeeDay}
          />
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
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: workOrderColor(order, db.workOrderTemplates) }} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      <span className="font-mono text-slate-500">{workOrderCode(order)}</span> {order.name}
                    </div>
                    <NotesView
                      value={order.description}
                      onToggleTodo={(index) => {
                        update((current) => ({
                          ...current,
                          workOrders: current.workOrders.map((row) =>
                            row.id === order.id ? { ...row, description: toggleNoteTodo(row.description, index) } : row,
                          ),
                        }));
                      }}
                    />
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
