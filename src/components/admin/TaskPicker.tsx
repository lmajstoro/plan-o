import { taskRoleGroups } from "../../lib/workOrders";
import type { JobRole, Task } from "../../types";

type Props = {
  tasks: Task[];
  jobRoles: JobRole[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export function TaskPicker({ tasks, jobRoles, selectedIds, onToggle }: Props) {
  if (tasks.length === 0) {
    return <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Nema zadataka. Dodajte ih u šifarniku Zadaci.</p>;
  }

  const groups = taskRoleGroups(tasks, jobRoles);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {groups.map((group) => (
        <div key={group.role} className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</div>
          <div className="space-y-1.5">
            {group.tasks.length === 0 ? (
              <p className="text-xs text-slate-400">Nema zadataka za ovu ulogu.</p>
            ) : (
              group.tasks.map((task) => (
                <label key={task.id} className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selectedIds.includes(task.id)}
                    onChange={() => onToggle(task.id)}
                  />
                  <span>
                    <span className="font-mono text-slate-500">{task.code}</span> {task.description}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
