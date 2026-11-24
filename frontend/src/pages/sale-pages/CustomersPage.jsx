// =========================================================
// CustomersPage.jsx
// Quản lý danh sách khách hàng dành cho Nhân viên Kinh doanh (Role Sale)
// Hỗ trợ tra cứu theo tên/SĐT/email, lọc trạng thái, xem hồ sơ giao dịch và tạo khách mới
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
  CheckCircle2,
  XCircle,
  UserPlus,
  ArrowLeft,
  User,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCustomers, getCustomerById, createSaleCustomer } from '../../services/saleOrderService';
import { TablePagination } from '../../components/common/TablePagination';
import { AccountStatusBadge } from '../../components/common/StatusBadge';

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

const SEARCH_BY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả tiêu chí' },
  { value: 'NAME', label: 'Tên khách hàng' },
  { value: 'PHONE', label: 'Số điện thoại' },
  { value: 'EMAIL', label: 'Địa chỉ email' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// ─── Modal Chi tiết Hồ sơ Khách hàng ─────────────────────
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl border border-stone-200 my-8 overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              {loading ? 'Đang tải hồ sơ...' : customer?.full_name || 'Chi tiết khách hàng'}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {customer?.phone_number ? `SĐT: ${customer.phone_number}` : 'Hồ sơ tài khoản khách hàng'}
              {customer?.email ? ` • ${customer.email}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Đóng cửa sổ"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 px-6 bg-stone-50/50 text-xs">
          {[
            { key: 'info', label: 'Thông tin cá nhân' },
            { key: 'requests', label: `Yêu cầu đặt đóng (${customer?.requests?.length ?? 0})` },
            { key: 'contracts', label: `Hợp đồng (${customer?.contracts?.length ?? 0})` },
            { key: 'orders', label: `Đơn hàng (${customer?.orders?.length ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-2.5 font-medium transition border-b-2 -mb-px ${activeTab === tab.key
                  ? 'border-stone-900 text-stone-900 font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Modal */}
        <div className="overflow-y-auto max-h-[60vh] p-6 text-xs text-stone-700 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-500">
              <RotateCw className="h-6 w-6 animate-spin text-stone-400 mb-2" />
              <span>Đang tải thông tin...</span>
            </div>
          ) : !customer ? (
            <p className="text-center text-stone-500 py-12">Không tìm thấy thông tin khách hàng</p>
          ) : (
            <>
              {/* Tab 1: Thông tin cá nhân */}
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-stone-200 p-3 bg-stone-50/50">
                    <span className="text-[11px] text-stone-500 block">Họ và tên:</span>
                    <span className="text-xs font-semibold text-stone-900">{customer.full_name}</span>
                  </div>
                  <div className="rounded-lg border border-stone-200 p-3 bg-stone-50/50">
                    <span className="text-[11px] text-stone-500 block">Số điện thoại:</span>
                    <span className="text-xs font-mono font-medium text-stone-800">{customer.phone_number || '—'}</span>
                  </div>
                  <div className="rounded-lg border border-stone-200 p-3 bg-stone-50/50">
                    <span className="text-[11px] text-stone-500 block">Địa chỉ email:</span>
                    <span className="text-xs text-stone-800">{customer.email || '—'}</span>
                  </div>
                  <div className="rounded-lg border border-stone-200 p-3 bg-stone-50/50">
                    <span className="text-[11px] text-stone-500 block">Trạng thái tài khoản:</span>
                    <div className="mt-0.5"><AccountStatusBadge status={customer.status} /></div>
                  </div>
                  <div className="sm:col-span-2 rounded-lg border border-stone-200 p-3 bg-stone-50/50">
                    <span className="text-[11px] text-stone-500 block">Địa chỉ giao hàng:</span>
                    <span className="text-xs text-stone-800">{customer.address || '—'}</span>
                  </div>
                  <div className="rounded-lg border border-stone-200 p-3 bg-stone-50/50">
                    <span className="text-[11px] text-stone-500 block">Ngày tham gia:</span>
                    <span className="text-xs text-stone-800">{formatDate(customer.createdate)}</span>
                  </div>
                  <div className="rounded-lg border border-stone-200 p-3 bg-stone-50/50">
                    <span className="text-[11px] text-stone-500 block">Giới tính:</span>
                    <span className="text-xs text-stone-800">{customer.gender || '—'}</span>
                  </div>
                </div>
              )}

              {/* Tab 2: Yêu cầu đặt đóng */}
              {activeTab === 'requests' && (
                <HistoryList
                  items={customer.requests}
                  emptyText="Khách hàng chưa có yêu cầu đặt đóng nào"
                  renderItem={(r) => (
                    <div key={r.request_id} className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-white">
                      <div>
                        <span className="font-mono font-semibold text-stone-900 text-xs">{r.request_code}</span>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {r.order_type === 'CUSTOM' ? 'Hàng thiết kế' : 'Hàng có sẵn'} • {formatDate(r.createdate)}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                        {r.status}
                      </span>
                    </div>
                  )}
                />
              )}

              {/* Tab 3: Hợp đồng */}
              {activeTab === 'contracts' && (
                <HistoryList
                  items={customer.contracts}
                  emptyText="Khách hàng chưa có hợp đồng nào"
                  renderItem={(c) => (
                    <div key={c.contract_id} className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-white">
                      <div>
                        <span className="font-mono font-semibold text-stone-900 text-xs">{c.contract_code}</span>
                        <p className="text-[11px] text-stone-500 mt-0.5 font-mono">
                          Tổng tiền: {formatVND(c.total_amount)}
                          {c.deposit_amount > 0 && ` • Cọc: ${formatVND(c.deposit_amount)}`}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                        {c.status}
                      </span>
                    </div>
                  )}
                />
              )}

              {/* Tab 4: Đơn hàng */}
              {activeTab === 'orders' && (
                <HistoryList
                  items={customer.orders}
                  emptyText="Khách hàng chưa có đơn hàng nào"
                  renderItem={(o) => (
                    <div key={o.customer_order_id} className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-white">
                      <div>
                        <span className="font-mono font-semibold text-stone-900 text-xs">{o.order_code}</span>
                        <p className="text-[11px] text-stone-500 mt-0.5 font-mono">
                          {formatVND(o.total_amount)} • {formatDate(o.createdate)}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                        {o.status}
                      </span>
                    </div>
                  )}
                />
              )}
            </>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-end border-t border-stone-200 bg-stone-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryList({ items, emptyText, renderItem }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-xs text-stone-500">
        <Info className="h-6 w-6 text-stone-300 mx-auto mb-1.5" />
        <p>{emptyText}</p>
      </div>
    );
  }
  return <div className="space-y-2">{items.map(renderItem)}</div>;
}

// ─── Modal Tạo mới Khách hàng ────────────────────────────
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
      toast.error('Vui lòng nhập họ tên khách hàng');
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error('Vui lòng nhập số điện thoại khách hàng');
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
      toast.success('Tạo khách hàng mới thành công');
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
      toast.error(err.response?.data?.message || err.message || 'Không thể tạo khách hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-stone-200 my-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50">
          <div>
            <h3 className="font-bold text-stone-900 text-sm">Thêm mới khách hàng</h3>
            <p className="text-[11px] text-stone-500">Tạo tài khoản hồ sơ khách hàng vào hệ thống</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {returnUrl && (
            <div className="rounded-lg bg-stone-50 border border-stone-200 p-2.5 text-stone-600">
              Sau khi lưu, hệ thống sẽ tự động điền thông tin khách hàng này vào đơn hàng tại quầy.
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Họ và tên khách hàng <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Số điện thoại liên hệ <span className="text-rose-600">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="0912345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-lg border border-stone-300 py-2 px-3 font-mono text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Địa chỉ Email
            </label>
            <input
              type="email"
              placeholder="khachhang@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
            <p className="mt-1 text-[11px] text-stone-500">
              Có thể để trống nếu khách chưa có email.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Địa chỉ giao hàng &amp; lắp đặt
            </label>
            <input
              type="text"
              placeholder="Số nhà, tên đường, phường/xã..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Ghi chú riêng
            </label>
            <textarea
              rows={2}
              placeholder="Sở thích chất liệu gỗ, phong cách nội thất..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-stone-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-950 disabled:opacity-50 transition"
            >
              {submitting ? 'Đang lưu...' : 'Lưu khách hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component: CustomersPage ──────────────────────────
export function CustomersPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Bộ lọc & Phân trang
  const [filters, setFilters] = useState({
    search: '',
    search_by: 'ALL',
    status: 'ALL',
  });
  const [searchInput, setSearchInput] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  const fetchCustomers = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = {
          page,
          limit: pageSize,
          search: filters.search.trim() || undefined,
          search_by: filters.search_by !== 'ALL' ? filters.search_by : undefined,
          status: filters.status !== 'ALL' ? filters.status : undefined,
        };

        const res = await getCustomers(params);
        const customerList = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.customers)
            ? res.data.customers
            : Array.isArray(res?.customers)
              ? res.customers
              : [];

        setCustomers(customerList);

        const pag = res?.pagination || res?.data?.pagination || {
          currentPage: page,
          totalPages: Math.max(1, Math.ceil((res?.totalItems || customerList.length) / pageSize)),
          totalItems: res?.totalItems || res?.pagination?.totalItems || customerList.length,
          itemsPerPage: pageSize,
        };
        setPagination(pag);

        const total = pag.totalItems || customerList.length;
        const active = customerList.filter((c) => c.status === 'ACTIVE').length;
        setStats({
          total,
          active,
          inactive: Math.max(0, total - active),
        });
      } catch (err) {
        console.error('Lỗi tải danh sách khách hàng:', err);
        toast.error(err.response?.data?.message || 'Không thể tải danh sách khách hàng');
      } finally {
        setLoading(false);
      }
    },
    [filters, pageSize]
  );

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) return prev;
        return { ...prev, search: searchInput };
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  const handlePageChange = (newPage) => {
    fetchCustomers(newPage);
  };

  const handlePageSizeChange = (newLimit) => {
    setPageSize(newLimit);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setFilters({ search: '', search_by: 'ALL', status: 'ALL' });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.search_by !== 'ALL') count++;
    if (filters.status !== 'ALL') count++;
    return count;
  }, [filters]);

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6 text-stone-900">
      {/* Banner nếu từ trang Tạo đơn hàng chuyển qua */}
      {searchParams.get('returnUrl') && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs text-stone-700">
          <span>
            Chế độ chọn khách hàng cho <strong>Đơn hàng tại quầy</strong>.
          </span>
          <button
            type="button"
            onClick={() => navigate(searchParams.get('returnUrl'))}
            className="inline-flex items-center gap-1 font-semibold text-stone-900 underline hover:text-stone-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại trang tạo đơn</span>
          </button>
        </div>
      )}

      {/* ── 1. TIÊU ĐỀ TRANG ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Quản lý khách hàng
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Danh bạ khách hàng, theo dõi hồ sơ giao dịch, yêu cầu đặt đóng và lịch sử hợp đồng tại xưởng.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchCustomers(pagination.currentPage)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <UserPlus className="h-4 w-4" />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </div>

      {/* ── 2. BỘ LỌC & TÌM KIẾM ─────────────────────────────── */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-4">
        {/* Tabs trạng thái kèm số lượng */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 pb-3">
          {[
            { key: 'ALL', label: 'Tất cả khách hàng', count: stats.total },
            { key: 'ACTIVE', label: 'Đang hoạt động', count: stats.active },
            { key: 'INACTIVE', label: 'Ngừng hoạt động', count: stats.inactive },
          ].map((tab) => {
            const isActive = filters.status === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleFilterChange('status', tab.key)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${isActive
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                  }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono font-medium ${isActive ? 'bg-stone-700 text-white' : 'bg-stone-200 text-stone-700'
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Thanh tìm kiếm */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-44 shrink-0">
            <select
              aria-label="Tiêu chí tìm kiếm"
              value={filters.search_by}
              onChange={(e) => handleFilterChange('search_by', e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
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
              placeholder="Tìm theo họ tên, số điện thoại hoặc email..."
              className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-9 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setFilters((prev) => ({ ...prev, search: '' }));
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600"
                title="Xóa từ khóa"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            >
              <X className="h-3.5 w-3.5" />
              <span>Đặt lại ({activeFilterCount})</span>
            </button>
          )}
        </div>

        {/* Thông tin số lượng */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs text-stone-500">
          <span>
            Hiển thị <strong className="font-semibold text-stone-800">{customers.length}</strong> trên tổng số{' '}
            <strong className="font-semibold text-stone-800">{pagination.totalItems}</strong> khách hàng
            {filters.search && (
              <span> với từ khóa &ldquo;<strong className="text-stone-900">{filters.search}</strong>&rdquo;</span>
            )}
          </span>
          {pagination.totalPages > 1 && (
            <span>
              Trang {pagination.currentPage} / {pagination.totalPages}
            </span>
          )}
        </div>
      </section>

      {/* ── 3. BẢNG DANH SÁCH KHÁCH HÀNG ─────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-500">
            <RotateCw className="h-6 w-6 animate-spin text-stone-400 mb-2" />
            <span className="text-xs text-stone-600">Đang tải danh sách khách hàng...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-400">
            <Users className="h-10 w-10 mb-2 text-stone-300" />
            <p className="text-sm font-semibold text-stone-800">Không tìm thấy khách hàng nào</p>
            <p className="text-xs text-stone-500 mt-0.5 max-w-sm text-center">
              Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm để xem danh sách.
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
              >
                <X className="h-3.5 w-3.5" />
                <span>Đặt lại bộ lọc</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
              <thead className="bg-stone-50 font-semibold text-stone-700">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 sm:pl-6 w-12">#</th>
                  <th scope="col" className="px-3 py-3.5">Khách hàng</th>
                  <th scope="col" className="px-3 py-3.5">Số điện thoại</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Trạng thái</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Yêu cầu</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Hợp đồng</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Đơn hàng</th>
                  <th scope="col" className="px-3 py-3.5">Ngày tham gia</th>
                  <th scope="col" className="px-3 py-3.5 text-center pr-4 sm:pr-6">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {customers.map((c, idx) => (
                  <tr key={c.user_account_id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3.5 pl-4 pr-3 sm:pl-6 text-stone-400 font-mono">
                      {(pagination.currentPage - 1) * pagination.itemsPerPage + idx + 1}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-800 font-semibold text-xs border border-stone-200">
                          {(c.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900 text-xs">{c.full_name}</p>
                          <p className="text-[11px] text-stone-500 truncate max-w-[180px]">{c.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-stone-800 font-mono">
                      {c.phone_number || '—'}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <AccountStatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-3.5 text-center font-mono font-medium text-stone-700">
                      {c.totalRequests || 0}
                    </td>
                    <td className="px-3 py-3.5 text-center font-mono font-medium text-stone-700">
                      {c.totalContracts || 0}
                    </td>
                    <td className="px-3 py-3.5 text-center font-mono font-medium text-stone-700">
                      {c.totalOrders || 0}
                    </td>
                    <td className="px-3 py-3.5 text-stone-500 text-[11px]">
                      {formatDate(c.createdate)}
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
                            className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            title="Chọn khách hàng này cho đơn hàng"
                          >
                            <span>Chọn cho đơn</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(c.user_account_id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
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

        {/* Phân trang */}
        {!loading && customers.length > 0 && (
          <div className="p-3 border-t border-stone-200 bg-stone-50/50">
            <TablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              currentCount={customers.length}
              itemsPerPage={pagination.itemsPerPage}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              itemLabel="khách hàng"
              loading={loading}
            />
          </div>
        )}
      </div>

      {/* ── MODAL XEM CHI TIẾT HỒ SƠ ─────────────────────────────── */}
      {selectedCustomerId && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}

      {/* ── MODAL TẠO MỚI KHÁCH HÀNG ─────────────────────────────── */}
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

export default CustomersPage;
