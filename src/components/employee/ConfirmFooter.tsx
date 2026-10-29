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

  const worked = (
    <span className="text-sm text-slate-600">
      Upisano <HoursValue hours={day.workedHours} tone={day.workedTone} />
    </span>
  );

  if (day.confirmed) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckIcon className="h-5 w-5 shrink-0" />
          <span className="truncate">Potvrđeno, {day.workedHours} h</span>
        </p>
        {day.editable ? (
          <button type="button" className="btn-secondary h-11 shrink-0 px-3 text-red-700" onClick={day.unconfirm}>
            Poništi
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
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {worked}
          {!error && blocker ? (
            <p className={`text-sm ${blocker === EMPTY_DAY_MESSAGE ? "text-slate-500" : "text-red-700"}`}>{blocker}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn-success h-12 shrink-0 px-4 text-base disabled:cursor-not-allowed disabled:opacity-40"
          disabled={Boolean(blocker)}
          onClick={onConfirm}
        >
          <CheckIcon className="h-5 w-5" />
          Potvrdi sate
        </button>
      </div>

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
