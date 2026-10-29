import { useEffect, useRef, useState } from "react";
import { DayCalendar, HOUR_HEIGHT } from "../../components/employee/DayCalendar";
import { EmployeeAssignmentSheet, type CalendarSheetState } from "../../components/employee/EmployeeAssignmentSheet";
import { ConfirmFooter } from "../../components/employee/ConfirmFooter";
import { EmployeeShell } from "../../components/employee/EmployeeShell";
import { PlanPanel } from "../../components/employee/PlanPanel";
import { PlusIcon } from "../../components/icons";
import { DAY_END, DAY_START } from "../../lib/gantt";
import { useEmployeeDay } from "../../lib/useEmployeeDay";

const DEFAULT_START = 7;

/** Prikaz 1: the familiar day calendar, entered hours only, with the plan as a reference above. */
export function KalendarUnosPage() {
  const day = useEmployeeDay();
  const [sheet, setSheet] = useState<CalendarSheetState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const showCalendar = day.canEdit || day.actuals.length > 0;
  const firstHour = Math.min(
    day.actuals[0]?.startHour ?? DEFAULT_START,
    day.planned[0]?.startHour ?? DEFAULT_START,
    DEFAULT_START,
  );

  useEffect(() => {
    setSheet(null);
  }, [day.date]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = Math.max(0, (firstHour - 1 - DAY_START) * HOUR_HEIGHT);
    // Only re-anchor when the viewed day changes, not while the employee edits it.
  }, [day.date, showCalendar]);

  function openCreate(startHour: number) {
    day.clearMessages();
    setSheet({ mode: "create", startHour: Math.min(startHour, DAY_END - 1) });
  }

  return (
    <EmployeeShell day={day} fillViewport footer={<ConfirmFooter day={day} showError={!sheet} />}>
      <PlanPanel day={day} collapsible className="max-h-[35dvh] overflow-y-auto" />

      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3 pb-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Tvoji sati</h2>
          {day.canEdit ? (
            <p className="text-xs text-slate-500">
              {day.actuals.length === 0 ? "Dodirni sat kad si počeo raditi." : "Dodirni unos za izmjenu."}
            </p>
          ) : null}
        </div>
        {day.canEdit ? (
          <button type="button" className="btn-primary h-11 shrink-0 text-base" onClick={() => openCreate(day.nextFreeHour ?? DEFAULT_START)}>
            <PlusIcon className="h-5 w-5" />
            Upiši sate
          </button>
        ) : null}
      </div>

      {showCalendar ? (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100" data-allow-scroll>
          <DayCalendar
            assignments={day.actuals}
            workOrders={day.db.workOrders}
            workOrderTemplates={day.db.workOrderTemplates}
            tasks={day.db.tasks}
            tone={day.tone}
            locked={day.confirmed}
            showNow={day.isToday}
            onSelectAssignment={(assignment) => {
              day.clearMessages();
              setSheet({ mode: "edit", assignment });
            }}
            onSelectHour={openCreate}
          />
        </div>
      ) : (
        <p className="px-6 py-10 text-center text-sm text-slate-500">
          {day.tone === "future" ? "Sate za ovaj dan upisuješ kad ga odradiš." : "Za ovaj dan nema upisanih sati."}
        </p>
      )}

      {sheet && day.canEdit ? <EmployeeAssignmentSheet day={day} state={sheet} onClose={() => setSheet(null)} /> : null}
    </EmployeeShell>
  );
}
