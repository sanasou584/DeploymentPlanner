import type { PaginationRow } from "@/types/dashboard";
import { MaterialIcon } from "@/shared/material-icon";
import { cn } from "@/utils/class-names";

export function PaginationBar({
  pages,
  current,
  statusLabel,
  onPrevious,
  onNext,
  onPage,
  row,
}: {
  pages: number[];
  current: number;
  statusLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onPage: (page: number) => void;
  row: PaginationRow;
}) {
  const canPrevious = current > (pages[0] ?? 1);
  const canNext = current < (pages[pages.length - 1] ?? 1);
  return (
    <div className="flex items-center justify-between pb-2 pt-4">
      <div className="w-32" />
      <div className="flex items-center gap-1.5 rounded-full bg-abyss px-2 py-1 shadow-inner">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canPrevious}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 font-mono text-label-md text-smoke enabled:cursor-pointer enabled:hover:text-ice"
        >
          <MaterialIcon name="arrow_back" className="text-[14px]" />
          <span>{row.previousLabel}</span>
        </button>
        <div className="flex items-center gap-1 px-1">
          {pages.map((page) =>
            page === current ? (
              <span
                key={page}
                aria-current="page"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-ice font-mono text-label-md font-bold text-abyss shadow-sm"
              >
                {page}
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPage(page)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full font-mono text-label-md text-smoke transition-colors hover:text-ice"
              >
                {page}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 font-mono text-label-md text-smoke enabled:cursor-pointer enabled:hover:text-ice"
        >
          <span>{row.nextLabel}</span>
          <MaterialIcon name="arrow_forward" className="text-[14px]" />
        </button>
      </div>
      <div className="w-32 text-right">
        <span className={cn("font-mono text-label-md text-smoke")}>
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
