import type { ChecklistItem, WorkOrderChecklistEntry } from "../types";

export function blankChecklist(items: ChecklistItem[]): WorkOrderChecklistEntry[] {
  return [...items]
    .sort((a, b) => a.code.localeCompare(b.code, "hr"))
    .map((item) => ({ itemId: item.id, mark: "prazno" }));
}

export function checklistSummary(entries: WorkOrderChecklistEntry[]) {
  const absent = entries.filter((entry) => entry.mark === "nema").length;
  const confirmed = entries.filter((entry) => entry.mark === "potvrdeno").length;
  return { confirmed, absent, applicable: entries.length - absent };
}
