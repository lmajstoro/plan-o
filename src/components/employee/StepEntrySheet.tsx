import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "../ui/Modal";
import { BottomSheet, ChoiceGrid, OrderChoiceList, OrderLabel, TaskChoiceList } from "./EntryPickers";
import { formatHour } from "../../lib/dates";
import { DAY_END, DAY_START, hourColumns } from "../../lib/gantt";
import { taskLabel } from "../../lib/workOrders";
import type { EmployeeDay } from "../../lib/useEmployeeDay";
import type { Assignment } from "../../types";

type Step = "start" | "order" | "task" | "hours" | "review";

export type StepSheetState = { kind: "create" } | { kind: "edit"; entry: Assignment } | { kind: "dayStart" };

const QUICK_HOURS = 12;

const STEP_TITLES: Record<Step, string> = {
  start: "Kada si počeo raditi?",
  order: "Na kojem nalogu si radio?",
  task: "Što si radio?",
  hours: "Koliko sati?",
  review: "Upisani sati",
};

export function StepEntrySheet({ day, state, onClose }: { day: EmployeeDay; state: StepSheetState; onClose: () => void }) {
  const entry = state.kind === "edit" ? state.entry : null;
  const needsStart = state.kind === "create" && day.actuals.length === 0;
  const flow: Step[] =
    state.kind === "dayStart"
      ? ["start"]
      : state.kind === "edit"
        ? ["review"]
        : needsStart
          ? ["start", "order", "task", "hours"]
          : ["order", "task", "hours"];

  const [step, setStep] = useState<Step>(flow[0]);
  const [returnTo, setReturnTo] = useState<Step | null>(null);
  const [start, setStart] = useState<number | null>(state.kind === "dayStart" ? day.actuals[0]?.startHour ?? null : null);
  const [workOrderId, setWorkOrderId] = useState(entry?.workOrderId ?? "");
  const [taskId, setTaskId] = useState(entry?.taskId ?? "");
  const [hours, setHours] = useState<number | null>(entry?.durationHours ?? null);
  const [moreHours, setMoreHours] = useState((entry?.durationHours ?? 0) > QUICK_HOURS);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const entryStart = entry ? entry.startHour : needsStart ? start : day.nextFreeHour;
  const laterHours = entry
    ? day.actuals.filter((row) => row.startHour > entry.startHour).reduce((sum, row) => sum + row.durationHours, 0)
    : 0;
  const maxHours = entryStart == null ? DAY_END - DAY_START : DAY_END - entryStart - laterHours;
  const maxDayStart = state.kind === "dayStart" ? DAY_END - day.workedHours : DAY_END - 1;
  const startOptions = hourColumns().filter((hour) => hour <= maxDayStart);
  const hourOptions = Array.from({ length: Math.max(0, moreHours ? maxHours : Math.min(QUICK_HOURS, maxHours)) }, (_, i) => i + 1);
  const order = day.orderById(workOrderId);
  const task = day.taskById(taskId);
  const tasks = workOrderId ? day.tasksFor(workOrderId) : [];
  const canSave = Boolean(workOrderId && taskId && hours && entryStart != null);
  const position = flow.indexOf(step);

  function close() {
    day.setError("");
    onClose();
  }

  function advance() {
    if (returnTo) {
      setStep(returnTo);
      setReturnTo(null);
      return;
    }
    const next = flow[position + 1];
    if (next) setStep(next);
  }

  function back() {
    day.setError("");
    if (returnTo) {
      setStep(returnTo);
      setReturnTo(null);
      return;
    }
    const previous = flow[position - 1];
    if (previous) setStep(previous);
  }

  function change(target: Step) {
    day.setError("");
    setReturnTo(step);
    setStep(target);
  }

  function pickStart(hour: number) {
    setStart(hour);
    if (state.kind === "dayStart") {
      if (day.setDayStart(hour)) onClose();
      return;
    }
    advance();
  }

  function pickOrder(id: string) {
    setWorkOrderId(id);
    if (!day.tasksFor(id).some((row) => row.id === taskId)) {
      setTaskId("");
      setStep("task");
      return;
    }
    advance();
  }

  function pickTask(id: string) {
    setTaskId(id);
    advance();
  }

  function pickHours(value: number) {
    setHours(value);
    day.setError("");
    if (returnTo) advance();
  }

  function save() {
    if (!canSave || entryStart == null || !hours) return;
    const draft = { workOrderId, taskId, startHour: entryStart, durationHours: hours };
    const saved = entry ? day.updateEntry(entry.id, draft, "chain") : day.addEntry(draft, "chain");
    if (saved) onClose();
  }

  function remove() {
    if (entry && day.deleteEntry(entry.id, "chain")) onClose();
    setConfirmDelete(false);
  }

  const canGoBack = Boolean(returnTo) || position > 0;
  const subtitle = flow.length > 1 && !returnTo ? `Korak ${position + 1} od ${flow.length}` : undefined;
  const title = state.kind === "dayStart" ? "Promijeni početak rada" : STEP_TITLES[step];
  const range =
    entryStart != null && hours ? `${formatHour(entryStart)} - ${formatHour(entryStart + hours)}` : null;

  const summaryRows = (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      <SummaryRow label="Nalog" onChange={() => change("order")}>
        <OrderLabel order={order} />
      </SummaryRow>
      <SummaryRow label="Posao" onChange={() => change("task")}>
        {task ? taskLabel(task) : <span className="text-slate-400">Nije odabran</span>}
      </SummaryRow>
      {step === "review" ? (
        <SummaryRow label="Sati" onChange={() => change("hours")}>
          {hours} h{range ? <span className="ml-2 text-sm font-normal text-slate-500">{range}</span> : null}
        </SummaryRow>
      ) : null}
    </div>
  );

  let footer = null;
  if (step === "hours" && !returnTo) {
    footer = (
      <button type="button" className="btn-primary h-14 w-full text-lg disabled:cursor-not-allowed disabled:opacity-40" disabled={!canSave} onClick={save}>
        {hours ? `Spremi ${hours} h` : "Odaberi broj sati"}
      </button>
    );
  } else if (step === "review") {
    footer = (
      <div className="flex gap-2">
        <button type="button" className="btn-secondary h-14 px-4 text-base text-red-700" onClick={() => setConfirmDelete(true)}>
          Obriši
        </button>
        <button type="button" className="btn-primary h-14 flex-1 text-lg disabled:opacity-40" disabled={!canSave} onClick={save}>
          Spremi
        </button>
      </div>
    );
  }

  return (
    <BottomSheet title={title} subtitle={subtitle} onClose={close} onBack={canGoBack ? back : undefined} footer={footer}>
      {step === "start" ? (
        <div className="space-y-3">
          {state.kind === "dayStart" ? (
            <p className="text-sm text-slate-600">Svi tvoji unosi pomaknut će se zajedno, redom kako su upisani.</p>
          ) : null}
          <ChoiceGrid values={startOptions} selected={start} onSelect={pickStart} render={(hour) => formatHour(hour)} />
        </div>
      ) : null}

      {step === "order" ? <OrderChoiceList day={day} selectedId={workOrderId} currentId={entry?.workOrderId} onSelect={pickOrder} /> : null}

      {step === "task" ? (
        <div className="space-y-3">
          {order ? (
            <p className="text-sm text-slate-600">
              Nalog: <span className="font-medium text-slate-900"><OrderLabel order={order} /></span>
            </p>
          ) : null}
          <TaskChoiceList tasks={tasks} selectedId={taskId} onSelect={pickTask} />
        </div>
      ) : null}

      {step === "hours" ? (
        <div className="space-y-4">
          {!returnTo ? summaryRows : null}
          {maxHours < 1 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Dan je popunjen do {formatHour(DAY_END)}.</p>
          ) : (
            <>
              <ChoiceGrid values={hourOptions} selected={hours} onSelect={pickHours} render={(value) => `${value} h`} />
              {!moreHours && maxHours > QUICK_HOURS ? (
                <button type="button" className="text-sm font-medium text-blue-700" onClick={() => setMoreHours(true)}>
                  Više od {QUICK_HOURS} h
                </button>
              ) : null}
            </>
          )}
          {range ? (
            <p className="text-center text-base text-slate-700">
              Od <span className="font-semibold tabular-nums">{formatHour(entryStart ?? 0)}</span> do{" "}
              <span className="font-semibold tabular-nums">{formatHour((entryStart ?? 0) + (hours ?? 0))}</span>
            </p>
          ) : null}
          {entry && laterHours > 0 && hours !== entry.durationHours ? (
            <p className="text-center text-sm text-slate-500">Unosi nakon ovoga pomaknut će se.</p>
          ) : null}
        </div>
      ) : null}

      {step === "review" ? (
        <div className="space-y-3">
          {summaryRows}
          {entry && laterHours > 0 && hours !== entry.durationHours ? (
            <p className="text-sm text-slate-500">Unosi nakon ovoga pomaknut će se.</p>
          ) : null}
        </div>
      ) : null}

      {day.error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{day.error}</p> : null}

      {confirmDelete ? (
        <ConfirmDialog
          title="Obriši unos"
          message="Ovaj unos sati bit će obrisan. Unosi nakon njega pomaknut će se ranije."
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        />
      ) : null}
    </BottomSheet>
  );
}

function SummaryRow({ label, onChange, children }: { label: string; onChange: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onChange} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50">
      <span className="w-14 shrink-0 text-sm text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 text-base font-semibold text-slate-900">{children}</span>
      <span className="shrink-0 text-sm font-medium text-blue-700">Promijeni</span>
    </button>
  );
}
