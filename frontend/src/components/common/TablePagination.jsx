// =========================================================
// TablePagination.jsx
// Component phân trang bảng đồng bộ cho toàn bộ hệ thống
// Hỗ trợ chọn số dòng hiển thị mỗi trang (page size selector)
// =========================================================

import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Tính toán danh sách số trang hiển thị (hỗ trợ dấu ...)
 */
function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = [];
  if (currentPage <= 3) {
    pages.push(1, 2, 3, 4, '...', totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
  }
  return pages;
}

export const TablePagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  currentCount = 0,
  itemsPerPage = 10,
  pageSizeOptions = [5, 10, 20, 50],
  onPageSizeChange,
  onPageChange,
  itemLabel = 'dữ liệu',
  loading = false,
  className = '',
}) => {
  // Nếu không có dữ liệu thì không render
  if (totalItems <= 0 && currentCount <= 0) return null;

  const validCurrentPage = Math.max(1, currentPage || 1);
  const validTotalPages = Math.max(1, totalPages || 1);
  const displayCount = currentCount > 0 ? currentCount : Math.min(totalItems, itemsPerPage || 10);

  const handlePrev = () => {
    if (validCurrentPage > 1 && !loading) {
      onPageChange?.(validCurrentPage - 1);
    }
  };

  const handleNext = () => {
    if (validCurrentPage < validTotalPages && !loading) {
      onPageChange?.(validCurrentPage + 1);
    }
  };

  const handleSelectPage = (page) => {
    if (page !== validCurrentPage && page !== '...' && !loading) {
      onPageChange?.(page);
    }
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-200 px-6 py-4 bg-stone-50/50 text-xs text-stone-600 ${className}`}
    >
      {/* Thông tin số lượng hiển thị & Bộ chọn số mục mỗi trang */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          Hiển thị <span className="font-semibold text-stone-900">{displayCount}</span> trên tổng số{' '}
          <span className="font-semibold text-stone-900">{totalItems || displayCount}</span> {itemLabel}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-0 sm:pl-2 sm:border-l sm:border-stone-200">
            <span className="text-stone-500">Hiển thị:</span>
            <select
              aria-label={`Số ${itemLabel} mỗi trang`}
              value={itemsPerPage}
              disabled={loading}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange?.(newSize);
              }}
              className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-800 shadow-xs outline-none transition hover:border-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Điều khiển phân trang */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Nút Trước */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={validCurrentPage <= 1 || loading}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Trang trước"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Trước</span>
        </button>

        {/* Các nút bấm chọn số trang (hiển thị trên màn hình từ sm trở lên khi có > 1 trang) */}
        {validTotalPages > 1 && (
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers(validCurrentPage, validTotalPages).map((p, idx) =>
              p === '...' ? (
                <span key={`dots-${idx}`} className="px-1.5 text-stone-400 font-bold select-none">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelectPage(p)}
                  disabled={loading}
                  className={`inline-flex h-8 min-w-8 px-2.5 items-center justify-center rounded-lg text-xs font-medium transition active:scale-95 ${
                    p === validCurrentPage
                      ? 'bg-stone-900 text-white font-semibold shadow-xs'
                      : 'border border-stone-300 bg-white text-stone-700 shadow-sm hover:bg-stone-50'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>
        )}

        {/* Nhãn Trang hiện tại / Tổng trang (giữ đồng bộ cho mobile và hỗ trợ test/screen readers) */}
        <span className="px-2 font-semibold text-stone-800">
          Trang {validCurrentPage} / {validTotalPages}
        </span>

        {/* Nút Sau */}
        <button
          type="button"
          onClick={handleNext}
          disabled={validCurrentPage >= validTotalPages || loading}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Trang sau"
        >
          <span>Sau</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default TablePagination;
