import { useEffect, useState } from "react";
import { ConfirmFooter } from "../../components/employee/ConfirmFooter";
import { EmployeeShell } from "../../components/employee/EmployeeShell";
import { PlanPanel } from "../../components/employee/PlanPanel";
import { StepEntrySheet, type StepSheetState } from "../../components/employee/StepEntrySheet";
import { ChevronRightIcon, PlusIcon } from "../../components/icons";
import { formatHour } from "../../lib/dates";
import { blockEnd, DAY_END } from "../../lib/gantt";
import { useEmployeeDay } from "../../lib/useEmployeeDay";
import { employeeOrderNumber, taskLabel, workOrderColor } from "../../lib/workOrders";

/** Prikaz 2: a list of entries, each added through one question per screen. Entries run back to back. */
export function KorakPoKorakPage() {
  const day = useEmployeeDay();
  const [sheet, setSheet] = useState<StepSheetState | null>(null);
  const dayFull = day.nextFreeHour != null && day.nextFreeHour >= DAY_END;

  useEffect(() => {
    setSheet(null);
  }, [day.date]);

  function open(next: StepSheetState) {
    day.clearMessages();
    setSheet(next);
  }

  return (
    <EmployeeShell day={day} fillViewport footer={<ConfirmFooter day={day} showError={!sheet} />}>
      <PlanPanel day={day} className="max-h-[45%] shrink-0 overflow-y-auto" />

      <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3" aria-label="Tvoji sati">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Tvoji sati</h2>

        {day.actuals.length === 0 ? (
          day.canEdit ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 px-4 py-6 text-center">
              <p className="text-base text-slate-700">Još nisi upisao sate za ovaj dan.</p>
              <button type="button" className="btn-primary mt-4 h-14 w-full text-lg" onClick={() => open({ kind: "create" })}>
                <PlusIcon className="h-6 w-6" />
                Upiši sate
              </button>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">
              {day.tone === "future" ? "Sate za ovaj dan upisuješ kad ga odradiš." : "Za ovaj dan nema upisanih sati."}
            </p>
          )
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-sm text-slate-600">
                Početak rada <span className="text-base font-semibold tabular-nums text-slate-900">{formatHour(day.actuals[0].startHour)}</span>
              </span>
              {day.canEdit ? (
                <button type="button" className="text-sm font-medium text-blue-700" onClick={() => open({ kind: "dayStart" })}>
                  Promijeni
                </button>
              ) : null}
            </div>

            <ol className="space-y-2">
              {day.actuals.map((row) => {
                const order = day.orderById(row.workOrderId);
                const task = day.taskById(row.taskId);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      disabled={!day.canEdit}
                      onClick={() => open({ kind: "edit", entry: row })}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-left shadow-sm hover:bg-slate-50 disabled:shadow-none disabled:hover:bg-white"
                    >
                      <span
                        className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg px-1.5 text-sm font-bold tabular-nums text-white"
                        style={{ backgroundColor: workOrderColor(order, day.db.workOrderTemplates) }}
                      >
                        {order ? employeeOrderNumber(order) : "?"}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-base font-semibold text-slate-900">{order?.name ?? "Nepoznat nalog"}</span>
                        <span className="block truncate text-sm text-slate-600">{taskLabel(task)}</span>
                        <span className="block text-sm tabular-nums text-slate-500">
                          {formatHour(row.startHour)} - {formatHour(blockEnd(row))}
                        </span>
                      </span>
                      <span className="shrink-0 text-xl font-bold tabular-nums text-slate-900">{row.durationHours} h</span>
                      {day.canEdit ? <ChevronRightIcon className="h-5 w-5 shrink-0 text-slate-400" /> : null}
                    </button>
                  </li>
                );
              })}
            </ol>

            {day.canEdit ? (
              dayFull ? (
                <p className="text-center text-sm text-slate-500">Dan je popunjen do {formatHour(DAY_END)}.</p>
              ) : (
                <button
                  type="button"
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 text-base font-semibold text-blue-700 hover:bg-blue-50"
                  onClick={() => open({ kind: "create" })}
                >
                  <PlusIcon className="h-6 w-6" />
                  Dodaj još, od {formatHour(day.nextFreeHour ?? 0)}
                </button>
              )
            ) : null}
          </div>
        )}
      </section>

      {sheet && day.canEdit ? <StepEntrySheet day={day} state={sheet} onClose={() => setSheet(null)} /> : null}
    </EmployeeShell>
  );
}
