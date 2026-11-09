// =========================================================
// RequestsPage.jsx
// Trang quản lý yêu cầu mua hàng của khách (Role Sale)
// Đồng bộ giao diện tối giản, trực quan theo chuẩn khu vực Owner (OwnerRequestsTab / ManageSuppliersPage)
//
// Chức năng:
// 1. Danh sách yêu cầu may đo / thiết kế (tìm kiếm, lọc trạng thái, phân trang chuẩn TablePagination)
// 2. Banner thông báo khi có yêu cầu Chủ xưởng yêu cầu sửa đổi (REQUEST_CHANGE)
// 3. Modal xem chi tiết yêu cầu (thông tin khách, thông số Dài x Rộng x Cao, bản vẽ thiết kế)
// 4. Modal chuyển yêu cầu thành hợp đồng bán hàng DRAFT (với giỏ hàng và thông tin giao nhận)
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
  AlertTriangle,
  PenTool,
  Lock,
  Layers,
  Image as ImageIcon,
  Maximize2,
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

const formatTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const REQUEST_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'REQUEST_CHANGE', label: 'Cần chỉnh sửa' },
  { value: 'APPROVED', label: 'Đã duyệt sơ bộ' },
  { value: 'DESIGN_FINALIZED', label: 'Đã chốt thiết kế' },
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

// ─── Status Badge Đồng bộ Owner ────────────────────────────
function RequestStatusBadge({ status }) {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <Clock className="h-3 w-3" />
          Chờ xử lý
        </span>
      );
    case 'REQUEST_CHANGE':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800 border border-orange-200">
          <AlertTriangle className="h-3 w-3" />
          Yêu cầu sửa
        </span>
      );
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          <CheckCircle2 className="h-3 w-3" />
          Đã duyệt sơ bộ
        </span>
      );
    case 'DESIGN_FINALIZED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
          <Lock className="h-3 w-3" />
          Đã chốt thiết kế
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

// ─── Modal 1: Chi tiết Yêu cầu (Đồng bộ phong cách OwnerRequestsTab) ───
function RequestDetailModal({ requestId, onClose, onConvert, onEdit }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState(null);

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

  const canConvert = detail && detail.status !== 'CONVERTED' && detail.status !== 'REJECTED' && detail.status !== 'REQUEST_CHANGE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-stone-900" />
            <h2 className="text-base font-bold text-stone-900">Chi tiết yêu cầu</h2>
            {detail?.requestCode && (
              <span className="font-mono text-xs font-bold text-stone-700 bg-stone-200/80 px-2 py-0.5 rounded">
                #{detail.requestCode}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-4 text-xs text-stone-800">
          {loading ? (
            <div className="py-12 text-center text-stone-500">
              <RotateCw className="mx-auto h-6 w-6 animate-spin text-stone-400" />
              <p className="mt-2 text-xs">Đang tải chi tiết yêu cầu...</p>
            </div>
          ) : !detail ? (
            <div className="py-12 text-center text-red-500">Không tìm thấy thông tin yêu cầu.</div>
          ) : (
            <>
              {/* Thanh trạng thái */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-600">Trạng thái:</span>
                  <RequestStatusBadge status={detail.status} />
                </div>
                <div className="font-mono text-stone-500">
                  Thời gian tạo: <span className="font-semibold text-stone-800">{formatDate(detail.createdAt)} lúc {formatTime(detail.createdAt)}</span>
                </div>
              </div>

              {/* Cảnh báo Chủ xưởng yêu cầu sửa */}
              {detail.status === 'REQUEST_CHANGE' && (
                <div className="rounded-xl border border-orange-300 bg-orange-50/90 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-orange-900">
                    <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
                    Chủ xưởng yêu cầu chỉnh sửa thiết kế / thông số kỹ thuật
                  </div>
                  {detail.rejectReason ? (
                    <div className="rounded-lg bg-white/90 p-3 text-xs text-orange-950 border border-orange-200">
                      <span className="font-semibold text-orange-800">Ý kiến phản hồi từ Chủ xưởng: </span>
                      <span className="italic">{detail.rejectReason}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-orange-700">
                      Vui lòng kiểm tra lại kích thước, vật liệu hoặc ảnh thiết kế theo trao đổi với xưởng.
                    </p>
                  )}
                  {onEdit && (
                    <div className="pt-1">
                      <button
                        onClick={() => {
                          onClose();
                          onEdit(detail.requestId);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 shadow-sm"
                      >
                        <PenTool className="h-3.5 w-3.5" />
                        Chỉnh sửa bản vẽ & Gửi lại
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Thông báo nếu đã từ chối */}
              {detail.status === 'REJECTED' && detail.rejectReason && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1 text-xs text-red-800">
                  <p className="font-bold flex items-center gap-1.5 text-red-900">
                    <XCircle className="h-4 w-4 text-red-600" /> Lý do từ chối:
                  </p>
                  <p className="italic pl-5">{detail.rejectReason}</p>
                </div>
              )}

              {/* Thông tin khách hàng & Giao nhận */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <div>
                  <span className="text-stone-500">Khách hàng:</span>
                  <p className="font-semibold text-stone-900">{detail.customerName || detail.contactName}</p>
                </div>
                <div>
                  <span className="text-stone-500">Số điện thoại:</span>
                  <p className="font-semibold text-stone-900">{detail.customerPhone || detail.contactPhone}</p>
                </div>
                <div>
                  <span className="text-stone-500">Email:</span>
                  <p className="font-semibold text-stone-900">{detail.customerEmail || '—'}</p>
                </div>
                <div>
                  <span className="text-stone-500">Ngày mong muốn:</span>
                  <p className="font-semibold text-stone-900">
                    {detail.expectedDate ? formatDate(detail.expectedDate) : 'Thỏa thuận'}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-4">
                  <span className="text-stone-500">Địa chỉ giao hàng & thi công:</span>
                  <p className="font-semibold text-stone-900">{detail.deliveryAddress || 'Chưa cung cấp'}</p>
                </div>
                {detail.description && (
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-stone-500">Mô tả tổng quan:</span>
                    <p className="font-medium text-stone-800 italic mt-0.5">{detail.description}</p>
                  </div>
                )}
              </div>

              {/* Danh sách sản phẩm kỹ thuật */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-stone-700" />
                  Danh sách sản phẩm & Thông số kích thước ({detail.items?.length || 0} món)
                </h4>
                <div className="rounded-xl border border-stone-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="px-3 py-2">Sản phẩm</th>
                        <th className="px-3 py-2">Kích thước (Dài × Rộng × Cao cm)</th>
                        <th className="px-3 py-2 text-center">SL</th>
                        <th className="px-3 py-2 text-right">Đơn giá ước tính</th>
                        <th className="px-3 py-2 text-right">Thành tiền</th>
                        <th className="px-3 py-2">Ghi chú kỹ thuật</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(detail.items || []).map((it, idx) => {
                        const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' × ');
                        const unitPrice = Number(it.unitPrice ?? it.unit_price) || 0;
                        const qty = Number(it.quantity) || 1;
                        return (
                          <tr key={it.requestItemId || idx}>
                            <td className="px-3 py-2 font-semibold text-stone-900">{it.itemName}</td>
                            <td className="px-3 py-2 font-mono font-bold text-amber-900">
                              {dim ? `${dim} cm` : '—'}
                            </td>
                            <td className="px-3 py-2 text-center font-bold">{qty}</td>
                            <td className="px-3 py-2 text-right">{formatVND(unitPrice)}</td>
                            <td className="px-3 py-2 text-right font-bold text-stone-900">
                              {formatVND(unitPrice * qty)}
                            </td>
                            <td className="px-3 py-2 text-stone-500 italic max-w-xs truncate">
                              {it.description || it.technicalNotes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hình ảnh thiết kế đính kèm */}
              {detail.images && detail.images.length > 0 && (
                <div>
                  <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-stone-700" />
                    Bản vẽ & Hình ảnh thiết kế ({detail.images.length} ảnh)
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {detail.images.map((img, idx) => {
                      const url = typeof img === 'string' ? img : img.imageUrl;
                      return (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-stone-200">
                          <img
                            src={url}
                            alt="Bản vẽ"
                            className="h-20 w-28 object-cover cursor-pointer hover:scale-105 transition"
                            onClick={() => setPreviewImg(url)}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewImg(url)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hợp đồng đã tạo nếu có */}
              {detail.contract && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-emerald-950">
                        Đã chuyển thành Hợp đồng: {detail.contract.contractCode}
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Trạng thái: {detail.contract.status}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      window.location.href = '/sale/contracts';
                    }}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Xem hợp đồng
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
          >
            Đóng
          </button>
          {canConvert && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onConvert(detail);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-5 py-2 text-xs font-semibold text-white hover:bg-stone-800 shadow-sm transition"
            >
              <ShoppingCart className="h-4 w-4" />
              Tạo Hợp đồng từ yêu cầu
            </button>
          )}
        </div>
      </div>

      {/* Lightbox xem ảnh lớn */}
      {previewImg && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewImg(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img src={previewImg} alt="Phóng to" className="max-h-[85vh] rounded-xl shadow-2xl object-contain" />
            <button
              onClick={() => setPreviewImg(null)}
              className="absolute -top-3 -right-3 rounded-full bg-white p-1 text-stone-800 shadow-xl"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal 2: Chuyển yêu cầu thành Hợp đồng (Đồng bộ chuẩn Owner) ───
function ConvertToContractModal({ request, onClose, onSuccess }) {
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

  const totalQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [cartItems]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  }, [cartItems]);

  const minDeposit = totalAmount > 10000000 ? Math.round(totalAmount * 0.3) : 0;

  const [customerName, setCustomerName] = useState(request?.customerName || request?.contact_name || '');
  const [customerPhone, setCustomerPhone] = useState(request?.customerPhone || request?.contact_phone || '');
  const [customerAddress, setCustomerAddress] = useState(request?.deliveryAddress || request?.delivery_address || '');
  const [deliveryDate, setDeliveryDate] = useState(request?.expectedDate || request?.expected_date || '');
  const [signedPlace, setSignedPlace] = useState('Cửa hàng Góc Nhà');
  const [depositAmount, setDepositAmount] = useState(() => minDeposit > 0 ? String(minDeposit) : '0');
  const [note, setNote] = useState(request?.description || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (totalAmount > 10000000) {
      setDepositAmount(String(Math.round(totalAmount * 0.3)));
    } else {
      setDepositAmount('0');
    }
  }, [totalAmount]);

  const handleUpdateQuantity = (idx, newQty) => {
    if (newQty < 1) return;
    setCartItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: newQty };
      return updated;
    });
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900">Chuyển yêu cầu thành Hợp đồng</h3>
                <span className="font-mono text-xs font-bold text-stone-800 bg-stone-200/80 px-2 py-0.5 rounded">
                  {request.requestCode}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Kiểm tra sản phẩm trong giỏ và điền thông tin giao nhận để chốt hợp đồng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-stone-800">
          {/* Cột 1: Giỏ hàng sản phẩm */}
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-2xs">
            <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200 flex items-center justify-between">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-stone-700" />
                <span>Giỏ hàng sản phẩm</span>
                <span className="text-stone-500 font-normal">({cartItems.length} món)</span>
              </h4>
              <span className="text-[11px] text-stone-500 font-medium">
                Tổng SL: <strong>{totalQuantity}</strong>
              </span>
            </div>

            <div className="divide-y divide-stone-100 max-h-52 overflow-y-auto">
              {cartItems.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-stone-50/60">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 truncate">{item.productName}</p>
                    <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                      Đơn giá: {formatVND(item.unitPrice)}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                      className="p-1 rounded border border-stone-200 hover:bg-stone-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center font-bold text-stone-800">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                      className="p-1 rounded border border-stone-200 hover:bg-stone-100"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Thành tiền */}
                  <div className="w-24 text-right font-bold text-stone-900">
                    {formatVND(item.unitPrice * item.quantity)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-stone-400 hover:text-red-600"
                    title="Xóa món"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 bg-stone-50/80 border-t border-stone-200 flex justify-between items-center font-bold text-sm">
              <span className="text-stone-700">Tổng giá trị đơn hàng:</span>
              <span className="text-base text-stone-900">{formatVND(totalAmount)}</span>
            </div>
          </div>

          {/* Cột 2: Thông tin khách hàng & Giao nhận */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-4 shadow-2xs">
            <h4 className="font-bold text-stone-900 flex items-center gap-1.5 border-b border-stone-100 pb-2">
              <User className="h-4 w-4 text-stone-700" />
              Thông tin khách hàng & Giao nhận
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Họ tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-9 w-full rounded-lg border border-stone-300 px-3 text-xs focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-9 w-full rounded-lg border border-stone-300 px-3 text-xs focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Địa chỉ giao hàng & thi công
                </label>
                <input
                  type="text"
                  placeholder="Địa chỉ số nhà, đường, phường/xã, quận/huyện..."
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="h-9 w-full rounded-lg border border-stone-300 px-3 text-xs focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Ngày giao hàng dự kiến
                </label>
                <input
                  type="date"
                  value={deliveryDate ? deliveryDate.split('T')[0] : ''}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-stone-300 px-3 text-xs focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tiền đặt cọc (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="h-9 w-full rounded-lg border border-stone-300 px-3 text-xs focus:border-stone-900 focus:outline-none font-mono font-semibold"
                />
                {depositError && (
                  <p className="mt-1 text-[11px] text-red-600 font-medium">{depositError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || !!depositError}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50"
            >
              {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
              <span>Tạo Hợp đồng</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Component Chính: RequestsPage ────────────────────────
export function RequestsPage() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');
  const [searchBy, setSearchBy] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [detailId, setDetailId] = useState(null);
  const [convertRequest, setConvertRequest] = useState(null);

  const debounceRef = useRef(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        orderType: orderTypeFilter !== 'ALL' ? orderTypeFilter : undefined,
      };

      if (search.trim()) {
        params.search = search.trim();
        if (searchBy !== 'ALL') {
          params.searchBy = searchBy;
        }
      }

      const res = await getRequests(params);
      const list = res.data || res.requests || [];
      setRequests(Array.isArray(list) ? list : []);

      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalItems(res.pagination.totalItems || 0);
      } else {
        setTotalPages(1);
        setTotalItems(list.length);
      }
    } catch {
      toast.error('Không tải được danh sách yêu cầu.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, orderTypeFilter, search, searchBy]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRequests();
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, orderTypeFilter, searchBy]);

  useEffect(() => {
    fetchRequests();
  }, [page, limit, statusFilter, orderTypeFilter, searchBy]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter !== 'ALL') count++;
    if (orderTypeFilter !== 'ALL') count++;
    if (searchBy !== 'ALL') count++;
    return count;
  }, [search, statusFilter, orderTypeFilter, searchBy]);

  const handleReset = () => {
    setSearch('');
    setStatusFilter('ALL');
    setOrderTypeFilter('ALL');
    setSearchBy('ALL');
    setPage(1);
  };

  const pendingChangeRequests = useMemo(() => {
    return requests.filter((r) => r.status === 'REQUEST_CHANGE');
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* ── Tiêu đề trang & Nút hành động chính (Chuẩn Owner UI) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-white shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Yêu cầu của khách hàng
            </h1>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Xem và chuyển yêu cầu mua hàng thành hợp đồng
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchRequests}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/sale/requests/create')}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo đơn theo yêu cầu</span>
          </button>
        </div>
      </div>

      {/* ── Banner cảnh báo đơn cần chỉnh sửa ── */}
      {pendingChangeRequests.length > 0 && (
        <div className="rounded-xl border border-orange-300 bg-orange-50/90 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-900">
                Có {pendingChangeRequests.length} yêu cầu cần Sales chỉnh sửa theo ý kiến Chủ xưởng
              </p>
              <p className="text-xs text-orange-700 mt-0.5">
                Nhấn nút <strong className="font-semibold text-orange-800">"Sửa đơn"</strong> hoặc mở chi tiết yêu cầu để cập nhật lại thông số/bản vẽ và gửi lại thẩm định.
              </p>
            </div>
          </div>
          {statusFilter !== 'REQUEST_CHANGE' && (
            <button
              onClick={() => {
                setStatusFilter('REQUEST_CHANGE');
                setPage(1);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 shadow-sm shrink-0"
            >
              <Filter className="h-3.5 w-3.5" />
              Lọc {pendingChangeRequests.length} đơn cần sửa
            </button>
          )}
        </div>
      )}

      {/* ── Bộ lọc & Tìm kiếm (Chuẩn 1 hàng Owner UI) ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Tìm kiếm */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-stone-300 bg-stone-50/50 pl-10 pr-9 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdowns lọc trạng thái & loại hàng */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc theo trường tìm kiếm nếu cần */}
          <div className="relative">
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value)}
              className="h-10 appearance-none rounded-lg border border-stone-300 bg-white pl-3.5 pr-8 text-sm font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              {SEARCH_BY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          </div>

          {/* Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 appearance-none rounded-lg border border-stone-300 bg-white pl-3.5 pr-8 text-sm font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              {REQUEST_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          </div>

          {/* Order type */}
          <div className="relative">
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="h-10 appearance-none rounded-lg border border-stone-300 bg-white pl-3.5 pr-8 text-sm font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              {ORDER_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          </div>

          {/* Reset Filters */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-100"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Đặt lại</span>
              <span className="ml-0.5 rounded-full bg-stone-200 px-1.5 py-0.5 text-[10px] font-bold text-stone-700">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Bảng dữ liệu yêu cầu (Đồng bộ chuẩn Owner) ── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {loading && requests.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <RotateCw className="h-8 w-8 animate-spin text-stone-400" />
            <p className="text-sm font-medium text-stone-500">Đang tải danh sách yêu cầu...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-stone-800">Không có yêu cầu nào</h3>
            <p className="mt-1 text-sm text-stone-500">
              {activeFilterCount > 0
                ? 'Không có kết quả phù hợp với tiêu chí lọc.'
                : 'Chưa có yêu cầu đặt hàng nào từ khách hàng.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-stone-700">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-600">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3">Mã yêu cầu</th>
                  <th scope="col" className="px-3 py-3.5">Khách hàng</th>
                  <th scope="col" className="px-3 py-3.5">Loại hàng</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Số SP</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Trạng thái</th>
                  <th scope="col" className="px-3 py-3.5">Ngày tạo</th>
                  <th scope="col" className="py-3.5 pl-3 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {requests.map((req) => (
                  <tr key={req.requestId} className="group transition-colors hover:bg-stone-50/80">
                    {/* Cột Mã yêu cầu */}
                    <td className="py-4 pl-6 pr-3">
                      <span className="font-mono text-xs font-bold text-amber-900">
                        {req.requestCode}
                      </span>
                      {req.status === 'REQUEST_CHANGE' && req.rejectReason && (
                        <p className="mt-1 text-[11px] font-medium text-orange-700 line-clamp-1 max-w-[220px]" title={req.rejectReason}>
                          ⚠️ Sửa: {req.rejectReason}
                        </p>
                      )}
                    </td>

                    {/* Cột Khách hàng */}
                    <td className="px-3 py-4">
                      <p className="font-semibold text-stone-900">{req.customerName || req.contactName}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{req.customerPhone || req.contactPhone}</p>
                    </td>

                    {/* Cột Loại hàng */}
                    <td className="px-3 py-4">
                      <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                        {req.orderType === 'READY' ? 'Mẫu sẵn' : 'Đặt theo yêu cầu'}
                      </span>
                    </td>

                    {/* Cột Số SP */}
                    <td className="px-3 py-4 text-center font-bold text-stone-800">
                      {req.items?.length ?? 0}
                    </td>

                    {/* Cột Trạng thái */}
                    <td className="px-3 py-4 text-center">
                      <RequestStatusBadge status={req.status} />
                    </td>

                    {/* Cột Ngày tạo & Giờ */}
                    <td className="px-3 py-4 text-xs">
                      <div className="font-semibold text-stone-800">{formatDate(req.createdAt)}</div>
                      {formatTime(req.createdAt) && (
                        <div className="text-[11px] text-stone-500 font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-stone-400" />
                          {formatTime(req.createdAt)}
                        </div>
                      )}
                    </td>

                    {/* Cột Thao tác */}
                    <td className="py-4 pl-3 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Xem chi tiết */}
                        <button
                          type="button"
                          onClick={() => setDetailId(req.requestId)}
                          title="Xem chi tiết"
                          className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700 transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Nút sửa đơn khi Chủ xưởng yêu cầu sửa */}
                        {req.status === 'REQUEST_CHANGE' && (
                          <button
                            type="button"
                            onClick={() => navigate(`/sale/requests/create?editId=${req.requestId}`)}
                            title="Chỉnh sửa theo ý kiến Chủ xưởng"
                            className="inline-flex items-center gap-1 rounded-lg border border-orange-300 bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800 hover:bg-orange-200 transition"
                          >
                            <PenTool className="h-3.5 w-3.5 text-orange-700" />
                            <span>Sửa đơn</span>
                          </button>
                        )}

                        {/* Chuyển thành HĐ */}
                        {req.status !== 'CONVERTED' && req.status !== 'REJECTED' && req.status !== 'REQUEST_CHANGE' && (
                          <button
                            type="button"
                            onClick={() => setConvertRequest(req)}
                            title="Chuyển thành Hợp đồng"
                            className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-1 text-xs font-semibold text-white hover:bg-stone-800 transition"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Tạo HĐ</span>
                          </button>
                        )}

                        {/* Xem hợp đồng đã tạo */}
                        {req.status === 'CONVERTED' && req.contract && (
                          <button
                            type="button"
                            onClick={() => navigate('/sale/contracts')}
                            title="Xem hợp đồng đã tạo"
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Xem HĐ</span>
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

        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          currentCount={requests.length}
          itemsPerPage={limit}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          itemLabel="yêu cầu"
          loading={loading}
        />
      </div>

      {/* ── Modal Xem chi tiết ── */}
      {detailId && (
        <RequestDetailModal
          requestId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(reqId) => navigate(`/sale/requests/create?editId=${reqId}`)}
          onConvert={(req) => {
            setDetailId(null);
            setConvertRequest(req);
          }}
        />
      )}

      {/* ── Modal Chuyển thành hợp đồng ── */}
      {convertRequest && (
        <ConvertToContractModal
          request={convertRequest}
          onClose={() => setConvertRequest(null)}
          onSuccess={() => {
            setConvertRequest(null);
            fetchRequests();
          }}
        />
      )}
    </div>
  );
}

export default RequestsPage;
