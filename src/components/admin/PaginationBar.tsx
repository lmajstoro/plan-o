import { ChevronLeftIcon, ChevronRightIcon } from "../icons";
import { PAGE_SIZE } from "../../lib/pagination";

type Props = {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  onPage: (page: number) => void;
};

export function PaginationBar({ page, totalPages, from, to, total, onPage }: Props) {
  if (total <= PAGE_SIZE) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <p className="text-sm text-slate-500">
        Prikaz {from} - {to} od {total}
      </p>
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
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            className={`min-w-8 rounded-lg px-2.5 py-1.5 text-sm font-medium ${
              item === page ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => onPage(item)}
          >
            {item}
          </button>
        ))}
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
