// =========================================================
// RequestsPage.jsx
// Trang quản lý yêu cầu đặt hàng & đặt đóng đồ gỗ của khách (Role Sale)
// Chuẩn hóa 100% theo FSSIMS Design System (Xưởng sản xuất đồ gỗ nội thất)
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
  Package,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  PenTool,
  Layers,
  Image as ImageIcon,
  Maximize2,
  FileUp,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getRequests,
  getRequestById,
  convertRequestToContract,
} from '../../services/saleOrderService';
import { TablePagination } from '../../components/common/TablePagination';
import { OrderRequestStatusBadge } from '../../components/common/StatusBadge';
import {
  DesignGallery,
  normalizeImg,
  isOwnerDesignImg,
  isPdfUrl,
} from '../../components/common/DesignGallery';
import {
  formatVND,
  formatDate,
  formatTime,
} from '../../utils/formatters';

const ORDER_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả loại yêu cầu' },
  { value: 'READY', label: 'Hàng có sẵn' },
  { value: 'CUSTOM', label: 'Hàng thiết kế' },
];

const SEARCH_BY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả tiêu chí' },
  { value: 'CUSTOMER_NAME', label: 'Tên khách hàng' },
  { value: 'REQUEST_CODE', label: 'Mã yêu cầu' },
  { value: 'PHONE', label: 'Số điện thoại' },
];

// ─── Modal 1: Chi tiết Yêu cầu Đặt đóng ───────────────────
function RequestDetailModal({ requestId, onClose, onEdit }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const res = await getRequestById(requestId);
        if (active) setDetail(res.data || null);
      } catch {
        if (active) toast.error('Không tải được thông tin yêu cầu.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [requestId]);

  // Phím tắt Esc đóng Modal / Lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewImg) {
          setPreviewImg(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImg, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl border border-stone-200 my-8 flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-stone-900">Chi tiết yêu cầu</h2>
            {detail && (
              <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                #{detail.requestCode}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            aria-label="Đóng cửa sổ"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung chi tiết */}
        <div className="p-6 space-y-4 text-xs text-stone-800">
          {loading ? (
            <div className="py-16 text-center text-stone-500">
              <RotateCw className="mx-auto mb-2 h-6 w-6 animate-spin text-stone-400" />
              Đang tải thông tin chi tiết yêu cầu...
            </div>
          ) : !detail ? (
            <div className="py-16 text-center text-rose-600">
              Không tìm thấy thông tin yêu cầu.
            </div>
          ) : (
            <>
              {/* Thanh trạng thái & thời gian tạo */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-stone-200 bg-stone-50">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-700">Trạng thái:</span>
                  <OrderRequestStatusBadge status={detail.status} size="lg" />
                </div>
                <div className="font-mono text-stone-500 text-xs">
                  Thời gian tạo: <span className="font-semibold text-stone-800">{formatDate(detail.createdAt)} lúc {formatTime(detail.createdAt)}</span>
                </div>
              </div>

              {/* Cảnh báo Chủ xưởng yêu cầu sửa thông số / bản vẽ */}
              {detail.status === 'REQUEST_CHANGE' && (
                <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-950 text-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                    Chủ xưởng yêu cầu chỉnh sửa bản vẽ / thông số kỹ thuật sản phẩm
                  </div>
                  {detail.rejectReason ? (
                    <div className="rounded-md bg-white p-3 text-xs text-stone-800 border border-amber-200">
                      <span className="font-semibold text-amber-900">Ý kiến phản hồi từ xưởng: </span>
                      <span className="italic">{detail.rejectReason}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800">
                      Vui lòng kiểm tra lại kích thước thực tế, quy cách gỗ hoặc bản vẽ theo trao đổi nội bộ.
                    </p>
                  )}
                  {onEdit && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEdit(detail.requestId);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                      >
                        <PenTool className="h-3.5 w-3.5" />
                        Chỉnh sửa bản vẽ & Gửi lại xưởng
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Thông báo nếu đã từ chối */}
              {detail.status === 'REJECTED' && detail.rejectReason && (
                <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-4 space-y-1 text-xs text-rose-800">
                  <p className="font-bold flex items-center gap-1.5 text-rose-900">
                    <XCircle className="h-4 w-4 text-rose-600" /> Lý do từ chối yêu cầu:
                  </p>
                  <p className="italic pl-5">{detail.rejectReason}</p>
                </div>
              )}

              {/* Thông tin khách hàng & Giao nhận */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 rounded-lg border border-stone-200 bg-stone-50/50 p-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase text-stone-500">Khách hàng</span>
                  <p className="mt-1 font-bold text-stone-900 text-xs">{detail.customerName || detail.contactName}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-stone-500">Số điện thoại</span>
                  <p className="mt-1 font-mono font-medium text-stone-900 text-xs">{detail.customerPhone || detail.contactPhone}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-stone-500">Email</span>
                  <p className="mt-1 text-stone-700 text-xs truncate">{detail.customerEmail || '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-stone-500">Ngày mong muốn</span>
                  <p className="mt-1 font-medium text-stone-900 text-xs">
                    {detail.expectedDate ? formatDate(detail.expectedDate) : 'Thỏa thuận'}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-4 border-t border-stone-200/60 pt-2.5 mt-1">
                  <span className="text-[11px] font-semibold uppercase text-stone-500">Địa chỉ giao hàng & thi công</span>
                  <p className="mt-1 font-medium text-stone-900">{detail.deliveryAddress || 'Chưa cung cấp'}</p>
                </div>
                {detail.title && (
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-[11px] font-semibold uppercase text-stone-500">Tên đơn đặt đóng</span>
                    <p className="mt-1 font-medium text-stone-800">{detail.title}</p>
                  </div>
                )}
              </div>

              {/* Danh sách sản phẩm & Hồ sơ thiết kế từng món */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-stone-600" />
                    Danh sách sản phẩm & Bản vẽ xưởng ({detail.items?.length || 0} món)
                  </span>
                  {(() => {
                    const ownerCnt =
                      (detail.items || []).reduce(
                        (s, it) => s + (it.images || []).map(normalizeImg).filter(isOwnerDesignImg).length,
                        0
                      ) + (detail.images || []).map(normalizeImg).filter(isOwnerDesignImg).length;
                    return ownerCnt > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                        Chủ xưởng đã duyệt {ownerCnt} bản vẽ
                      </span>
                    ) : null;
                  })()}
                </div>

                <div className="space-y-3">
                  {(detail.items || []).map((it, idx) => {
                    const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' × ');
                    const unitPrice = Number(it.unitPrice ?? it.unit_price) || 0;
                    const qty = Number(it.quantity) || 1;
                    const techNote = it.description || it.technicalNotes;
                    const normalizedItemImgs = (it.images || []).map(normalizeImg).filter((x) => x.imageUrl);
                    const directCustomerImgs = normalizedItemImgs.filter((x) => !isOwnerDesignImg(x));
                    const generalCustomerImgs = (detail.images || [])
                      .map(normalizeImg)
                      .filter((x) => x.imageUrl && !isOwnerDesignImg(x));
                    const customerImgs = directCustomerImgs.length > 0 ? directCustomerImgs : generalCustomerImgs;
                    const ownerImgs = normalizedItemImgs.filter(isOwnerDesignImg);
                    const hasAnyDesignBlock = detail.orderType === 'CUSTOM' || customerImgs.length > 0 || ownerImgs.length > 0;

                    return (
                      <div key={it.requestItemId || idx} className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-2.5">
                          <div className="flex items-start gap-2.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-stone-100 text-xs font-mono font-bold text-stone-700">
                              #{idx + 1}
                            </span>
                            <div>
                              <h3 className="text-xs font-bold text-stone-900">{it.itemName}</h3>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                                <span>
                                  Kích thước:{' '}
                                  <strong className="font-mono text-stone-800">
                                    {dim ? `${dim} cm` : 'Theo thiết kế'}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>Số lượng: <strong className="font-mono text-stone-800">{qty}</strong></span>
                                <span>•</span>
                                <span>Đơn giá: <strong className="font-mono text-stone-800">{unitPrice ? formatVND(unitPrice) : 'Chờ báo giá'}</strong></span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-stone-400 block">Thành tiền</span>
                            <span className="text-xs font-bold text-amber-900 font-mono">
                              {unitPrice ? formatVND(unitPrice * qty) : '—'}
                            </span>
                          </div>
                        </div>

                        {techNote && (
                          <div className="rounded-md border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-700">
                            <span className="font-semibold text-stone-800 block mb-0.5">Mô tả & Thông số kỹ thuật:</span>
                            <p className="whitespace-pre-line">{techNote}</p>
                          </div>
                        )}

                        {hasAnyDesignBlock && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-3">
                              <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                                <span className="text-[11px] font-semibold uppercase text-stone-800 flex items-center gap-1">
                                  <ImageIcon className="h-3.5 w-3.5 text-stone-600" />
                                  Ảnh mẫu khách gửi
                                </span>
                                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                                  {customerImgs.length} ảnh
                                </span>
                              </div>
                              <DesignGallery
                                images={customerImgs}
                                badgeText={directCustomerImgs.length === 0 && customerImgs.length > 0 ? 'Ảnh chung' : 'Khách gửi'}
                                badgeClassName="bg-stone-800/90"
                                borderClassName="border-stone-200 hover:border-stone-400"
                                emptyText="Chưa có ảnh mẫu tham khảo."
                                emptyClassName="mt-2 rounded-lg border border-dashed border-stone-200 bg-stone-50 p-3 text-center text-[11px] text-stone-500"
                                onPreview={setPreviewImg}
                              />
                            </div>

                            <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-3">
                              <div className="flex items-center justify-between border-b border-amber-200 pb-1.5">
                                <span className="text-[11px] font-semibold uppercase text-amber-900 flex items-center gap-1">
                                  <FileUp className="h-3.5 w-3.5 text-amber-800" />
                                  Bản vẽ thiết kế của xưởng
                                </span>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                                  {ownerImgs.length} bản vẽ
                                </span>
                              </div>
                              <DesignGallery
                                images={ownerImgs}
                                badgeText="Bản vẽ xưởng"
                                badgeClassName="bg-amber-900/90"
                                borderClassName="border-amber-200 hover:border-amber-400"
                                emptyText="Chủ xưởng chưa tải lên bản vẽ thiết kế cho món này."
                                emptyClassName="mt-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-3 text-center text-[11px] text-amber-700"
                                onPreview={setPreviewImg}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bản vẽ / Hình ảnh đính kèm chung */}
              {(() => {
                const generalOwnerImgs = (detail.images || []).map(normalizeImg).filter((x) => x.imageUrl && isOwnerDesignImg(x));
                const generalOtherImgs = (detail.images || []).map(normalizeImg).filter((x) => x.imageUrl && !isOwnerDesignImg(x));
                if (generalOwnerImgs.length === 0 && (detail.items?.length > 0 || generalOtherImgs.length === 0)) {
                  return null;
                }
                const allGeneral = [...generalOwnerImgs, ...generalOtherImgs];
                return (
                  <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/60 p-3.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-stone-600" />
                      Bản vẽ & Hình ảnh đính kèm chung ({allGeneral.length} tệp)
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {allGeneral.map((img, idx) => {
                        const isOwner = isOwnerDesignImg(img);
                        return isPdfUrl(img.imageUrl) ? (
                          <a
                            key={idx}
                            href={img.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                          >
                            <FileText className="h-4 w-4 text-rose-600" />
                            <span>{isOwner ? 'Bản vẽ PDF xưởng' : 'Tài liệu PDF'} #{idx + 1}</span>
                            <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
                          </a>
                        ) : (
                          <div key={idx} className="relative group rounded-lg overflow-hidden border border-stone-200 shadow-2xs">
                            <img
                              src={img.imageUrl}
                              alt="Bản vẽ"
                              className="h-20 w-20 object-cover cursor-pointer transition group-hover:scale-105"
                              onClick={() => setPreviewImg(img.imageUrl)}
                            />
                            {isOwner && (
                              <span className="absolute bottom-1 left-1 rounded bg-amber-900/90 px-1 py-0.5 text-[9px] font-semibold text-white">
                                Bản vẽ xưởng
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setPreviewImg(img.imageUrl)}
                              className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition shadow"
                              title="Phóng to"
                            >
                              <Maximize2 className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Lightbox zoom modal */}
      {previewImg && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img src={previewImg} alt="Bản vẽ phóng to" className="max-h-[85vh] rounded-lg shadow-2xl object-contain" />
            <button
              type="button"
              onClick={() => setPreviewImg(null)}
              className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-stone-800 shadow-xl hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal 2: Chuyển yêu cầu thành Hợp đồng ──────────────
function ConvertToContractModal({ request, onClose, onSuccess }) {
  const [customerName, setCustomerName] = useState(request.customerName || request.contactName || '');
  const [customerPhone, setCustomerPhone] = useState(request.customerPhone || request.contactPhone || '');
  const [customerAddress, setCustomerAddress] = useState(request.deliveryAddress || '');
  const [deliveryDate, setDeliveryDate] = useState(request.expectedDate || '');
  const [depositAmount, setDepositAmount] = useState(0);

  const minDeliveryDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d;
  }, []);
  const minDeliveryDateStr = useMemo(() => {
    const yyyy = minDeliveryDate.getFullYear();
    const mm = String(minDeliveryDate.getMonth() + 1).padStart(2, '0');
    const dd = String(minDeliveryDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [minDeliveryDate]);

  const initialItems = useMemo(() => {
    return (request.items || []).map((it) => ({
      requestItemId: it.requestItemId,
      productId: it.productId || null,
      productName: it.itemName,
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || 0,
      description: it.description || null,
      lengthCm: it.lengthCm ?? it.length_cm ?? null,
      widthCm: it.widthCm ?? it.width_cm ?? null,
      heightCm: it.heightCm ?? it.height_cm ?? null,
      categoryId: it.categoryId || it.category_id || null,
      roomId: it.roomId || it.room_id || null,
      materialId: it.materialId || it.material_id || null,
      colorId: it.colorId || it.color_id || null,
    }));
  }, [request]);

  const [cartItems, setCartItems] = useState(initialItems);
  const [submitting, setSubmitting] = useState(false);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.unitPrice || 0) * (item.quantity || 1), 0);
  }, [cartItems]);

  const totalQuantity = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  }, [cartItems]);

  useEffect(() => {
    const minDeposit = totalAmount > 10000000 ? Math.round(totalAmount * 0.3) : 0;
    setDepositAmount(minDeposit);
  }, [totalAmount]);

  const depositError = useMemo(() => {
    if (totalAmount > 10000000) {
      const minRequired = Math.round(totalAmount * 0.3);
      if (depositAmount < minRequired) {
        return `Đơn hàng trên 10 triệu cần đặt cọc tối thiểu 30% (${formatVND(minRequired)})`;
      }
    }
    if (depositAmount > totalAmount) {
      return 'Tiền cọc không được lớn hơn tổng giá trị hợp đồng';
    }
    return null;
  }, [totalAmount, depositAmount]);

  const handleUpdateQuantity = (index, newQty) => {
    if (newQty < 1) return;
    setCartItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, quantity: newQty } : it))
    );
  };

  const handleRemoveItem = (index) => {
    if (cartItems.length <= 1) {
      toast.error('Đơn hàng cần có ít nhất một sản phẩm.');
      return;
    }
    setCartItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!customerName.trim()) return toast.error('Họ tên khách hàng là bắt buộc');
    if (!customerPhone.trim()) return toast.error('Số điện thoại khách hàng là bắt buộc');
    if (cartItems.length === 0) return toast.error('Giỏ hàng trống');
    if (depositError) return toast.error(depositError);

    if (deliveryDate) {
      const selDate = new Date(deliveryDate);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const targetDate = new Date(selDate.getFullYear(), selDate.getMonth(), selDate.getDate());
      const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        return toast.error('Ngày giao hàng không thể ở trong quá khứ.');
      }
      if (diffDays < 10) {
        return toast.error('Ngày giao hàng dự kiến phải cách thời điểm tạo hợp đồng ít nhất 10 ngày.');
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim() || null,
        deliveryDate: deliveryDate || null,
        depositAmount: Number(depositAmount) || 0,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim() || null,
        delivery_date: deliveryDate || null,
        deposit_amount: Number(depositAmount) || 0,
        items: cartItems.map((item) => ({
          request_item_id: item.requestItemId,
          product_id: item.productId,
          item_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          description: item.description,
          length_cm: item.lengthCm,
          width_cm: item.widthCm,
          height_cm: item.heightCm,
          category_id: item.categoryId,
          room_id: item.roomId,
          material_id: item.materialId,
          color_id: item.colorId,
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

  // Phím tắt Esc đóng Modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl border border-stone-200 my-8 flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-stone-900">Chuyển yêu cầu thành Hợp đồng</h2>
            <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              {request.requestCode}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            aria-label="Đóng cửa sổ"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-stone-800">
          {/* Giỏ hàng sản phẩm */}
          <div className="rounded-lg border border-stone-200 bg-white overflow-hidden shadow-2xs">
            <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-stone-500" />
                <span>Giỏ hàng sản phẩm</span>
                <span className="text-stone-400 font-normal">({cartItems.length} món)</span>
              </span>
              <span className="text-xs text-stone-500 font-medium">
                Tổng SL: <strong className="text-stone-900 font-mono">{totalQuantity}</strong>
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

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                      className="p-1 rounded border border-stone-300 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center font-bold text-stone-800 font-mono">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                      className="p-1 rounded border border-stone-300 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="w-28 text-right font-bold text-stone-900 font-mono">
                    {formatVND(item.unitPrice * item.quantity)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-stone-400 hover:text-rose-600 focus-visible:outline-none"
                    title="Xóa món"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-between items-center font-bold text-xs">
              <span className="text-stone-700">Tổng giá trị đơn hàng:</span>
              <span className="text-sm text-stone-900 font-bold font-mono">{formatVND(totalAmount)}</span>
            </div>
          </div>

          {/* Thông tin khách hàng & Giao nhận */}
          <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-3.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-700 block border-b border-stone-100 pb-2">
              Thông tin khách hàng & Giao nhận
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-stone-700 block">
                  Họ tên khách hàng <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">
                  Số điện thoại <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-xs text-stone-900 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-stone-700 block">
                  Địa chỉ giao hàng & thi công
                </label>
                <input
                  type="text"
                  placeholder="Địa chỉ số nhà, đường, phường/xã, quận/huyện..."
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">
                  Ngày giao hàng dự kiến
                </label>
                <input
                  type="date"
                  min={minDeliveryDateStr}
                  value={deliveryDate ? deliveryDate.split('T')[0] : ''}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Cách thời điểm tạo hợp đồng ít nhất 10 ngày để kịp sản xuất.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block">
                  Tiền đặt cọc (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 font-mono font-semibold"
                />
                {depositError && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">{depositError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || !!depositError}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-amber-950 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
              <span>Tạo hợp đồng</span>
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

  // Thống kê nhanh cho Tabs trạng thái
  const stats = useMemo(() => {
    const total = totalItems || requests.length;
    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const designing = requests.filter((r) =>
      ['DESIGNING', 'DRAFTING'].includes(r.status)
    ).length;
    const designed = requests.filter((r) =>
      ['DESIGNED', 'CONFIRMED', 'APPROVED', 'DESIGN_FINALIZED'].includes(r.status)
    ).length;
    const draft = requests.filter((r) =>
      ['DRAFT', 'CONTRACT_CREATED'].includes(r.status)
    ).length;
    const converted = requests.filter((r) => r.status === 'CONVERTED').length;
    const rejected = requests.filter((r) =>
      ['REJECTED', 'CANCELLED'].includes(r.status)
    ).length;
    const change = requests.filter((r) => r.status === 'REQUEST_CHANGE').length;

    return { total, pending, designing, designed, draft, converted, rejected, change };
  }, [requests, totalItems]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter !== 'ALL') count++;
    if (orderTypeFilter !== 'ALL') count++;
    if (searchBy !== 'ALL') count++;
    return count;
  }, [search, statusFilter, orderTypeFilter, searchBy]);

  const searchPlaceholder = useMemo(() => {
    switch (searchBy) {
      case 'REQUEST_CODE':
        return 'Nhập mã yêu cầu (ví dụ: REQ-20261124-0001)...';
      case 'CUSTOMER_NAME':
        return 'Nhập họ tên khách hàng...';
      case 'PHONE':
        return 'Nhập số điện thoại khách hàng...';
      default:
        return 'Tìm theo tên khách hàng, mã yêu cầu hoặc số điện thoại...';
    }
  }, [searchBy]);

  return (
    <div className="space-y-6 text-stone-900 pb-8">
      {/* ── 1. TIÊU ĐỀ TRANG ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Quản lý yêu cầu đặt hàng
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Theo dõi, thẩm định bản vẽ kỹ thuật và chuyển đổi yêu cầu đặt đóng đồ gỗ thành hợp đồng sản xuất.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchRequests}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            title="Làm mới danh sách"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/sale/requests/create')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo yêu cầu đặt đóng</span>
          </button>
        </div>
      </div>

      {/* ── Cảnh báo yêu cầu cần sửa đổi ──────────────────────── */}
      {pendingChangeRequests.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">
                Có {pendingChangeRequests.length} yêu cầu cần điều chỉnh bản vẽ theo góp ý của xưởng
              </p>
              <p className="text-stone-600 mt-0.5">
                Nhấn nút <strong className="font-semibold text-amber-900">&quot;Sửa đơn&quot;</strong> để cập nhật lại thông số/kích thước và gửi lại thẩm định.
              </p>
            </div>
          </div>
          {statusFilter !== 'REQUEST_CHANGE' && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('REQUEST_CHANGE');
                setPage(1);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-950 shrink-0"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Xem {pendingChangeRequests.length} đơn cần sửa</span>
            </button>
          )}
        </div>
      )}

      {/* ── 2. BỘ LỌC & TÌM KIẾM ─────────────────────────────── */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-4">
        {/* Tabs trạng thái kèm số lượng */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 pb-3">
          {[
            { key: 'ALL', label: 'Tất cả yêu cầu', count: stats?.total ?? 0 },
            { key: 'PENDING', label: 'Chờ xử lý', count: stats?.pending ?? 0 },
            { key: 'DESIGNING', label: 'Chờ thiết kế', count: stats?.designing ?? 0 },
            { key: 'DESIGNED', label: 'Đã có bản vẽ', count: stats?.designed ?? 0 },
            { key: 'DRAFT', label: 'Chờ ký hợp đồng', count: stats?.draft ?? 0 },
            { key: 'CONVERTED', label: 'Đã chuyển đơn hàng', count: stats?.converted ?? 0 },
            { key: 'REJECTED', label: 'Đã từ chối', count: stats?.rejected ?? 0 },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${isActive
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                  }`}
              >
                <span>{tab.label}</span>

                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono ${isActive
                    ? 'bg-stone-700 text-white'
                    : 'bg-stone-200 text-stone-700'
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        {/* Thanh tìm kiếm & bộ lọc phụ */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Dropdown tiêu chí tìm */}
          <div className="w-full lg:w-44 shrink-0">
            <select
              aria-label="Tiêu chí tìm kiếm"
              value={searchBy}
              onChange={(e) => {
                setSearchBy(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            >
              {SEARCH_BY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ô nhập từ khóa tìm kiếm */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-9 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 focus-visible:outline-none"
                title="Xóa từ khóa"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Bộ lọc loại yêu cầu */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Lọc loại yêu cầu"
              value={orderTypeFilter}
              onChange={(e) => {
                setOrderTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            >
              {ORDER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              >
                <X className="h-3.5 w-3.5" />
                <span>Đặt lại ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Thông tin tóm tắt kết quả */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs text-stone-500">
          <span>
            Hiển thị <strong className="font-semibold text-stone-800">{requests.length}</strong> trên tổng số{' '}
            <strong className="font-semibold text-stone-800">{totalItems}</strong> yêu cầu
            {search.trim() && (
              <span> với từ khóa &ldquo;<strong className="text-stone-900">{search.trim()}</strong>&rdquo;</span>
            )}
          </span>
          {totalPages > 1 && (
            <span>
              Trang {page} / {totalPages}
            </span>
          )}
        </div>
      </section>

      {/* ── 3. BẢNG DANH SÁCH YÊU CẦU ───────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th scope="col" className="py-3 pl-4 pr-3 sm:pl-6">Mã yêu cầu</th>
                <th scope="col" className="px-3 py-3">Khách hàng & Liên hệ</th>
                <th scope="col" className="px-3 py-3">Loại yêu cầu</th>
                <th scope="col" className="px-3 py-3 text-center">Sản phẩm & Bản vẽ</th>
                <th scope="col" className="px-3 py-3 text-center">Thời gian tạo</th>
                <th scope="col" className="px-3 py-3 text-center">Trạng thái</th>
                <th scope="col" className="px-3 py-3 text-center pr-4 sm:pr-6">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-stone-500">
                    <RotateCw className="mx-auto mb-2 h-6 w-6 animate-spin text-stone-400" />
                    <p className="text-xs">Đang tải danh sách yêu cầu...</p>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-stone-500">
                    <ClipboardList className="mx-auto mb-2 h-10 w-10 text-stone-300" />
                    <p className="mt-2 text-sm font-semibold text-stone-800">
                      Không tìm thấy yêu cầu nào
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {activeFilterCount > 0
                        ? 'Thử thay đổi từ khóa hoặc nhấn "Đặt lại" để xem toàn bộ danh sách.'
                        : 'Hiện chưa có yêu cầu nào trong hệ thống.'}
                    </p>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={handleReset}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Đặt lại bộ lọc</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const itemsCount = r.items?.length || 0;

                  return (
                    <tr key={r.requestId} className="hover:bg-stone-50 transition">
                      {/* Mã yêu cầu */}
                      <td className="py-3.5 pl-4 pr-3 sm:pl-6 font-mono font-bold text-amber-900">
                        {r.requestCode}
                      </td>

                      {/* Khách hàng & SĐT */}
                      <td className="px-3 py-3.5">
                        <p className="font-medium text-stone-900">{r.customerName || r.contactName || 'Khách vãng lai'}</p>
                        <p className="text-stone-500 font-mono text-[11px] mt-0.5">
                          {r.customerPhone || r.contactPhone || '—'}
                        </p>
                      </td>

                      {/* Loại đơn */}
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700 border border-stone-200">
                          {r.orderType === 'CUSTOM' ? 'Hàng thiết kế' : 'Hàng có sẵn'}
                        </span>
                      </td>

                      {/* Số sản phẩm & Bản vẽ */}
                      <td className="px-3 py-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            <Package className="h-3 w-3 text-stone-500" />
                            {itemsCount} sản phẩm
                          </span>
                          {(() => {
                            const allImgs = [
                              ...(r.images || []),
                              ...(r.items || []).flatMap((it) => it.images || []),
                            ]
                              .map(normalizeImg)
                              .filter((x) => x.imageUrl);
                            const ownerCnt = allImgs.filter(isOwnerDesignImg).length;
                            if (ownerCnt > 0) {
                              return (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                                  {ownerCnt} bản vẽ xưởng
                                </span>
                              );
                            }
                            if (allImgs.length > 0) {
                              return (
                                <span className="text-[10px] font-medium text-stone-600">
                                  {allImgs.length} ảnh mẫu
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>

                      {/* Thời gian tạo */}
                      <td className="px-3 py-3.5 text-center">
                        <div className="font-medium text-stone-800">{formatDate(r.createdAt)}</div>
                        <div className="text-[11px] text-stone-400 font-mono mt-0.5">{formatTime(r.createdAt)}</div>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-3 py-3.5 text-center">
                        <OrderRequestStatusBadge status={r.status} />
                        {r.status === 'REQUEST_CHANGE' && r.rejectReason && (
                          <p className="mt-1 text-[11px] font-medium text-amber-900 line-clamp-1 max-w-[200px] mx-auto" title={r.rejectReason}>
                            {r.rejectReason}
                          </p>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-3 py-3.5 text-center pr-4 sm:pr-6">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailId(r.requestId)}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            title="Xem chi tiết yêu cầu"
                          >
                            <Eye className="h-3.5 w-3.5 text-stone-500" />
                            <span>Chi tiết</span>
                          </button>

                          {/* Nút Tạo hợp đồng */}
                          {(r.status === 'PENDING' || r.status === 'DESIGNED') && (
                            <button
                              type="button"
                              onClick={() => setConvertRequest(r)}
                              className="inline-flex items-center gap-1 rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            >
                              <span>Tạo HĐ</span>
                            </button>
                          )}

                          {/* Nút Xem hợp đồng nếu đã chuyển hoặc đang chờ ký */}
                          {(r.status === 'CONVERTED' || r.status === 'DRAFT' || r.status === 'CONTRACT_CREATED') && (
                            <button
                              type="button"
                              onClick={() => navigate('/sale/contracts')}
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            >
                              <span>Xem HĐ</span>
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

        {/* Phân trang */}
        {!loading && requests.length > 0 && (
          <div className="p-3 border-t border-stone-200 bg-stone-50/50">
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              currentCount={requests.length}
              itemsPerPage={limit}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
              itemLabel="yêu cầu"
              onPageChange={(p) => setPage(p)}
              loading={loading}
            />
          </div>
        )}
      </div>

      {/* ── 4. MODALS ────────────────────────────────────────── */}
      {detailId && (
        <RequestDetailModal
          requestId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(id) => navigate(`/sale/requests/create?editId=${id}`)}
        />
      )}

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
