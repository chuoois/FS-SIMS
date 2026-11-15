// =========================================================
// CustomersPage.jsx
// Trang quản lý khách hàng dành cho Role Sale
// Có đầy đủ: phân trang, tìm kiếm, lọc theo trạng thái
// =========================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Search,
  RotateCw,
  Eye,
  Filter,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShoppingBag,
  FileText,
  ClipboardList,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCustomers, getCustomerById } from '../../services/saleOrderService';
import { TablePagination } from '../../components/common/TablePagination';

// ─── Helpers ──────────────────────────────────────────────
const formatDate = (d) =>
  d ? new Intl.DateTimeFormat('vi-VN').format(new Date(d)) : '—';

const formatVND = (val) =>
  val != null
    ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(val)
    : '—';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
];

const SEARCH_BY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'NAME', label: 'Tên khách hàng' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Số điện thoại' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// ─── Status Badge ──────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        Hoạt động
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
      <XCircle className="h-3 w-3" />
      Ngừng HĐ
    </span>
  );
}

// ─── Customer Detail Modal ─────────────────────────────────
function CustomerDetailModal({ customerId, onClose }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    getCustomerById(customerId)
      .then((res) => {
        setCustomer(res?.data || null);
      })
      .catch((err) => {
        console.error('Lỗi tải chi tiết khách hàng:', err);
        toast.error(err.response?.data?.message || 'Không thể tải thông tin khách hàng');
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  const overlayRef = useRef(null);
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Users className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-800">
                {loading ? 'Đang tải...' : customer?.full_name || '—'}
              </h2>
              <p className="text-xs text-stone-500">Chi tiết khách hàng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 shrink-0 px-6">
          {[
            { key: 'info', label: 'Thông tin' },
            { key: 'requests', label: `Yêu cầu (${customer?.requests?.length ?? 0})` },
            { key: 'contracts', label: `Hợp đồng (${customer?.contracts?.length ?? 0})` },
            { key: 'orders', label: `Đơn hàng (${customer?.orders?.length ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-amber-500 text-amber-700'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RotateCw className="h-6 w-6 animate-spin text-amber-500" />
            </div>
          ) : !customer ? (
            <p className="text-center text-stone-500 py-16">Không tìm thấy khách hàng</p>
          ) : (
            <>
              {/* Tab: Thông tin */}
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoRow icon={<Users className="h-4 w-4" />} label="Họ và tên" value={customer.full_name} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={customer.email} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Số điện thoại" value={customer.phone_number} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Địa chỉ" value={customer.address || '—'} />
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Ngày tham gia"
                    value={formatDate(customer.createdate)}
                  />
                  <InfoRow
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Trạng thái"
                    value={<StatusBadge status={customer.status} />}
                  />
                  <InfoRow label="Giới tính" value={customer.gender || '—'} />
                  <InfoRow label="Ngày sinh" value={formatDate(customer.dob)} />
                </div>
              )}

              {/* Tab: Yêu cầu */}
              {activeTab === 'requests' && (
                <HistoryList
                  items={customer.requests}
                  emptyText="Chưa có yêu cầu nào"
                  renderItem={(r) => (
                    <div key={r.request_id} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-stone-800 text-sm">{r.request_code}</p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {r.order_type === 'CUSTOM' ? 'Đặt theo yêu cầu' : 'Hàng có sẵn'} •{' '}
                          {formatDate(r.createdate)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.status === 'CONVERTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : r.status === 'PROCESSING'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status === 'CONVERTED'
                          ? 'Đã chuyển HĐ'
                          : r.status === 'REJECTED'
                          ? 'Từ chối'
                          : r.status === 'PROCESSING'
                          ? 'Đang xử lý'
                          : 'Chờ xử lý'}
                      </span>
                    </div>
                  )}
                />
              )}

              {/* Tab: Hợp đồng */}
              {activeTab === 'contracts' && (
                <HistoryList
                  items={customer.contracts}
                  emptyText="Chưa có hợp đồng nào"
                  renderItem={(c) => (
                    <div key={c.contract_id} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-stone-800 text-sm">{c.contract_code}</p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {formatVND(c.total_amount)} • {formatDate(c.createdate)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          c.status === 'SIGNED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status === 'SIGNED' ? 'Đã ký' : c.status === 'CANCELLED' ? 'Đã huỷ' : 'Nháp'}
                      </span>
                    </div>
                  )}
                />
              )}

              {/* Tab: Đơn hàng */}
              {activeTab === 'orders' && (
                <HistoryList
                  items={customer.orders}
                  emptyText="Chưa có đơn hàng nào"
                  renderItem={(o) => (
                    <div key={o.order_id} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-stone-800 text-sm">{o.order_code}</p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {formatVND(o.total_amount)} • Dự kiến: {formatDate(o.expected_date)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          o.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-700'
                            : o.status === 'IN_PRODUCTION'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.status === 'COMPLETED'
                          ? 'Hoàn thành'
                          : o.status === 'CANCELLED'
                          ? 'Đã huỷ'
                          : o.status === 'IN_PRODUCTION'
                          ? 'Đang xử lý'
                          : o.status === 'CONFIRMED'
                          ? 'Đã xác nhận'
                          : o.status}
                      </span>
                    </div>
                  )}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-stone-50 px-4 py-3">
      {icon && <span className="mt-0.5 text-amber-600">{icon}</span>}
      <div>
        <p className="text-xs text-stone-500">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-stone-800">{value}</div>
      </div>
    </div>
  );
}

function HistoryList({ items, emptyText, renderItem }) {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-stone-400">
        <ClipboardList className="h-10 w-10 mb-2" />
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3">
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    search_by: 'ALL',
    status: 'ALL',
  });
  const [pageSize, setPageSize] = useState(10);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const debounceRef = useRef(null);

  // Computed active filter count (không tính search vì hiển thị riêng)
  const activeFilterCount = [
    filters.status !== 'ALL' ? 1 : 0,
    filters.search_by !== 'ALL' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const fetchCustomers = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: pageSize,
          ...(filters.search ? { search: filters.search } : {}),
          ...(filters.search_by !== 'ALL' ? { search_by: filters.search_by } : {}),
          ...(filters.status !== 'ALL' ? { status: filters.status } : {}),
        };
        const res = await getCustomers(params);
        setCustomers(res.data || []);
        setPagination(res.pagination || { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: pageSize });
      } catch (err) {
        toast.error('Không thể tải danh sách khách hàng');
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [filters, pageSize]
  );

  // Fetch on filter/page-size change
  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  // Debounce search input 300ms
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: val }));
    }, 300);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (page) => {
    fetchCustomers(page);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setFilters({ search: '', search_by: 'ALL', status: 'ALL' });
  };

  return (
    <div className="min-h-screen bg-stone-50 p-4 sm:p-6">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <Users className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-800">Quản lý khách hàng</h1>
            <p className="text-xs text-stone-500">
              {pagination.totalItems} khách hàng
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchCustomers(pagination.currentPage)}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
        >
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search by dropdown */}
          <div className="relative">
            <select
              value={filters.search_by}
              onChange={(e) => handleFilterChange('search_by', e.target.value)}
              className="appearance-none rounded-lg border border-stone-200 bg-stone-50 pl-3 pr-8 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {SEARCH_BY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          </div>

          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Tìm kiếm khách hàng..."
              className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-9 pr-4 text-sm text-stone-700 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setFilters((prev) => ({ ...prev, search: '' }));
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-stone-400 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="appearance-none rounded-lg border border-stone-200 bg-stone-50 pl-3 pr-8 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          </div>

          {/* Page size */}
          <div className="relative">
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="appearance-none rounded-lg border border-stone-200 bg-stone-50 pl-3 pr-8 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s} / trang
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          </div>

          {/* Reset button */}
          {(activeFilterCount > 0 || filters.search) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-200 transition"
            >
              <X className="h-4 w-4" />
              Xoá bộ lọc
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RotateCw className="h-6 w-6 animate-spin text-amber-500" />
            <span className="ml-2 text-stone-500">Đang tải...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <Users className="h-12 w-12 mb-3" />
            <p className="text-base font-medium">Không tìm thấy khách hàng</p>
            <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Số điện thoại</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Yêu cầu</th>
                  <th className="px-4 py-3 text-center">Hợp đồng</th>
                  <th className="px-4 py-3 text-center">Đơn hàng</th>
                  <th className="px-4 py-3">Ngày tham gia</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {customers.map((c, idx) => (
                  <tr
                    key={c.user_account_id}
                    className="hover:bg-amber-50/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-stone-400 text-xs">
                      {(pagination.currentPage - 1) * pagination.itemsPerPage + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                          {(c.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-800">{c.full_name}</p>
                          <p className="text-xs text-stone-500">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-stone-400" />
                        {c.phone_number}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatBadge value={c.totalRequests} icon={<ClipboardList className="h-3 w-3" />} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatBadge value={c.totalContracts} icon={<FileText className="h-3 w-3" />} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatBadge value={c.totalOrders} icon={<ShoppingBag className="h-3 w-3" />} />
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-stone-400" />
                        {formatDate(c.createdate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedCustomerId(c.user_account_id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && customers.length > 0 && (
        <div className="mt-4">
          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Detail Modal */}
      {selectedCustomerId && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  );
}

function StatBadge({ value, icon }) {
  if (!value) {
    return <span className="text-stone-300 text-xs">0</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
      {icon}
      {value}
    </span>
  );
}

