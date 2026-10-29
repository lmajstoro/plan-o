import { useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../ui/Modal";
import { ChevronLeftIcon, ChevronRightIcon, LogoutIcon } from "../icons";
import { formatCroatianDate } from "../../lib/dates";
import { assignedRoles } from "../../lib/roles";
import { REST_DAY_MESSAGE } from "../../lib/employee";
import { HOURS_TONE_TEXT, type EmployeeDay } from "../../lib/useEmployeeDay";

export const EMPLOYEE_VARIANTS = [
  { id: "1", label: "Kalendar" },
  { id: "2", label: "Korak po korak" },
  { id: "3", label: "Sat po sat" },
] as const;

type Props = {
  day: EmployeeDay;
  /** Locks the shell to the viewport so the body can manage its own scrolling. */
  fillViewport?: boolean;
  footer?: ReactNode;
  children: ReactNode;
};

export function EmployeeShell({ day, fillViewport = false, footer, children }: Props) {
  const navigate = useNavigate();
  const [resetOpen, setResetOpen] = useState(false);
  const { employee } = day;

  function signOut() {
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
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center bg-white px-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">Račun je deaktiviran</p>
        <p className="mt-2 text-sm text-slate-600">Ne možeš unositi sate dok administrator ponovno ne aktivira tvoj račun.</p>
        <button type="button" className="btn-secondary mt-6" onClick={signOut}>
          <LogoutIcon className="h-5 w-5" />
          Odjava
        </button>
      </div>
    );
  }

  const bannerClass = day.confirmed
    ? "bg-emerald-50 text-emerald-800"
    : day.tone === "live"
      ? "bg-blue-50 text-blue-900"
      : "bg-slate-100 text-slate-600";
  const bannerText = day.confirmed
    ? day.hourStatus === "uredeni_i_potvrdeni"
      ? "Sati su potvrđeni, razlikuju se od plana."
      : "Sati su potvrđeni, isti kao plan."
    : day.modeLabel;

  return (
    <div
      className={`mx-auto flex w-full max-w-md flex-col bg-white shadow-sm md:max-w-lg ${
        fillViewport ? "h-dvh overflow-hidden" : "min-h-dvh"
      }`}
    >
      <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white/95 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-start justify-between gap-3 px-4 pb-2">
          <div className="min-w-0">
            <button
              type="button"
              className="block w-full truncate text-left text-base font-semibold text-slate-900"
              onClick={() => setResetOpen(true)}
            >
              {employee.name}
            </button>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              {assignedRoles(day.db.jobRoles, employee.roleIds).map((role) => (
                <span key={role.id} className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: role.color }} />
                  {role.name}
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <VariantSwitcher />
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
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-base font-semibold text-slate-900">{formatCroatianDate(day.current)}</div>
            {day.isToday ? (
              <div className="text-xs font-medium text-slate-500">Danas</div>
            ) : (
              <button type="button" className="text-xs font-medium text-blue-700 underline-offset-2 hover:underline" onClick={day.goToday}>
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

        {day.restDay ? null : <div className={`px-4 py-2 text-sm ${bannerClass}`}>{bannerText}</div>}
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
          className={`z-40 shrink-0 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
            fillViewport ? "" : "sticky bottom-0"
          }`}
        >
          {footer}
        </div>
      ) : null}

      {resetOpen ? (
        <ConfirmDialog
          title="Poništi testne podatke"
          message="Ovo vraća demo stanje na ovom uređaju. Lokalne izmjene sati i potvrde nestaju."
          confirmLabel="Poništi testne podatke"
          onConfirm={() => {
            day.resetTestData();
            setResetOpen(false);
          }}
          onClose={() => setResetOpen(false)}
        />
      ) : null}
    </div>
  );
}

function VariantSwitcher() {
  const location = useLocation();
  return (
    <nav aria-label="Prikaz unosa sati" className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs">
      <span className="hidden px-1.5 text-slate-500 sm:inline">Prikaz</span>
      {EMPLOYEE_VARIANTS.map((variant) => (
        <NavLink
          key={variant.id}
          to={{ pathname: `/zaposlenik/${variant.id}`, search: location.search }}
          title={`Prikaz ${variant.id}: ${variant.label}`}
          className={({ isActive }) =>
            `flex h-7 min-w-7 items-center justify-center rounded-md px-2 font-semibold ${
              isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`
          }
        >
          {variant.id}
        </NavLink>
      ))}
    </nav>
  );
}

export function HoursValue({ hours, tone }: { hours: number; tone: EmployeeDay["workedTone"] }) {
  return <span className={`font-semibold tabular-nums ${HOURS_TONE_TEXT[tone]}`}>{hours} h</span>;
}
