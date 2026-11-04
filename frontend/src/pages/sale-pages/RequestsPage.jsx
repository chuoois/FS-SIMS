// =========================================================
// RequestsPage.jsx
// Trang quản lý yêu cầu mua hàng của khách (Role Sale)
// Sale xem, duyệt và chuyển yêu cầu thành hợp đồng DRAFT
// Giao diện chuyển hợp đồng mô phỏng đầy đủ cột trái trang POS:
// - Giỏ hàng sản phẩm (hiển thị, chỉnh số lượng, tính tổng)
// - Thông tin khách hàng & Giao nhận (tên, SĐT, điền nốt địa chỉ, ngày giao, cọc...)
// =========================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  RotateCw,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Filter,
  X,
  ChevronDown,
  Package,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ShoppingCart,
  DollarSign,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getRequests,
  getRequestById,
  convertRequestToContract,
} from '../../services/saleOrderService';
import { TablePagination } from '../../components/common/TablePagination';

// ─── Helpers ──────────────────────────────────────────────
const formatVND = (val) =>
  val != null
    ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(val)
    : '—';

const formatDate = (d) =>
  d ? new Intl.DateTimeFormat('vi-VN').format(new Date(d)) : '—';

const REQUEST_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'CONVERTED', label: 'Đã chuyển HĐ' },
  { value: 'REJECTED', label: 'Đã từ chối' },
];

const ORDER_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả loại' },
  { value: 'READY', label: 'Hàng có sẵn' },
  { value: 'CUSTOM', label: 'Đặt theo yêu cầu' },
];

const SEARCH_BY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'CUSTOMER_NAME', label: 'Tên khách hàng' },
  { value: 'REQUEST_CODE', label: 'Mã yêu cầu' },
  { value: 'PHONE', label: 'Số điện thoại' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// ─── Status Badge ──────────────────────────────────────────
function RequestStatusBadge({ status }) {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <Clock className="h-3 w-3" />
          Chờ xử lý
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          <Clock className="h-3 w-3" />
          Đang xử lý
        </span>
      );
    case 'CONVERTED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-3 w-3" />
          Đã chuyển HĐ
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
          <XCircle className="h-3 w-3" />
          Đã từ chối
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-600">
          {status}
        </span>
      );
  }
}

// ─── Detail Modal ──────────────────────────────────────────
function RequestDetailModal({ requestId, onClose, onConvert }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getRequestById(requestId);
        if (!cancelled) setDetail(res.data);
      } catch {
        if (!cancelled) toast.error('Không tải được chi tiết yêu cầu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [requestId]);

  const canConvert = detail && detail.status !== 'CONVERTED' && detail.status !== 'REJECTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold text-stone-800">Chi tiết yêu cầu</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-stone-100">
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-12 text-center text-stone-500">Đang tải...</div>
          ) : !detail ? (
            <div className="py-12 text-center text-red-500">Không tìm thấy yêu cầu.</div>
          ) : (
            <>
              {/* Code + Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-500">Mã yêu cầu</p>
                  <p className="font-mono text-base font-bold text-amber-700">{detail.requestCode}</p>
                </div>
                <RequestStatusBadge status={detail.status} />
              </div>

              {/* Thông tin khách */}
              <div className="rounded-lg border border-stone-200 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-amber-600" /> Thông tin khách hàng
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-stone-400">Tên</p>
                    <p className="font-medium text-stone-800">{detail.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Điện thoại</p>
                    <p className="font-medium text-stone-800 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-stone-400" />
                      {detail.customerPhone}
                    </p>
                  </div>
                  {detail.customerEmail && (
                    <div className="col-span-2">
                      <p className="text-xs text-stone-400">Email</p>
                      <p className="font-medium text-stone-800">{detail.customerEmail}</p>
                    </div>
                  )}
                  {detail.deliveryAddress ? (
                    <div className="col-span-2">
                      <p className="text-xs text-stone-400">Địa chỉ giao hàng</p>
                      <p className="font-medium text-stone-800 flex items-start gap-1">
                        <MapPin className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
                        {detail.deliveryAddress}
                      </p>
                    </div>
                  ) : (
                    <div className="col-span-2">
                      <p className="text-xs text-stone-400">Địa chỉ giao hàng</p>
                      <p className="text-xs font-medium text-amber-700 bg-amber-50 rounded px-2 py-1 inline-block">
                        Chưa có địa chỉ — Sale sẽ điền khi chuyển thành hợp đồng
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Thông tin yêu cầu */}
              <div className="rounded-lg border border-stone-200 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-amber-600" /> Thông tin yêu cầu
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-stone-400">Loại hàng</p>
                    <p className="font-medium text-stone-800">
                      {detail.orderType === 'READY' ? 'Hàng có sẵn' : 'Đặt theo yêu cầu'}
                    </p>
                  </div>
                  {detail.expectedDate && (
                    <div>
                      <p className="text-xs text-stone-400">Ngày mong muốn</p>
                      <p className="font-medium text-stone-800 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-stone-400" />
                        {formatDate(detail.expectedDate)}
                      </p>
                    </div>
                  )}
                  {(detail.budgetMin || detail.budgetMax) && (
                    <div className="col-span-2">
                      <p className="text-xs text-stone-400">Ngân sách dự kiến</p>
                      <p className="font-medium text-stone-800">
                        {detail.budgetMin && detail.budgetMax
                          ? `${formatVND(detail.budgetMin)} – ${formatVND(detail.budgetMax)}`
                          : detail.budgetMin
                          ? `Từ ${formatVND(detail.budgetMin)}`
                          : `Đến ${formatVND(detail.budgetMax)}`}
                      </p>
                    </div>
                  )}
                </div>
                {detail.description && (
                  <p className="mt-2 text-sm text-stone-600 bg-stone-50 rounded-md px-3 py-2">
                    {detail.description}
                  </p>
                )}
              </div>

              {/* Danh sách sản phẩm */}
              {detail.items && detail.items.length > 0 && (
                <div className="rounded-lg border border-stone-200 overflow-hidden">
                  <div className="bg-stone-50 px-4 py-2 border-b border-stone-200">
                    <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-amber-600" />
                      Danh sách sản phẩm ({detail.items.length})
                    </h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone-50 text-xs text-stone-500">
                        <th className="px-3 py-2 text-left">Tên sản phẩm</th>
                        <th className="px-3 py-2 text-right">SL</th>
                        <th className="px-3 py-2 text-right">Đơn giá</th>
                        <th className="px-3 py-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-stone-100">
                          <td className="px-3 py-2 font-medium text-stone-800">{item.itemName}</td>
                          <td className="px-3 py-2 text-right text-stone-600">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-stone-600">
                            {item.unitPrice != null ? formatVND(item.unitPrice) : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-amber-700">
                            {item.unitPrice != null
                              ? formatVND(item.unitPrice * item.quantity)
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Contract đã tạo */}
              {detail.contract && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-800">
                    Đã chuyển thành hợp đồng{' '}
                    <span className="font-bold font-mono">{detail.contract.contractCode}</span>
                    {' '}(trạng thái: {detail.contract.status})
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Đóng
                </button>
                {canConvert && (
                  <button
                    onClick={() => onConvert(detail)}
                    className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 active:bg-amber-700"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Chuyển thành Hợp đồng
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Convert Modal (Mô phỏng giao diện bên trái trang POS) ───
function ConvertToContractModal({ request, onClose, onSuccess }) {
  // 1. Giỏ hàng sản phẩm (khởi tạo từ request.items)
  const [cartItems, setCartItems] = useState(() => {
    return (request?.items || []).map((it) => ({
      requestItemId: it.requestItemId || it.request_item_id,
      productId: it.productId || it.product_id || null,
      productCode: it.productCode || (it.productId ? `PRD-${String(it.productId).padStart(4, '0')}` : 'CUSTOM'),
      productName: it.itemName || it.item_name || 'Sản phẩm',
      imageUrl: it.imageUrl || it.image_url || null,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice ?? it.unit_price) || 0,
      description: it.description || '',
    }));
  });

  // Tính tổng số lượng và tổng tiền hàng
  const totalQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [cartItems]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  }, [cartItems]);

  const minDeposit = totalAmount > 10000000 ? Math.round(totalAmount * 0.3) : 0;

  // 2. Form Thông tin khách hàng & Giao nhận (pre-filled từ request, cho phép sale chỉnh sửa hoặc điền nốt)
  const [customerName, setCustomerName] = useState(request?.customerName || request?.contact_name || '');
  const [customerPhone, setCustomerPhone] = useState(request?.customerPhone || request?.contact_phone || '');
  const [customerAddress, setCustomerAddress] = useState(request?.deliveryAddress || request?.delivery_address || '');
  const [deliveryDate, setDeliveryDate] = useState(request?.expectedDate || request?.expected_date || '');
  const [signedPlace, setSignedPlace] = useState('Cửa hàng Góc Nhà');
  const [depositAmount, setDepositAmount] = useState(() => minDeposit > 0 ? String(minDeposit) : '0');
  const [note, setNote] = useState(request?.description || '');
  const [submitting, setSubmitting] = useState(false);

  // Tự động cập nhật tiền cọc 30% khi tổng tiền thay đổi (đơn > 10M)
  useEffect(() => {
    if (totalAmount > 10000000) {
      setDepositAmount(String(Math.round(totalAmount * 0.3)));
    } else {
      setDepositAmount('0');
    }
  }, [totalAmount]);

  // Bộ điều khiển số lượng giỏ hàng
  const handleUpdateQuantity = (idx, newQty) => {
    if (newQty < 1) return;
    setCartItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: newQty };
      return updated;
    });
  };

  // Xóa sản phẩm khỏi giỏ hàng
  const handleRemoveItem = (idx) => {
    if (cartItems.length <= 1) {
      toast.error('Hợp đồng phải có ít nhất một sản phẩm.');
      return;
    }
    setCartItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const depositNum = parseInt(String(depositAmount).replace(/\D/g, ''), 10) || 0;
  const depositError = useMemo(() => {
    if (totalAmount > 10000000 && depositNum < minDeposit) {
      return `Đơn trên 10 triệu cần đặt cọc tối thiểu 30% (${formatVND(minDeposit)})`;
    }
    if (depositNum > totalAmount) return 'Tiền cọc không được vượt tổng giá trị hợp đồng.';
    return null;
  }, [depositNum, minDeposit, totalAmount]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error('Vui lòng nhập họ và tên khách hàng.');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Vui lòng nhập số điện thoại liên hệ.');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Giỏ hàng không có sản phẩm nào.');
      return;
    }
    if (depositError) {
      toast.error(depositError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim() || undefined,
        deposit_amount: depositNum,
        delivery_date: deliveryDate || undefined,
        signed_place: signedPlace || undefined,
        note: note.trim() || undefined,
        items: cartItems.map((item) => ({
          request_item_id: item.requestItemId,
          product_id: item.productId,
          item_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          description: item.description,
        })),
      };

      const res = await convertRequestToContract(request.requestId, payload);
      toast.success(`Đã tạo hợp đồng ${res.data?.contractCode || ''} thành công!`);
      onSuccess(res.data);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Có lỗi xảy ra khi chuyển yêu cầu thành hợp đồng.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-stone-100 shadow-2xl border border-stone-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="h-5 w-5 text-amber-700" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">Chuyển yêu cầu thành Hợp đồng</h2>
                <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {request.requestCode}
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Kiểm tra sản phẩm trong giỏ, bổ sung địa chỉ và thông tin còn thiếu trước khi lập hợp đồng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Bố cục Giỏ hàng & Form thông tin khách hàng giống POS */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ═════════════════════════════════════════════════════
              PHẦN 1: GIỎ HÀNG SẢN PHẨM (Mô phỏng POS bên trên)
              ═════════════════════════════════════════════════════ */}
          <div className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
            {/* Card Header Giỏ hàng */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/80 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-amber-700" />
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Giỏ hàng sản phẩm
                </h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                  {totalQuantity} món
                </span>
              </div>
              <span className="text-[11px] text-stone-500">
                Điều chỉnh số lượng nếu khách thay đổi
              </span>
            </div>

            {/* Danh sách các món trong giỏ */}
            <div className="max-h-[260px] divide-y divide-stone-100 overflow-y-auto p-2">
              {cartItems.map((item, idx) => (
                <div
                  key={item.requestItemId || idx}
                  className="flex items-center justify-between gap-3 p-2.5 transition hover:bg-stone-50/80 rounded-lg"
                >
                  {/* Ảnh & thông tin sản phẩm */}
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-stone-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-amber-700">
                          {item.productCode}
                        </span>
                        {item.productId ? (
                          <span className="rounded bg-emerald-50 px-1 text-[9px] font-medium text-emerald-700">
                            Hàng kho
                          </span>
                        ) : (
                          <span className="rounded bg-stone-100 px-1 text-[9px] font-medium text-stone-600">
                            Đặt riêng
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs font-semibold text-stone-900" title={item.productName}>
                        {item.productName}
                      </p>
                      <p className="text-xs font-bold text-amber-800">
                        {formatVND(item.unitPrice)}
                      </p>
                    </div>
                  </div>

                  {/* Stepper số lượng & thành tiền */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center rounded-lg border border-stone-200 bg-white">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="flex h-7 w-7 items-center justify-center text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                        title="Giảm số lượng"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-stone-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center text-stone-600 hover:bg-stone-100"
                        title="Tăng số lượng"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-right min-w-[85px]">
                      <p className="text-xs font-bold text-stone-900">
                        {formatVND(item.quantity * item.unitPrice)}
                      </p>
                      {cartItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-[11px] text-red-500 hover:underline inline-flex items-center gap-0.5"
                        >
                          <Trash2 className="h-3 w-3" /> Xóa
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tóm tắt tiền hàng (giống hệt POS) */}
            <div className="border-t border-stone-200 bg-stone-50/70 p-4">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>Tổng số lượng sản phẩm:</span>
                <span className="font-semibold text-stone-900">{totalQuantity} cái</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-stone-600">
                <span>Tổng tiền hàng:</span>
                <span className="text-sm font-bold text-stone-900">{formatVND(totalAmount)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-stone-600">
                <span>Tiền cọc mặc định:</span>
                <span className="font-semibold text-amber-800">
                  {formatVND(depositNum)}
                  {totalAmount > 10000000 && (
                    <span className="ml-1 rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[10px] font-bold text-amber-800">
                      (30%)
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-stone-200 pt-2 text-xs font-bold text-stone-900">
                <span>Còn lại cần thu:</span>
                <span className="text-sm font-extrabold text-stone-900">
                  {formatVND(Math.max(0, totalAmount - depositNum))}
                </span>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════
              PHẦN 2: FORM THÔNG TIN KHÁCH HÀNG & GIAO NHẬN (Mô phỏng POS bên dưới)
              ═════════════════════════════════════════════════════ */}
          <div className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-amber-700" />
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Thông tin khách hàng & Giao nhận
                </h3>
              </div>
              <span className="text-[11px] text-stone-400">
                * Điền nốt hoặc sửa thông tin
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Họ tên khách hàng */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Họ và tên khách hàng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Số điện thoại liên hệ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Ví dụ: 0912345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Địa chỉ giao hàng - Rất quan trọng khi request chưa có */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700">
                    Địa chỉ giao hàng (nếu có)
                  </label>
                  {!customerAddress.trim() && (
                    <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Khách chưa có địa chỉ — Sale vui lòng điền nốt
                    </span>
                  )}
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Địa chỉ số nhà, đường, phường, thành phố..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className={`w-full rounded-lg border py-2 pl-9 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 ${
                      !customerAddress.trim()
                        ? 'border-amber-300 bg-amber-50/30 focus:border-amber-500 focus:ring-amber-500'
                        : 'border-stone-200 focus:border-amber-500 focus:ring-amber-500'
                    }`}
                  />
                </div>
              </div>

              {/* Ngày hẹn giao & Nơi ký kết */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">
                    Ngày hẹn giao (dự kiến)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-xs text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">
                    Địa điểm ký kết
                  </label>
                  <input
                    type="text"
                    value={signedPlace}
                    onChange={(e) => setSignedPlace(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 py-2 px-3 text-xs text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Tiền đặt cọc trước */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700">
                    Tiền đặt cọc trước (VND)
                  </label>
                  {totalAmount > 10000000 ? (
                    <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                      Mặc định cọc 30% (Đơn > 10 triệu)
                    </span>
                  ) : (
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">
                      Không bắt buộc cọc (Đơn ≤ 10 triệu)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="number"
                    min={minDeposit}
                    max={totalAmount}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className={`w-full rounded-lg border py-2 pl-9 pr-3 text-xs font-bold text-amber-800 placeholder-stone-400 focus:outline-none focus:ring-1 ${
                      depositError
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                        : 'border-stone-200 focus:border-amber-500 focus:ring-amber-500'
                    }`}
                  />
                </div>
                {depositError ? (
                  <p className="mt-1 text-[11px] font-medium text-red-600">{depositError}</p>
                ) : (
                  <p className="mt-1 text-[11px] text-stone-500">
                    {totalAmount > 10000000
                      ? `* Theo chính sách bán hàng: Đơn trên 10 triệu mặc định cọc 30% (${formatVND(minDeposit)}).`
                      : '* Đơn hàng từ 10 triệu trở xuống không yêu cầu đặt cọc trước.'}
                  </p>
                )}
              </div>

              {/* Ghi chú */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Ghi chú đơn hàng
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về vận chuyển, đóng gói, bảo quản..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 p-2 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            Sau khi bấm <strong>Tạo Hợp đồng</strong>, hệ thống sẽ lập biên bản hợp đồng (trạng thái <strong>DRAFT</strong>) và tự động chuyển sang trang <strong>Quản lý Hợp đồng</strong> để in và tiến hành ký kết.
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2.5 text-xs font-medium text-stone-700 hover:bg-white"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || !customerName.trim() || !customerPhone.trim() || !!depositError || cartItems.length === 0}
              className="flex items-center gap-2 rounded-lg bg-amber-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <RotateCw className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Tạo Hợp đồng (DRAFT)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export function RequestsPage() {
  const navigate = useNavigate();

  // Filter state
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Data
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 });
  const [loading, setLoading] = useState(false);

  // Modals
  const [detailId, setDetailId] = useState(null);
  const [convertRequest, setConvertRequest] = useState(null);

  // Debounce
  const debounceRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Reset page khi filter thay đổi
  useEffect(() => { setPage(1); }, [statusFilter, orderTypeFilter, searchBy]);

  // Fetch
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        status: statusFilter,
        order_type: orderTypeFilter,
      };
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
        params.search_by = searchBy;
      }
      const res = await getRequests(params);
      setRequests(res.data || []);
      setPagination(res.pagination || { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: pageSize });
    } catch {
      toast.error('Không tải được danh sách yêu cầu.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, searchBy, statusFilter, orderTypeFilter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'ALL') count++;
    if (orderTypeFilter !== 'ALL') count++;
    if (debouncedSearch.trim()) count++;
    return count;
  }, [statusFilter, orderTypeFilter, debouncedSearch]);

  function handleReset() {
    setSearch('');
    setSearchBy('ALL');
    setStatusFilter('ALL');
    setOrderTypeFilter('ALL');
    setPage(1);
  }

  function handleConvertSuccess() {
    setConvertRequest(null);
    setDetailId(null);
    fetchRequests();
    // Chuyển sang trang contracts
    setTimeout(() => navigate('/sale/contracts'), 800);
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <ClipboardList className="h-6 w-6 text-amber-600" />
          <h1 className="text-2xl font-bold text-stone-800">Yêu cầu của khách hàng</h1>
        </div>
        <p className="text-sm text-stone-500 pl-9">
          Xem và chuyển yêu cầu mua hàng thành hợp đồng
        </p>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 rounded-xl bg-white border border-stone-200 p-4 shadow-sm space-y-3">
        {/* Row 1: search */}
        <div className="flex gap-2 flex-wrap">
          {/* Search By */}
          <div className="relative">
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-stone-300 bg-white pl-3 pr-8 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {SEARCH_BY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-stone-400" />
          </div>

          {/* Search input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="h-9 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-2 text-stone-400 hover:text-stone-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <Filter className="h-4 w-4 text-stone-400 shrink-0" />

          {/* Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-stone-300 bg-white pl-3 pr-8 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {REQUEST_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-stone-400" />
          </div>

          {/* Order type */}
          <div className="relative">
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="h-9 appearance-none rounded-lg border border-stone-300 bg-white pl-3 pr-8 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {ORDER_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-stone-400" />
          </div>

          {/* Reset */}
          {activeFilterCount > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Đặt lại
              <span className="ml-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-700">
                {activeFilterCount}
              </span>
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white border border-stone-200 shadow-sm overflow-hidden">
        {loading && requests.length === 0 ? (
          <div className="py-16 text-center text-stone-400">Đang tải...</div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-stone-300 mb-3" />
            <p className="text-stone-500">Không có yêu cầu nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-xs text-stone-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Mã yêu cầu</th>
                  <th className="px-4 py-3 text-left">Khách hàng</th>
                  <th className="px-4 py-3 text-left">Loại</th>
                  <th className="px-4 py-3 text-right">Số SP</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-left">Ngày tạo</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {requests.map((req) => (
                  <tr key={req.requestId} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-amber-700">
                        {req.requestCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-800">{req.customerName}</p>
                      <p className="text-xs text-stone-400">{req.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {req.orderType === 'READY' ? 'Có sẵn' : 'Đặt riêng'}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-700 font-medium">
                      {req.items?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <RequestStatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* Xem chi tiết */}
                        <button
                          onClick={() => setDetailId(req.requestId)}
                          title="Xem chi tiết"
                          className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {/* Chuyển thành HĐ */}
                        {req.status !== 'CONVERTED' && req.status !== 'REJECTED' && (
                          <button
                            onClick={() => setConvertRequest(req)}
                            title="Chuyển thành Hợp đồng"
                            className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                            Tạo HĐ
                          </button>
                        )}
                        {/* Xem hợp đồng đã tạo */}
                        {req.status === 'CONVERTED' && req.contract && (
                          <button
                            onClick={() => navigate('/sale/contracts')}
                            title="Xem hợp đồng"
                            className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Xem HĐ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="border-t border-stone-200">
          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            currentCount={requests.length}
            itemsPerPage={pagination.itemsPerPage}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            onPageChange={setPage}
            itemLabel="yêu cầu"
            loading={loading}
          />
        </div>
      </div>

      {/* Detail Modal */}
      {detailId !== null && (
        <RequestDetailModal
          requestId={detailId}
          onClose={() => setDetailId(null)}
          onConvert={(req) => {
            setDetailId(null);
            setConvertRequest(req);
          }}
        />
      )}

      {/* Convert Modal */}
      {convertRequest !== null && (
        <ConvertToContractModal
          request={convertRequest}
          onClose={() => setConvertRequest(null)}
          onSuccess={handleConvertSuccess}
        />
      )}
    </div>
  );
}

export default RequestsPage;
