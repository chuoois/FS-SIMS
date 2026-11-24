// =========================================================
// ManageCustomerRequestsPage.jsx
// Quản lý Yêu Cầu Khách Hàng (Hàng Đặt Làm - Custom Requests) — dành cho Chủ xưởng (Owner)
// Chức năng:
// 1. Xem danh sách yêu cầu đặt đóng theo mẫu (CUSTOM) từ khách hàng
// 2. Tabs lọc theo trạng thái tuần tự chuẩn Design System FSSIMS
// 3. Tìm kiếm linh hoạt theo Mã yêu cầu, Tên khách hàng, Số điện thoại
// 4. Xem chi tiết yêu cầu, quy cách kỹ thuật & danh sách ảnh thiết kế
// 5. Chủ xưởng gửi ảnh bản vẽ thiết kế kỹ thuật và mô tả quy cách sang bộ phận Sales
// Chuẩn hóa 100% theo FSSIMS Design System (Xưởng sản xuất đồ gỗ nội thất)
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
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  getRequests,
  getRequestById,
  updateRequestDesign,
  deleteRequestDesignImage,
} from '../../services/saleOrderService';
import {
  DesignGallery,
  isOwnerDesignImage,
  isPdfDesignUrl,
} from '../../components/common/DesignGallery';
import { TablePagination } from '../../components/common/TablePagination';
import { OrderRequestStatusBadge } from '../../components/common/StatusBadge';
import {
  formatVND as formatCurrency,
  formatDateVN as formatDate,
  formatDateTimeVN as formatDateTime,
} from '../../utils/formatters';

// ─── Hằng số ──────────────────────────────────────────────
const STATUSES = [
  'ALL',
  'DESIGNING',
  'DESIGNED',
  'DRAFT',
  'CONVERTED',
  'REJECTED',
];

const OWNER_ALLOWED_STATUSES = [
  'DESIGNING',
  'DESIGNED',
  'DRAFT',
  'CONVERTED',
  'CONTRACT_CREATED',
  'REJECTED',
];

const SEARCH_BY_OPTIONS = [
  { value: 'ALL', label: 'Tất cả tiêu chí' },
  { value: 'REQUEST_CODE', label: 'Mã yêu cầu' },
  { value: 'CUSTOMER_NAME', label: 'Tên khách hàng' },
  { value: 'PHONE', label: 'Số điện thoại' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// ─── Huy hiệu trạng thái bản thiết kế (đếm số ảnh từ order_request_image) ─
function DesignStatusBadge({ count = 0 }) {
  if (count > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
        <span>Đã có {count} bản vẽ</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 border border-stone-200">
      <Clock className="h-3.5 w-3.5 text-stone-400" />
      <span>Chưa có bản vẽ</span>
    </span>
  );
}

// ─── Component Thẻ Bản Thiết Kế Cho Từng Sản Phẩm ────────────────
function ItemDesignCard({ item, index, requestId, generalImages = [], onUpdated }) {
  const [description, setDescription] = useState(item.description || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [justSent, setJustSent] = useState(false);
  const [lastSavedFallback, setLastSavedFallback] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = useRef(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    setDescription(item.description || '');
  }, [item.description]);

  const itemImages = (item.images || [])
    .map((img) => (typeof img === 'string' ? { imageUrl: img } : img))
    .filter((img) => img?.imageUrl);

  const directCustomerImages = itemImages.filter((img) => !isOwnerDesignImage(img));
  const ownerImages = itemImages.filter((img) => isOwnerDesignImage(img));
  const displaySavedImages =
    ownerImages.length > 0
      ? ownerImages
      : lastSavedFallback
        ? [lastSavedFallback]
        : [];
  const latestSavedImage = displaySavedImages[displaySavedImages.length - 1] || null;

  // Nếu sản phẩm không có ảnh mẫu riêng, lấy ảnh tham khảo chung của yêu cầu
  const customerImages =
    directCustomerImages.length > 0
      ? directCustomerImages
      : (generalImages || [])
        .map((img) => (typeof img === 'string' ? { imageUrl: img } : img))
        .filter((img) => img?.imageUrl && !isOwnerDesignImage(img));

  const handleClearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 20MB.');
      return;
    }

    setSubmitError('');
    setJustSent(false);
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
    if (submitLockRef.current || submitting) return;
    if (!selectedFile && !description.trim()) {
      toast.error('Vui lòng chọn ảnh bản vẽ kỹ thuật hoặc nhập mô tả quy cách gỗ.');
      return;
    }

    submitLockRef.current = true;
    setSubmitError('');
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

      const updatedItem = res?.data?.items?.find((it) =>
        item.requestItemId
          ? Number(it.requestItemId) === Number(item.requestItemId)
          : it.itemName === item.itemName
      );
      const updatedOwnerImgs = (updatedItem?.images || []).filter(isOwnerDesignImage);
      const newestSaved = updatedOwnerImgs[updatedOwnerImgs.length - 1] || null;

      if (selectedFile && updatedOwnerImgs.length === 0 && (newestSaved?.imageUrl || filePreview)) {
        setLastSavedFallback({
          imageId: newestSaved?.imageId || 'local-saved',
          imageUrl: newestSaved?.imageUrl || filePreview,
          isOwnerDesign: true,
        });
      } else {
        setLastSavedFallback(null);
      }

      setJustSent(true);
      handleClearSelectedFile();

      if (onUpdated) onUpdated(res.data);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Lỗi khi gửi bản thiết kế cho sản phẩm này.';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDeleteOwnerImage = async (img) => {
    const imgId = img?.imageId || img?.requestImageId;
    if (!imgId || deletingImageId) return;

    setDeletingImageId(imgId);
    setSubmitError('');
    try {
      const res = await deleteRequestDesignImage(requestId, imgId);
      toast.success('Đã xóa bản vẽ thiết kế khỏi hồ sơ.');
      setLastSavedFallback(null);
      if (ownerImages.length <= 1) {
        setJustSent(false);
      }
      if (onUpdated) onUpdated(res.data);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Lỗi khi xóa bản vẽ thiết kế.';
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setDeletingImageId(null);
    }
  };

  const isUsingGeneral = directCustomerImages.length === 0 && customerImages.length > 0;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-3.5 transition hover:border-amber-400">
      {/* Header sản phẩm */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-stone-100">
        <div className="flex items-start gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-stone-100 font-mono text-xs font-semibold text-stone-700">
            #{index + 1}
          </div>
          <div>
            <h4 className="font-semibold text-xs text-stone-900">{item.itemName}</h4>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-0.5">
              <span>
                Kích thước:{' '}
                <strong className="font-mono text-stone-700">
                  {item.lengthCm && item.widthCm && item.heightCm
                    ? `${item.lengthCm} × ${item.widthCm} × ${item.heightCm} cm`
                    : 'Theo thiết kế'}
                </strong>
              </span>
              <span>•</span>
              <span>
                Số lượng: <strong className="font-mono text-stone-700">{item.quantity}</strong>
              </span>
              <span>•</span>
              <span>
                Đơn giá dự kiến:{' '}
                <strong className="font-mono text-amber-900">
                  {item.unitPrice != null ? formatCurrency(item.unitPrice) : 'Chờ báo giá'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          {itemImages.length > 0 ? (
            <span key="item-has-images" className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              <span>Đã có {itemImages.length} ảnh thiết kế</span>
            </span>
          ) : (
            <span key="item-no-images" className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 border border-stone-200">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              <span>Chưa có ảnh</span>
            </span>
          )}
          {customerImages.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700 border border-stone-200">
              {customerImages.length} ảnh khách
            </span>
          )}
          {ownerImages.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-300">
              {ownerImages.length} bản vẽ xưởng
            </span>
          )}
        </div>
      </div>

      {/* Mô tả kỹ thuật hiện tại của món */}
      {item.description && (
        <div className="rounded-lg bg-stone-50 border border-stone-200 p-2.5 text-xs text-stone-700">
          <span className="font-semibold text-stone-800 block mb-0.5">Mô tả quy cách kỹ thuật hiện tại:</span>
          <p className="whitespace-pre-line">{item.description}</p>
        </div>
      )}

      {/* ── Khối đối chiếu: Ảnh của khách vs Bản vẽ của Chủ xưởng ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Khối 1: Ảnh mẫu tham khảo do khách hàng gửi */}
        <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-3 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
              <div className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-stone-600" />
                <h5 className="text-[11px] font-semibold text-stone-800 uppercase tracking-wide">
                  Ảnh mẫu khách gửi
                </h5>
              </div>
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                {customerImages.length} ảnh
              </span>
            </div>

            <DesignGallery
              images={customerImages}
              badgeText={isUsingGeneral ? 'Khách gửi (Ảnh chung)' : 'Khách gửi'}
              badgeClassName="bg-stone-800/90"
              borderClassName="border-stone-200 hover:border-stone-400"
              emptyText="Khách hàng không đính kèm ảnh mẫu tham khảo."
              emptyClassName="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-3 text-center text-[11px] text-stone-500 mt-2"
            />
          </div>
          <p className="text-[11px] text-stone-500 italic mt-1">
            Dùng làm tư liệu tham khảo yêu cầu thực tế của khách hàng.
          </p>
        </div>

        {/* Khối 2: Bản vẽ kỹ thuật thiết kế của Chủ xưởng */}
        <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-3 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-200">
              <div className="flex items-center gap-1.5">
                <FileUp className="h-3.5 w-3.5 text-amber-800" />
                <h5 className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">
                  Bản vẽ thiết kế của xưởng
                </h5>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                {ownerImages.length} bản vẽ
              </span>
            </div>

            <DesignGallery
              images={ownerImages}
              badgeText="Bản vẽ xưởng"
              badgeClassName="bg-amber-900/90"
              borderClassName="border-amber-200 hover:border-amber-400"
              emptyText="Chưa có bản vẽ xưởng cho món này. Hãy tải ảnh bản vẽ ở biểu mẫu phía dưới."
              emptyClassName="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-3 text-center text-[11px] text-amber-700 mt-2"
              onDelete={handleDeleteOwnerImage}
              deletingImageId={deletingImageId}
            />
          </div>
          <p className="text-[11px] text-amber-800 italic mt-1">
            Bản vẽ đã gửi được lưu giữ tại đây để Chủ xưởng & Sales cùng theo dõi.
          </p>
        </div>
      </div>

      {/* Form tải lên bản thiết kế & cập nhật mô tả kỹ thuật cho món */}
      <form onSubmit={handleSendItemDesign} className="rounded-lg bg-stone-50 p-3.5 border border-stone-200 space-y-3">
        <p className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
          <FileUp className="h-4 w-4 text-stone-600" />
          Tải ảnh bản vẽ kỹ thuật mới và cập nhật quy cách mộng/gỗ:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Chọn ảnh bản vẽ kỹ thuật / phối cảnh (JPG, PNG, PDF tối đa 20MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.pdf"
              onChange={handleFileChange}
              className="w-full text-xs text-stone-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-stone-300 file:text-xs file:font-medium file:bg-white file:text-stone-700 hover:file:bg-stone-50 cursor-pointer"
            />
            {filePreview && (
              <div className="mt-2 rounded-lg border border-stone-200 bg-white p-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-stone-800">Ảnh mới chuẩn bị gửi:</p>
                  <button
                    type="button"
                    onClick={handleClearSelectedFile}
                    className="text-[11px] font-medium text-stone-500 hover:text-stone-800 underline"
                  >
                    Bỏ chọn
                  </button>
                </div>
                <img
                  src={filePreview}
                  alt="Preview"
                  className="max-h-24 rounded border border-stone-200 bg-white object-contain"
                />
              </div>
            )}
            {selectedFile && !filePreview && (
              <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-stone-600">
                <span className="flex items-center gap-1 truncate">
                  <ExternalLink className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                  {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
                <button
                  type="button"
                  onClick={handleClearSelectedFile}
                  className="text-[11px] font-medium text-stone-500 hover:text-stone-800 underline shrink-0"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
            {displaySavedImages.length > 0 && (
              <div className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50/75 p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {justSent
                      ? 'Đã gửi sang Sales & lưu giữ bản vẽ:'
                      : `Bản vẽ đã gửi sang Sales (${displaySavedImages.length}):`}
                  </span>
                  {latestSavedImage?.imageUrl && (
                    <a
                      href={latestSavedImage.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-medium text-emerald-700 hover:underline inline-flex items-center gap-0.5 shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" /> Mở lớn
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {displaySavedImages.map((img, imgIdx) => {
                    const imgId = img.imageId || img.requestImageId || imgIdx;
                    const isPdf = isPdfDesignUrl(img.imageUrl);
                    const isLatest = imgIdx === displaySavedImages.length - 1;
                    return (
                      <div
                        key={imgId}
                        className={`rounded-lg border bg-white p-1 ${isLatest ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-stone-200'
                          }`}
                      >
                        <a href={img.imageUrl} target="_blank" rel="noreferrer" className="block">
                          {isPdf ? (
                            <div className="flex h-16 w-16 flex-col items-center justify-center rounded bg-stone-50 text-[10px] font-semibold text-stone-700">
                              <ExternalLink className="h-4 w-4 text-rose-600 mb-1" />
                              PDF #{imgIdx + 1}
                            </div>
                          ) : (
                            <img
                              src={img.imageUrl}
                              alt={`Bản vẽ ${imgIdx + 1}`}
                              className="h-16 w-16 rounded object-cover"
                            />
                          )}
                        </a>
                        {isLatest && (
                          <span className="mt-0.5 block text-center text-[10px] font-semibold text-emerald-700">
                            Mới nhất
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Mô tả quy cách kỹ thuật cho món này
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quy cách kích thước chi tiết, loại gỗ tự nhiên, độ ẩm tiêu chuẩn, kết cấu mộng âm dương, màu sơn PU..."
              className="w-full rounded-lg border border-stone-300 p-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
          </div>
        </div>

        {submitError && (
          <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-950 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            {submitting ? (
              <RotateCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>{submitting ? 'Đang gửi...' : 'Gửi bản thiết kế sang Sales'}</span>
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

  const totalDesignImages = useMemo(() => {
    if (!detail) return 0;
    return (detail.items || []).reduce(
      (sum, it) => sum + (it.images?.length || 0),
      0
    );
  }, [detail]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl border border-stone-200 my-8 flex flex-col">
        {/* Header modal */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-stone-900">
              Chi tiết yêu cầu đặt đóng
            </h2>
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

        <div className="p-6 space-y-5 text-xs text-stone-800">
          {loading ? (
            <div className="py-16 text-center text-stone-500">
              <RotateCw className="mx-auto h-6 w-6 animate-spin text-stone-400 mb-2" />
              <span>Đang tải thông tin chi tiết...</span>
            </div>
          ) : !detail ? (
            <div className="py-16 text-center text-rose-600 font-medium">
              Không tìm thấy yêu cầu này.
            </div>
          ) : (
            <>
              {/* Mã yêu cầu & Trạng thái */}
              <div className="flex items-center justify-between flex-wrap gap-2 p-3.5 rounded-lg border border-stone-200 bg-stone-50">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-700">Trạng thái:</span>
                  <OrderRequestStatusBadge status={detail.status} />
                </div>
                <div className="font-mono text-stone-500 text-xs">
                  Ngày gửi: <span className="font-semibold text-stone-800">{formatDateTime(detail.createdAt || detail.createdate)}</span>
                </div>
              </div>

              {/* Thông tin khách hàng & Yêu cầu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-stone-200 p-4 space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-stone-600" /> Thông tin khách hàng
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-stone-900 text-sm">{detail.customerName}</p>
                    <p className="text-stone-600 flex items-center gap-2 font-mono">
                      <Phone className="h-3.5 w-3.5 text-stone-400" />
                      <span>{detail.customerPhone}</span>
                    </p>
                    {detail.customerEmail && (
                      <p className="text-stone-600 truncate">{detail.customerEmail}</p>
                    )}
                    <p className="text-stone-600 flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
                      <span>{detail.deliveryAddress || 'Chưa cung cấp địa chỉ'}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-stone-200 p-4 space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-stone-600" /> Tiến độ & Phụ trách
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Tiêu đề đặt đóng:</span>
                      <span className="font-medium text-stone-900">{detail.title}</span>
                    </div>
                    {detail.expectedDate && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">Ngày mong muốn:</span>
                        <span className="font-medium text-stone-800">{formatDate(detail.expectedDate)}</span>
                      </div>
                    )}
                    {(detail.budgetMin || detail.budgetMax) && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">Ngân sách dự kiến:</span>
                        <span className="font-mono text-stone-800">
                          {detail.budgetMin && detail.budgetMax
                            ? `${formatCurrency(detail.budgetMin)} – ${formatCurrency(detail.budgetMax)}`
                            : detail.budgetMin
                              ? `Từ ${formatCurrency(detail.budgetMin)}`
                              : `Đến ${formatCurrency(detail.budgetMax)}`}
                        </span>
                      </div>
                    )}
                    {detail.assigneeName && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">Sales phụ trách:</span>
                        <span className="font-medium text-stone-800">{detail.assigneeName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {detail.description && (
                <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
                  <span className="font-semibold text-stone-800 block mb-0.5">Yêu cầu từ khách hàng:</span>
                  <p className="whitespace-pre-line">{detail.description}</p>
                </div>
              )}

              {/* KHỐI TRỌNG TÂM: BẢN THIẾT KẾ CHO TỪNG SẢN PHẨM */}
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-200 pb-2.5">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                      <FileUp className="h-4 w-4 text-stone-600" />
                      Hồ sơ bản vẽ kỹ thuật gửi bộ phận Sales
                    </h3>
                  </div>
                  <DesignStatusBadge count={totalDesignImages} />
                </div>

                {/* Danh sách từng món để gửi bản thiết kế */}
                <div className="space-y-3.5">
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

              {/* Hợp đồng liên kết nếu đã tạo */}
              {detail.contract && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Đã tạo hợp đồng bán hàng</p>
                    <p className="mt-0.5 font-mono">
                      Mã HĐ: <strong className="font-bold">{detail.contract.contractCode}</strong> • Trạng thái: {detail.contract.status}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer modal */}
        <div className="flex justify-end border-t border-stone-200 bg-stone-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
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
  const [searchBy, setSearchBy] = useState('ALL');
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
        order_type: 'CUSTOM',
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
      };

      if (search.trim()) {
        const keyword = search.trim();
        if (searchBy === 'REQUEST_CODE') {
          params.request_code = keyword;
        } else if (searchBy === 'CUSTOMER_NAME') {
          params.customer_name = keyword;
        } else if (searchBy === 'PHONE') {
          params.search = keyword;
          params.search_by = 'PHONE';
        } else {
          params.search = keyword;
          params.search_by = 'ALL';
        }
      }

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
  }, [page, pageSize, statusFilter, search, searchBy]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleResetFilters = () => {
    setSearch('');
    setSearchBy('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  // Lọc chỉ hiển thị các yêu cầu thuộc 4 trạng thái chủ xưởng quản lý
  const displayedRequests = useMemo(() => {
    return requests.filter((r) => OWNER_ALLOWED_STATUSES.includes(r.status));
  }, [requests]);

  // Thống kê nhanh theo các trạng thái dành riêng cho Chủ xưởng
  const stats = useMemo(() => {
    const designing = displayedRequests.filter((r) =>
      ['DESIGNING', 'DRAFTING'].includes(r.status)
    ).length;
    const designed = displayedRequests.filter((r) =>
      ['DESIGNED', 'CONFIRMED', 'APPROVED'].includes(r.status)
    ).length;
    const draft = displayedRequests.filter((r) =>
      ['DRAFT', 'CONTRACT_CREATED'].includes(r.status)
    ).length;
    const converted = displayedRequests.filter((r) => r.status === 'CONVERTED').length;
    const rejected = displayedRequests.filter((r) =>
      ['REJECTED', 'CANCELLED'].includes(r.status)
    ).length;
    const total = pagination.totalItems || displayedRequests.length;
    return { total, designing, designed, draft, converted, rejected };
  }, [pagination.totalItems, displayedRequests]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter !== 'ALL') count++;
    if (searchBy !== 'ALL') count++;
    return count;
  }, [search, statusFilter, searchBy]);

  const searchPlaceholder = useMemo(() => {
    switch (searchBy) {
      case 'REQUEST_CODE':
        return 'Nhập mã yêu cầu cần tìm (ví dụ: REQ-20261124-0001)...';
      case 'CUSTOMER_NAME':
        return 'Nhập tên khách hàng cần tìm...';
      case 'PHONE':
        return 'Nhập số điện thoại khách hàng...';
      default:
        return 'Tìm theo mã yêu cầu, tên khách hàng, số điện thoại...';
    }
  }, [searchBy]);

  return (
    <div className="space-y-6 text-stone-900">
      {/* ── 1. TIÊU ĐỀ TRANG ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Quản lý yêu cầu khách hàng
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Xem và theo dõi các yêu cầu đặt đóng đồ gỗ của khách hàng, tải lên bản vẽ thiết kế kỹ thuật và chuyển tiếp thông tin cho bộ phận kinh doanh.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchRequests(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${refreshing || loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 2. BỘ LỌC & TÌM KIẾM ─────────────────────────────── */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-4">
        {/* Tabs trạng thái kèm số lượng (Các trạng thái thuộc phạm vi quản lý của Chủ xưởng) */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 pb-3">
          {[
            { key: 'ALL', label: 'Tất cả yêu cầu', count: stats?.total ?? 0 },
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

        {/* Thanh tìm kiếm & bộ lọc */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Dropdown tiêu chí tìm kiếm */}
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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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

        {/* Thông tin tóm tắt kết quả */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs text-stone-500">
          <span>
            Hiển thị <strong className="font-semibold text-stone-800">{displayedRequests.length}</strong> trên tổng số{' '}
            <strong className="font-semibold text-stone-800">{pagination.totalItems}</strong> yêu cầu đặt đóng
            {search.trim() && (
              <span> với từ khóa &ldquo;<strong className="text-stone-900">{search.trim()}</strong>&rdquo;</span>
            )}
          </span>
          {pagination.totalPages > 1 && (
            <span>
              Trang {pagination.currentPage} / {pagination.totalPages}
            </span>
          )}
        </div>
      </section>

      {/* ── Thông báo lỗi (nếu có) ────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 3. BẢNG DANH SÁCH YÊU CẦU ────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3 pl-4 pr-3 sm:pl-6 w-12 text-stone-500">STT</th>
                <th className="px-3 py-3">Mã yêu cầu</th>
                <th className="px-3 py-3">Khách hàng</th>
                <th className="px-3 py-3">Tiêu đề đặt đóng</th>
                <th className="px-3 py-3">Ngày gửi</th>
                <th className="px-3 py-3 text-center">Bản thiết kế</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
                <th className="py-3 pl-3 pr-4 text-center sm:pr-6">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-stone-500">
                    <RotateCw className="mx-auto h-6 w-6 animate-spin text-stone-400 mb-2" />
                    <p className="text-xs">Đang tải danh sách yêu cầu...</p>
                  </td>
                </tr>
              ) : displayedRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-stone-500">
                    <ClipboardList className="mx-auto h-10 w-10 text-stone-300 mb-2" />
                    <p className="text-sm font-semibold text-stone-800">Không tìm thấy yêu cầu đặt đóng nào</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {search || statusFilter !== 'ALL'
                        ? 'Thử thay đổi từ khóa hoặc bộ lọc trạng thái.'
                        : 'Các yêu cầu gia công từ khách hàng sẽ xuất hiện tại đây.'}
                    </p>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Đặt lại bộ lọc</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                displayedRequests.map((req, idx) => {
                  const rowNum =
                    (pagination.currentPage - 1) * pagination.itemsPerPage + idx + 1;

                  return (
                    <tr
                      key={req.requestId}
                      className="hover:bg-stone-50 transition"
                    >
                      <td className="whitespace-nowrap py-3.5 pl-4 pr-3 sm:pl-6 text-stone-400 font-mono">
                        {rowNum}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 font-bold font-mono text-amber-900">
                        {req.requestCode}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-stone-900">
                            {req.customerName}
                          </span>
                          <span className="text-[11px] text-stone-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 text-stone-400" />
                            {req.customerPhone}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 max-w-[240px] truncate text-stone-800" title={req.title}>
                        {req.title}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-stone-600">
                        {formatDate(req.createdAt || req.createdate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-center">
                        <DesignStatusBadge
                          count={
                            (req.images?.length || 0) +
                            (req.items?.reduce((sum, it) => sum + (it.images?.length || 0), 0) || 0)
                          }
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-center">
                        <OrderRequestStatusBadge status={req.status} />
                      </td>
                      <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-center sm:pr-6">
                        <button
                          type="button"
                          onClick={() => setViewingId(req.requestId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                          title={`Xem chi tiết & gửi bản vẽ ${req.requestCode}`}
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

        {!loading && displayedRequests.length > 0 && (
          <div className="p-3 border-t border-stone-200 bg-stone-50/50">
            <TablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              currentCount={displayedRequests.length}
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
          </div>
        )}
      </div>

      {/* ── 4. MODAL CHI TIẾT ─────────────────────────────── */}
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
