// =========================================================
// ManageCustomerRequestsPage.jsx
// Quản lý Yêu Cầu Khách Hàng (Hàng Đặt Làm - Custom Requests) — dành cho Chủ xưởng (Owner)
// Chức năng:
// 1. Xem danh sách yêu cầu đặt làm theo mẫu (CUSTOM) từ khách hàng
// 2. Thống kê tổng quan (Cards)
// 3. Tìm kiếm, lọc theo trạng thái, từ khóa
// 4. Xem chi tiết yêu cầu, quy cách kỹ thuật & ảnh tham khảo của khách
// 5. Chủ xưởng gửi bản thiết kế (file kỹ thuật/PDF/ảnh) + ghi chú sang cho Sales
// Đồng bộ giao diện 100% với hệ thống Dashboard Owner
// =========================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ClipboardList,
  Search,
  RotateCw,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  Package,
  AlertCircle,
  DollarSign,
  FileUp,
  ExternalLink,
  Image as ImageIcon,
  Send,
  Layers,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  getRequests,
  getRequestById,
  updateRequestDesign,
} from '../../services/saleOrderService';
import { TablePagination } from '../../components/common/TablePagination';

// ─── Hằng số ──────────────────────────────────────────────
const STATUSES = ['ALL', 'PENDING', 'PROCESSING', 'CONVERTED', 'REJECTED'];

const STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đang xử lý',
  CONVERTED: 'Đã chuyển HĐ',
  REJECTED: 'Đã từ chối',
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// ─── Helpers ──────────────────────────────────────────────
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return Number(amount).toLocaleString('vi-VN') + ' ₫';
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

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

// ─── Huy hiệu trạng thái yêu cầu ──────────────────────────
function StatusBadge({ status }) {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
          <Clock className="h-3.5 w-3.5" />
          Chờ xử lý
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
          <Clock className="h-3.5 w-3.5" />
          Đang xử lý
        </span>
      );
    case 'CONVERTED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Đã chuyển HĐ
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
          <XCircle className="h-3.5 w-3.5" />
          Đã từ chối
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
          {status}
        </span>
      );
  }
}

// ─── Huy hiệu trạng thái bản thiết kế ─────────────────────
function DesignStatusBadge({ hasDesign }) {
  if (hasDesign) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Đã có bản thiết kế
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 border border-stone-200">
      <Clock className="h-3.5 w-3.5 text-stone-400" />
      Chưa gửi thiết kế
    </span>
  );
}

// ─── Detail Modal (kèm upload bản thiết kế) ─────────────────
function RequestDetailModal({ requestId, onClose, onUpdated }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // State gửi bản thiết kế
  const [designNote, setDesignNote] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [submittingDesign, setSubmittingDesign] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getRequestById(requestId);
        if (!cancelled) {
          setDetail(res.data);
          if (res.data?.designNote) {
            setDesignNote(res.data.designNote);
          }
        }
      } catch {
        if (!cancelled) toast.error('Không tải được chi tiết yêu cầu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 20MB.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleSendDesign = async (e) => {
    e.preventDefault();
    if (!selectedFile && !designNote.trim()) {
      toast.error('Vui lòng chọn file bản thiết kế hoặc nhập ghi chú thiết kế.');
      return;
    }

    setSubmittingDesign(true);
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('design_file', selectedFile);
      }
      formData.append('design_note', designNote.trim());

      const res = await updateRequestDesign(requestId, formData);
      toast.success('Đã gửi bản thiết kế sang cho Sales thành công!');

      setDetail((prev) => ({
        ...prev,
        designNote: res.data?.designNote !== undefined ? res.data.designNote : designNote,
        designFileUrl: res.data?.designFileUrl || prev.designFileUrl,
      }));

      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onUpdated) onUpdated();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Lỗi khi gửi bản thiết kế sang cho Sales.';
      toast.error(msg);
    } finally {
      setSubmittingDesign(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header modal */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-700" />
            <h2 className="text-lg font-bold text-stone-900">
              Chi tiết yêu cầu đặt làm
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-12 text-center text-stone-500">
              <RotateCw className="mx-auto h-6 w-6 animate-spin text-amber-700 mb-2" />
              <span>Đang tải thông tin chi tiết...</span>
            </div>
          ) : !detail ? (
            <div className="py-12 text-center text-rose-500 font-medium">
              Không tìm thấy yêu cầu này.
            </div>
          ) : (
            <>
              {/* Mã yêu cầu & Trạng thái */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-stone-100">
                <div>
                  <p className="text-xs text-stone-400">Mã yêu cầu</p>
                  <p className="font-mono text-base font-bold text-amber-800">
                    {detail.requestCode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 border border-violet-200">
                    Đặt theo yêu cầu (Custom)
                  </span>
                  <StatusBadge status={detail.status} />
                </div>
              </div>

              {/* KHỐI GỬI BẢN THIẾT KẾ SANG SALES (Tính năng chính cho Owner) */}
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50/40 p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-amber-700" />
                    Bản thiết kế gửi cho bộ phận Sales
                  </h3>
                  <DesignStatusBadge hasDesign={!!detail.designFileUrl} />
                </div>

                {/* Nếu đã có bản thiết kế trước đó */}
                {detail.designFileUrl && (
                  <div className="rounded-lg border border-amber-200 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Bản thiết kế hiện tại:
                      </div>
                      <a
                        href={detail.designFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-amber-900 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Xem / Mở file thiết kế
                      </a>
                    </div>

                    {/* Preview ảnh nếu là file hình */}
                    {detail.designFileUrl.match(/\.(jpeg|jpg|png|webp)($|\?)/i) && (
                      <div className="mt-2">
                        <img
                          src={detail.designFileUrl}
                          alt="Bản thiết kế hiện tại"
                          className="max-h-56 rounded-md border border-stone-200 object-contain bg-stone-50"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Form upload / cập nhật bản thiết kế */}
                <form onSubmit={handleSendDesign} className="space-y-3 bg-white p-4 rounded-lg border border-stone-200">
                  <p className="text-xs font-medium text-stone-600">
                    {detail.designFileUrl
                      ? 'Tải lên bản thiết kế mới thay thế hoặc cập nhật ghi chú kỹ thuật:'
                      : 'Tải lên file bản thiết kế (ảnh 2D/3D hoặc PDF) và gửi cho Sales:'}
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-start">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Chọn file thiết kế (PDF, PNG, JPG - Tối đa 20MB)
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        onChange={handleFileChange}
                        className="w-full text-xs text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
                      />
                      {filePreview && (
                        <div className="mt-2">
                          <p className="text-[11px] text-stone-400 mb-1">Ảnh xem trước:</p>
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="max-h-28 rounded border border-stone-200 object-contain"
                          />
                        </div>
                      )}
                      {selectedFile && !filePreview && (
                        <p className="mt-1 text-xs text-stone-600 flex items-center gap-1">
                          <ExternalLink className="h-3.5 w-3.5 text-stone-500" />
                          {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Ghi chú kỹ thuật / thiết kế cho Sales
                      </label>
                      <textarea
                        rows={3}
                        value={designNote}
                        onChange={(e) => setDesignNote(e.target.value)}
                        placeholder="Vd: Bản vẽ chi tiết kích thước 1m8 x 2m, khung sồi tự nhiên, mặt đá marble..."
                        className="w-full rounded-lg border border-stone-300 p-2 text-xs text-stone-900 outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={submittingDesign}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-amber-900 active:scale-95 disabled:opacity-50 transition"
                    >
                      {submittingDesign ? (
                        <RotateCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {submittingDesign ? 'Đang gửi sang Sales...' : 'Gửi bản thiết kế sang Sales'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Thông tin khách hàng */}
              <div className="rounded-xl border border-stone-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-amber-700" /> Thông tin khách hàng
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-stone-400">Họ và tên</p>
                    <p className="font-medium text-stone-900">{detail.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Số điện thoại</p>
                    <p className="font-medium text-stone-900 flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-stone-400" />
                      {detail.customerPhone}
                    </p>
                  </div>
                  {detail.customerEmail && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-stone-400">Email</p>
                      <p className="font-medium text-stone-900">{detail.customerEmail}</p>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <p className="text-xs text-stone-400">Địa chỉ giao hàng</p>
                    {detail.deliveryAddress ? (
                      <p className="font-medium text-stone-900 flex items-start gap-1">
                        <MapPin className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
                        {detail.deliveryAddress}
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-stone-500 bg-stone-100 rounded px-2 py-1 inline-block mt-0.5">
                        Chưa có địa chỉ cụ thể
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Thông tin yêu cầu đặt làm */}
              <div className="rounded-xl border border-stone-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-700" /> Thông tin yêu cầu đặt làm
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="sm:col-span-2">
                    <p className="text-xs text-stone-400">Tiêu đề yêu cầu</p>
                    <p className="font-semibold text-stone-900">{detail.title}</p>
                  </div>
                  {detail.expectedDate && (
                    <div>
                      <p className="text-xs text-stone-400">Ngày mong muốn nhận</p>
                      <p className="font-medium text-stone-900 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-stone-400" />
                        {formatDate(detail.expectedDate)}
                      </p>
                    </div>
                  )}
                  {(detail.budgetMin || detail.budgetMax) && (
                    <div>
                      <p className="text-xs text-stone-400">Ngân sách dự kiến</p>
                      <p className="font-medium text-stone-900 flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-stone-400" />
                        {detail.budgetMin && detail.budgetMax
                          ? `${formatCurrency(detail.budgetMin)} – ${formatCurrency(detail.budgetMax)}`
                          : detail.budgetMin
                          ? `Từ ${formatCurrency(detail.budgetMin)}`
                          : `Đến ${formatCurrency(detail.budgetMax)}`}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-stone-400">Ngày gửi yêu cầu</p>
                    <p className="font-medium text-stone-900">
                      {formatDateTime(detail.createdAt || detail.createdate)}
                    </p>
                  </div>
                  {detail.assigneeName && (
                    <div>
                      <p className="text-xs text-stone-400">Sales phụ trách</p>
                      <p className="font-medium text-stone-900">{detail.assigneeName}</p>
                    </div>
                  )}
                </div>

                {detail.description && (
                  <div>
                    <p className="text-xs text-stone-400 mb-1">Mô tả của khách hàng</p>
                    <p className="text-sm text-stone-800 bg-stone-50 rounded-lg p-3 border border-stone-200">
                      {detail.description}
                    </p>
                  </div>
                )}
                {detail.staffNote && (
                  <div>
                    <p className="text-xs text-stone-400 mb-1">Ghi chú của Sales</p>
                    <p className="text-sm text-blue-900 bg-blue-50 rounded-lg p-3 border border-blue-200">
                      {detail.staffNote}
                    </p>
                  </div>
                )}
                {detail.rejectReason && (
                  <div>
                    <p className="text-xs text-stone-400 mb-1">Lý do từ chối</p>
                    <p className="text-sm text-rose-900 bg-rose-50 rounded-lg p-3 border border-rose-200">
                      {detail.rejectReason}
                    </p>
                  </div>
                )}
              </div>

              {/* Ảnh tham khảo của khách gửi kèm */}
              {detail.images && detail.images.length > 0 && (
                <div className="rounded-xl border border-stone-200 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-amber-700" />
                    Ảnh tham khảo khách gửi kèm ({detail.images.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {detail.images.map((img, i) => (
                      <a
                        key={i}
                        href={img.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block overflow-hidden rounded-lg border border-stone-200 bg-stone-100 aspect-square"
                      >
                        <img
                          src={img.imageUrl}
                          alt={`Ảnh tham khảo ${i + 1}`}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition text-xs font-medium gap-1">
                          <ExternalLink className="h-3.5 w-3.5" /> Xem lớn
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Danh sách món đặt làm */}
              {detail.items && detail.items.length > 0 && (
                <div className="rounded-xl border border-stone-200 overflow-hidden shadow-xs">
                  <div className="bg-stone-50 px-4 py-3 border-b border-stone-200">
                    <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-amber-700" />
                      Quy cách món đặt làm ({detail.items.length})
                    </h3>
                  </div>
                  <table className="min-w-full divide-y divide-stone-200 text-sm">
                    <thead className="bg-stone-50/60 text-xs text-stone-600 font-semibold">
                      <tr>
                        <th className="py-2.5 pl-4 pr-3 text-left">Tên món</th>
                        <th className="px-3 py-2.5 text-center">Kích thước (D x R x C)</th>
                        <th className="px-3 py-2.5 text-right">SL</th>
                        <th className="py-2.5 pl-3 pr-4 text-right">Đơn giá dự kiến</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {detail.items.map((item, idx) => (
                        <tr key={idx} className="transition hover:bg-stone-50/70">
                          <td className="py-2.5 pl-4 pr-3 font-medium text-stone-900">
                            <div>{item.itemName}</div>
                            {item.description && (
                              <div className="text-xs text-stone-400 mt-0.5">
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-stone-600">
                            {item.lengthCm && item.widthCm && item.heightCm
                              ? `${item.lengthCm} × ${item.widthCm} × ${item.heightCm} cm`
                              : 'Theo thiết kế'}
                          </td>
                          <td className="px-3 py-2.5 text-right text-stone-700 font-medium">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 pl-3 pr-4 text-right font-medium text-amber-800">
                            {item.unitPrice != null ? formatCurrency(item.unitPrice) : 'Chờ báo giá'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Hợp đồng liên kết */}
              {detail.contract && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Đã chuyển thành hợp đồng
                    </p>
                    <p className="text-sm text-emerald-800 mt-0.5">
                      Mã HĐ:{' '}
                      <span className="font-bold font-mono">{detail.contract.contractCode}</span>
                      {' · '}Trạng thái: {detail.contract.status}
                    </p>
                  </div>
                </div>
              )}

              {/* Thông báo phân quyền */}
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-3.5 flex items-center gap-2 text-xs text-stone-600">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                Chủ xưởng gửi bản thiết kế và ghi chú kỹ thuật sang cho Sales. Việc chốt hợp đồng và báo giá do nhân viên Sales thực hiện.
              </div>
            </>
          )}
        </div>

        {/* Footer modal */}
        <div className="sticky bottom-0 z-10 flex justify-end border-t border-stone-200 bg-white px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// ManageCustomerRequestsPage Component chính
// =========================================================
export function ManageCustomerRequestsPage() {
  // ── States bộ lọc ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Dữ liệu ──
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ── Detail modal ──
  const [viewingId, setViewingId] = useState(null);

  // ── Fetch (Cố định order_type: 'CUSTOM') ──
  const fetchRequests = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit: pageSize,
        order_type: 'CUSTOM', // Chỉ lấy đơn đặt theo yêu cầu
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
        ...(search.trim() && { search: search.trim() }),
      };
      const res = await getRequests(params);
      const items = res.data || res.requests || [];
      setRequests(items);
      setPagination(
        res.pagination || {
          totalItems: res.totalItems || items.length,
          totalPages: res.totalPages || 1,
          currentPage: res.currentPage || 1,
          itemsPerPage: res.itemsPerPage || pageSize,
        }
      );
      if (isRefresh) toast.success('Đã làm mới dữ liệu');
    } catch (err) {
      const msg =
        err?.response?.data?.message || 'Không thể tải danh sách yêu cầu khách hàng.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, pageSize, statusFilter, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPage(1);
  };

  // ── Thống kê Cards nhanh ──
  const stats = useMemo(() => {
    const total = pagination.totalItems || requests.length;
    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const processing = requests.filter((r) => r.status === 'PROCESSING').length;
    const withDesign = requests.filter((r) => !!r.designFileUrl).length;
    return { total, pending, processing, withDesign };
  }, [pagination.totalItems, requests]);

  return (
    <div className="space-y-6">
      {/* ── Tiêu đề & Nút thao tác ───────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Quản Lý Yêu Cầu Khách Hàng 
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Xem và theo dõi các yêu cầu đặt làm theo mẫu của khách hàng, tải lên bản thiết kế và gửi sang cho bộ phận Sales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchRequests(true)}
            disabled={loading || refreshing}
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
        {/* Tổng yêu cầu đặt làm */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-500">Tổng yêu cầu</span>
            <div className="rounded-lg bg-stone-100 p-2 text-stone-700">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{stats.total}</span>
            <span className="text-xs text-stone-400">yêu cầu</span>
          </div>
        </div>

        {/* Chờ xử lý */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">Chờ xử lý</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900">{stats.pending}</span>
            <span className="text-xs text-amber-600">chờ lên bản vẽ</span>
          </div>
        </div>

        {/* Đang xử lý */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">Đang xử lý</span>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <RefreshCw className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-900">{stats.processing}</span>
            <span className="text-xs text-blue-600">đang trao đổi Sales</span>
          </div>
        </div>

        {/* Đã gửi bản thiết kế */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">Đã có bản thiết kế</span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900">{stats.withDesign}</span>
            <span className="text-xs text-emerald-600">sẵn sàng báo giá</span>
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
              placeholder="Tìm theo mã yêu cầu, tên khách hàng, số điện thoại..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          {/* Lọc Trạng thái */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'ALL' ? 'Tất cả trạng thái' : STATUS_LABELS[s]}
                </option>
              ))}
            </select>

            {(search || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Thông báo lỗi (nếu có) ────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Bảng danh sách yêu cầu ────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3.5 pl-4 pr-3 sm:pl-6 w-14">STT</th>
                <th className="px-3 py-3.5">Mã yêu cầu</th>
                <th className="px-3 py-3.5">Khách hàng</th>
                <th className="px-3 py-3.5">Tiêu đề đặt làm</th>
                <th className="px-3 py-3.5">Ngày gửi</th>
                <th className="px-3 py-3.5">Bản thiết kế</th>
                <th className="px-3 py-3.5">Trạng thái</th>
                <th className="py-3.5 pl-3 pr-4 text-center sm:pr-6">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="h-6 w-6 animate-spin text-amber-700" />
                      <span>Đang tải danh sách yêu cầu...</span>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ClipboardList className="h-10 w-10 text-stone-300" />
                      <p className="font-medium text-stone-700">Không tìm thấy yêu cầu đặt làm nào</p>
                      <p className="text-xs text-stone-400">
                        {search || statusFilter !== 'ALL'
                          ? 'Thử thay đổi từ khóa hoặc bộ lọc trạng thái.'
                          : 'Các yêu cầu gia công từ khách hàng sẽ xuất hiện tại đây.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req, idx) => {
                  const rowNum =
                    (pagination.currentPage - 1) * pagination.itemsPerPage + idx + 1;

                  return (
                    <tr
                      key={req.requestId}
                      className="transition hover:bg-stone-50/80"
                    >
                      <td className="whitespace-nowrap py-3.5 pl-4 pr-3 sm:pl-6 text-xs text-stone-400 font-medium">
                        {rowNum}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 font-semibold font-mono text-amber-800">
                        {req.requestCode}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-stone-900">
                            {req.customerName}
                          </span>
                          <span className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 text-stone-400" />
                            {req.customerPhone}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 max-w-[260px] truncate text-stone-800" title={req.title}>
                        {req.title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs text-stone-600">
                        {formatDate(req.createdAt || req.createdate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <DesignStatusBadge hasDesign={!!req.designFileUrl} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-center sm:pr-6">
                        <button
                          type="button"
                          onClick={() => setViewingId(req.requestId)}
                          aria-label={`Xem chi tiết ${req.requestCode}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 active:scale-95"
                        >
                          <Eye className="h-3.5 w-3.5 text-stone-500" />
                          <span>Xem & Gửi thiết kế</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && requests.length > 0 && (
          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            currentCount={requests.length}
            itemsPerPage={pagination.itemsPerPage}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            itemLabel="yêu cầu"
            loading={loading}
          />
        )}
      </div>

      {/* ── Detail Modal ── */}
      {viewingId && (
        <RequestDetailModal
          requestId={viewingId}
          onClose={() => setViewingId(null)}
          onUpdated={() => fetchRequests(false)}
        />
      )}
    </div>
  );
}

export default ManageCustomerRequestsPage;
