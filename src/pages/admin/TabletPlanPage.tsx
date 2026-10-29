import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { TouchGanttBoard } from "../../components/gantt/TouchGanttBoard";
import { FullscreenButton } from "../../components/ui/FullscreenButton";
import { SaveStatus } from "../../components/ui/SaveStatus";
import { Switch } from "../../components/ui/Switch";
import { ChevronLeftIcon, ChevronRightIcon, LogoutIcon } from "../../components/icons";
import { useAuth } from "../../context/AuthContext";
import { formatCroatianDate } from "../../lib/dates";
import { sortJobRoles } from "../../lib/roles";
import { SOPNICA_LOAD_MESSAGES, usePlanDay } from "../../lib/usePlanDay";

const SWIPE_MIN = 50;

export function TabletPlanPage() {
  const {
    db,
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
    employees,
    dayHasActuals,
    showPlanned,
    toggleShowPlanned,
    confirmedEmployeeIds,
    sopnicaLoading,
    sopnicaStep,
    commitEmployeeDay,
  } = usePlanDay();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const embedded = window.self !== window.top;

  return (
    <div className="flex h-dvh flex-col gap-3 overflow-hidden bg-slate-50 p-3 select-none">
      <header className="flex shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2.5 pr-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-base font-bold text-white">P</div>
          <div className="text-lg font-semibold leading-tight text-slate-900">Plan rada</div>
        </div>
        <DaySwiper
          dateKey={date}
          label={formatCroatianDate(current)}
          hint={dayHasActuals ? (showPlanned ? "Kod razlika: gore plan, dolje ostvareno" : "Prikazano samo ostvareno") : undefined}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
        />
        {dayHasActuals ? (
          <Switch
            checked={showPlanned}
            label="Planirano"
            onToggle={toggleShowPlanned}
            className="h-11 border border-slate-200 px-3 text-base text-slate-700"
          />
        ) : null}
        <SaveStatus compact />
        <button type="button" className="btn-secondary h-11 px-4 text-base" onClick={goToday}>
          Danas
        </button>
        <FullscreenButton className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600" />
        {embedded ? null : (
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
            aria-label="Odjava"
            onClick={() => {
              logout();
              navigate("/prijava");
            }}
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        )}
      </header>

      <section className="shrink-0 space-y-2 rounded-xl border border-slate-200 bg-white py-2.5 shadow-sm">
        <FilterRow label="Uloge" allActive={roleFilter.length === 0} onAll={clearRoles}>
          {sortJobRoles(db.jobRoles).map((role) => (
            <Chip key={role.id} active={roleFilter.includes(role.id)} onClick={() => toggleRole(role.id)}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: role.color }} />
              {role.name}
            </Chip>
          ))}
        </FilterRow>
        <div className="border-t border-slate-100" />
        <FilterRow label="Radne skupine" allActive={groupFilter.length === 0} onAll={clearGroups}>
          {db.workGroups.map((group) => (
            <Chip key={group.id} active={groupFilter.includes(group.id)} onClick={() => toggleGroup(group.id)}>
              {group.name}
            </Chip>
          ))}
        </FilterRow>
      </section>

      <div className="min-h-0 flex-1">
        {sopnicaLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white" aria-busy="true">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-700" aria-hidden />
            <p key={sopnicaStep} className="animate-fade-in text-base font-semibold text-slate-800">
              {SOPNICA_LOAD_MESSAGES[sopnicaStep]}
            </p>
          </div>
        ) : (
          <TouchGanttBoard
            date={date}
            employees={employees}
            tasks={db.tasks}
            workOrders={db.workOrders}
            workOrderTemplates={db.workOrderTemplates}
            jobRoles={db.jobRoles}
            assignments={db.assignments}
            confirmedEmployeeIds={confirmedEmployeeIds}
            showPlanned={showPlanned || !dayHasActuals}
            onCommitEmployeeDay={commitEmployeeDay}
          />
        )}
      </div>
    </div>
  );
}

function DaySwiper({
  dateKey,
  label,
  hint,
  onPrev,
  onNext,
}: {
  dateKey: string;
  label: string;
  hint?: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [start, setStart] = useState<{ id: number; x: number; y: number } | null>(null);
  const [offset, setOffset] = useState(0);

  function onDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    setStart({ id: event.pointerId, x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!start || start.id !== event.pointerId) return;
    setOffset(Math.max(-120, Math.min(120, event.clientX - start.x)));
  }

  function onUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    setStart(null);
    setOffset(0);
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) onNext();
    else onPrev();
  }

  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 p-1"
      style={{ touchAction: "pan-y" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => {
        setStart(null);
        setOffset(0);
      }}
    >
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
        aria-label="Prethodni radni dan"
        onClick={onPrev}
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1 overflow-hidden text-center">
        <div
          key={dateKey}
          className={`animate-fade-in ${start ? "" : "transition-transform duration-200"}`}
          style={{ transform: `translateX(${offset}px)`, opacity: 1 - Math.abs(offset) / 240 }}
        >
          <div className="truncate text-base font-semibold text-slate-900">{label}</div>
          <div className="truncate text-xs text-slate-500">{hint ?? "Povuci lijevo ili desno za drugi dan"}</div>
        </div>
      </div>
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
        aria-label="Sljedeći radni dan"
        onClick={onNext}
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

function FilterRow({
  label,
  allActive,
  onAll,
  children,
}: {
  label: string;
  allActive: boolean;
  onAll: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 pl-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pr-4" style={{ touchAction: "pan-x" }}>
        <Chip active={allActive} onClick={onAll}>
          Sve
        </Chip>
        {children}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[15px] font-medium ${
        active ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700 active:bg-slate-200"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
