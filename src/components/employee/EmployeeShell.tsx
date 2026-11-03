import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDb } from "../../context/DbContext";
import { pageName, pushAudit } from "../../lib/audit";
import { ChevronLeftIcon, ChevronRightIcon, LogoutIcon } from "../icons";
import { formatCroatianDate, formatDuration } from "../../lib/dates";
import { SkillMarks } from "./SkillMarks";
import { REST_DAY_MESSAGE } from "../../lib/employee";
import { HOURS_TONE_TEXT, type EmployeeDay } from "../../lib/useEmployeeDay";

const SWIPE_MIN = 48;

type Props = {
  day: EmployeeDay;
  /** Locks the shell to the viewport so the body can manage its own scrolling. */
  fillViewport?: boolean;
  footer?: ReactNode;
  children: ReactNode;
};

export function EmployeeShell({ day, fillViewport = false, footer, children }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { update } = useDb();
  const { employee } = day;
  const gesture = useRef<{ id: number; x: number; y: number; axis: "x" | "y" | null } | null>(null);
  const swiped = useRef(false);
  const dateShift = useRef<HTMLDivElement>(null);

  function resetShift() {
    if (dateShift.current) dateShift.current.style.transform = "";
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    if ((event.target as HTMLElement).closest("[data-no-swipe]")) return;
    swiped.current = false;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      current.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (current.axis !== "x" || !dateShift.current) return;
    const blocked = dx < 0 ? !day.canGoForward : !day.canGoBack;
    const limited = Math.max(-72, Math.min(72, dx)) * (blocked ? 0.25 : 1);
    dateShift.current.style.transform = `translateX(${limited}px)`;
  }

  function finishSwipe(event: ReactPointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    const horizontal = current.axis === "x" && Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy);
    gesture.current = null;
    resetShift();
    if (!horizontal) return;
    swiped.current = true;
    if (dx < 0) {
      if (day.canGoForward) day.go(1);
    } else if (day.canGoBack) {
      day.go(-1);
    }
  }

  function onClickCapture(event: React.MouseEvent) {
    if (!swiped.current) return;
    swiped.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  useEffect(() => {
    if (!fillViewport) return;
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      overscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.overscroll;
    };
  }, [fillViewport]);

  function signOut() {
    if (user) {
      update((current) => pushAudit(current, { account: user.name, email: user.email, action: "Odjava", target: pageName("/zaposlenik") }));
    }
    day.logout();
    navigate("/prijava");
  }

  if (!day.user || !employee) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
        <p className="text-slate-600">Zaposlenik nije pronađen u planu.</p>
      </div>
    );
  }

  if (!day.active) {
    return (
      <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-white px-6 text-center">
        <p className="text-lg font-semibold text-slate-900">Račun je deaktiviran</p>
        <p className="mt-2 text-sm text-slate-600">Ne možeš unositi sate dok administrator ponovno ne aktivira tvoj račun.</p>
        <button type="button" className="btn-secondary mt-6" onClick={signOut}>
          <LogoutIcon className="h-5 w-5" />
          Odjava
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex w-full touch-pan-y flex-col bg-white ${
        fillViewport ? "h-svh max-h-svh min-w-0 max-w-full overflow-hidden overscroll-none" : "min-h-dvh"
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishSwipe}
      onPointerCancel={() => {
        gesture.current = null;
        resetShift();
      }}
      onClickCapture={onClickCapture}
    >
      <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white/95 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-start justify-between gap-3 px-4 pb-2">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-900">{employee.name}</div>
            <SkillMarks
              person={employee}
              roles={day.db.jobRoles}
              tasks={day.db.tasks}
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-100"
              onClick={signOut}
              aria-label="Odjava"
            >
              <LogoutIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Odjava</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 pb-2">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            disabled={!day.canGoBack}
            onClick={() => day.go(-1)}
            aria-label="Prethodni dan"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div ref={dateShift} className="min-w-0 flex-1 text-center">
            <div className="truncate text-base font-semibold text-slate-900">{formatCroatianDate(day.current)}</div>
            {day.isToday ? (
              <div className="text-xs font-medium text-slate-500">Danas</div>
            ) : (
              <button type="button" className="text-xs font-medium text-frigo-700 underline-offset-2 hover:underline" onClick={day.goToday}>
                Vrati na danas
              </button>
            )}
          </div>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            disabled={!day.canGoForward}
            onClick={() => day.go(1)}
            aria-label="Sljedeći dan"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className={fillViewport ? "flex min-h-0 flex-1 flex-col" : "flex-1 pb-6"}>
        {day.notice ? (
          <p className="mx-4 mt-3 shrink-0 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{day.notice}</p>
        ) : null}
        {day.restDay ? (
          <p className="px-6 py-16 text-center text-base font-medium text-slate-600">{REST_DAY_MESSAGE}</p>
        ) : (
          children
        )}
      </main>

      {footer && !day.restDay ? (
        <div
          className={`z-40 shrink-0 border-t border-slate-200 bg-white px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${
            fillViewport ? "" : "sticky bottom-0"
          }`}
        >
          {footer}
        </div>
      ) : null}

    </div>
  );
}

export function HoursValue({ hours, tone }: { hours: number; tone: EmployeeDay["workedTone"] }) {
  return <span className={`font-semibold tabular-nums ${HOURS_TONE_TEXT[tone]}`}>{formatDuration(hours)}</span>;
}
