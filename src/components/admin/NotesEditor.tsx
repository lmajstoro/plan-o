import { KeyboardEvent } from "react";
import { PlusIcon } from "../icons";
import { parseNotes, serializeNotes, type NoteTodo } from "../../lib/notes";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function NotesEditor({ value, onChange }: Props) {
  const parsed = parseNotes(value);

  function commit(text: string, todos: NoteTodo[]) {
    onChange(serializeNotes(text, todos, true));
  }

  function addTodo() {
    commit(parsed.text, [...parsed.todos, { done: false, label: "" }]);
  }

  function updateTodo(index: number, next: NoteTodo) {
    commit(
      parsed.text,
      parsed.todos.map((todo, todoIndex) => (todoIndex === index ? next : todo)),
    );
  }

  function removeTodo(index: number) {
    commit(
      parsed.text,
      parsed.todos.filter((_, todoIndex) => todoIndex !== index),
    );
  }

  function onTodoKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "Enter") {
      event.preventDefault();
      const next = [...parsed.todos];
      next.splice(index + 1, 0, { done: false, label: "" });
      commit(parsed.text, next);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <textarea
        className="min-h-[72px] w-full resize-y border-0 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none"
        value={parsed.text}
        onChange={(event) => commit(event.target.value, parsed.todos)}
        placeholder="Slobodan tekst napomene"
      />
      <div className="border-t border-slate-100 px-3 py-2">
        {parsed.todos.length > 0 ? (
          <ul className="space-y-1.5">
            {parsed.todos.map((todo, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => updateTodo(index, { ...todo, done: !todo.done })}
                  aria-label={todo.label || "Stavka"}
                />
                <input
                  className={`min-w-0 flex-1 border-0 bg-transparent py-0.5 text-sm outline-none ${
                    todo.done ? "text-slate-400 line-through" : "text-slate-800"
                  }`}
                  value={todo.label}
                  onChange={(event) => updateTodo(index, { ...todo, label: event.target.value })}
                  onKeyDown={(event) => onTodoKeyDown(event, index)}
                  placeholder="Stavka todo liste"
                />
                <button
                  type="button"
                  className="shrink-0 rounded px-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => removeTodo(index)}
                >
                  Ukloni
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Možeš dodati todo listu koju kasnije označavaš klikom.</p>
        )}
        <button type="button" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800" onClick={addTodo}>
          <PlusIcon className="h-3.5 w-3.5" />
          Dodaj stavku
        </button>
      </div>
    </div>
  );
}
