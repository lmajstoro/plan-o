import { formatHour } from "./dates";

export const DAY_START = 4;
export const DAY_END = 23;
export const CORE_START = 8;
export const CORE_END = 16;
export const EXPECTED_HOURS = 8;

export type Timed = {
  id: string;
  startHour: number;
  durationHours: number;
};

export function hourColumns(): number[] {
  return Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
}

export function blockEnd(block: Pick<Timed, "startHour" | "durationHours">): number {
  return block.startHour + block.durationHours;
}

export function totalHours(blocks: Pick<Timed, "durationHours">[]): number {
  return blocks.reduce((sum, block) => sum + block.durationHours, 0);
}

export function workGaps<T extends Timed>(blocks: T[]): { start: number; end: number }[] {
  const sorted = [...blocks].sort((a, b) => a.startHour - b.startHour || a.id.localeCompare(b.id));
  const gaps: { start: number; end: number }[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const start = blockEnd(sorted[index - 1]);
    const end = sorted[index].startHour;
    if (end > start) gaps.push({ start, end });
  }
  return gaps;
}

export function gapErrorMessage<T extends Timed>(blocks: T[]): string | null {
  const gaps = workGaps(blocks);
  if (gaps.length === 0) return null;
  const labels = gaps.map((gap) => `${formatHour(gap.start)} - ${formatHour(gap.end)}`).join(", ");
  if (gaps.length === 1) {
    return `Dan se ne može potvrditi dok postoji rupa u radu (${labels}). Zadaci moraju ići jedan za drugim.`;
  }
  return `Dan se ne može potvrditi dok postoje rupe u radu (${labels}). Zadaci moraju ići jedan za drugim.`;
}

export function closeWorkGaps<T extends Timed>(blocks: T[]): T[] {
  const sorted = sortBlocks(blocks);
  if (sorted.length < 2) return blocks.map((block) => ({ ...block }));
  const moved = new Map<string, T>();
  moved.set(sorted[0].id, { ...sorted[0] });
  let cursor = blockEnd(sorted[0]);
  for (const block of sorted.slice(1)) {
    const startHour = block.startHour > cursor ? cursor : block.startHour;
    moved.set(block.id, { ...block, startHour });
    cursor = startHour + block.durationHours;
  }
  return blocks.map((block) => moved.get(block.id) ?? { ...block });
}

export function hourFromClientX(clientX: number, timeline: HTMLElement): number {
  const rect = timeline.getBoundingClientRect();
  const ratio = (clientX - rect.left) / rect.width;
  const hour = DAY_START + Math.floor(ratio * (DAY_END - DAY_START));
  return Math.min(DAY_END - 1, Math.max(DAY_START, hour));
}

export function edgeHourFromClientX(clientX: number, timeline: HTMLElement): number {
  const rect = timeline.getBoundingClientRect();
  const ratio = (clientX - rect.left) / rect.width;
  const hour = DAY_START + Math.round(ratio * (DAY_END - DAY_START));
  return Math.min(DAY_END, Math.max(DAY_START, hour));
}

function sortBlocks<T extends Timed>(blocks: T[]): T[] {
  return [...blocks].sort((a, b) => a.startHour - b.startHour || a.id.localeCompare(b.id));
}

export function movingGroupIds<T extends Timed>(blocks: T[], movedId: string, deltaHours: number): Set<string> {
  const sorted = sortBlocks(blocks);
  const idx = sorted.findIndex((block) => block.id === movedId);
  if (idx < 0) return new Set();
  const isEdge = idx === 0 || idx === sorted.length - 1;
  if (isEdge || deltaHours === 0) return new Set([movedId]);
  if (deltaHours < 0) return new Set(sorted.slice(0, idx + 1).map((block) => block.id));
  return new Set(sorted.slice(idx).map((block) => block.id));
}

function isInBounds<T extends Timed>(blocks: T[]): boolean {
  return blocks.every((block) => block.startHour >= DAY_START && blockEnd(block) <= DAY_END && block.durationHours >= 1);
}

function hasOverlap<T extends Timed>(blocks: T[]): boolean {
  const sorted = sortBlocks(blocks);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].startHour < blockEnd(sorted[i - 1])) return true;
  }
  return false;
}

function rangeLabel(block: Pick<Timed, "startHour" | "durationHours">): string {
  return `${formatHour(block.startHour)} - ${formatHour(blockEnd(block))}`;
}

export function fitAroundTarget<T extends Timed>(blocks: T[], targetId: string): T[] | null {
  const target = blocks.find((block) => block.id === targetId);
  if (!target) return null;
  if (target.startHour < DAY_START || blockEnd(target) > DAY_END || target.durationHours < 1) return null;

  const others = blocks.filter((block) => block.id !== targetId);
  const left = others
    .filter((block) => block.startHour < target.startHour)
    .sort((a, b) => b.startHour - a.startHour || b.id.localeCompare(a.id));
  const right = others
    .filter((block) => block.startHour >= target.startHour)
    .sort((a, b) => a.startHour - b.startHour || a.id.localeCompare(b.id));

  const moved = new Map<string, T>();
  moved.set(target.id, { ...target });

  let leftCursor = target.startHour;
  for (const block of left) {
    const end = Math.min(blockEnd(block), leftCursor);
    moved.set(block.id, { ...block, startHour: end - block.durationHours });
    leftCursor = end - block.durationHours;
  }

  let rightCursor = blockEnd(target);
  for (const block of right) {
    const startHour = Math.max(block.startHour, rightCursor);
    moved.set(block.id, { ...block, startHour });
    rightCursor = startHour + block.durationHours;
  }

  const next = blocks.map((block) => moved.get(block.id) ?? { ...block });
  if (!isInBounds(next) || hasOverlap(next)) return null;
  return next;
}

export function blocksShifted<T extends Timed>(before: T[], after: T[]): boolean {
  const starts = new Map(before.map((block) => [block.id, block.startHour]));
  return after.some((block) => starts.get(block.id) !== block.startHour);
}

export function overlapErrorMessage<T extends Timed>(blocks: T[], targetId: string): string | null {
  const sorted = sortBlocks(blocks);
  const idx = sorted.findIndex((block) => block.id === targetId);
  if (idx < 0) return null;
  const target = sorted[idx];
  const previous = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  const hitsPrevious = Boolean(previous && target.startHour < blockEnd(previous));
  const hitsNext = Boolean(next && next.startHour < blockEnd(target));
  if (hitsPrevious && hitsNext && previous && next) {
    return `Zadatak se preklapa s prethodnim zadatkom (${rangeLabel(previous)}) i narednim zadatkom (${rangeLabel(next)}).`;
  }
  if (hitsPrevious && previous) {
    return `Zadatak se preklapa s prethodnim zadatkom (${rangeLabel(previous)}).`;
  }
  if (hitsNext && next) {
    return `Zadatak se preklapa s narednim zadatkom (${rangeLabel(next)}).`;
  }
  return null;
}

export function shiftChain<T extends Timed>(blocks: T[], movedId: string, deltaHours: number): T[] | null {
  if (deltaHours === 0) return blocks.map((block) => ({ ...block }));
  const movingIds = movingGroupIds(blocks, movedId, deltaHours);
  if (movingIds.size === 0) return null;
  const next = blocks.map((block) =>
    movingIds.has(block.id) ? { ...block, startHour: block.startHour + deltaHours } : { ...block },
  );
  if (!isInBounds(next) || hasOverlap(next)) return null;
  return next;
}

export function resizeBlock<T extends Timed>(
  blocks: T[],
  id: string,
  edge: "start" | "end",
  edgeHour: number,
): T[] | null {
  const target = blocks.find((block) => block.id === id);
  if (!target) return null;
  const oldEnd = blockEnd(target);
  let startHour = target.startHour;
  let durationHours = target.durationHours;

  if (edge === "end") {
    durationHours = edgeHour - target.startHour;
  } else {
    startHour = edgeHour;
    durationHours = oldEnd - startHour;
  }

  if (durationHours < 1) {
    return blocks.filter((block) => block.id !== id).map((block) => ({ ...block }));
  }

  const updated = { ...target, startHour, durationHours };
  const next = blocks.map((block) => (block.id === id ? updated : { ...block }));
  if (!isInBounds(next) || hasOverlap(next)) return null;
  return next;
}

export function occupiedHours<T extends Timed>(blocks: T[]): Set<number> {
  const hours = new Set<number>();
  for (const block of blocks) {
    for (let hour = block.startHour; hour < blockEnd(block); hour += 1) {
      hours.add(hour);
    }
  }
  return hours;
}

export function expandSelection(startHour: number, currentHour: number, occupied: Set<number>): { start: number; end: number } | null {
  const lo = Math.min(startHour, currentHour);
  const hi = Math.max(startHour, currentHour);
  if (occupied.has(startHour)) return null;
  let start = startHour;
  let end = startHour;
  for (let hour = startHour; hour >= lo; hour -= 1) {
    if (occupied.has(hour)) break;
    start = hour;
  }
  for (let hour = startHour; hour <= hi; hour += 1) {
    if (occupied.has(hour)) break;
    end = hour;
  }
  return { start, end: end + 1 };
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
