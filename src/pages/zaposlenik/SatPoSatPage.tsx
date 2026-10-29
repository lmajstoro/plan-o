import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmFooter } from "../../components/employee/ConfirmFooter";
import { EmployeeShell } from "../../components/employee/EmployeeShell";
import { BottomSheet, OrderChoiceList, OrderLabel, TaskChoiceList } from "../../components/employee/EntryPickers";
import { PlanPanel } from "../../components/employee/PlanPanel";
import { PlusIcon } from "../../components/icons";
import { formatHour } from "../../lib/dates";
import { blockEnd, DAY_END, DAY_START } from "../../lib/gantt";
import { useEmployeeDay, type EmployeeDay, type EntryDraft } from "../../lib/useEmployeeDay";
import { employeeOrderNumber, workOrderColor } from "../../lib/workOrders";
import type { Assignment } from "../../types";

type Job = { workOrderId: string; taskId: string };

const VISIBLE_FROM = 6;
const VISIBLE_TO = 19;

function jobKey(job: Job): string {
  return `${job.workOrderId}|${job.taskId}`;
}

function sameJob(a: Job | null | undefined, b: Job | null | undefined): boolean {
  return Boolean(a && b && a.workOrderId === b.workOrderId && a.taskId === b.taskId);
}

function hourMap(actuals: Assignment[]): Map<number, Job> {
  const map = new Map<number, Job>();
  for (const row of actuals) {
    for (let hour = row.startHour; hour < blockEnd(row); hour += 1) {
      map.set(hour, { workOrderId: row.workOrderId, taskId: row.taskId });
    }
  }
  return map;
}

function toDrafts(map: Map<number, Job>): EntryDraft[] {
  const drafts: EntryDraft[] = [];
  for (let hour = DAY_START; hour < DAY_END; hour += 1) {
    const job = map.get(hour);
    if (!job) continue;
    const last = drafts[drafts.length - 1];
    if (last && sameJob(last, job) && last.startHour + last.durationHours === hour) {
      last.durationHours += 1;
    } else {
      drafts.push({ ...job, startHour: hour, durationHours: 1 });
    }
  }
  return drafts;
}

/** Prikaz 3: pick a job, then tap every hour worked on it, like filling in a paper timesheet. */
export function SatPoSatPage() {
  const day = useEmployeeDay();
  const [brush, setBrush] = useState<Job | null>(null);
  const [picker, setPicker] = useState<{ pendingHour: number | null } | null>(null);
  const [showEarly, setShowEarly] = useState(false);
  const [showLate, setShowLate] = useState(false);
  const hours = useMemo(() => hourMap(day.actuals), [day.actuals]);
  const hoursRef = useRef<HTMLElement>(null);

  const usedJobs = useMemo(() => {
    const seen = new Map<string, Job & { hours: number }>();
    for (const row of day.actuals) {
      const key = jobKey(row);
      const current = seen.get(key);
      if (current) current.hours += row.durationHours;
      else seen.set(key, { workOrderId: row.workOrderId, taskId: row.taskId, hours: row.durationHours });
    }
    return [...seen.values()];
  }, [day.actuals]);

  useEffect(() => {
    setBrush(null);
    setPicker(null);
    setShowEarly(false);
    setShowLate(false);
  }, [day.date]);

  const firstUsed = day.actuals[0]?.startHour ?? VISIBLE_FROM;
  const lastUsed = day.actuals.length > 0 ? blockEnd(day.actuals[day.actuals.length - 1]) : VISIBLE_TO;
  const from = showEarly ? DAY_START : Math.min(VISIBLE_FROM, firstUsed);
  const to = showLate ? DAY_END : Math.max(VISIBLE_TO, lastUsed);
  const rows = Array.from({ length: to - from }, (_, index) => from + index);

  function paint(hour: number, job: Job) {
    const next = new Map(hours);
    if (sameJob(next.get(hour), job)) next.delete(hour);
    else next.set(hour, job);
    day.replaceEntries(toDrafts(next));
  }

  function tapHour(hour: number) {
    if (!day.canEdit) return;
    if (!brush) {
      day.clearMessages();
      setPicker({ pendingHour: hour });
      return;
    }
    paint(hour, brush);
  }

  function chooseBrush(job: Job) {
    setBrush(job);
    window.requestAnimationFrame(() => hoursRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function pickJob(job: Job) {
    const pending = picker?.pendingHour;
    setPicker(null);
    if (pending != null) {
      setBrush(job);
      paint(pending, job);
    } else {
      chooseBrush(job);
    }
  }

  function hourTotal(job: Job): number {
    let total = 0;
    hours.forEach((value) => {
      if (sameJob(value, job)) total += 1;
    });
    return total;
  }

  const brushOrder = brush ? day.orderById(brush.workOrderId) : undefined;
  const brushTask = brush ? day.taskById(brush.taskId) : undefined;
  const brushColor = brush ? workOrderColor(brushOrder, day.db.workOrderTemplates) : undefined;
  const brushIsNew = brush && !usedJobs.some((job) => sameJob(job, brush));

  return (
    <EmployeeShell day={day} footer={<ConfirmFooter day={day} showError={!picker} />}>
      <PlanPanel day={day} />

      <section className="px-4 pt-4" aria-label="Tvoji sati">
        <h2 className="text-base font-semibold text-slate-900">Tvoji sati</h2>

        {day.canEdit ? (
          <>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">1.</span> Odaberi posao.{" "}
              <span className="font-semibold text-slate-800">2.</span> Dodirni svaki sat koji si radio na njemu.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {usedJobs.map((job) => (
                <JobChip key={jobKey(job)} day={day} job={job} hours={job.hours} selected={sameJob(job, brush)} onSelect={() => chooseBrush(job)} />
              ))}
              {brush && brushIsNew ? <JobChip day={day} job={brush} hours={hourTotal(brush)} selected onSelect={() => undefined} /> : null}
              <button
                type="button"
                className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 px-3 text-base font-semibold text-blue-700 hover:bg-blue-50 ${
                  usedJobs.length === 0 && !brush ? "col-span-2" : ""
                }`}
                onClick={() => {
                  day.clearMessages();
                  setPicker({ pendingHour: null });
                }}
              >
                <PlusIcon className="h-5 w-5" />
                {usedJobs.length === 0 && !brush ? "Odaberi posao" : "Drugi posao"}
              </button>
            </div>
          </>
        ) : day.actuals.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {day.tone === "future" ? "Sate za ovaj dan upisuješ kad ga odradiš." : "Za ovaj dan nema upisanih sati."}
          </p>
        ) : null}
      </section>

      {day.canEdit || day.actuals.length > 0 ? (
        <section ref={hoursRef} className="mt-3 scroll-mt-40 px-4" aria-label="Sati u danu">
          {brush && day.canEdit ? (
            <p className="mb-2 rounded-lg px-3 py-2 text-sm text-white" style={{ backgroundColor: brushColor }}>
              Upisuješ: <span className="font-semibold"><OrderLabel order={brushOrder} /></span>
              {brushTask ? `, ${brushTask.code} ${brushTask.description}` : null}. Ponovni dodir sata ga briše.
            </p>
          ) : null}
          {from > DAY_START && day.canEdit ? (
            <button type="button" className="mb-2 w-full rounded-lg py-2 text-sm font-medium text-blue-700 hover:bg-blue-50" onClick={() => setShowEarly(true)}>
              Prikaži ranije sate
            </button>
          ) : null}
          <ol className="overflow-hidden rounded-xl border border-slate-200">
            {rows.map((hour) => {
              const job = hours.get(hour);
              const previous = hours.get(hour - 1);
              const continues = sameJob(job, previous);
              const order = job ? day.orderById(job.workOrderId) : undefined;
              const task = job ? day.taskById(job.taskId) : undefined;
              const color = job ? workOrderColor(order, day.db.workOrderTemplates) : undefined;
              return (
                <li key={hour} className="border-t border-slate-100 first:border-t-0">
                  <button
                    type="button"
                    disabled={!day.canEdit}
                    onClick={() => tapHour(hour)}
                    aria-label={`${formatHour(hour)} do ${formatHour(hour + 1)}`}
                    className="flex h-14 w-full items-stretch text-left disabled:cursor-default"
                  >
                    <span className="flex w-16 shrink-0 items-center justify-center text-sm tabular-nums text-slate-500">{formatHour(hour)}</span>
                    {job ? (
                      <span className="my-0.5 mr-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 text-white" style={{ backgroundColor: color }}>
                        {continues ? (
                          <span className="text-sm text-white/80">{order ? employeeOrderNumber(order) : "?"}</span>
                        ) : (
                          <>
                            <span className="shrink-0 text-base font-bold tabular-nums">{order ? employeeOrderNumber(order) : "?"}</span>
                            <span className="min-w-0 truncate text-sm font-medium">
                              {order?.name}
                              {task ? `, ${task.code}` : null}
                            </span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="mr-1 flex flex-1 items-center rounded-lg px-3 text-sm text-slate-300">
                        {day.canEdit ? (brush ? "Dodirni za upis" : "Prazno") : ""}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          {to < DAY_END && day.canEdit ? (
            <button type="button" className="mt-2 w-full rounded-lg py-2 text-sm font-medium text-blue-700 hover:bg-blue-50" onClick={() => setShowLate(true)}>
              Prikaži kasnije sate
            </button>
          ) : null}
        </section>
      ) : null}

      {picker && day.canEdit ? (
        <JobPickerSheet day={day} onPick={pickJob} onClose={() => setPicker(null)} />
      ) : null}
    </EmployeeShell>
  );
}

function JobChip({
  day,
  job,
  hours,
  selected,
  onSelect,
}: {
  day: EmployeeDay;
  job: Job;
  hours: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const order = day.orderById(job.workOrderId);
  const task = day.taskById(job.taskId);
  const color = workOrderColor(order, day.db.workOrderTemplates);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-h-14 min-w-0 items-center gap-2 rounded-xl border-2 px-2.5 py-1.5 text-left transition ${
        selected ? "border-slate-900 bg-white shadow" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <span
        className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md px-1 text-sm font-bold tabular-nums text-white"
        style={{ backgroundColor: color }}
      >
        {order ? employeeOrderNumber(order) : "?"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">{order?.name ?? "Nepoznat nalog"}</span>
        <span className="block truncate text-xs text-slate-500">
          {task?.code}, {hours} h
        </span>
      </span>
    </button>
  );
}

function JobPickerSheet({ day, onPick, onClose }: { day: EmployeeDay; onPick: (job: Job) => void; onClose: () => void }) {
  const [workOrderId, setWorkOrderId] = useState("");
  const order = day.orderById(workOrderId);

  return (
    <BottomSheet
      title={workOrderId ? "Što si radio?" : "Na kojem nalogu si radio?"}
      subtitle={workOrderId ? "Korak 2 od 2" : "Korak 1 od 2"}
      onClose={onClose}
      onBack={workOrderId ? () => setWorkOrderId("") : undefined}
    >
      {workOrderId ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Nalog: <span className="font-medium text-slate-900"><OrderLabel order={order} /></span>
          </p>
          <TaskChoiceList tasks={day.tasksFor(workOrderId)} onSelect={(taskId) => onPick({ workOrderId, taskId })} />
        </div>
      ) : (
        <OrderChoiceList day={day} onSelect={setWorkOrderId} />
      )}
    </BottomSheet>
  );
}
