import { FormEvent } from "react";
import { Modal } from "../ui/Modal";
import type { Employee } from "../../types";

type Props = {
  targetName: string;
  employees: Employee[];
  onClose: () => void;
  onCopy: (sourceId: string) => void;
};

export function CopyScheduleModal({ targetName, employees, onClose, onCopy }: Props) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const sourceId = String(data.get("sourceId") ?? "");
    if (!sourceId) return;
    onCopy(sourceId);
  }

  return (
    <Modal title="Kopiraj raspored" onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600">
        Prepiši raspored na zaposlenika <span className="font-medium text-slate-800">{targetName}</span>. Postojeći unos za ovaj dan biti će zamijenjen.
      </p>
      {employees.length === 0 ? (
        <p className="text-sm text-amber-700">Nema drugih zaposlenika s kojih se može kopirati.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Zaposlenik s kojeg se prepisuje</span>
            <select name="sourceId" className="input" required defaultValue={employees[0].id}>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Odustani
            </button>
            <button type="submit" className="btn-primary">
              Kopiraj raspored
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
