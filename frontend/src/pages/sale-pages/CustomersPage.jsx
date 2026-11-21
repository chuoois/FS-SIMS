// =========================================================
// CustomersPage.jsx
// Trang quản lý khách hàng dành cho Role Sale
// Có đầy đủ: phân trang, tìm kiếm, lọc theo trạng thái
// Thiết kế đồng bộ 100% với hệ thống Dashboard Owner
// =========================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  RotateCw,
  Eye,
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
  UserPlus,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCustomers, getCustomerById, createSaleCustomer } from '../../services/saleOrderService';
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
  { value: 'ALL', label: '🔍 Tất cả tiêu chí' },
  { value: 'NAME', label: '👤 Tên khách hàng' },
  { value: 'EMAIL', label: '✉️ Email' },
  { value: 'PHONE', label: '📞 Số điện thoại' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// ─── Status Badge ──────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Hoạt động
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 border border-rose-200">
      <XCircle className="h-3.5 w-3.5" />
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-stone-200 my-8 overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                {loading ? 'Đang tải thông tin...' : customer?.full_name || 'Chi tiết khách hàng'}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {customer?.email ? customer.email : 'Hồ sơ tài khoản khách hàng'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 shrink-0 px-6 bg-stone-50/60">
          {[
            { key: 'info', label: 'Thông tin chung' },
            { key: 'requests', label: `Yêu cầu (${customer?.requests?.length ?? 0})` },
            { key: 'contracts', label: `Hợp đồng (${customer?.contracts?.length ?? 0})` },
            { key: 'orders', label: `Đơn hàng (${customer?.orders?.length ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px px-4 py-3 text-sm font-semibold transition border-b-2 ${
                activeTab === tab.key
                  ? 'border-amber-800 text-amber-900 bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[65vh] p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-500">
              <RotateCw className="h-6 w-6 animate-spin text-amber-700 mb-2" />
              <span className="text-xs">Đang tải hồ sơ khách hàng...</span>
            </div>
          ) : !customer ? (
            <p className="text-center text-stone-500 py-16 text-sm">Không tìm thấy khách hàng</p>
          ) : (
            <>
              {/* Tab: Thông tin */}
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoRow icon={<Users className="h-4 w-4" />} label="Họ và tên" value={customer.full_name} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={customer.email || '—'} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Số điện thoại" value={customer.phone_number || '—'} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Địa chỉ" value={customer.address || '—'} />
                  <InfoRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Ngày tham gia"
                    value={formatDate(customer.createdate)}
                  />
                  <InfoRow
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Trạng thái tài khoản"
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
                  emptyText="Chưa có yêu cầu nào từ khách hàng này"
                  renderItem={(r) => (
                    <div key={r.request_id} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-stone-900 text-sm">{r.request_code}</p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {r.order_type === 'CUSTOM' ? 'Đặt theo yêu cầu' : 'Hàng có sẵn'} •{' '}
                          {formatDate(r.createdate)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          r.status === 'CONVERTED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : r.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : r.status === 'PROCESSING'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
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
                  emptyText="Chưa có hợp đồng nào với khách hàng này"
                  renderItem={(c) => (
                    <div key={c.contract_id} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-stone-900 text-sm">{c.contract_code}</p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {formatVND(c.total_amount)} • Ngày tạo: {formatDate(c.createdate)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          c.status === 'SIGNED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : c.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {c.status === 'SIGNED' ? 'Đã ký kết' : c.status === 'CANCELLED' ? 'Đã huỷ' : 'Bản nháp'}
                      </span>
                    </div>
                  )}
                />
              )}

              {/* Tab: Đơn hàng */}
              {activeTab === 'orders' && (
                <HistoryList
                  items={customer.orders}
                  emptyText="Chưa có đơn hàng nào được tạo cho khách hàng này"
                  renderItem={(o) => (
                    <div key={o.order_id} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-stone-900 text-sm">{o.order_code}</p>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {formatVND(o.total_amount)} • Dự kiến: {formatDate(o.expected_date)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          o.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : o.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : o.status === 'IN_PRODUCTION'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
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

        {/* Footer Modal */}
        <div className="flex items-center justify-end border-t border-stone-200 bg-stone-50 px-6 py-4 rounded-b-2xl">
          <button
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3">
      {icon && <span className="mt-0.5 text-amber-700 shrink-0">{icon}</span>}
      <div>
        <p className="text-xs font-medium text-stone-500">{label}</p>
        <div className="mt-0.5 text-sm font-semibold text-stone-900">{value}</div>
      </div>
    </div>
  );
}

function HistoryList({ items, emptyText, renderItem }) {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-stone-400">
        <ClipboardList className="h-10 w-10 mb-2 text-stone-300" />
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs hover:bg-amber-50/20 transition">
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}

// ─── Create Customer Modal ─────────────────────────────────
function CreateCustomerModal({ open, onClose, initialName = '', initialPhone = '', onSuccess, returnUrl }) {
  const [fullName, setFullName] = useState(initialName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setFullName(initialName);
      setPhoneNumber(initialPhone);
      setEmail('');
      setAddress('');
      setNote('');
    }
  }, [open, initialName, initialPhone]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Vui lòng nhập họ tên khách hàng.');
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error('Vui lòng nhập số điện thoại khách hàng.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createSaleCustomer({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        note: note.trim() || undefined,
      });

      const newCustomer = res.data;
      toast.success('Tạo khách hàng mới thành công!');
      if (onSuccess) onSuccess(newCustomer);

      if (returnUrl) {
        const params = new URLSearchParams();
        params.set('customerAccountId', newCustomer.customerAccountId);
        params.set('customerName', newCustomer.fullName);
        params.set('customerPhone', newCustomer.phoneNumber);
        if (newCustomer.address) params.set('customerAddress', newCustomer.address);
        navigate(`${returnUrl}?${params.toString()}`);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Lỗi khi tạo khách hàng:', err);
      toast.error(err.response?.data?.message || err.message || 'Không thể tạo khách hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 my-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-800">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900">Thêm mới thông tin khách hàng</h3>
              <p className="text-xs text-stone-500">Tạo tài khoản khách hàng mới vào hệ thống</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {returnUrl && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              💡 Sau khi lưu, hệ thống sẽ tự động chuyển về trang Tạo đơn hàng và điền thông tin khách hàng này.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Họ và tên khách hàng <span className="text-rose-600 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Số điện thoại <span className="text-rose-600 font-bold">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="Ví dụ: 0912345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Email (không bắt buộc)
            </label>
            <input
              type="email"
              placeholder="khachhang@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
            />
            <p className="mt-1 text-[11px] text-stone-500">
              Để trống nếu khách chưa có email (hệ thống sẽ tạo email theo số điện thoại).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Địa chỉ nhận hàng (nếu có)
            </label>
            <input
              type="text"
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              placeholder="Yêu cầu riêng, sở thích khách hàng..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 transition active:scale-95"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-800 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-900 disabled:opacity-50 transition active:scale-95"
            >
              {submitting ? 'Đang lưu...' : 'Lưu khách hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export function CustomersPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
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

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = pagination.totalItems || customers.length;
    const active = customers.filter((c) => c.status === 'ACTIVE').length;
    const withOrders = customers.filter((c) => (c.totalOrders || 0) > 0).length;
    const withContracts = customers.filter((c) => (c.totalContracts || 0) > 0).length;
    return { total, active, withOrders, withContracts };
  }, [pagination.totalItems, customers]);

  // Computed active filter count
  const activeFilterCount = [
    filters.status !== 'ALL' ? 1 : 0,
    filters.search_by !== 'ALL' ? 1 : 0,
    filters.search ? 1 : 0,
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

  useEffect(() => {
    if (searchParams.get('action') === 'create' || searchParams.get('create') === 'true') {
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      {/* Return URL Alert Banner */}
      {searchParams.get('returnUrl') && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-700 shrink-0" />
            <span>
              Bạn đang ở chế độ tra cứu / tạo khách hàng để sử dụng cho đơn hàng tại quầy.
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(searchParams.get('returnUrl'))}
            className="flex items-center gap-1.5 font-bold text-amber-800 underline hover:text-amber-950 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại tạo đơn
          </button>
        </div>
      )}

      {/* ── Tiêu đề & Nút thao tác ───────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Quản Lý Khách Hàng
          </h1>
          <p className="text-sm text-stone-500">
            Tra cứu, quản lý hồ sơ và lịch sử giao dịch mua sắm của khách hàng
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchCustomers(pagination.currentPage)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-900 active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </div>

      {/* ── Thống kê tổng quan (Cards) ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số khách hàng */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-500">Tổng khách hàng</span>
            <div className="rounded-lg bg-stone-100 p-2 text-stone-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{stats.total}</span>
            <span className="text-xs text-stone-400">khách hàng</span>
          </div>
        </div>

        {/* Khách hàng đang hoạt động */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">Đang hoạt động</span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900">{stats.active}</span>
            <span className="text-xs text-emerald-600">tài khoản kích hoạt</span>
          </div>
        </div>

        {/* Khách có đơn hàng */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">Có đơn hàng</span>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-900">{stats.withOrders}</span>
            <span className="text-xs text-blue-600">khách đã mua sắm</span>
          </div>
        </div>

        {/* Khách có hợp đồng */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">Có hợp đồng</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900">{stats.withContracts}</span>
            <span className="text-xs text-amber-600">đã lập biên bản HĐ</span>
          </div>
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tiêu chí + Ô tìm kiếm */}
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-48">
              <select
                aria-label="Tiêu chí tìm kiếm khách hàng"
                value={filters.search_by}
                onChange={(e) => handleFilterChange('search_by', e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
              >
                {SEARCH_BY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Tìm kiếm khách hàng theo tên, email, số điện thoại..."
                className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-9 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setFilters((prev) => ({ ...prev, search: '' }));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status filter & Page size */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Lọc trạng thái khách hàng"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Số lượng mục trên mỗi trang"
              value={pageSize}
              onChange={handlePageSizeChange}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s} / trang
                </option>
              ))}
            </select>

            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 transition shadow-sm"
              >
                Xóa bộ lọc ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* Tóm tắt kết quả */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100 mt-3">
          <span>
            Tìm thấy <strong className="font-bold text-stone-900">{pagination.totalItems}</strong> khách hàng
            {filters.search && (
              <span> cho từ khóa &ldquo;<strong className="text-amber-900">{filters.search}</strong>&rdquo;</span>
            )}
          </span>
          {pagination.totalPages > 1 && (
            <span>
              Trang {pagination.currentPage} / {pagination.totalPages}
            </span>
          )}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-500">
            <RotateCw className="h-6 w-6 animate-spin text-amber-800 mb-2" />
            <span className="text-xs">Đang tải danh sách khách hàng...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <Users className="h-12 w-12 mb-3 text-stone-300" />
            <p className="text-base font-semibold text-stone-800">Không tìm thấy khách hàng nào</p>
            <p className="text-xs text-stone-500 mt-1">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm</p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                <X className="h-3.5 w-3.5" />
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
              <thead className="bg-stone-50 font-semibold text-stone-700">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 sm:pl-6 w-12">#</th>
                  <th className="px-3 py-3.5">Khách hàng</th>
                  <th className="px-3 py-3.5">Số điện thoại</th>
                  <th className="px-3 py-3.5 text-center">Trạng thái</th>
                  <th className="px-3 py-3.5 text-center">Yêu cầu</th>
                  <th className="px-3 py-3.5 text-center">Hợp đồng</th>
                  <th className="px-3 py-3.5 text-center">Đơn hàng</th>
                  <th className="px-3 py-3.5">Ngày tham gia</th>
                  <th className="px-3 py-3.5 text-center pr-4 sm:pr-6">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {customers.map((c, idx) => (
                  <tr
                    key={c.user_account_id}
                    className="hover:bg-amber-50/30 transition"
                  >
                    <td className="py-3.5 pl-4 pr-3 sm:pl-6 text-stone-400 text-xs font-mono">
                      {(pagination.currentPage - 1) * pagination.itemsPerPage + idx + 1}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold text-sm">
                          {(c.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900">{c.full_name}</p>
                          <p className="text-xs text-stone-500">{c.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-stone-700">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-stone-400" />
                        <span>{c.phone_number || '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <StatBadge value={c.totalRequests} icon={<ClipboardList className="h-3 w-3" />} />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <StatBadge value={c.totalContracts} icon={<FileText className="h-3 w-3" />} />
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <StatBadge value={c.totalOrders} icon={<ShoppingBag className="h-3 w-3" />} />
                    </td>
                    <td className="px-3 py-3.5 text-stone-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-stone-400" />
                        <span>{formatDate(c.createdate)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center pr-4 sm:pr-6">
                      <div className="flex items-center justify-center gap-1.5">
                        {searchParams.get('returnUrl') && (
                          <button
                            type="button"
                            onClick={() => {
                              const params = new URLSearchParams();
                              params.set('customerAccountId', c.user_account_id);
                              params.set('customerName', c.full_name);
                              params.set('customerPhone', c.phone_number || '');
                              if (c.address) params.set('customerAddress', c.address);
                              navigate(`${searchParams.get('returnUrl')}?${params.toString()}`);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-800 transition active:scale-95"
                            title="Chọn khách hàng này cho đơn hàng"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Chọn cho đơn</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedCustomerId(c.user_account_id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow-2xs hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 transition"
                          title="Xem hồ sơ chi tiết"
                        >
                          <Eye className="h-3.5 w-3.5 text-stone-500" />
                          <span>Chi tiết</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && customers.length > 0 && (
          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            currentCount={customers.length}
            itemsPerPage={pagination.itemsPerPage}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={handlePageChange}
            onPageSizeChange={(newLimit) => {
              setPageSize(newLimit);
            }}
            itemLabel="khách hàng"
            loading={loading}
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedCustomerId && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}

      {/* Create Customer Modal */}
      <CreateCustomerModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        initialName={searchParams.get('name') || ''}
        initialPhone={searchParams.get('phone') || ''}
        returnUrl={searchParams.get('returnUrl') || ''}
        onSuccess={() => {
          fetchCustomers(1);
        }}
      />
    </div>
  );
}

function StatBadge({ value, icon }) {
  if (!value) {
    return <span className="text-stone-300 text-xs font-mono">0</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700 border border-stone-200">
      {icon}
      <span>{value}</span>
    </span>
  );
}

export default CustomersPage;
