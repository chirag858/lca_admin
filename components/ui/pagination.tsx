import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
};

/** Page-number row used under any paginated table; renders nothing for a single page. */
export function Pagination({ page, pages, onPageChange }: Props) {
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: pages }, (_, i) => (
        <button
          type="button"
          key={i}
          aria-label={"Page " + (i + 1)}
          aria-current={page === i + 1 ? "page" : undefined}
          className={page === i + 1 ? "selected" : ""}
          onClick={() => onPageChange(i + 1)}
        >
          {i + 1}
        </button>
      ))}
      <button type="button" aria-label="Next page" disabled={page === pages} onClick={() => onPageChange(page + 1)}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
