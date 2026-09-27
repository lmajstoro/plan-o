import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE = 15;

export function usePagedRows<T>(rows: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage]);

  const pageRows = useMemo(
    () => rows.slice(startIndex, startIndex + pageSize),
    [rows, startIndex, pageSize],
  );

  return {
    page: currentPage,
    setPage,
    totalPages,
    pageRows,
    total,
    from: total === 0 ? 0 : startIndex + 1,
    to: Math.min(startIndex + pageSize, total),
  };
}
