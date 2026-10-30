import { notesHasContent, parseNotes } from "../../lib/notes";

type Props = {
  value: string;
  compact?: boolean;
  maxTodos?: number;
  onShowMore?: () => void;
  onToggleTodo?: (index: number) => void;
};

export function NotesView({ value, compact = false, maxTodos, onShowMore, onToggleTodo }: Props) {
  const parsed = parseNotes(value);
  if (!notesHasContent(value)) return null;
  const hidden = maxTodos != null && parsed.todos.length > maxTodos ? parsed.todos.length - maxTodos : 0;
  const todos = hidden > 0 ? parsed.todos.slice(0, maxTodos) : parsed.todos;

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {parsed.text ? (
        <p className={`whitespace-pre-wrap text-slate-600 ${compact ? "line-clamp-2 text-sm" : "text-xs leading-snug"}`}>
          {parsed.text}
        </p>
      ) : null}
      {todos.length > 0 ? (
        <ul className="space-y-1">
          {todos.map((todo, index) => (
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
      {hidden > 0 && onShowMore ? (
        <button type="button" className="text-sm font-medium text-blue-800 hover:underline" onClick={onShowMore}>
          i još {hidden}...
        </button>
      ) : null}
    </div>
  );
}
