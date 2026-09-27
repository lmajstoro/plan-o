import { notesHasContent, parseNotes } from "../../lib/notes";

type Props = {
  value: string;
  compact?: boolean;
  onToggleTodo?: (index: number) => void;
};

export function NotesView({ value, compact = false, onToggleTodo }: Props) {
  const parsed = parseNotes(value);
  if (!notesHasContent(value)) return null;

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {parsed.text ? (
        <p className={`whitespace-pre-wrap text-slate-600 ${compact ? "line-clamp-2 text-sm" : "text-xs leading-snug"}`}>
          {parsed.text}
        </p>
      ) : null}
      {parsed.todos.length > 0 ? (
        <ul className="space-y-1">
          {parsed.todos.map((todo, index) => (
            <li key={`${todo.label}-${index}`}>
              <label className={`flex items-start gap-1.5 ${onToggleTodo ? "cursor-pointer" : ""}`}>
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={todo.done}
                  disabled={!onToggleTodo}
                  onChange={onToggleTodo ? () => onToggleTodo(index) : undefined}
                />
                <span
                  className={`${compact ? "text-sm" : "text-xs leading-snug"} ${
                    todo.done ? "text-slate-400 line-through" : "text-slate-700"
                  }`}
                >
                  {todo.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
