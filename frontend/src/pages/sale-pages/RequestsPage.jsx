// =========================================================
// RequestsPage.jsx
// Trang quản lý yêu cầu mua hàng & may đo của khách (Role Sale)
// Chuẩn hóa UI/UX 100% theo trang mẫu ManageProductsPage.jsx của Owner
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
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  PenTool,
  Lock,
  Layers,
  Image as ImageIcon,
  Maximize2,
  Boxes,
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
  { value: 'CUSTOM', label: 'Đơn hàng theo yêu cầu' },
];

const SEARCH_BY_OPTIONS = [
  { value: 'ALL', label: 'Tìm theo: Tất cả' },
  { value: 'CUSTOMER_NAME', label: 'Tên khách hàng' },
  { value: 'REQUEST_CODE', label: 'Mã yêu cầu' },
  { value: 'PHONE', label: 'Số điện thoại' },
];

// ─── Status Badge Đồng bộ Owner ────────────────────────────
function RequestStatusBadge({ status }) {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold">
          <Clock className="h-3 w-3 text-amber-600" />
          Chờ xử lý
        </span>
      );
    case 'REQUEST_CHANGE':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-0.5 text-xs font-semibold">
          <AlertTriangle className="h-3 w-3 text-orange-600" />
          Yêu cầu sửa
        </span>
      );
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold">
          <CheckCircle2 className="h-3 w-3 text-blue-600" />
          Đã duyệt sơ bộ
        </span>
      );
    case 'DESIGN_FINALIZED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 text-xs font-semibold">
          <Lock className="h-3 w-3 text-purple-600" />
          Đã chốt thiết kế
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 text-stone-800 border border-stone-200 px-2.5 py-0.5 text-xs font-semibold">
          Đang xử lý
        </span>
      );
    case 'CONVERTED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          Đã chuyển HĐ
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 text-xs font-semibold">
          <XCircle className="h-3 w-3 text-rose-600" />
          Đã từ chối
        </span>
      );
    default:
      return (
        <span className="inline-block rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
          {status}
        </span>
      );
  }
}

// ─── Modal 1: Chi tiết yêu cầu (Chuẩn Modal ManageProductsPage) ───
const isOwnerDesignImg = (img) =>
  Boolean(
    img &&
      typeof img === 'object' &&
      (img.imageType === 'OWNER_DESIGN' ||
        img.isOwnerDesign ||
        (typeof img.createdBy === 'string' && img.createdBy.toUpperCase().includes('OWNER')) ||
        (typeof img.imageUrl === 'string' && img.imageUrl.includes('design_files')))
  );

const isPdfUrl = (url = '') =>
  typeof url === 'string' &&
  (url.toLowerCase().includes('.pdf') || url.includes('/raw/upload/'));

const normalizeImg = (img) =>
  typeof img === 'string'
    ? { imageUrl: img, isOwnerDesign: img.includes('design_files') }
    : { ...img, imageUrl: img?.imageUrl || img?.image_url || '' };

function RequestImageGrid({ images, badgeText, badgeClass, borderClass, emptyText, emptyClass, onPreview }) {
  if (!images || images.length === 0) {
    return <div className={emptyClass}>{emptyText}</div>;
  }
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {images.map((img, idx) => {
        const isPdf = isPdfUrl(img.imageUrl);
        return isPdf ? (
          <a
            key={img.imageId || img.requestImageId || idx}
            href={img.imageUrl}
            target="_blank"
            rel="noreferrer"
            className={`group relative flex flex-col items-center justify-center rounded-lg border bg-white aspect-square p-2 text-center shadow-2xs transition ${borderClass}`}
          >
            <FileText className="h-6 w-6 text-rose-600" />
            <span className="mt-1 text-[10px] font-semibold text-stone-700">Mở file PDF</span>
            <span className={`absolute top-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-semibold text-white ${badgeClass}`}>
              {badgeText}
            </span>
          </a>
        ) : (
          <div
            key={img.imageId || img.requestImageId || idx}
            className={`group relative overflow-hidden rounded-lg border bg-white aspect-square shadow-2xs transition ${borderClass}`}
          >
            <img
              src={img.imageUrl}
              alt={`${badgeText} ${idx + 1}`}
              className="h-full w-full cursor-pointer object-cover transition group-hover:scale-105"
              onClick={() => onPreview(img.imageUrl)}
            />
            <span className={`absolute top-1 left-1 rounded px-1.5 py-0.5 text-[9px] font-semibold text-white ${badgeClass}`}>
              {badgeText}
            </span>
            <button
              type="button"
              onClick={() => onPreview(img.imageUrl)}
              className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 text-white text-[11px] font-medium gap-1 transition"
              title="Phóng to"
            >
              <Maximize2 className="h-3.5 w-3.5" /> Xem lớn
            </button>
          </div>
        );
      })}
    </div>
  );
}

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-bold text-stone-900">Chi tiết yêu cầu</h3>
            {detail && (
              <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
                #{detail.requestCode}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs text-stone-700">
          {loading ? (
            <div className="py-12 text-center text-sm text-stone-500">
              <RotateCw className="mx-auto mb-2 h-6 w-6 animate-spin text-stone-400" />
              Đang tải chi tiết yêu cầu...
            </div>
          ) : !detail ? (
            <div className="py-12 text-center text-sm text-rose-500">
              Không tìm thấy thông tin yêu cầu.
            </div>
          ) : (
            <>
              {/* Thanh trạng thái */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 bg-stone-50">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-600">Trạng thái:</span>
                  <RequestStatusBadge status={detail.status} />
                </div>
                <div className="font-mono text-stone-500 text-xs">
                  Thời gian tạo: <span className="font-semibold text-stone-800">{formatDate(detail.createdAt)} lúc {formatTime(detail.createdAt)}</span>
                </div>
              </div>

              {/* Cảnh báo Chủ xưởng yêu cầu sửa */}
              {detail.status === 'REQUEST_CHANGE' && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-orange-900 text-sm">
                    <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
                    Chủ xưởng yêu cầu chỉnh sửa thiết kế / thông số kỹ thuật
                  </div>
                  {detail.rejectReason ? (
                    <div className="rounded-lg bg-white p-3 text-xs text-orange-950 border border-orange-200">
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
                        className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 shadow-sm transition"
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
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 space-y-1 text-xs text-rose-800">
                  <p className="font-bold flex items-center gap-1.5 text-rose-900">
                    <XCircle className="h-4 w-4 text-rose-600" /> Lý do từ chối:
                  </p>
                  <p className="italic pl-5">{detail.rejectReason}</p>
                </div>
              )}

              {/* Thông tin khách hàng & Giao nhận */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                <div>
                  <span className="text-xs font-semibold uppercase text-stone-500">Khách hàng</span>
                  <p className="mt-1 font-semibold text-stone-900 text-sm">{detail.customerName || detail.contactName}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-stone-500">Số điện thoại</span>
                  <p className="mt-1 font-semibold text-stone-900 text-sm">{detail.customerPhone || detail.contactPhone}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-stone-500">Email</span>
                  <p className="mt-1 font-semibold text-stone-900 text-sm">{detail.customerEmail || '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-stone-500">Ngày mong muốn</span>
                  <p className="mt-1 font-semibold text-stone-900 text-sm">
                    {detail.expectedDate ? formatDate(detail.expectedDate) : 'Thỏa thuận'}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-4 border-t border-stone-200/60 pt-2.5 mt-1">
                  <span className="text-xs font-semibold uppercase text-stone-500">Địa chỉ giao hàng & thi công</span>
                  <p className="mt-1 font-semibold text-stone-900">{detail.deliveryAddress || 'Chưa cung cấp'}</p>
                </div>
                {detail.title && (
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-xs font-semibold uppercase text-stone-500">Tên đơn hàng</span>
                    <p className="mt-1 font-medium text-stone-800">{detail.title}</p>
                  </div>
                )}
              </div>

              {/* Danh sách sản phẩm & Hồ sơ thiết kế từng món */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-amber-700" />
                    Danh sách sản phẩm & Hồ sơ thiết kế ({detail.items?.length || 0} món)
                  </span>
                  {(() => {
                    const ownerCnt =
                      (detail.items || []).reduce(
                        (s, it) => s + (it.images || []).map(normalizeImg).filter(isOwnerDesignImg).length,
                        0
                      ) + (detail.images || []).map(normalizeImg).filter(isOwnerDesignImg).length;
                    return ownerCnt > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Chủ xưởng đã gửi {ownerCnt} bản vẽ
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
                      <div key={it.requestItemId || idx} className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-2.5">
                          <div className="flex items-start gap-2.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-xs font-bold text-amber-800">
                              #{idx + 1}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-stone-900">{it.itemName}</h4>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                                <span>
                                  Kích thước:{' '}
                                  <strong className="font-mono text-amber-900">
                                    {dim ? `${dim} cm` : 'Theo thiết kế'}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>SL: <strong className="text-stone-800">{qty}</strong></span>
                                <span>•</span>
                                <span>Đơn giá: <strong className="text-stone-800">{unitPrice ? formatVND(unitPrice) : 'Chờ báo giá'}</strong></span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[11px] text-stone-400 block">Thành tiền</span>
                            <span className="text-sm font-bold text-stone-900">{unitPrice ? formatVND(unitPrice * qty) : '—'}</span>
                          </div>
                        </div>

                        {techNote && (
                          <div className="rounded-lg border border-stone-200 bg-stone-50 p-2.5 text-xs text-stone-700">
                            <span className="font-semibold text-stone-800 block mb-0.5">Mô tả & Thông số kỹ thuật:</span>
                            <p className="whitespace-pre-line">{techNote}</p>
                          </div>
                        )}

                        {hasAnyDesignBlock && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3">
                              <div className="flex items-center justify-between border-b border-sky-100 pb-1.5">
                                <span className="text-[11px] font-bold uppercase text-sky-900 flex items-center gap-1">
                                  <ImageIcon className="h-3.5 w-3.5 text-sky-700" />
                                  Ảnh mẫu khách gửi
                                </span>
                                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                                  {customerImgs.length} ảnh
                                </span>
                              </div>
                              <RequestImageGrid
                                images={customerImgs}
                                badgeText={directCustomerImgs.length === 0 && customerImgs.length > 0 ? 'Ảnh chung' : 'Khách gửi'}
                                badgeClass="bg-sky-700/90"
                                borderClass="border-sky-200 hover:border-sky-400"
                                emptyText="Chưa có ảnh mẫu tham khảo."
                                emptyClass="mt-2 rounded-lg border border-dashed border-sky-200 bg-sky-50/50 p-3 text-center text-[11px] text-sky-600"
                                onPreview={setPreviewImg}
                              />
                            </div>

                            <div className="rounded-xl border border-amber-300 bg-amber-50/40 p-3">
                              <div className="flex items-center justify-between border-b border-amber-200/70 pb-1.5">
                                <span className="text-[11px] font-bold uppercase text-amber-950 flex items-center gap-1">
                                  <FileUp className="h-3.5 w-3.5 text-amber-800" />
                                  Bản vẽ thiết kế từ Chủ xưởng
                                </span>
                                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                                  {ownerImgs.length} bản vẽ
                                </span>
                              </div>
                              <RequestImageGrid
                                images={ownerImgs}
                                badgeText="Bản vẽ xưởng"
                                badgeClass="bg-amber-800/90"
                                borderClass="border-amber-300 hover:border-amber-500"
                                emptyText="Chủ xưởng chưa gửi bản vẽ thiết kế cho món này."
                                emptyClass="mt-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-3 text-center text-[11px] text-amber-700"
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

              {/* Bản vẽ / Hình ảnh chung cấp yêu cầu (nếu có bản vẽ xưởng cấp chung hoặc ảnh chung chưa gắn item) */}
              {(() => {
                const generalOwnerImgs = (detail.images || []).map(normalizeImg).filter((x) => x.imageUrl && isOwnerDesignImg(x));
                const generalOtherImgs = (detail.images || []).map(normalizeImg).filter((x) => x.imageUrl && !isOwnerDesignImg(x));
                if (generalOwnerImgs.length === 0 && (detail.items?.length > 0 || generalOtherImgs.length === 0)) {
                  return null;
                }
                const allGeneral = [...generalOwnerImgs, ...generalOtherImgs];
                return (
                  <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-amber-700" />
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
                            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
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
                              <span className="absolute bottom-1 left-1 rounded bg-amber-800/90 px-1 py-0.5 text-[9px] font-semibold text-white">
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

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
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
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img src={previewImg} alt="Bản vẽ phóng to" className="max-h-[85vh] rounded-xl shadow-2xl object-contain" />
            <button
              onClick={() => setPreviewImg(null)}
              className="absolute -top-3 -right-3 rounded-full bg-white p-1 text-stone-800 shadow-xl hover:bg-stone-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal 2: Chuyển yêu cầu thành Hợp đồng (Chuẩn Modal ManageProductsPage) ───
function ConvertToContractModal({ request, onClose, onSuccess }) {
  const [customerName, setCustomerName] = useState(request.customerName || request.contactName || '');
  const [customerPhone, setCustomerPhone] = useState(request.customerPhone || request.contactPhone || '');
  const [customerAddress, setCustomerAddress] = useState(request.deliveryAddress || '');
  const [deliveryDate, setDeliveryDate] = useState(request.expectedDate || '');
  const [depositAmount, setDepositAmount] = useState(0);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-bold text-stone-900">Chuyển yêu cầu thành Hợp đồng</h3>
            <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded">
              {request.requestCode}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-stone-800">
          {/* Giỏ hàng sản phẩm */}
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs">
            <div className="bg-stone-50/75 px-4 py-2.5 border-b border-stone-200 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-stone-500" />
                <span>Giỏ hàng sản phẩm</span>
                <span className="text-stone-400 font-normal">({cartItems.length} món)</span>
              </span>
              <span className="text-xs text-stone-500 font-medium">
                Tổng SL: <strong className="text-stone-900">{totalQuantity}</strong>
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

                  <div className="w-24 text-right font-bold text-stone-900">
                    {formatVND(item.unitPrice * item.quantity)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-stone-400 hover:text-rose-600"
                    title="Xóa món"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-between items-center font-bold text-sm">
              <span className="text-stone-600">Tổng giá trị đơn hàng:</span>
              <span className="text-base text-stone-900 font-bold">{formatVND(totalAmount)}</span>
            </div>
          </div>

          {/* Thông tin khách hàng & Giao nhận */}
          <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3.5 shadow-xs">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 block border-b border-stone-100 pb-2">
              Thông tin khách hàng & Giao nhận
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold uppercase text-stone-600 block">
                  Họ tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-stone-600 block">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-stone-600 block">
                  Địa chỉ giao hàng & thi công
                </label>
                <input
                  type="text"
                  placeholder="Địa chỉ số nhà, đường, phường/xã, quận/huyện..."
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-stone-600 block">
                  Ngày giao hàng dự kiến
                </label>
                <input
                  type="date"
                  value={deliveryDate ? deliveryDate.split('T')[0] : ''}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-stone-600 block">
                  Tiền đặt cọc (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none font-mono font-semibold"
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
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || !!depositError}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-stone-800 disabled:opacity-50"
            >
              <span hidden={!submitting} className={submitting ? 'inline-flex' : 'hidden'} aria-hidden="true">
                <RotateCw className="h-4 w-4 animate-spin" />
              </span>
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

  // Thống kê nhanh theo chuẩn Overview Stats của ManageProductsPage
  const stats = useMemo(() => {
    const total = totalItems || requests.length;
    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const change = requests.filter((r) => r.status === 'REQUEST_CHANGE').length;
    const converted = requests.filter((r) => r.status === 'CONVERTED' || r.status === 'DESIGN_FINALIZED').length;
    return { total, pending, change, converted };
  }, [requests, totalItems]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header chuẩn ManageProductsPage ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Yêu cầu của khách hàng
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Xem và chuyển yêu cầu mua hàng thành hợp đồng
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchRequests}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
            title="Làm mới danh sách"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          <button
            type="button"
            onClick={() => navigate('/sale/requests/create')}
            className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-stone-800"
          >
            <Plus className="h-4 w-4" />
            Tạo đơn theo yêu cầu
          </button>
        </div>
      </div>

      {/* ── Overview Stats chuẩn ManageProductsPage ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Tổng yêu cầu</span>
            <ClipboardList className="h-4 w-4 text-stone-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900">{stats.total}</p>
          <span className="text-xs text-stone-500">Đơn yêu cầu trong hệ thống</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Chờ xử lý</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900">{stats.pending}</p>
          <span className="text-xs text-amber-700">Chờ Chủ xưởng thẩm định</span>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-700">Cần chỉnh sửa</span>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-orange-900">{stats.change}</p>
          <span className="text-xs text-orange-700">Chủ xưởng yêu cầu sửa lại</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Đã chốt / Chuyển HĐ</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{stats.converted}</p>
          <span className="text-xs text-emerald-700">Đã sẵn sàng hoặc lập hợp đồng</span>
        </div>
      </div>

      {/* ── Banner cảnh báo đơn cần chỉnh sửa ── */}
      {pendingChangeRequests.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 shadow-sm transition shrink-0"
            >
              <Filter className="h-3.5 w-3.5" />
              Lọc {pendingChangeRequests.length} đơn cần sửa
            </button>
          )}
        </div>
      )}

      {/* ── Filters & Search chuẩn ManageProductsPage ── */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-stone-200 pl-10 pr-4 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          {/* Nhóm dropdown lọc */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Lọc Trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              {REQUEST_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Lọc Loại đơn */}
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              {ORDER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Lọc Tiêu chí tìm */}
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              {SEARCH_BY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {(search || statusFilter !== 'ALL' || orderTypeFilter !== 'ALL' || searchBy !== 'ALL') && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200 transition"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table chuẩn ManageProductsPage ── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-600">
            <thead className="border-b border-stone-200 bg-stone-50/75 text-xs font-semibold uppercase tracking-wider text-stone-500">
              <tr>
                <th scope="col" className="px-4 py-3.5">Mã yêu cầu</th>
                <th scope="col" className="px-4 py-3.5">Khách hàng & Liên hệ</th>
                <th scope="col" className="px-4 py-3.5">Loại yêu cầu</th>
                <th scope="col" className="px-4 py-3.5 text-center">Số sản phẩm</th>
                <th scope="col" className="px-4 py-3.5 text-center">Thời gian tạo</th>
                <th scope="col" className="px-4 py-3.5 text-center">Trạng thái</th>
                <th scope="col" className="px-4 py-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-stone-500">
                    <RotateCw className="mx-auto mb-2 h-6 w-6 animate-spin text-stone-400" />
                    Đang tải danh sách yêu cầu...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-stone-500">
                    <ClipboardList className="mx-auto mb-2 h-8 w-8 text-stone-300" />
                    Không tìm thấy yêu cầu nào phù hợp.
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const itemsCount = r.items?.length || 0;
                  const firstItem = r.items?.[0];
                  const firstItemDim = firstItem ? [firstItem.lengthCm, firstItem.widthCm, firstItem.heightCm].filter(Boolean).join('×') : '';

                  return (
                    <tr key={r.requestId} className="hover:bg-stone-50/60 transition">
                      {/* Mã yêu cầu */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200/60">
                          {r.requestCode}
                        </span>
                      </td>

                      {/* Khách hàng & SĐT */}
                      <td className="px-4 py-3">
                        <p className="font-semibold text-stone-900">{r.customerName || r.contactName || 'Khách vãng lai'}</p>
                        <p className="text-xs text-stone-500 font-mono mt-0.5">
                          {r.customerPhone || r.contactPhone || '—'}
                        </p>
                      </td>

                      {/* Loại đơn */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${
                            r.orderType === 'CUSTOM'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {r.orderType === 'CUSTOM' ? 'Đơn hàng theo yêu cầu' : 'Hàng có sẵn'}
                        </span>
                      </td>

                      {/* Số sản phẩm & Bản vẽ */}
                      <td className="px-4 py-3 text-center text-xs">
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
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
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {ownerCnt} bản vẽ xưởng
                                </span>
                              );
                            }
                            if (allImgs.length > 0) {
                              return (
                                <span className="text-[10px] font-medium text-sky-700">
                                  {allImgs.length} ảnh mẫu
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>

                      {/* Thời gian tạo */}
                      <td className="px-4 py-3 text-center text-xs">
                        <div className="font-medium text-stone-800">{formatDate(r.createdAt)}</div>
                        <div className="text-[11px] text-stone-400 font-mono mt-0.5">{formatTime(r.createdAt)}</div>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3 text-center">
                        <RequestStatusBadge status={r.status} />
                        {r.status === 'REQUEST_CHANGE' && r.rejectReason && (
                          <p className="mt-1 text-[11px] font-medium text-orange-700 line-clamp-1 max-w-[220px] mx-auto" title={r.rejectReason}>
                            ⚠️ Sửa: {r.rejectReason}
                          </p>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title="Xem chi tiết"
                            onClick={() => setDetailId(r.requestId)}
                            className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Nút sửa đơn nếu Chủ xưởng yêu cầu sửa */}
                          {r.status === 'REQUEST_CHANGE' && (
                            <button
                              type="button"
                              onClick={() => navigate(`/sale/requests/create?editId=${r.requestId}`)}
                              className="inline-flex items-center gap-1 rounded bg-orange-600 px-2 py-1 text-xs font-semibold text-white shadow-xs hover:bg-orange-700 transition"
                              title="Chỉnh sửa bản vẽ / thông số theo yêu cầu của xưởng"
                            >
                              <PenTool className="h-3 w-3" />
                              <span>Sửa đơn</span>
                            </button>
                          )}

                          {/* Nút Tạo hợp đồng */}
                          {(r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'DESIGN_FINALIZED') && (
                            <button
                              type="button"
                              onClick={() => setConvertRequest(r)}
                              className="inline-flex items-center gap-1 rounded bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 transition"
                            >
                              <span>Tạo HĐ</span>
                            </button>
                          )}

                          {/* Nút Xem hợp đồng nếu đã chuyển */}
                          {r.status === 'CONVERTED' && (
                            <button
                              type="button"
                              onClick={() => navigate('/sale/contracts')}
                              className="inline-flex items-center gap-1 rounded border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
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

        {/* Phân trang chuẩn ManageProductsPage */}
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

      {/* ── Modal Xem Chi Tiết ── */}
      {detailId && (
        <RequestDetailModal
          requestId={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(id) => navigate(`/sale/requests/create?editId=${id}`)}
        />
      )}

      {/* ── Modal Chuyển Hợp Đồng ── */}
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
