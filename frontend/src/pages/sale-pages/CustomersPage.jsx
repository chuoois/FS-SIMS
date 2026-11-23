// =========================================================
// CustomersPage.jsx
// Trang quản lý khách hàng dành cho Role Sale (Nhân viên kinh doanh)
// Có đầy đủ: phân trang, tìm kiếm, lọc theo trạng thái, xem hồ sơ chi tiết và tạo mới khách hàng
// Thiết kế đồng bộ Atelier Woodcraft - Xưởng mộc nội thất cao cấp FSSIMS
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
  Sparkles,
  User,
  Info,
  Clock,
  Package,
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
  { value: 'ALL', label: 'Tất cả tiêu chí' },
  { value: 'NAME', label: 'Tên khách hàng' },
  { value: 'EMAIL', label: 'Địa chỉ email' },
  { value: 'PHONE', label: 'Số điện thoại' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// ─── Status Badges chuẩn tiếng Việt theo quy ước FSSIMS ────
function StatusBadge({ status }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Đang hoạt động
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600 border border-stone-200">
      <XCircle className="h-3.5 w-3.5" />
      Ngừng hoạt động
    </span>
  );
}

// Dịch trạng thái Yêu cầu (order_request) theo AGENTS.md
const getOrderRequestStatusBadge = (status) => {
  switch (status) {
    case 'PENDING':
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">Chờ tiếp nhận</span>;
    case 'DRAFTING':
      return <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700 border border-stone-200">Đang phác thảo</span>;
    case 'DESIGNING':
      return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200">Đang thiết kế</span>;
    case 'DESIGNED':
      return <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 border border-indigo-200">Đã có bản vẽ</span>;
    case 'CONFIRMED':
      return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">Đã xác nhận</span>;
    case 'CONTRACT_CREATED':
      return <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 border border-teal-200">Đã tạo hợp đồng</span>;
    case 'CONVERTED':
      return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900 border border-emerald-300">Đã chuyển đổi</span>;
    case 'REJECTED':
      return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 border border-rose-200">Từ chối</span>;
    case 'CANCELLED':
      return <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600 border border-stone-200">Đã hủy</span>;
    default:
      return <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">{status || '—'}</span>;
  }
};

// Dịch trạng thái Hợp đồng (contract) theo AGENTS.md
const getContractStatusBadge = (status) => {
  switch (status) {
    case 'DRAFT':
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">Biên bản chờ ký</span>;
    case 'SIGNED':
      return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">Đã ký kết</span>;
    case 'CANCELLED':
      return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 border border-rose-200">Đã hủy</span>;
    default:
      return <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">{status || '—'}</span>;
  }
};

// Dịch trạng thái Đơn hàng (customer_order) theo AGENTS.md
const getCustomerOrderStatusBadge = (status) => {
  switch (status) {
    case 'NEW':
      return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200">Đơn mới</span>;
    case 'ASSIGNED':
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">Đã giao xưởng</span>;
    case 'IN_PROGRESS':
      return <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 border border-indigo-200">Đang sản xuất</span>;
    case 'PENDING_APPROVAL':
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 border border-amber-300">Chờ duyệt xong</span>;
    case 'READY_TO_DELIVER':
      return <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-800 border border-teal-200">Sẵn sàng giao</span>;
    case 'COMPLETED':
      return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-900 border border-emerald-300">Hoàn tất</span>;
    case 'CANCELLED':
      return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 border border-rose-200">Đã hủy</span>;
    default:
      return <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">{status || '—'}</span>;
  }
};

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

  const overlayRef = useRef(null);
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-stone-200 my-8 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal - Phong cách mun sẫm sang trọng */}
        <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                {loading ? 'Đang tải hồ sơ...' : customer?.full_name || 'Chi tiết khách hàng'}
              </h2>
              <p className="text-xs text-stone-300 mt-0.5">
                {customer?.phone_number ? `SĐT: ${customer.phone_number}` : 'Hồ sơ tài khoản khách hàng'}
                {customer?.email ? ` • ${customer.email}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white transition"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs chuyển đổi */}
        <div className="flex border-b border-stone-200 shrink-0 px-6 bg-stone-50/70 text-xs font-semibold">
          {[
            { key: 'info', label: 'Thông tin cá nhân' },
            { key: 'requests', label: `Yêu cầu may đo (${customer?.requests?.length ?? 0})` },
            { key: 'contracts', label: `Hợp đồng (${customer?.contracts?.length ?? 0})` },
            { key: 'orders', label: `Đơn hàng (${customer?.orders?.length ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px px-4 py-3 text-xs font-bold transition border-b-2 ${
                activeTab === tab.key
                  ? 'border-amber-900 text-amber-950 bg-white shadow-2xs'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Thân Modal */}
        <div className="overflow-y-auto max-h-[65vh] p-6 text-xs text-stone-700 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-500">
              <RotateCw className="h-7 w-7 animate-spin text-amber-800 mb-2" />
              <span className="text-xs font-medium text-stone-600">Đang tải hồ sơ khách hàng...</span>
            </div>
          ) : !customer ? (
            <p className="text-center text-stone-500 py-16 text-sm">Không tìm thấy thông tin khách hàng</p>
          ) : (
            <>
              {/* Tab 1: Thông tin cá nhân */}
              {activeTab === 'info' && (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <InfoRow icon={<User className="h-4 w-4" />} label="Họ và tên" value={customer.full_name} isBold />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Số điện thoại" value={customer.phone_number || '—'} isMono />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="Địa chỉ email" value={customer.email || '—'} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Địa chỉ giao hàng" value={customer.address || '—'} />
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

              {/* Tab 2: Yêu cầu may đo */}
              {activeTab === 'requests' && (
                <HistoryList
                  items={customer.requests}
                  emptyText="Khách hàng này chưa có yêu cầu may đo nào"
                  renderItem={(r) => (
                    <div key={r.request_id} className="flex items-start justify-between gap-4 p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50/80 transition">
                      <div>
                        <p className="font-mono font-bold text-amber-900 text-xs">{r.request_code}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {r.order_type === 'CUSTOM' ? 'Đặt may đo theo yêu cầu' : 'Hàng có sẵn'} &bull;{' '}
                          {formatDate(r.createdate)}
                        </p>
                      </div>
                      <div className="shrink-0">{getOrderRequestStatusBadge(r.status)}</div>
                    </div>
                  )}
                />
              )}

              {/* Tab 3: Hợp đồng */}
              {activeTab === 'contracts' && (
                <HistoryList
                  items={customer.contracts}
                  emptyText="Khách hàng này chưa có biên bản hợp đồng nào"
                  renderItem={(c) => (
                    <div key={c.contract_id} className="flex items-start justify-between gap-4 p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50/80 transition">
                      <div>
                        <p className="font-mono font-bold text-amber-900 text-xs">{c.contract_code}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Tổng giá trị: <strong className="text-stone-900 font-mono">{formatVND(c.total_amount)}</strong>
                          {c.deposit_amount > 0 && (
                            <span> &bull; Đã cọc: <span className="text-emerald-800 font-mono font-bold">{formatVND(c.deposit_amount)}</span></span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0">{getContractStatusBadge(c.status)}</div>
                    </div>
                  )}
                />
              )}

              {/* Tab 4: Đơn hàng */}
              {activeTab === 'orders' && (
                <HistoryList
                  items={customer.orders}
                  emptyText="Khách hàng này chưa có đơn hàng nào"
                  renderItem={(o) => (
                    <div key={o.customer_order_id} className="flex items-start justify-between gap-4 p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50/80 transition">
                      <div>
                        <p className="font-mono font-bold text-amber-900 text-xs">{o.order_code}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Tổng thanh toán: <strong className="text-stone-900 font-mono">{formatVND(o.total_amount)}</strong> &bull; {formatDate(o.createdate)}
                        </p>
                      </div>
                      <div className="shrink-0">{getCustomerOrderStatusBadge(o.status)}</div>
                    </div>
                  )}
                />
              )}
            </>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-end border-t border-stone-200 bg-stone-50 px-6 py-3.5 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-100 transition"
          >
            Đóng hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, isBold, isMono }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3 shadow-2xs">
      {icon && <div className="text-amber-800 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <span className="text-[11px] text-stone-500 block">{label}</span>
        <div className={`text-xs truncate ${isBold ? 'font-bold text-stone-900' : 'text-stone-800'} ${isMono ? 'font-mono' : ''}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function HistoryList({ items, emptyText, renderItem }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-500 bg-stone-50/50">
        <Info className="h-8 w-8 text-stone-300 mx-auto mb-2" />
        <p className="font-medium text-stone-700">{emptyText}</p>
      </div>
    );
  }
  return <div className="space-y-2.5">{items.map(renderItem)}</div>;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal - Phong cách mun sẫm */}
        <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30">
              <UserPlus className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Thêm Mới Khách Hàng Tại Quầy</h3>
              <p className="text-[11px] text-stone-300">Tạo tài khoản hồ sơ khách hàng mới vào hệ thống</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          {returnUrl && (
            <div className="rounded-xl bg-amber-50 border border-amber-200/90 p-3 text-amber-950 flex items-start gap-2 shadow-2xs">
              <Sparkles className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Sau khi lưu, hệ thống sẽ tự động chuyển về trang Tạo đơn hàng và điền thông tin khách hàng này.
              </span>
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
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Số điện thoại liên hệ <span className="text-rose-600 font-bold">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="Ví dụ: 0912345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 font-mono text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Địa chỉ Email (không bắt buộc)
            </label>
            <input
              type="email"
              placeholder="khachhang@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
            <p className="mt-1 text-[11px] text-stone-500">
              Để trống nếu khách chưa có email (hệ thống sẽ tạo email theo số điện thoại).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Địa chỉ giao hàng &amp; Lắp đặt (nếu có)
            </label>
            <input
              type="text"
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Ghi chú riêng về khách hàng
            </label>
            <textarea
              rows={2}
              placeholder="Sở thích gỗ, phong cách nội thất, ghi chú giao nhận..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 transition active:scale-95"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-amber-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-950 disabled:opacity-50 transition active:scale-95"
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

  // Filters & Pagination
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

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    withOrders: 0,
    withContracts: 0,
  });

  // Fetch list
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

        if (res?.data?.stats || res?.stats) {
          setStats(res.data?.stats || res.stats);
        } else {
          setStats({
            total: pag.totalItems || customerList.length,
            active: customerList.filter((c) => c.status === 'ACTIVE').length,
            withOrders: customerList.filter((c) => Number(c.totalOrders) > 0).length,
            withContracts: customerList.filter((c) => Number(c.totalContracts) > 0).length,
          });
        }
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
    }, 400);
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

  // Auto-open create modal if returnUrl is present
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  return (
    <div className="space-y-6 text-stone-900">
      {/* ── BANNER ĐIỀU HƯỚNG TỪ TẠO ĐƠN HÀNG ───────────────────────── */}
      {searchParams.get('returnUrl') && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 px-4.5 py-3.5 text-xs text-amber-950 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-900 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <span>
              Bạn đang ở chế độ tra cứu hoặc tạo mới khách hàng để sử dụng cho <strong>Đơn hàng tại quầy</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate(searchParams.get('returnUrl'))}
            className="inline-flex items-center gap-1.5 font-bold text-amber-900 underline hover:text-amber-950 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại trang tạo đơn</span>
          </button>
        </div>
      )}

      {/* ── 1. HEADER TRANG: QUẢN LÝ KHÁCH HÀNG (CLIENT DIRECTORY) ──── */}
      <header className="flex flex-col gap-4 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm transition sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-amber-400 shadow-sm ring-1 ring-stone-900/10">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
                Quản Lý Khách Hàng
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                <Sparkles className="h-3 w-3 text-amber-700" />
                Hồ sơ khách hàng
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500 sm:text-sm">
              Tra cứu danh bạ khách hàng, quản lý hồ sơ giao dịch và lịch sử mua sắm tại xưởng mộc FSSIMS.
            </p>
          </div>
        </div>

        {/* Cụm nút thao tác */}
        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
          <button
            type="button"
            onClick={() => fetchCustomers(pagination.currentPage)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50 hover:text-stone-900 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${loading ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-amber-950 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            <UserPlus className="h-4 w-4" />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </header>

      {/* ── 2. DẢI THỐNG KÊ TỔNG QUAN (METRIC CARDS) ───────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số khách hàng */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Tổng khách hàng</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-stone-900 font-mono">{stats.total}</span>
            <span className="text-xs text-stone-400">hồ sơ lưu trữ</span>
          </div>
        </div>

        {/* Khách hàng đang hoạt động */}
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-5 shadow-2xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Đang hoạt động</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-900 font-mono">{stats.active}</span>
            <span className="text-xs text-emerald-700">tài khoản sẵn sàng</span>
          </div>
        </div>

        {/* Khách có đơn hàng */}
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-5 shadow-2xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Đã có đơn hàng</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-900 font-mono">{stats.withOrders}</span>
            <span className="text-xs text-amber-700">khách hàng mua sắm</span>
          </div>
        </div>

        {/* Khách có hợp đồng */}
        <div className="rounded-2xl border border-stone-200/90 bg-stone-50/70 p-5 shadow-2xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800">Đã lập hợp đồng</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-200 text-stone-700">
              <FileText className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-stone-900 font-mono">{stats.withContracts}</span>
            <span className="text-xs text-stone-500">đã lập biên bản</span>
          </div>
        </div>
      </div>

      {/* ── 3. BỘ LỌC & TÌM KIẾM ─────────────────────────────── */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-4.5 shadow-sm space-y-3.5">
        {/* Hàng 1: Tabs chọn trạng thái nhanh */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-100 pb-3">
          {[
            { key: 'ALL', label: 'Tất cả khách hàng', count: stats.total },
            { key: 'ACTIVE', label: 'Đang hoạt động', count: stats.active },
            { key: 'INACTIVE', label: 'Ngừng hoạt động', count: Math.max(0, stats.total - stats.active) },
          ].map((tab) => {
            const isActive = filters.status === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleFilterChange('status', tab.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hàng 2: Bộ tìm kiếm & Dropdown tiêu chí */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Tiêu chí tìm kiếm */}
            <div className="w-full sm:w-48">
              <select
                aria-label="Tiêu chí tìm kiếm khách hàng"
                value={filters.search_by}
                onChange={(e) => handleFilterChange('search_by', e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-2 px-3 text-xs font-medium text-stone-700 shadow-2xs transition focus:border-amber-600 focus:outline-none"
              >
                {SEARCH_BY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Input tìm kiếm */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Tìm theo họ tên, số điện thoại hoặc email khách hàng..."
                className="w-full rounded-xl border border-stone-200 py-2 pl-9 pr-9 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setFilters((prev) => ({ ...prev, search: '' }));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  title="Xóa từ khóa"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Page size & Nút đặt lại */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Số lượng mục trên mỗi trang"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="rounded-xl border border-stone-200 bg-white py-2 px-3 text-xs font-medium text-stone-700 shadow-2xs transition focus:border-amber-600 focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s} khách / trang
                </option>
              ))}
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-100 hover:text-stone-900 active:scale-95"
              >
                <X className="h-3.5 w-3.5" />
                <span>Xóa bộ lọc ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Tóm tắt kết quả */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
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
      </section>

      {/* ── 4. BẢNG DANH SÁCH KHÁCH HÀNG ─────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-500">
            <RotateCw className="h-7 w-7 animate-spin text-amber-800 mb-2" />
            <span className="text-xs font-medium text-stone-600">Đang tải danh sách khách hàng...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <Users className="h-12 w-12 mb-3 text-stone-300" />
            <p className="text-sm font-bold text-stone-800">Không tìm thấy khách hàng nào</p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm text-center">
              Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm để xem danh sách khách hàng.
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 shadow-2xs transition"
              >
                <X className="h-3.5 w-3.5" />
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
              <thead className="bg-stone-50 font-bold text-stone-700 border-b border-stone-200">
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
                    className="hover:bg-amber-50/40 transition"
                  >
                    <td className="py-3.5 pl-4 pr-3 sm:pl-6 text-stone-400 font-mono">
                      {(pagination.currentPage - 1) * pagination.itemsPerPage + idx + 1}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 text-amber-300 font-bold text-xs ring-1 ring-stone-900/10">
                          {(c.full_name || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 text-xs">{c.full_name}</p>
                          <p className="text-[11px] text-stone-500 truncate max-w-[180px]">{c.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-stone-800 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-stone-400 shrink-0" />
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
                    <td className="px-3 py-3.5 text-stone-500 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
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
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-800 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-900 transition active:scale-95"
                            title="Chọn khách hàng này cho đơn hàng"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Chọn cho đơn</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(c.user_account_id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 hover:text-stone-900 transition"
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
          <div className="p-3 border-t border-stone-200">
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
          </div>
        )}
      </div>

      {/* ── MODAL XEM CHI TIẾT HỒ SƠ KHÁCH HÀNG ───────────────────── */}
      {selectedCustomerId && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}

      {/* ── MODAL TẠO MỚI KHÁCH HÀNG ──────────────────────────────── */}
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
    return <span className="text-stone-300 text-xs font-mono font-medium">0</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900 border border-amber-200">
      {icon}
      <span>{value}</span>
    </span>
  );
}

export default CustomersPage;
