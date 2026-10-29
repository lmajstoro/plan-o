import { useState } from "react";
import { CheckIcon } from "../icons";
import { ConfirmDialog } from "../ui/Modal";
import { EXPECTED_HOURS } from "../../lib/gantt";
import { EMPTY_DAY_MESSAGE, type EmployeeDay } from "../../lib/useEmployeeDay";
import { HoursValue } from "./EmployeeShell";

type Props = {
  day: EmployeeDay;
  /** Errors are shown here only while no entry sheet is open, the sheet shows its own. */
  showError?: boolean;
};

export function ConfirmFooter({ day, showError = true }: Props) {
  const [askConfirm, setAskConfirm] = useState(false);
  const error = showError ? day.error : "";

  if (day.restDay) return null;

  const totals = (
    <div className="flex items-baseline justify-between text-sm text-slate-600">
      <span>
        Upisano <HoursValue hours={day.workedHours} tone={day.workedTone} />
      </span>
      <span>
        Plan <span className="font-medium tabular-nums text-slate-700">{day.plannedHours} h</span>
      </span>
    </div>
  );

  if (day.confirmed) {
    return (
      <div className="space-y-2">
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-700">
          <CheckIcon className="h-5 w-5" />
          {day.hourStatus === "uredeni_i_potvrdeni" ? "Sati su uređeni i potvrđeni" : "Sati su potvrđeni"}
        </p>
        {totals}
        {day.editable ? (
          <button type="button" className="btn-secondary h-12 w-full text-base text-red-700" onClick={day.unconfirm}>
            Poništi potvrdu
          </button>
        ) : null}
      </div>
    );
  }

  if (!day.canEdit) {
    return (
      <div className="space-y-1 py-1 text-center text-sm text-slate-500">
        {day.tone === "future" ? (
          <p>Samo pregled. Sate upisuješ na dan rada ili idući radni dan.</p>
        ) : (
          <p>Sati nisu potvrđeni. Upisano {day.workedHours} h.</p>
        )}
      </div>
    );
  }

  const blocker = day.confirmBlocker;
  const offTarget = day.workedHours > 0 && day.workedHours !== EXPECTED_HOURS;

  function onConfirm() {
    if (blocker) {
      day.confirm();
      return;
    }
    if (offTarget) {
      setAskConfirm(true);
      return;
    }
    day.confirm();
  }

  return (
    <div className="space-y-2">
      {totals}
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {!error && blocker ? (
        <p className={`text-sm ${blocker === EMPTY_DAY_MESSAGE ? "text-slate-500" : "text-red-700"}`}>{blocker}</p>
      ) : null}
      {!error && !blocker && offTarget ? (
        <p className="text-sm text-amber-700">
          {day.workedHours > EXPECTED_HOURS
            ? `Upisano je više od uobičajenih ${EXPECTED_HOURS} h.`
            : `Upisano je manje od uobičajenih ${EXPECTED_HOURS} h.`}
        </p>
      ) : null}
      <button
        type="button"
        className="btn-success h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-40"
        disabled={Boolean(blocker)}
        onClick={onConfirm}
      >
        <CheckIcon className="h-5 w-5" />
        Potvrdi sate
      </button>

      {askConfirm ? (
        <ConfirmDialog
          title="Potvrdi sate"
          message={`Upisao si ${day.workedHours} h, a uobičajeni radni dan ima ${EXPECTED_HOURS} h. Želiš li ipak potvrditi?`}
          confirmLabel="Da, potvrdi"
          tone="primary"
          onConfirm={() => {
            day.confirm();
            setAskConfirm(false);
          }}
          onClose={() => setAskConfirm(false)}
        />
      ) : null}
    </div>
  );
}
