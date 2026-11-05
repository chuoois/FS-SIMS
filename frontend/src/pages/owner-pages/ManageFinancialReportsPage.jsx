// =========================================================
// ManageFinancialReportsPage.jsx
// Quản lý Báo Cáo Tài Chính (Manage Financial Reports) dành cho Chủ xưởng (Owner)
// Chức năng:
// 1. Xem báo cáo tài chính tổng quan (Doanh thu, Thực thu, Công nợ, Chi phí nhập vật tư, Lợi nhuận gộp)
// 2. Phân tích doanh thu theo loại đơn hàng (Hàng sẵn có READY vs Hàng đặt làm CUSTOM)
// 3. Xem danh sách chi tiết đơn hàng doanh thu & chi phí phiếu nhập vật tư
// 4. Xuất báo cáo tài chính ra file Excel (.csv UTF-8 BOM chuẩn tiếng Việt)
// 5. Xuất báo cáo tài chính ra file PDF / In ấn với định dạng biểu mẫu chuẩn doanh nghiệp
// =========================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  RotateCw,
  Calendar,
  Layers,
  ShoppingBag,
  Building2,
  Download,
  Printer,
  ChevronRight,
  PieChart,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  getFinancialSummary,
  getFinancialOrders,
  getFinancialReceipts,
  getFinancialExportData,
  downloadFinancialCSV,
} from '../../services/financialReportService';
import {
  formatCurrency,
  exportFinancialToExcel,
  printFinancialReport,
} from '../../utils/financialExportUtils';
import { TablePagination } from '../../components/common/TablePagination';

// Format ngày tháng hiển thị
const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const ManageFinancialReportsPage = () => {
  // ── 1. Khoảng thời gian lọc ─────────────────────────────────
  const getInitialDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return {
      startDate: `${year}-${month}-01`,
      endDate: now.toISOString().slice(0, 10),
    };
  };

  const initialDates = getInitialDates();
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);
  const [activePreset, setActivePreset] = useState('THIS_MONTH');

  // ── 2. Dữ liệu tổng hợp (Summary) ──────────────────────────
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // ── 3. Tabs & Dữ liệu chi tiết ─────────────────────────────
  const [activeTab, setActiveTab] = useState('ORDERS'); // 'ORDERS' | 'RECEIPTS' | 'TOP_PRODUCTS'

  // Tab Đơn hàng
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(10);
  const [ordersPagination, setOrdersPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });

  // Tab Phiếu nhập
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsPage, setReceiptsPage] = useState(1);
  const [receiptsPageSize, setReceiptsPageSize] = useState(10);
  const [receiptsPagination, setReceiptsPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });

  // Trạng thái thao tác xuất file
  const [exporting, setExporting] = useState(false);

  // ── 4. Áp dụng preset thời gian ─────────────────────────────
  const applyPreset = (preset) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    setActivePreset(preset);
    setOrdersPage(1);
    setReceiptsPage(1);

    if (preset === 'THIS_MONTH') {
      const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const end = now.toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'LAST_MONTH') {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
      setStartDate(`${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`);
      setEndDate(`${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${lastDay}`);
    } else if (preset === 'THIS_QUARTER') {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      setStartDate(`${year}-${String(quarterStartMonth + 1).padStart(2, '0')}-01`);
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === 'THIS_YEAR') {
      setStartDate(`${year}-01-01`);
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  // ── 5. Fetch Dữ liệu Tổng hợp ───────────────────────────────
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await getFinancialSummary({ startDate, endDate });
      setSummary(res?.summary || null);
    } catch (err) {
      console.error('Lỗi khi tải tổng quan tài chính:', err);
      toast.error('Không thể tải tổng quan tài chính');
    } finally {
      setSummaryLoading(false);
    }
  }, [startDate, endDate]);

  // ── 6. Fetch Chi tiết Đơn hàng ──────────────────────────────
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await getFinancialOrders({
        startDate,
        endDate,
        orderType: orderTypeFilter !== 'ALL' ? orderTypeFilter : undefined,
        page: ordersPage,
        limit: ordersPageSize,
      });
      setOrders(res?.orders || []);
      if (res?.pagination) {
        setOrdersPagination(res.pagination);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách đơn hàng tài chính:', err);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setOrdersLoading(false);
    }
  }, [startDate, endDate, orderTypeFilter, ordersPage, ordersPageSize]);

  // ── 7. Fetch Chi tiết Phiếu nhập ────────────────────────────
  const fetchReceipts = useCallback(async () => {
    setReceiptsLoading(true);
    try {
      const res = await getFinancialReceipts({
        startDate,
        endDate,
        page: receiptsPage,
        limit: receiptsPageSize,
      });
      setReceipts(res?.receipts || []);
      if (res?.pagination) {
        setReceiptsPagination(res.pagination);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách phiếu nhập kho:', err);
      toast.error('Không thể tải danh sách phiếu nhập');
    } finally {
      setReceiptsLoading(false);
    }
  }, [startDate, endDate, receiptsPage, receiptsPageSize]);

  // Kích hoạt fetch khi thay đổi ngày hoặc tab
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === 'ORDERS') {
      fetchOrders();
    } else if (activeTab === 'RECEIPTS') {
      fetchReceipts();
    }
  }, [activeTab, fetchOrders, fetchReceipts]);

  // Làm mới toàn bộ
  const handleRefresh = async () => {
    await Promise.all([fetchSummary(), activeTab === 'ORDERS' ? fetchOrders() : fetchReceipts()]);
    toast.success('Đã làm mới dữ liệu báo cáo');
  };

  // ── 8. Xử lý Xuất file Excel ────────────────────────────────
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await getFinancialExportData({ startDate, endDate });
      if (res?.exportData) {
        exportFinancialToExcel(res.exportData, startDate, endDate);
        toast.success('Xuất file Excel thành công');
        return;
      }
      throw new Error('Không có dữ liệu export');
    } catch (err) {
      console.warn('Thử tải trực tiếp CSV từ máy chủ:', err);
      try {
        const blob = await downloadFinancialCSV({ startDate, endDate });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `BaoCaoTaiChinh_GocNha_${startDate || 'start'}_${endDate || 'end'}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Xuất file Excel thành công');
      } catch (fallbackErr) {
        console.error('Lỗi khi xuất file Excel:', fallbackErr);
        toast.error('Không thể xuất file Excel');
      }
    } finally {
      setExporting(false);
    }
  };

  // ── 9. Xử lý Xuất file PDF / In ấn ─────────────────────────
  const handleExportPdf = () => {
    toast.success('Đang mở hộp thoại in / lưu PDF...');
    printFinancialReport();
  };

  const metrics = summary?.metrics || {};
  const revenueByOrderType = summary?.revenueByOrderType || [];
  const timeline = summary?.timeline || [];
  const topProducts = summary?.topProducts || [];

  return (
    <div className="space-y-6">
      {/* ── CSS chuyên biệt khi In / Lưu PDF ─────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-financial-report, #printable-financial-report * {
            visibility: visible;
          }
          #printable-financial-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            color: black;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Header: Tiêu đề & Nút xuất báo cáo ─────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Báo Cáo Tài Chính
            </h1>
            <p className="text-sm text-stone-500">
              Theo dõi dòng tiền, doanh thu bán hàng, chi phí nhập vật tư và lợi nhuận xưởng Góc Nhà.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={summaryLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RotateCw className={`h-4 w-4 ${summaryLoading ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>

          {/* Nút Xuất Excel */}
          <button
            onClick={handleExportExcel}
            disabled={exporting || summaryLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-800 shadow-xs transition hover:bg-emerald-100 active:scale-95 disabled:opacity-50"
            title="Xuất dữ liệu ra file Excel (.csv UTF-8)"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <span>Xuất Excel</span>
          </button>

          {/* Nút Xuất PDF / In */}
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-amber-800 active:scale-95"
            title="Mở hộp thoại in hoặc lưu thành file PDF"
          >
            <Printer className="h-4 w-4" />
            <span>Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* ── Bộ lọc thời gian (Presets & Date Pickers) ───────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs no-print">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 mr-1">
              Kỳ báo cáo:
            </span>
            <button
              onClick={() => applyPreset('THIS_MONTH')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activePreset === 'THIS_MONTH'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => applyPreset('LAST_MONTH')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activePreset === 'LAST_MONTH'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Tháng trước
            </button>
            <button
              onClick={() => applyPreset('THIS_QUARTER')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activePreset === 'THIS_QUARTER'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Quý này
            </button>
            <button
              onClick={() => applyPreset('THIS_YEAR')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activePreset === 'THIS_YEAR'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Năm nay
            </button>
          </div>

          {/* Chọn ngày từ - đến */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-stone-600">Từ ngày:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('CUSTOM');
                  setOrdersPage(1);
                  setReceiptsPage(1);
                }}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-800 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-stone-600">Đến ngày:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('CUSTOM');
                  setOrdersPage(1);
                  setReceiptsPage(1);
                }}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-800 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards (Tổng hợp chỉ số tài chính) ───────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 no-print">
        {/* 1. Tổng doanh thu */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Tổng doanh thu
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold text-stone-900">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-stone-500">
            <span>{metrics.ordersCount || 0} đơn hàng phát sinh</span>
          </div>
        </div>

        {/* 2. Thực thu (Đã thanh toán) */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Thực thu (Đã thu)
            </span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold text-emerald-900">
            {formatCurrency(metrics.paidRevenue)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">
            {metrics.totalRevenue > 0
              ? `${Math.round(((metrics.paidRevenue || 0) / metrics.totalRevenue) * 100)}% tổng doanh thu`
              : '0% tổng doanh thu'}
          </div>
        </div>

        {/* 3. Công nợ phải thu */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Khoản phải thu
            </span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold text-amber-900">
            {formatCurrency(metrics.receivableAmount)}
          </div>
          <div className="mt-1 text-[11px] text-amber-700">Khách hàng còn nợ</div>
        </div>

        {/* 4. Chi phí nhập vật tư */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
              Chi phí nhập vật tư
            </span>
            <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold text-rose-900">
            {formatCurrency(metrics.totalCost)}
          </div>
          <div className="mt-1 text-[11px] text-rose-700">
            {metrics.receiptsCount || 0} phiếu nhập xác nhận
          </div>
        </div>

        {/* 5. Lợi nhuận gộp ước tính */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-800">
              Lợi nhuận gộp
            </span>
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-lg font-bold ${
              (metrics.grossProfit || 0) >= 0 ? 'text-indigo-900' : 'text-rose-700'
            }`}
          >
            {formatCurrency(metrics.grossProfit)}
          </div>
          <div className="mt-1 text-[11px] text-indigo-700">Doanh thu - Chi phí vật tư</div>
        </div>

        {/* 6. Tỷ suất lợi nhuận gộp */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Tỷ suất lợi nhuận
            </span>
            <div className="rounded-lg bg-stone-100 p-2 text-stone-700">
              <PieChart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold text-stone-900">
            {metrics.profitMargin || 0}%
          </div>
          <div className="mt-1 text-[11px] text-stone-500">Tỷ lệ biên lợi nhuận gộp</div>
        </div>
      </div>

      {/* ── Phân tích Cơ cấu & Diễn biến dòng tiền ─────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 no-print">
        {/* Cơ cấu doanh thu theo loại đơn (CUSTOM vs READY) */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-800" />
              <h3 className="font-bold text-stone-900">Cơ Cấu Doanh Thu Theo Loại Đơn</h3>
            </div>
            <span className="text-xs text-stone-400">Hàng đặt làm vs Hàng sẵn có</span>
          </div>

          <div className="mt-4 space-y-4">
            {revenueByOrderType.map((typeItem) => {
              const totalRev = metrics.totalRevenue || 1;
              const percent = Math.min(
                100,
                Math.round(((typeItem.total_revenue || 0) / totalRev) * 100)
              );
              const isCustom = typeItem.order_type === 'CUSTOM';

              return (
                <div key={typeItem.order_type} className="rounded-lg border border-stone-100 bg-stone-50/50 p-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isCustom ? 'bg-amber-600' : 'bg-blue-600'
                        }`}
                      />
                      <span className="font-semibold text-stone-800">{typeItem.type_name}</span>
                      <span className="text-xs text-stone-500">
                        ({typeItem.orders_count || 0} đơn)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-stone-900">
                        {formatCurrency(typeItem.total_revenue)}
                      </span>
                      <span className="ml-2 text-xs font-semibold text-stone-500">
                        {percent}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-stone-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCustom ? 'bg-amber-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                    <span>Đã thanh toán thực tế:</span>
                    <span className="font-medium text-emerald-700">
                      {formatCurrency(typeItem.paid_revenue)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diễn biến theo dòng thời gian (Timeline) */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-700" />
              <h3 className="font-bold text-stone-900">Diễn Biến Doanh Thu & Chi Phí</h3>
            </div>
            <span className="text-xs text-stone-400">Theo các mốc kỳ</span>
          </div>

          <div className="mt-4">
            {timeline.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 italic">
                Chưa có dữ liệu giao dịch trong khoảng thời gian này.
              </div>
            ) : (
              <div className="space-y-3">
                {timeline.slice(0, 6).map((t) => (
                  <div
                    key={t.period}
                    className="flex flex-col gap-1.5 rounded-lg border border-stone-100 p-2.5 sm:flex-row sm:items-center sm:justify-between text-xs"
                  >
                    <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-stone-400" />
                      <span>{t.period}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1">
                        <span className="text-stone-400">Thu:</span>
                        <span className="font-medium text-emerald-700">
                          {formatCurrency(t.revenue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-stone-400">Chi:</span>
                        <span className="font-medium text-rose-700">
                          {formatCurrency(t.cost)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 font-bold">
                        <span className="text-stone-400">Lãi gộp:</span>
                        <span className={t.profit >= 0 ? 'text-indigo-700' : 'text-rose-600'}>
                          {formatCurrency(t.profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs: Bảng Kê Chi Tiết ───────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-xs overflow-hidden no-print">
        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50/60 px-4">
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`flex items-center gap-2 border-b-2 py-3.5 px-4 text-sm font-semibold transition ${
              activeTab === 'ORDERS'
                ? 'border-amber-700 text-amber-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Doanh Thu Đơn Hàng</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-600">
              {ordersPagination.totalItems || orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('RECEIPTS')}
            className={`flex items-center gap-2 border-b-2 py-3.5 px-4 text-sm font-semibold transition ${
              activeTab === 'RECEIPTS'
                ? 'border-amber-700 text-amber-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Chi Phí Nhập Vật Tư</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-600">
              {receiptsPagination.totalItems || receipts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('TOP_PRODUCTS')}
            className={`flex items-center gap-2 border-b-2 py-3.5 px-4 text-sm font-semibold transition ${
              activeTab === 'TOP_PRODUCTS'
                ? 'border-amber-700 text-amber-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Top Sản Phẩm Doanh Thu Cao</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-normal text-stone-600">
              {topProducts.length}
            </span>
          </button>
        </div>

        {/* Nội dung Tab 1: Đơn Hàng */}
        {activeTab === 'ORDERS' && (
          <div>
            {/* Lọc loại đơn trong tab */}
            <div className="flex items-center justify-between border-b border-stone-100 p-3 bg-stone-50/30 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-stone-600">Lọc loại đơn:</span>
                <select
                  value={orderTypeFilter}
                  onChange={(e) => {
                    setOrderTypeFilter(e.target.value);
                    setOrdersPage(1);
                  }}
                  className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700 focus:border-amber-600 focus:outline-none"
                >
                  <option value="ALL">Tất cả loại đơn</option>
                  <option value="CUSTOM">Hàng đặt làm</option>
                  <option value="READY">Hàng sẵn có</option>
                </select>
              </div>

              <span className="text-stone-400">
                Hiển thị các đơn hàng phát sinh trong khoảng ngày đã chọn
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                <thead className="bg-stone-50 font-semibold text-stone-700 text-xs">
                  <tr>
                    <th className="py-3 pl-4 pr-3 sm:pl-6">Mã đơn</th>
                    <th className="px-3 py-3">Khách hàng</th>
                    <th className="px-3 py-3">Loại đơn</th>
                    <th className="px-3 py-3 text-right">Tổng tiền</th>
                    <th className="px-3 py-3 text-right">Đã thanh toán</th>
                    <th className="px-3 py-3 text-right">Còn lại</th>
                    <th className="px-3 py-3 text-center">Trạng thái</th>
                    <th className="py-3 pl-3 pr-4 text-center sm:pr-6">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {ordersLoading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-stone-500">
                        <div className="flex items-center justify-center gap-2">
                          <RotateCw className="h-5 w-5 animate-spin text-amber-700" />
                          <span>Đang tải danh sách đơn hàng...</span>
                        </div>
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-stone-400 italic">
                        Không có đơn hàng nào trong khoảng thời gian đã chọn.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.order_id} className="transition hover:bg-stone-50/70 text-xs">
                        <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6 font-semibold text-amber-800">
                          {o.order_code}
                        </td>
                        <td className="px-3 py-3 font-medium text-stone-800">
                          <div>{o.contact_name}</div>
                          <div className="text-[11px] text-stone-400">{o.contact_phone}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
                              o.order_type === 'CUSTOM'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {o.order_type_label || o.order_type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-stone-900">
                          {formatCurrency(o.total_amount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-emerald-700">
                          {formatCurrency(o.paid_amount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-medium text-amber-700">
                          {formatCurrency(o.remaining_amount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-center">
                          <span className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                            {o.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-3 pl-3 pr-4 text-center text-stone-500 sm:pr-6">
                          {formatDate(o.createdate)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân trang đơn hàng */}
            <TablePagination
              currentPage={ordersPage}
              totalPages={ordersPagination.totalPages}
              totalItems={ordersPagination.totalItems}
              currentCount={orders.length}
              itemsPerPage={ordersPageSize}
              onPageChange={(page) => setOrdersPage(page)}
              onPageSizeChange={(size) => {
                setOrdersPageSize(size);
                setOrdersPage(1);
              }}
              itemLabel="đơn hàng"
              loading={ordersLoading}
            />
          </div>
        )}

        {/* Nội dung Tab 2: Phiếu Nhập Kho Vật Tư */}
        {activeTab === 'RECEIPTS' && (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                <thead className="bg-stone-50 font-semibold text-stone-700 text-xs">
                  <tr>
                    <th className="py-3 pl-4 pr-3 sm:pl-6">Mã phiếu</th>
                    <th className="px-3 py-3">Nhà cung cấp</th>
                    <th className="px-3 py-3">Ngày nhập</th>
                    <th className="px-3 py-3 text-right">Tổng tiền chi phí</th>
                    <th className="px-3 py-3 text-center">Trạng thái</th>
                    <th className="py-3 pl-3 pr-4 text-center sm:pr-6">Người tiếp nhận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {receiptsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-stone-500">
                        <div className="flex items-center justify-center gap-2">
                          <RotateCw className="h-5 w-5 animate-spin text-amber-700" />
                          <span>Đang tải danh sách phiếu nhập kho...</span>
                        </div>
                      </td>
                    </tr>
                  ) : receipts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-stone-400 italic">
                        Không có phiếu nhập kho nào trong khoảng thời gian đã chọn.
                      </td>
                    </tr>
                  ) : (
                    receipts.map((r) => (
                      <tr key={r.receipt_id} className="transition hover:bg-stone-50/70 text-xs">
                        <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6 font-semibold text-amber-800">
                          {r.receipt_code}
                        </td>
                        <td className="px-3 py-3 font-medium text-stone-800">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-stone-400" />
                            <span>{r.supplier_name}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-stone-600">
                          {formatDate(r.receipt_date)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-rose-700">
                          {formatCurrency(r.total_amount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              r.status === 'CONFIRMED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-stone-100 text-stone-700'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap py-3 pl-3 pr-4 text-center text-stone-600 sm:pr-6">
                          {r.received_by_name || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân trang phiếu nhập */}
            <TablePagination
              currentPage={receiptsPage}
              totalPages={receiptsPagination.totalPages}
              totalItems={receiptsPagination.totalItems}
              currentCount={receipts.length}
              itemsPerPage={receiptsPageSize}
              onPageChange={(page) => setReceiptsPage(page)}
              onPageSizeChange={(size) => {
                setReceiptsPageSize(size);
                setReceiptsPage(1);
              }}
              itemLabel="phiếu nhập"
              loading={receiptsLoading}
            />
          </div>
        )}

        {/* Nội dung Tab 3: Top Sản Phẩm Bán Chạy */}
        {activeTab === 'TOP_PRODUCTS' && (
          <div className="p-4">
            {topProducts.length === 0 ? (
              <div className="py-10 text-center text-stone-400 italic text-xs">
                Chưa có dữ liệu sản phẩm trong khoảng thời gian này.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {topProducts.map((p, idx) => (
                  <div
                    key={p.item_name}
                    className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4 transition hover:bg-stone-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-bold text-amber-900">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-stone-900 truncate text-sm">
                        {p.item_name}
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Đã bán: <span className="font-semibold text-stone-800">{p.quantity_sold}</span> món
                      </p>
                      <p className="text-xs font-bold text-emerald-700 mt-1">
                        Doanh thu: {formatCurrency(p.total_revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── BẢN IN / PDF CHUẨN DOANH NGHIỆP (ẨN KHI XEM, CHỈ HIỆN KHI IN) ── */}
      <div id="printable-financial-report" className="hidden print:block">
        <div className="border-b-2 border-stone-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight text-stone-900">
                XƯỞNG NỘI THẤT GÓC NHÀ
              </h2>
              <p className="text-xs text-stone-600">
                Địa chỉ: Xưởng mộc Góc Nhà, TP. Hồ Chí Minh
              </p>
              <p className="text-xs text-stone-600">Hotline: 0900.000.000 • Email: info@gocnha.vn</p>
            </div>
            <div className="text-right text-xs text-stone-500">
              <p>Mẫu số: 01-BCTC-GN</p>
              <p>Ngày in: {new Date().toLocaleDateString('vi-VN')}</p>
            </div>
          </div>

          <div className="text-center mt-6">
            <h1 className="text-2xl font-bold uppercase tracking-wide text-stone-900">
              BÁO CÁO KẾT QUẢ HOẠT ĐỘNG TÀI CHÍNH
            </h1>
            <p className="text-sm italic text-stone-600 mt-1">
              Kỳ báo cáo: Từ ngày {startDate} đến ngày {endDate}
            </p>
          </div>
        </div>

        {/* 1. Chỉ số tổng hợp */}
        <div className="mb-6">
          <h3 className="font-bold text-sm uppercase tracking-wide text-stone-800 mb-2">
            I. BẢNG TỔNG HỢP CHỈ SỐ TÀI CHÍNH
          </h3>
          <table className="w-full border-collapse border border-stone-300 text-xs">
            <thead>
              <tr className="bg-stone-100 text-left font-bold">
                <th className="border border-stone-300 p-2">Chỉ số tài chính</th>
                <th className="border border-stone-300 p-2 text-right">Giá trị (VNĐ)</th>
                <th className="border border-stone-300 p-2">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-stone-300 p-2 font-medium">1. Tổng doanh thu bán hàng</td>
                <td className="border border-stone-300 p-2 text-right font-bold">{formatCurrency(metrics.totalRevenue)}</td>
                <td className="border border-stone-300 p-2 text-stone-600">Tổng giá trị các đơn hàng phát sinh</td>
              </tr>
              <tr>
                <td className="border border-stone-300 p-2 font-medium">2. Thực thu (Đã thanh toán)</td>
                <td className="border border-stone-300 p-2 text-right font-bold text-emerald-800">{formatCurrency(metrics.paidRevenue)}</td>
                <td className="border border-stone-300 p-2 text-stone-600">Tiền thực nhận từ khách hàng</td>
              </tr>
              <tr>
                <td className="border border-stone-300 p-2 font-medium">3. Khoản phải thu (Công nợ)</td>
                <td className="border border-stone-300 p-2 text-right font-bold text-amber-800">{formatCurrency(metrics.receivableAmount)}</td>
                <td className="border border-stone-300 p-2 text-stone-600">Tiền khách còn nợ xưởng</td>
              </tr>
              <tr>
                <td className="border border-stone-300 p-2 font-medium">4. Tổng chi phí nhập nguyên vật liệu</td>
                <td className="border border-stone-300 p-2 text-right font-bold text-rose-800">{formatCurrency(metrics.totalCost)}</td>
                <td className="border border-stone-300 p-2 text-stone-600">Chi phí mua gỗ, phụ kiện từ nhà cung cấp</td>
              </tr>
              <tr className="bg-stone-50 font-bold">
                <td className="border border-stone-300 p-2">5. Lợi nhuận gộp ước tính (1 - 4)</td>
                <td className="border border-stone-300 p-2 text-right text-indigo-900">{formatCurrency(metrics.grossProfit)}</td>
                <td className="border border-stone-300 p-2">Tỷ suất lợi nhuận gộp: {metrics.profitMargin || 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Ký tên xác nhận */}
        <div className="mt-12 flex justify-between text-center text-xs">
          <div>
            <p className="font-bold">NGƯỜI LẬP BÁO CÁO</p>
            <p className="text-stone-400 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
            <div className="h-16" />
          </div>
          <div>
            <p className="font-bold">KẾ TOÁN TRƯỞNG</p>
            <p className="text-stone-400 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
            <div className="h-16" />
          </div>
          <div>
            <p className="font-bold">CHỦ XƯỞNG / GIÁM ĐỐC</p>
            <p className="text-stone-400 italic mt-0.5">(Ký, đóng dấu)</p>
            <div className="h-16" />
          </div>
        </div>
      </div>
    </div>
  );
};
