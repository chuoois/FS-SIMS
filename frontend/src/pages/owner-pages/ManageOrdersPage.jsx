// =========================================================
// ManageOrdersPage.jsx
// Quản lý Đơn hàng (Manage Orders) dành cho Chủ xưởng (Owner)
// Chức năng:
// 1. Xem danh sách đơn hàng (hàng sẵn & hàng đặt làm, tìm kiếm, lọc, phân trang)
// 2. Xem chi tiết đơn hàng (thông tin khách, sản phẩm, thanh toán)
// 3. Quản lý trạng thái đơn hàng tuần tự (Next Action Button, không dùng select/dropdown)
//    Quy trình: Mới (NEW) -> Đã xác nhận (CONFIRMED) -> Đang xử lý (IN_PRODUCTION) -> Hoàn thành (COMPLETED)
// 4. Hủy đơn hàng chưa hoàn thành
// Đồng bộ giao diện 100% với hệ thống Dashboard Owner
// =========================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Filter,
  ClipboardList,
  Search,
  RotateCw,
  Eye,
  RefreshCw,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Calendar,
  Layers,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  CreditCard,
  Package,
  FileText,
  Hammer,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  getOrders,
  getOrderDetail,
  cancelOrder as cancelOrderApi,
  updateOrderStatus as updateOrderStatusApi,
  getStaffLeaders,
  assignLeaderToOrder,
  inspectOrder,
} from '../../services/orderManagementService';
import { TablePagination } from '../../components/common/TablePagination';

// ─── Hằng số ──────────────────────────────────────────────
const STATUSES = ['ALL', 'NEW', 'CONFIRMED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED'];
const ORDER_TYPES = ['ALL', 'READY', 'CUSTOM'];

const STATUS_LABELS = {
  NEW: 'Mới',
  CONFIRMED: 'Đã xác nhận',
  IN_PRODUCTION: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const ORDER_TYPE_LABELS = {
  READY: 'Hàng sẵn',
  CUSTOM: 'Đặt theo yêu cầu',
};

// Cấu hình trạng thái kế tiếp trong quy trình tuần tự
// Chỉ cho phép chuyển sang trạng thái hợp lệ tiếp theo
const NEXT_STATUS_CONFIG = {
  NEW: {
    nextStatus: 'CONFIRMED',
    actionLabel: 'Xác nhận đơn',
    nextLabel: 'Đã xác nhận',
    buttonClass: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
    icon: CheckCircle2,
  },
  CONFIRMED: {
    nextStatus: 'IN_PRODUCTION',
    actionLabel: 'Chuyển xử lý',
    nextLabel: 'Đang xử lý',
    buttonClass: 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100',
    icon: RefreshCw,
  },
  IN_PRODUCTION: {
    nextStatus: 'COMPLETED',
    actionLabel: 'Hoàn thành đơn',
    nextLabel: 'Hoàn thành',
    buttonClass: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    icon: CheckCircle2,
  },
};

// ─── Định dạng tiền tệ VNĐ ─────────────────────────────────
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return Number(amount).toLocaleString('vi-VN') + ' ₫';
};

// ─── Định dạng ngày tháng ─────────────────────────────────
const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return timeStr + ' - ' + dateStr;
  } catch {
    return dateString;
  }
};
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

// ─── Huy hiệu trạng thái đơn hàng ─────────────────────────
const StatusBadge = ({ status }) => {
  switch (status) {
    case 'NEW':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 border border-stone-200">
          <Clock className="h-3.5 w-3.5" />
          Mới
        </span>
      );
    case 'CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
          <Clock className="h-3.5 w-3.5" />
          Đã xác nhận
        </span>
      );
    case 'IN_PRODUCTION':
    case 'PROCESSING':
    case 'UNDER_INSPECTION':
    case 'READY_TO_DELIVER':
    case 'DELIVERING':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
          <RefreshCw className="h-3.5 w-3.5" />
          Đang xử lý
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Hoàn thành
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
          <XCircle className="h-3.5 w-3.5" />
          Đã hủy
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
          {STATUS_LABELS[status] || status}
        </span>
      );
  }
};

// ─── Modal Chi tiết đơn hàng ──────────────────────────────
function OrderDetailModal({ order, onClose, onAdvanceStatus, advanceLoadingId }) {
  if (!order) return null;
  const nextConfig = NEXT_STATUS_CONFIG[order.status];
  const NextIcon = nextConfig?.icon || CheckCircle2;
  const isAdvancing = advanceLoadingId === order.orderId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-stone-200 my-8">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                Chi tiết đơn hàng — {order.orderCode}
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                <span>Loại: {ORDER_TYPE_LABELS[order.orderType] || order.orderType}</span>
                {order.contractCode && <span>• Hợp đồng: {order.contractCode}</span>}
              </div>
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

        {/* Nội dung chi tiết */}
        <div className="max-h-[72vh] overflow-y-auto px-6 py-5 space-y-6">
          {/* Trạng thái & hành động kế tiếp */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4 border border-stone-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-stone-500">Trạng thái hiện tại:</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex items-center gap-3">
              {nextConfig && (
                <button
                  onClick={() => onAdvanceStatus(order)}
                  disabled={isAdvancing}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 ${nextConfig.buttonClass}`}
                  title={`Chuyển trạng thái sang ${nextConfig.nextLabel}`}
                >
                  {isAdvancing ? (
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <NextIcon className="h-3.5 w-3.5" />
                  )}
                  <span>Chuyển sang: {nextConfig.actionLabel}</span>
                </button>
              )}
              <div className="flex items-center gap-3 text-xs text-stone-500">
                {order.createdAt && (
                  <span>Ngày tạo: {formatDateTime(order.createdAt)}</span>
                )}
                {order.expectedDate && (
                  <span className="font-medium text-stone-700">
                    Giao dự kiến: {formatDate(order.expectedDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Thông tin Khách hàng & Phụ trách */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cột 1: Thông tin khách hàng */}
            <div className="rounded-xl border border-stone-200 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <User className="h-4 w-4 text-amber-700" />
                Thông tin người nhận
              </h3>
              <div className="space-y-1.5 text-sm">
                <p className="font-semibold text-stone-800">{order.contactName}</p>
                <p className="text-stone-600 flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-stone-400" />
                  <span>{order.contactPhone}</span>
                </p>
                {order.deliveryAddress && (
                  <p className="text-stone-600 flex items-start gap-2 text-xs">
                    <MapPin className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
                    <span>{order.deliveryAddress}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Cột 2: Phụ trách & Tiến độ */}
            <div className="rounded-xl border border-stone-200 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-amber-700" />
                Tiến độ & Giao nhận
              </h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Nhân viên bán hàng:</span>
                  <span className="font-medium text-stone-800">{order.staffName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Giao dự kiến:</span>
                  <span className="text-stone-800">{formatDate(order.expectedDate)}</span>
                </div>
                {order.deliveredDate && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Ngày giao thực tế:</span>
                    <span className="font-medium text-emerald-700">{formatDate(order.deliveredDate)}</span>
                  </div>
                )}
                {order.note && (
                  <div className="border-t border-stone-100 pt-1 text-xs text-stone-500">
                    <span className="font-medium text-stone-600">Ghi chú:</span> {order.note}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tóm tắt tài chính */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-amber-800" />
              Tình trạng thanh toán
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg bg-white p-3 border border-stone-200">
                <span className="text-xs text-stone-500 block">Tổng giá trị đơn</span>
                <span className="text-base font-bold text-stone-900">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="rounded-lg bg-white p-3 border border-stone-200">
                <span className="text-xs text-stone-500 block">Tiền đặt cọc</span>
                <span className="text-base font-semibold text-stone-800">{formatCurrency(order.depositAmount)}</span>
              </div>
              <div className="rounded-lg bg-white p-3 border border-stone-200">
                <span className="text-xs text-stone-500 block">Đã thanh toán</span>
                <span className="text-base font-semibold text-emerald-700">{formatCurrency(order.paidAmount)}</span>
              </div>
              <div className="rounded-lg bg-white p-3 border border-stone-200">
                <span className="text-xs text-stone-500 block">Còn lại cần thu</span>
                <span className="text-base font-bold text-rose-600">{formatCurrency(order.remainingAmount)}</span>
              </div>
            </div>
          </div>

          {/* Danh sách sản phẩm trong đơn */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-800 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-amber-700" />
                Sản phẩm trong đơn ({(order.items || []).length})
              </h3>
            </div>

            {(order.items || []).length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                Không có sản phẩm nào trong đơn hàng này.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-stone-200">
                <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                  <thead className="bg-stone-50 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Sản phẩm</th>
                      <th className="px-3 py-3 text-center">SL</th>
                      <th className="px-3 py-3 text-right">Đơn giá</th>
                      <th className="px-4 py-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {order.items.map((item, idx) => (
                      <tr key={item.orderItemId || idx} className="hover:bg-stone-50/60 transition">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-800">{item.productName}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400 mt-0.5">
                            {item.productCode && <span>Mã: {item.productCode}</span>}
                            {(item.lengthCm || item.widthCm || item.heightCm) && (
                              <span>
                                Kích thước: {item.lengthCm || '—'} × {item.widthCm || '—'} × {item.heightCm || '—'} cm
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-stone-500 mt-1 italic">{item.description}</p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center font-medium text-stone-800">{item.quantity}</td>
                        <td className="px-3 py-3 text-right text-stone-600">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-bold text-amber-900">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-stone-200 px-6 py-4 bg-stone-50 rounded-b-2xl">
          <div>
            {nextConfig && (
              <button
                onClick={() => onAdvanceStatus(order)}
                disabled={isAdvancing}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 ${nextConfig.buttonClass}`}
                title={`Chuyển trạng thái sang ${nextConfig.nextLabel}`}
              >
                {isAdvancing ? (
                  <RotateCw className="h-4 w-4 animate-spin" />
                ) : (
                  <NextIcon className="h-4 w-4" />
                )}
                <span>{nextConfig.actionLabel}</span>
              </button>
            )}
          </div>
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

// ─── Dialog xác nhận Hủy đơn ─────────────────────────────
function CancelConfirmDialog({ order, loading, onConfirm, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-rose-100 p-2.5 text-rose-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Xác nhận hủy đơn hàng</h2>
              <p className="text-xs text-stone-500">Thao tác này sẽ chuyển đơn hàng sang trạng thái Đã hủy</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-rose-50/50 p-4 border border-rose-200 text-sm space-y-1">
            <p className="text-stone-700">
              Bạn có chắc chắn muốn hủy đơn hàng{' '}
              <span className="font-bold text-rose-700">{order.orderCode}</span> của khách hàng{' '}
              <span className="font-semibold text-stone-900">{order.contactName}</span>?
            </p>
            <p className="text-xs text-stone-500 pt-1">
              ⚠️ Hành động này không thể hoàn tác sau khi xác nhận.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-stone-200 px-6 py-4 bg-stone-50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 transition active:scale-95 disabled:opacity-50"
          >
            Không hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 transition active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Đang hủy...' : 'Xác nhận hủy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Trang chính ManageOrdersPage ─────────────────────────
export function ManageOrdersPage() {
  // States danh sách
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Phân trang
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState('ALL'); // 'ALL' | 'CUSTOMER_NAME' | 'ORDER_CODE' | 'PHONE'
  const [zoomImage, setZoomImage] = useState(null);
  const [leadersLoading, setLeadersLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });

  // Modals & Action loading
  const [detailOrder, setDetailOrder] = useState(null);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [advanceLoadingId, setAdvanceLoadingId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Điều hướng sang trang Quản lý Lệnh Gia Công
  let navigate = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigate = useNavigate();
  } catch {
    navigate = null;
  }

  const handleGoToProductionOrders = (order) => {
    const targetUrl = `/owner/production-orders?orderId=${order.orderId}&orderCode=${encodeURIComponent(order.orderCode || '')}`;
    if (navigate) {
      navigate(targetUrl, {
        state: { orderId: order.orderId, orderCode: order.orderCode, autoCreate: true },
      });
    } else if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
      window.location.href = targetUrl;
    }
  };

  // Modal Phân công Tổ trưởng
  const [assignLeaderOrder, setAssignLeaderOrder] = useState(null);
  const [leaders, setLeaders] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const handleOpenAssignLeader = async (order) => {
    setAssignLeaderOrder(order);
    try {
      const res = await getStaffLeaders();
      const list = res.leaders || res.data || (Array.isArray(res) ? res : []);
      const rawStf = res.staff || res.allStaff || res.data || [];
      const stf = rawStf.filter((s) => (s.roleCode === 'SALES' || s.roleId === 2) && s.roleCode !== 'LEADERSTAFF');
      setLeaders(list);
      setStaffList(stf);
      setSelectedStaffId('');
      const existingLeaderId = order.assignedTo || order.assigned_to || order.leaderId;
      if (existingLeaderId && list.some((l) => (l.userAccountId || l.user_account_id) == existingLeaderId)) {
        setSelectedLeaderId(existingLeaderId);
      } else if (list.length > 0) {
        setSelectedLeaderId(list[0].userAccountId || list[0].user_account_id);
      } else {
        setSelectedLeaderId('');
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách tổ trưởng:', err);
      toast.error('Không thể tải danh sách Tổ trưởng/Quản lý.');
    }
  };

  const handleConfirmAssignLeader = async (e) => {
    e.preventDefault();
    if (!assignLeaderOrder) return;
    if (!selectedLeaderId) {
      toast.error('Vui lòng chọn Tổ trưởng / Quản lý xưởng cần giao việc.');
      return;
    }
    try {
      setAssignLoading(true);
      await assignLeaderToOrder(assignLeaderOrder.orderId, {
        leaderId: selectedLeaderId,
        assigned_to: selectedLeaderId,
        staffId: selectedStaffId || undefined,
        note: assignNote,
      });
      toast.success('Đã phân công Tổ trưởng cho đơn hàng #' + assignLeaderOrder.orderCode);
      setAssignLeaderOrder(null);
      setAssignNote('');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Không thể phân công Tổ trưởng.');
    } finally {
      setAssignLoading(false);
    }
  };

  // Modal Nghiệm thu chất lượng
  const [inspectTarget, setInspectTarget] = useState(null);
  const [inspectResult, setInspectResult] = useState('PASSED');
  const [inspectReason, setInspectReason] = useState('');
  const [inspectLoading, setInspectLoading] = useState(false);

  const handleConfirmInspect = async (e) => {
    e.preventDefault();
    if (!inspectTarget) return;
    if (inspectResult === 'FAILED' && !inspectReason.trim()) {
      toast.error('Vui lòng cung cấp lý do không đạt để xưởng khắc phục.');
      return;
    }
    try {
      setInspectLoading(true);
      await inspectOrder(inspectTarget.orderId, {
        result: inspectResult,
        reason: inspectReason.trim() || undefined,
      });
      toast.success(
        inspectResult === 'PASSED'
          ? 'Nghiệm thu ĐẠT! Đơn hàng #' + inspectTarget.orderCode + ' chuyển sang trạng thái Sẵn sàng giao hàng.'
          : 'Đã trả lại đơn hàng #' + inspectTarget.orderCode + ' cho xưởng sản xuất lại.'
      );
      setInspectTarget(null);
      setInspectReason('');
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể hoàn tất nghiệm thu.');
    } finally {
      setInspectLoading(false);
    }
  };

  // ── Fetch danh sách ──────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrders({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        order_type: orderTypeFilter !== 'ALL' ? orderTypeFilter : undefined,
        page: currentPage,
        limit: pageSize,
      });
      setOrders(data.orders || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error('Lỗi khi tải danh sách đơn hàng:', err);
      toast.error(err?.response?.data?.message || 'Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, orderTypeFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Làm mới dữ liệu ──────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
    toast.success('Đã làm mới dữ liệu');
  };

  // ── Xóa bộ lọc ───────────────────────────────────────────
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setOrderTypeFilter('ALL');
    setCurrentPage(1);
  };

  // ── Xem chi tiết ─────────────────────────────────────────
  async function handleViewDetail(order) {
    try {
      const data = await getOrderDetail(order.orderId);
      setDetailOrder(data.order);
    } catch {
      setDetailOrder(order); // fallback với dữ liệu đã có
    }
  }

  // ── Hủy đơn ─────────────────────────────────────────────
  async function handleCancelConfirm() {
    if (!cancelOrder) return;
    setCancelLoading(true);
    try {
      await cancelOrderApi(cancelOrder.orderId);
      toast.success(`Đã hủy đơn hàng ${cancelOrder.orderCode}.`);
      setCancelOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không thể hủy đơn hàng.');
    } finally {
      setCancelLoading(false);
    }
  }

  // ── Chuyển sang trạng thái kế tiếp trong quy trình ───────
  const handleAdvanceStatus = async (order) => {
    const nextConfig = NEXT_STATUS_CONFIG[order.status];
    if (!nextConfig) return;

    setAdvanceLoadingId(order.orderId);
    try {
      await updateOrderStatusApi(order.orderId, { status: nextConfig.nextStatus });
      toast.success(
        `Đã chuyển trạng thái đơn hàng ${order.orderCode} sang "${nextConfig.nextLabel}".`
      );

      // Cập nhật ngay lập tức danh sách để nút hành động đổi sang trạng thái mới
      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.orderId === order.orderId
            ? {
                ...o,
                status: nextConfig.nextStatus,
                statusLabel: nextConfig.nextLabel,
              }
            : o
        )
      );

      // Nếu đang mở modal chi tiết đơn hàng này, cập nhật modal luôn
      setDetailOrder((prev) =>
        prev && prev.orderId === order.orderId
          ? {
              ...prev,
              status: nextConfig.nextStatus,
              statusLabel: nextConfig.nextLabel,
            }
          : prev
      );

      // Đồng bộ lại với backend
      fetchOrders();
    } catch (err) {
      console.error('Lỗi khi chuyển trạng thái đơn hàng:', err);
      toast.error(err?.response?.data?.message || 'Không thể chuyển trạng thái đơn hàng.');
    } finally {
      setAdvanceLoadingId(null);
    }
  };

  // ── Tính thống kê nhanh ─────────────────────────────────
  const stats = useMemo(() => {
    const total = pagination.totalItems || orders.length;
    const confirmed = orders.filter((o) => o.status === 'CONFIRMED').length;
    const inProduction = orders.filter((o) => o.status === 'IN_PRODUCTION').length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    return { total, confirmed, inProduction, completed };
  }, [pagination.totalItems, orders]);

  return (
    <div className="space-y-6">
      {/* ── Tiêu đề & Nút thao tác ───────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                Quản Lý Đơn Hàng
              </h1>
              <p className="text-sm text-stone-500">
                Xem toàn bộ đơn hàng (hàng sẵn & đặt làm), theo dõi tiến độ, chi tiết thông tin và chuyển trạng thái theo quy trình.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── Thống kê tổng quan (Cards) ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số đơn hàng */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-500">Tổng đơn hàng</span>
            <div className="rounded-lg bg-stone-100 p-2 text-stone-700">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{stats.total}</span>
            <span className="text-xs text-stone-400">đơn</span>
          </div>
        </div>

        {/* Đã xác nhận */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">Đã xác nhận</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900">{stats.confirmed}</span>
            <span className="text-xs text-amber-600">chờ xử lý</span>
          </div>
        </div>

        {/* Đang xử lý */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">Đang xử lý</span>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-900">{stats.inProduction}</span>
            <span className="text-xs text-blue-600">trong tiến trình</span>
          </div>
        </div>

        {/* Hoàn thành */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">Hoàn thành</span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900">{stats.completed}</span>
            <span className="text-xs text-emerald-600">đã giao khách</span>
          </div>
        </div>
      </div>

      {/* ── Bộ lọc & Tìm kiếm ─────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, tên khách hàng, số điện thoại..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Lọc Trạng thái & Loại đơn */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'Tất cả trạng thái' : STATUS_LABELS[s]}
                </option>
              ))}
            </select>

            <select
              value={orderTypeFilter}
              onChange={(e) => {
                setOrderTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              {ORDER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'ALL' ? 'Tất cả loại đơn' : ORDER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>

            {(search || statusFilter !== 'ALL' || orderTypeFilter !== 'ALL') && (
              <button
                onClick={handleResetFilters}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bảng danh sách đơn hàng ───────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3.5 pl-4 pr-3 sm:pl-6">Mã đơn</th>
                <th className="px-3 py-3.5">Loại</th>
                <th className="px-3 py-3.5">Khách hàng</th>
                <th className="px-3 py-3.5">Nhân viên</th>
                <th className="px-3 py-3.5 text-center">Trạng thái</th>
                <th className="px-3 py-3.5 text-right">Tổng tiền</th>
                <th className="py-3.5 pl-3 pr-4 text-center sm:pr-6">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="h-6 w-6 animate-spin text-amber-700" />
                      <span>Đang tải danh sách đơn hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ClipboardList className="h-10 w-10 text-stone-300" />
                      <p className="font-medium text-stone-700">Không có đơn hàng nào.</p>
                      <p className="text-xs text-stone-400">
                        Chưa có đơn hàng nào thỏa mãn điều kiện tìm kiếm.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const nextConfig = NEXT_STATUS_CONFIG[order.status];
                  const NextIcon = nextConfig?.icon || CheckCircle2;
                  const isAdvancing = advanceLoadingId === order.orderId;
                  const canCancel = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';

                  return (
                    <tr key={order.orderId} className="transition hover:bg-stone-50/80">
                      {/* 1. Mã đơn */}
                      <td className="whitespace-nowrap py-3.5 pl-4 pr-3 sm:pl-6">
                        <div className="font-mono font-bold text-amber-800 text-xs">
                          {order.orderCode}
                        </div>
                      </td>

                      {/* 2. Loại đơn */}
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold border ${
                            order.orderType === 'CUSTOM'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {ORDER_TYPE_LABELS[order.orderType] || order.orderType}
                        </span>
                      </td>

                      {/* Khách hàng */}
                      <td className="px-3 py-3.5">
                        <div className="font-semibold text-stone-800 flex items-center gap-1.5 text-xs">
                          <User className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          <span>{order.contactName}</span>
                        </div>
                        <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-stone-400" />
                          <span>{order.contactPhone}</span>
                        </div>
                      </td>

                      {/* Nhân viên phụ trách / Tổ trưởng */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs">
                        {order.staffName ? (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                            <Hammer className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                            <span>{order.staffName}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-stone-400 italic">
                            Chưa phân công
                          </span>
                        )}
                      </td>

                      {/* Trạng thái hiện tại */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-center">
                        <StatusBadge status={order.status} />
                      </td>

                      {/* Tài chính & Thu tiền */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-right text-xs">
                        <div className="font-bold text-stone-900">
                          {formatCurrency(order.totalAmount)}
                        </div>
                        {order.remainingAmount > 0 ? (
                          <div className="text-[11px] font-semibold text-rose-600 mt-0.5">
                            Còn lại: {formatCurrency(order.remainingAmount)}
                          </div>
                        ) : (
                          <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                            Đã thanh toán đủ
                          </div>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-center sm:pr-6">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* Nút Nghiệm thu chất lượng khi UNDER_INSPECTION */}
                          {order.status === 'UNDER_INSPECTION' && (
                            <button
                              onClick={() => {
                                setInspectTarget(order);
                                setInspectResult('PASSED');
                                setInspectReason('');
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-purple-700 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-purple-800 transition active:scale-95 animate-pulse"
                              title="Xem ảnh thành phẩm và đánh giá nghiệm thu"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Thẩm định nghiệm thu</span>
                            </button>
                          )}

                          {/* Nút Giao việc -> Chuyển sang trang Quản Lý Lệnh Gia Công (chỉ áp dụng cho đơn đặt làm CUSTOM đang ở trạng thái Đang xử lý - IN_PRODUCTION) */}
                          {(order.orderType === 'CUSTOM' || order.order_type === 'CUSTOM') &&
                            order.status === 'IN_PRODUCTION' && (
                            <button
                              onClick={() => handleGoToProductionOrders(order)}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 active:scale-95"
                              title="Chuyển sang trang Quản lý lệnh gia công để giao việc"
                            >
                              <Hammer className="h-3.5 w-3.5" />
                              <span>Giao việc</span>
                            </button>
                          )}

                          {/* Nút chuyển trạng thái kế tiếp (quy trình tuần tự) */}
                          {nextConfig && order.status !== 'UNDER_INSPECTION' && (
                            <button
                              onClick={() => handleAdvanceStatus(order)}
                              disabled={isAdvancing}
                              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 ${nextConfig.buttonClass}`}
                              title={`Chuyển sang ${nextConfig.nextLabel}`}
                            >
                              {isAdvancing ? (
                                <RotateCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <NextIcon className="h-3.5 w-3.5" />
                              )}
                              <span>{nextConfig.actionLabel}</span>
                            </button>
                          )}

                          {/* Xem chi tiết */}
                          <button
                            onClick={() => handleViewDetail(order)}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95"
                            title="Xem chi tiết đơn hàng"
                          >
                            <Eye className="h-3.5 w-3.5 text-stone-400" />
                            <span>Chi tiết</span>
                          </button>

                          {/* Hủy đơn hàng */}
                          {canCancel && (
                            <button
                              onClick={() => setCancelOrder(order)}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-100 active:scale-95"
                              title="Hủy đơn hàng này"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>Hủy</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang đồng bộ TablePagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          currentCount={orders.length}
          itemsPerPage={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          itemLabel="đơn hàng"
          loading={loading}
        />
      </div>

      {/* ── Modals ── */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onAdvanceStatus={handleAdvanceStatus}
          advanceLoadingId={advanceLoadingId}
        />
      )}

      {cancelOrder && (
        <CancelConfirmDialog
          order={cancelOrder}
          loading={cancelLoading}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelOrder(null)}
        />
      )}

      {/* ── Modal Phân công Tổ trưởng ── */}
      {assignLeaderOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-stone-900 mb-2 flex items-center gap-2">
              <Hammer className="h-5 w-5 text-amber-800" />
              Phân công Tổ trưởng sản xuất #{assignLeaderOrder.orderCode}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Chọn Tổ trưởng xưởng chịu trách nhiệm bám sát bản vẽ kỹ thuật đã khóa và quản lý tiến độ gia công.
            </p>
            <form onSubmit={handleConfirmAssignLeader} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Chọn Tổ trưởng / Quản lý xưởng: <span className="text-rose-500">*</span>
                </label>
                {leadersLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-stone-600 text-xs">
                    <RotateCw className="h-4 w-4 animate-spin text-amber-800" />
                    <span>Đang tải danh sách Tổ trưởng xưởng...</span>
                  </div>
                ) : leaders.length === 0 ? (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 text-xs">
                      Chưa tìm thấy tài khoản Tổ trưởng/Quản lý nào đang hoạt động.
                    </div>
                    <button
                      type="button"
                      onClick={() => loadLeaders()}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:underline"
                    >
                      <RotateCw className="h-3 w-3" /> Thử tải lại danh sách
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedLeaderId}
                    onChange={(e) => setSelectedLeaderId(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-amber-800 focus:outline-none bg-white font-medium"
                    required
                  >
                    <option value="">-- Chọn Tổ trưởng xưởng --</option>
                    {leaders.map((ldr) => {
                      const ldrId = ldr.userAccountId || ldr.user_account_id;
                      const name = ldr.fullName || ldr.full_name;
                      const contact = ldr.phoneNumber || ldr.phone_number || ldr.email;
                      return (
                        <option key={ldrId} value={ldrId}>
                          {name} ({contact})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
              {/* Chọn Thợ / Nhân viên kỹ thuật đồng hành */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Thợ chính / Nhân viên kỹ thuật phụ trách: <span className="text-stone-400 text-[11px] font-normal">(Tùy chọn)</span>
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-amber-800 focus:outline-none bg-white font-medium"
                >
                  <option value="">-- Để trống (Tổ trưởng tự phân công) --</option>
                  {staffList.map((stf) => {
                    const stfId = stf.userAccountId || stf.user_account_id;
                    const name = stf.fullName || stf.full_name;
                    const role = stf.roleName || stf.roleCode || 'Nhân sự';
                    const contact = stf.phoneNumber || stf.phone_number || stf.email;
                    return (
                      <option key={stfId} value={stfId}>
                        {name} ({role}{contact ? ` - ${contact}` : ''})
                      </option>
                    );
                  })}
                </select>
              </div>
<div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Ghi chú chỉ đạo cho xưởng:
                </label>
                <textarea
                  rows="2"
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="Ghi chú về thời hạn hoặc tiêu chuẩn đóng gói..."
                  className="w-full rounded-lg border border-stone-200 p-2 text-xs focus:border-amber-800 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignLeaderOrder(null)}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={assignLoading || leaders.length === 0}
                  className="rounded-lg bg-amber-800 px-5 py-2 font-bold text-white hover:bg-amber-900 disabled:opacity-50 transition shadow-sm"
                >
                  {assignLoading ? 'Đang giao...' : 'Xác nhận giao việc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Nghiệm thu chất lượng & Xem ảnh thành phẩm ── */}
      {inspectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-purple-700" />
                Thẩm định & Nghiệm thu sản phẩm #{inspectTarget.orderCode}
              </h3>
              <button
                type="button"
                onClick={() => setInspectTarget(null)}
                className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thông tin nộp từ Tổ trưởng */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 mb-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-purple-900">
                  Tổ trưởng phụ trách: {inspectTarget.staffName || inspectTarget.leaderName || 'Xưởng gia công'}
                </span>
                <span className="rounded bg-purple-200/70 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                  Chờ Chủ xưởng duyệt
                </span>
              </div>
              {inspectTarget.inspectionNote && (
                <div className="text-stone-700">
                  <span className="font-semibold text-purple-900">Ghi chú tự kiểm: </span>
                  {inspectTarget.inspectionNote}
                </div>
              )}
            </div>

            {/* Thư viện ảnh thành phẩm Leader đã gửi */}
            <div className="mb-4">
              <label className="block font-semibold text-stone-800 text-xs mb-2">
                📸 Hình ảnh thành phẩm thực tế từ xưởng:{' '}
                {inspectTarget.inspectionImages && inspectTarget.inspectionImages.length > 0 ? (
                  <span className="text-purple-700 font-bold">
                    ({inspectTarget.inspectionImages.length} ảnh)
                  </span>
                ) : (
                  <span className="text-stone-400 font-normal">(Chưa có ảnh)</span>
                )}
              </label>

              {inspectTarget.inspectionImages && inspectTarget.inspectionImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {inspectTarget.inspectionImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setZoomImage(imgUrl)}
                      className="group relative cursor-pointer overflow-hidden rounded-lg border border-stone-200 bg-stone-100 aspect-video shadow-xs hover:border-purple-600 hover:shadow-md transition"
                      title="Bấm để phóng to xem chi tiết"
                    >
                      <img
                        src={imgUrl}
                        alt={`Ảnh thành phẩm ${idx + 1}`}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Eye className="h-5 w-5 text-white drop-shadow" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-stone-200 p-3 text-center text-xs text-stone-400">
                  Tổ trưởng chưa đính kèm ảnh sản phẩm.
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmInspect} className="space-y-4 text-xs pt-2 border-t border-stone-100">
              <div>
                <label className="block font-semibold text-stone-700 mb-2">
                  Đánh giá nghiệm thu của Chủ xưởng: <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer font-bold transition ${
                      inspectResult === 'PASSED'
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="inspectRes"
                      value="PASSED"
                      checked={inspectResult === 'PASSED'}
                      onChange={() => setInspectResult('PASSED')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>✅ ĐẠT (Chuyển giao hàng)</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer font-bold transition ${
                      inspectResult === 'FAILED'
                        ? 'border-rose-500 bg-rose-50/60 text-rose-900 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="inspectRes"
                      value="FAILED"
                      checked={inspectResult === 'FAILED'}
                      onChange={() => setInspectResult('FAILED')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>❌ KHÔNG ĐẠT (Trả xưởng sửa)</span>
                  </label>
                </div>
              </div>

              {inspectResult === 'FAILED' && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Lý do không đạt (để Tổ trưởng khắc phục): <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows="3"
                    required
                    value={inspectReason}
                    onChange={(e) => setInspectReason(e.target.value)}
                    placeholder="VD: Nước sơn cạnh đáy chưa đều, cánh cửa tủ bị cọ 2mm, cần chà nhám và phun lại..."
                    className="w-full rounded-lg border border-red-300 p-2.5 text-xs focus:border-red-600 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInspectTarget(null)}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={inspectLoading}
                  className="rounded-lg bg-purple-700 px-5 py-2 font-bold text-white hover:bg-purple-800 disabled:opacity-50 transition shadow-sm"
                >
                  {inspectLoading ? 'Đang lưu...' : 'Xác nhận nghiệm thu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Phóng to ảnh (Lightbox) ── */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={zoomImage}
              alt="Phóng to ảnh nghiệm thu"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-stone-800 shadow-lg hover:bg-stone-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageOrdersPage;
