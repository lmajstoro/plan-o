import { skillLabels } from "../../lib/skills";
import type { Employee, JobRole, Task } from "../../types";

export function SkillMarks({
  person,
  roles,
  tasks,
  className,
}: {
  person: Pick<Employee, "roleIds" | "taskIds">;
  roles: JobRole[];
  tasks: Task[];
  className?: string;
}) {
  const labels = skillLabels(person, roles, tasks);
  if (labels.length === 0) return null;
  return (
    <div className={className}>
      {labels.map((label) => (
        <span key={label.key} className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
          {label.text}
        </span>
      ))}
    </div>
  );
}
