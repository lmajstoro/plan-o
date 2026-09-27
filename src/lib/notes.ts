export type NoteTodo = {
  done: boolean;
  label: string;
};

export type ParsedNotes = {
  text: string;
  todos: NoteTodo[];
};

const TODO_LINE = /^\s*[-*]\s*\[([ xX])\]\s*(.*)$/;

export function parseNotes(value: string): ParsedNotes {
  const todos: NoteTodo[] = [];
  const textLines: string[] = [];
  for (const line of value.split("\n")) {
    const match = line.match(TODO_LINE);
    if (match) {
      todos.push({ done: match[1].toLowerCase() === "x", label: match[2] });
      continue;
    }
    textLines.push(line);
  }
  return {
    text: textLines.join("\n").replace(/\n+$/g, "").replace(/^\n+/, ""),
    todos,
  };
}

export function serializeNotes(text: string, todos: NoteTodo[], keepEmpty = false): string {
  const body = text.replace(/\n+$/g, "").replace(/^\n+/, "");
  const list = todos
    .filter((todo) => keepEmpty || todo.label.trim())
    .map((todo) => `- [${todo.done ? "x" : " "}] ${keepEmpty ? todo.label : todo.label.trim()}`)
    .join("\n");
  return [body, list].filter(Boolean).join("\n\n");
}

export function compactNotes(value: string): string {
  const parsed = parseNotes(value);
  return serializeNotes(parsed.text, parsed.todos);
}

export function toggleNoteTodo(value: string, index: number): string {
  const parsed = parseNotes(value);
  if (!parsed.todos[index]) return value;
  parsed.todos[index] = { ...parsed.todos[index], done: !parsed.todos[index].done };
  return serializeNotes(parsed.text, parsed.todos);
}

export function notesHasContent(value: string): boolean {
  const parsed = parseNotes(value);
  return Boolean(parsed.text.trim() || parsed.todos.length);
}
