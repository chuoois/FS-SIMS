// =========================================================
// ManageCustomerRequestsPage.jsx
// Quản lý Yêu Cầu Khách Hàng (Hàng Đặt Làm - Custom Requests) — dành cho Chủ xưởng (Owner)
// Chức năng:
// 1. Xem danh sách yêu cầu đặt làm theo mẫu (CUSTOM) từ khách hàng
// 2. Thống kê tổng quan (Cards)
// 3. Tìm kiếm, lọc theo trạng thái, từ khóa
// 4. Xem chi tiết yêu cầu, quy cách kỹ thuật & danh sách ảnh thiết kế (order_request_image)
// 5. Chủ xưởng gửi ảnh bản thiết kế (lưu vào order_request_image) và mô tả kỹ thuật (lưu vào description)
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

// ─── Huy hiệu trạng thái bản thiết kế (đếm số ảnh từ order_request_image) ─
function DesignStatusBadge({ count = 0 }) {
  if (count > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Đã có {count} ảnh
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 border border-stone-200">
      <Clock className="h-3.5 w-3.5 text-stone-400" />
      Chưa có ảnh
    </span>
  );
}

// ─── Component Thẻ Bản Thiết Kế Cho Từng Sản Phẩm ────────────────
function ItemDesignCard({ item, index, requestId, generalImages = [], onUpdated }) {
  const [description, setDescription] = useState(item.description || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setDescription(item.description || '');
  }, [item.description]);

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

  const handleSendItemDesign = async (e) => {
    e.preventDefault();
    if (!selectedFile && !description.trim()) {
      toast.error('Vui lòng chọn ảnh bản vẽ thiết kế hoặc nhập mô tả kỹ thuật.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('design_file', selectedFile);
      }
      formData.append('description', description.trim());
      if (item.requestItemId) {
        formData.append('request_item_id', item.requestItemId);
      }

      const res = await updateRequestDesign(requestId, formData);
      toast.success(`Đã gửi bản thiết kế cho "${item.itemName}" sang Sales thành công!`);

      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onUpdated) onUpdated(res.data);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Lỗi khi gửi bản thiết kế cho sản phẩm này.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const itemImages = (item.images || [])
    .map((img) => (typeof img === 'string' ? { imageUrl: img } : img))
    .filter((img) => img?.imageUrl);

  const isOwnerImg = (img) =>
    Boolean(
      img.imageType === 'OWNER_DESIGN' ||
      img.isOwnerDesign ||
      (typeof img.createdBy === 'string' && img.createdBy.toUpperCase().includes('OWNER')) ||
      (typeof img.imageUrl === 'string' && img.imageUrl.includes('design_files'))
    );

  const directCustomerImages = itemImages.filter((img) => !isOwnerImg(img));
  const ownerImages = itemImages.filter((img) => isOwnerImg(img));

  // Nếu sản phẩm không có ảnh mẫu riêng, lấy ảnh tham khảo chung của yêu cầu (nếu có)
  const customerImages =
    directCustomerImages.length > 0
      ? directCustomerImages
      : (generalImages || [])
          .map((img) => (typeof img === 'string' ? { imageUrl: img } : img))
          .filter((img) => img?.imageUrl && !isOwnerImg(img));

  const isUsingGeneral = directCustomerImages.length === 0 && customerImages.length > 0;

  return (
    <div className="rounded-xl border border-stone-300 bg-white p-4 shadow-xs space-y-3.5 transition hover:border-amber-400">
      {/* Header sản phẩm */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-stone-100">
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-bold text-xs text-amber-800">
            #{index + 1}
          </div>
          <div>
            <h4 className="font-bold text-sm text-stone-900">{item.itemName}</h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-0.5">
              <span>
                Kích thước:{' '}
                <strong className="text-stone-700">
                  {item.lengthCm && item.widthCm && item.heightCm
                    ? `${item.lengthCm} × ${item.widthCm} × ${item.heightCm} cm`
                    : 'Theo thiết kế'}
                </strong>
              </span>
              <span>•</span>
              <span>
                Số lượng: <strong className="text-stone-700">{item.quantity}</strong>
              </span>
              <span>•</span>
              <span>
                Đơn giá dự kiến:{' '}
                <strong className="text-amber-800">
                  {item.unitPrice != null ? formatCurrency(item.unitPrice) : 'Chờ báo giá'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          {itemImages.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Đã có {itemImages.length} ảnh thiết kế
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-500 border border-stone-200">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              Chưa có ảnh
            </span>
          )}
          {customerImages.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200">
              {customerImages.length} ảnh khách
            </span>
          )}
          {ownerImages.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-300">
              {ownerImages.length} bản vẽ xưởng
            </span>
          )}
        </div>
      </div>

      {/* Mô tả kỹ thuật hiện tại của món (nếu có) */}
      {item.description && (
        <div className="rounded-lg bg-stone-50 border border-stone-200 p-2.5 text-xs text-stone-700">
          <span className="font-semibold text-stone-800 block mb-0.5">Mô tả kỹ thuật hiện tại:</span>
          <p className="whitespace-pre-line">{item.description}</p>
        </div>
      )}

      {/* ── KHỐI PHÂN BIỆT RÕ RÀNG: ẢNH CỦA KHÁCH VS BẢN VẼ CỦA CHỦ XƯỞNG ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Khối 1: Ảnh mẫu tham khảo do khách hàng gửi */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3.5 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-sky-100">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <ImageIcon className="h-3 w-3" />
                </span>
                <h5 className="text-xs font-bold text-sky-950 uppercase tracking-wide">
                  Ảnh mẫu khách gửi
                </h5>
              </div>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                {customerImages.length} ảnh
              </span>
            </div>

            {customerImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 mt-2.5">
                {customerImages.map((img, imgIdx) => (
                  <a
                    key={img.imageId || imgIdx}
                    href={img.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block overflow-hidden rounded-lg border border-sky-200 bg-white aspect-square shadow-2xs hover:border-sky-400 transition"
                  >
                    <img
                      src={img.imageUrl}
                      alt={`Ảnh mẫu khách gửi ${imgIdx + 1}`}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <span className="absolute top-1 left-1 rounded bg-sky-700/90 backdrop-blur-xs px-1.5 py-0.5 text-[10px] font-medium text-white shadow-xs">
                      {isUsingGeneral ? 'Khách gửi (Ảnh chung)' : 'Khách gửi'}
                    </span>
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition text-xs font-medium gap-1">
                      <ExternalLink className="h-3.5 w-3.5" /> Xem lớn
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-sky-200 bg-sky-50/60 p-4 text-center text-xs text-sky-600 mt-2.5">
                Khách không đính kèm ảnh mẫu tham khảo.
              </div>
            )}
          </div>
          <p className="text-[11px] text-sky-600/90 italic mt-2">
            💡 Dùng làm tư liệu tham khảo yêu cầu thực tế của khách hàng.
          </p>
        </div>

        {/* Khối 2: Bản vẽ kỹ thuật thiết kế của Chủ xưởng */}
        <div className="rounded-xl border border-amber-300 bg-amber-50/40 p-3.5 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-amber-900">
                  <FileUp className="h-3 w-3" />
                </span>
                <h5 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Bản vẽ thiết kế của Chủ xưởng
                </h5>
              </div>
              <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                {ownerImages.length} bản vẽ
              </span>
            </div>

            {ownerImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 mt-2.5">
                {ownerImages.map((img, imgIdx) => (
                  <a
                    key={img.imageId || imgIdx}
                    href={img.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative block overflow-hidden rounded-lg border border-amber-300 bg-white aspect-square shadow-2xs hover:border-amber-500 transition"
                  >
                    <img
                      src={img.imageUrl}
                      alt={`Bản vẽ thiết kế xưởng ${imgIdx + 1}`}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <span className="absolute top-1 left-1 rounded bg-amber-800/90 backdrop-blur-xs px-1.5 py-0.5 text-[10px] font-medium text-white shadow-xs">
                      Bản vẽ xưởng
                    </span>
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition text-xs font-medium gap-1">
                      <ExternalLink className="h-3.5 w-3.5" /> Xem lớn
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-4 text-center text-xs text-amber-700 mt-2.5">
                Chưa có bản vẽ xưởng nào cho món này. Hãy tải ảnh bản vẽ ở biểu mẫu phía dưới.
              </div>
            )}
          </div>
          <p className="text-[11px] text-amber-700/90 italic mt-2">
            📐 Bản vẽ kỹ thuật xưởng sẽ được gửi sang Sales để trao đổi & chốt hợp đồng.
          </p>
        </div>
      </div>

      {/* Form tải lên bản thiết kế & cập nhật mô tả kỹ thuật cho món */}
      <form onSubmit={handleSendItemDesign} className="rounded-lg bg-stone-50/80 p-3.5 border border-stone-200 space-y-3">
        <p className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
          <FileUp className="h-4 w-4 text-amber-700" />
          Tải ảnh bản vẽ thiết kế mới và cập nhật mô tả kỹ thuật cho món này:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Chọn ảnh bản vẽ kỹ thuật / phối cảnh (JPG, PNG, WebP tối đa 20MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf"
              onChange={handleFileChange}
              className="w-full text-xs text-stone-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer"
            />
            {filePreview && (
              <div className="mt-2">
                <p className="text-[11px] text-stone-400 mb-1">Ảnh xem trước:</p>
                <img
                  src={filePreview}
                  alt="Preview"
                  className="max-h-24 rounded border border-stone-200 object-contain"
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
              Mô tả kỹ thuật cho món này
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bản vẽ chi tiết kích thước, chất liệu khung, mặt đá, kết cấu mộng gỗ..."
              className="w-full rounded-lg border border-stone-300 p-2 text-xs text-stone-900 outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-900 active:scale-95 disabled:opacity-50 transition"
          >
            {submitting ? (
              <RotateCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {submitting ? 'Đang gửi...' : 'Gửi bản thiết kế sang Sales'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Detail Modal (Quản lý bản thiết kế từng sản phẩm) ─────────
function RequestDetailModal({ requestId, onClose, onUpdated }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getRequestById(requestId);
        if (!cancelled) {
          setDetail(res.data);
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

  // Tính tổng số ảnh thiết kế do Chủ xưởng gửi (ở các món sản phẩm)
  const totalDesignImages = useMemo(() => {
    if (!detail) return 0;
    return (detail.items || []).reduce(
      (sum, it) => sum + (it.images?.length || 0),
      0
    );
  }, [detail]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
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

        <div className="p-6 space-y-6">
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
                    Đặt theo yêu cầu 
                  </span>
                  <StatusBadge status={detail.status} />
                </div>
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

              {/* Thông tin chung yêu cầu đặt làm */}
              <div className="rounded-xl border border-stone-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-700" /> Thông tin chung yêu cầu đặt làm
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
                {detail.description && (
                  <div>
                    <p className="text-xs text-stone-400 mb-1">Ghi chú / Yêu cầu của khách hàng</p>
                    <p className="text-sm text-stone-800 bg-stone-50 rounded-lg p-3 border border-stone-200 whitespace-pre-line">
                      {detail.description}
                    </p>
                  </div>
                )}
              </div>

              {/* KHỐI TRỌNG TÂM: BẢN THIẾT KẾ CHO TỪNG SẢN PHẨM */}
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50/40 p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <FileUp className="h-5 w-5 text-amber-700" />
                      Hồ sơ thiết kế gửi cho bộ phận Sales
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Gửi ảnh bản vẽ thiết kế và mô tả kỹ thuật riêng cho từng sản phẩm
                    </p>
                  </div>
                  <DesignStatusBadge count={totalDesignImages} />
                </div>

                {/* Danh sách từng món để gửi bản thiết kế */}
                <div className="space-y-4">
                  {detail.items && detail.items.length > 0 ? (
                    detail.items.map((item, idx) => (
                      <ItemDesignCard
                        key={item.requestItemId || idx}
                        item={item}
                        index={idx}
                        requestId={requestId}
                        generalImages={detail.images}
                        onUpdated={(newData) => {
                          if (newData) setDetail(newData);
                          if (onUpdated) onUpdated();
                        }}
                      />
                    ))
                  ) : (
                    <div className="rounded-lg bg-white p-4 text-center text-xs text-stone-500 border border-stone-200">
                      Yêu cầu này chưa có danh sách sản phẩm chi tiết.
                    </div>
                  )}
                </div>
              </div>

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
                Chủ xưởng gửi ảnh bản thiết kế và mô tả kỹ thuật cho từng sản phẩm sang cho Sales. Việc chốt hợp đồng và báo giá do nhân viên Sales thực hiện.
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
    // Kiểm tra xem đơn đã có ảnh thiết kế (cấp request hoặc cấp từng món)
    const withImages = requests.filter(
      (r) =>
        (r.images && r.images.length > 0) ||
        (r.items && r.items.some((it) => it.images && it.images.length > 0))
    ).length;
    return { total, pending, processing, withImages };
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
            Xem và theo dõi các yêu cầu đặt làm theo mẫu của khách hàng, tải lên ảnh bản thiết kế và gửi sang cho bộ phận Sales.
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

        {/* Đã có ảnh thiết kế */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">Đã có ảnh thiết kế</span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900">{stats.withImages}</span>
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
                        <DesignStatusBadge
                          count={
                            (req.images?.length || 0) +
                            (req.items?.reduce((sum, it) => sum + (it.images?.length || 0), 0) || 0)
                          }
                        />
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
