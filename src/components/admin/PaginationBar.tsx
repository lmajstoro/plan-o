import { ChevronLeftIcon, ChevronRightIcon } from "../icons";

type Props = {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  onPage: (page: number) => void;
};

function visiblePages(page: number, totalPages: number): Array<number | "gap"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const items: Array<number | "gap"> = [];
  const push = (value: number | "gap") => {
    if (items[items.length - 1] === value) return;
    items.push(value);
  };
  push(1);
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) push("gap");
  for (let number = start; number <= end; number += 1) push(number);
  if (end < totalPages - 1) push("gap");
  push(totalPages);
  return items;
}

export function PaginationBar({ page, totalPages, from, to, total, onPage }: Props) {
  const pages = visiblePages(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <p className="text-sm text-slate-500">{total === 0 ? "Prikaz 0 od 0" : `Prikaz ${from} - ${to} od ${total}`}</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="icon-btn disabled:pointer-events-none disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          title="Prethodna stranica"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {pages.map((item, index) =>
          item === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-sm text-slate-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`min-w-8 rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                item === page ? "bg-frigo-700 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => onPage(item)}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className="icon-btn disabled:pointer-events-none disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          title="Sljedeća stranica"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
