// =========================================================
// CreateOrderRequestPage.jsx
// Màn hình TẠO YÊU CẦU ĐẶT ĐÓNG NỘI THẤT THEO YÊU CẦU (Role Sale)
// Tiếp nhận kích thước thực tế, ảnh phác thảo, loại gỗ, màu sơn và gửi Chủ xưởng thẩm định
// =========================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  RotateCw,
  Layers,
  Upload,
  X,
  Send,
  Maximize2,
  Ruler,
  DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getProductMetadata,
  createSalesOrderRequest,
  uploadRequestImages,
  createRequestMaterial,
  createRequestColor,
} from '../../services/saleOrderService';
import { CreatableCombobox } from '../../components/common/CreatableCombobox';
import { formatVND, formatDateVN } from '../../utils/formatters';

// Tính ngày hoàn thiện tối thiểu (cách hôm nay ít nhất 10 ngày)
const getMinExpectedDate = (days = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

const formatDateInputStr = (dateObj) => {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Khởi tạo 1 sản phẩm rỗng
const createEmptyItem = () => ({
  id: Date.now() + Math.random(),
  itemName: '',
  categoryId: '',
  roomId: '',
  materialId: '',
  colorId: '',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  quantity: 1,
  unitPrice: '',
  technicalNotes: '',
  images: [], // Danh sách ảnh riêng của món này: [{ id, imageUrl }]
  uploading: false,
});

const createEmptyCustomerInfo = () => ({
  customerAccountId: null,
  title: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  deliveryAddress: '',
  expectedDate: '',
  orderType: 'CUSTOM',
});

export const CreateOrderRequestPage = () => {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const minExpectedDate = useMemo(() => getMinExpectedDate(10), []);
  const minExpectedDateStr = useMemo(() => formatDateInputStr(minExpectedDate), [minExpectedDate]);

  // ── 1. Metadata từ API hệ thống (Danh mục, phòng, vật liệu, màu sắc) ──
  const [metadata, setMetadata] = useState({
    categories: [],
    rooms: [],
    materials: [],
    colors: [],
  });
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // ── 2. Thông tin khách hàng & Tên đơn hàng ──
  const [customerInfo, setCustomerInfo] = useState(createEmptyCustomerInfo);

  // ── 3. Danh sách sản phẩm kỹ thuật - Mỗi món có mảng ảnh riêng ──
  const [items, setItems] = useState(() => [createEmptyItem()]);

  // Modal xem ảnh phóng to (Lightbox)
  const [previewImageModal, setPreviewImageModal] = useState(null);

  // Modal tóm tắt thông tin trước khi gửi
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Tải metadata chuẩn từ API ──
  const fetchMetadata = useCallback(async () => {
    try {
      setLoadingMetadata(true);
      const res = await getProductMetadata();
      if (res.data) {
        const rawCats = res.data.categories || [];
        const rawRooms = res.data.rooms || [];
        const rawMats = res.data.materials || [];
        const rawColors = res.data.colors || [];

        setMetadata({
          categories: rawCats.map((c, idx) => ({
            categoryId: c.categoryId ?? c.category_id ?? `cat-${idx}`,
            categoryName: c.categoryName ?? c.category_name ?? '',
            categoryCode: c.categoryCode ?? c.category_code ?? '',
          })),
          rooms: rawRooms.map((r, idx) => ({
            roomId: r.roomId ?? r.room_id ?? `room-${idx}`,
            roomName: r.roomName ?? r.room_name ?? '',
            roomCode: r.roomCode ?? r.room_code ?? '',
          })),
          materials: rawMats.map((m, idx) => ({
            materialId: m.materialId ?? m.material_id ?? `mat-${idx}`,
            materialName: m.materialName ?? m.material_name ?? '',
            materialCode: m.materialCode ?? m.material_code ?? '',
          })),
          colors: rawColors.map((col, idx) => ({
            colorId: col.colorId ?? col.color_id ?? `col-${idx}`,
            colorName: col.colorName ?? col.color_name ?? '',
            colorCode: col.colorCode ?? col.color_code ?? '',
            hexValue: col.hexValue ?? col.hex_value ?? '',
          })),
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải metadata:', err);
      toast.error('Không thể tải danh mục sản phẩm từ hệ thống.');
    } finally {
      setLoadingMetadata(false);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // ── Làm mới biểu mẫu ──
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMetadata();
      setCustomerInfo(createEmptyCustomerInfo());
      setItems([createEmptyItem()]);
      toast.success('Đã làm mới biểu mẫu.');
    } finally {
      setRefreshing(false);
    }
  };

  // ── Thêm mới Chất liệu (Loại gỗ) từ Combobox ──
  const handleCreateMaterial = async (name, extra = {}) => {
    try {
      const res = await createRequestMaterial({ material_name: name, ...extra });
      const raw = res.data || res;
      const normalizedMat = {
        materialId: raw.materialId ?? raw.material_id,
        materialName: raw.materialName ?? raw.material_name,
        materialCode: raw.materialCode ?? raw.material_code ?? '',
      };
      toast.success(`Đã thêm chất liệu mới: "${normalizedMat.materialName}"`);
      setMetadata((prev) => ({
        ...prev,
        materials: [
          ...(prev.materials || []).filter((m) => String(m.materialId) !== String(normalizedMat.materialId)),
          normalizedMat,
        ],
      }));
      return normalizedMat;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Lỗi khi thêm chất liệu mới';
      toast.error(errorMsg);
      throw err;
    }
  };

  // ── Thêm mới Màu sắc (Màu sơn) từ Combobox ──
  const handleCreateColor = async (name, extra = {}) => {
    try {
      const res = await createRequestColor({ color_name: name, ...extra });
      const raw = res.data || res;
      const normalizedCol = {
        colorId: raw.colorId ?? raw.color_id,
        colorName: raw.colorName ?? raw.color_name,
        colorCode: raw.colorCode ?? raw.color_code ?? '',
        hexValue: raw.hexValue ?? raw.hex_value ?? '#8B5A2B',
      };
      toast.success(`Đã thêm màu sắc mới: "${normalizedCol.colorName}"`);
      setMetadata((prev) => ({
        ...prev,
        colors: [
          ...(prev.colors || []).filter((c) => String(c.colorId) !== String(normalizedCol.colorId)),
          normalizedCol,
        ],
      }));
      return normalizedCol;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Lỗi khi thêm màu sắc mới';
      toast.error(errorMsg);
      throw err;
    }
  };

  // ── Thêm / xóa sản phẩm ──
  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (itemId) => {
    if (items.length <= 1) {
      toast.error('Đơn yêu cầu phải có ít nhất một sản phẩm.');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleItemChange = (itemId, field, value) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, [field]: value } : it))
    );
  };

  // ── Upload ảnh riêng cho từng sản phẩm ──
  const handleItemFileUpload = async (itemId, fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      toast.error('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP).');
      return;
    }

    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, uploading: true } : it))
    );

    try {
      const res = await uploadRequestImages(files);
      const uploadedUrls = res.urls || res.images || [];

      if (!uploadedUrls || uploadedUrls.length === 0) {
        throw new Error('Máy chủ không trả về URL hình ảnh.');
      }

      const newImgs = uploadedUrls.map((url, idx) => ({
        id: Date.now() + Math.random() + idx,
        imageUrl: url,
      }));

      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? { ...it, images: [...it.images, ...newImgs], uploading: false }
            : it
        )
      );

      toast.success(`Đã thêm ${uploadedUrls.length} ảnh cho sản phẩm.`);
    } catch (err) {
      console.error('Lỗi khi tải ảnh lên:', err);
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi tải ảnh lên.');
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, uploading: false } : it))
      );
    }
  };

  const handleRemoveItemImage = (itemId, imageId) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? { ...it, images: it.images.filter((img) => img.id !== imageId) }
          : it
      )
    );
  };

  // ── Tính tổng kinh phí ước tính ──
  const totalEstimatedAmount = useMemo(() => {
    return items.reduce((sum, it) => {
      const price = Number(it.unitPrice) || 0;
      const qty = Number(it.quantity) || 1;
      return sum + price * qty;
    }, 0);
  }, [items]);

  // ── Validate form trước khi mở modal tóm tắt ──
  const handleValidateAndOpenSummary = (e) => {
    e.preventDefault();

    if (!customerInfo.contactName.trim()) {
      toast.error('Vui lòng nhập họ tên khách hàng.');
      return;
    }
    if (!customerInfo.contactPhone.trim()) {
      toast.error('Vui lòng nhập số điện thoại khách hàng.');
      return;
    }

    if (customerInfo.expectedDate) {
      const selDate = new Date(customerInfo.expectedDate);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const targetDate = new Date(selDate.getFullYear(), selDate.getMonth(), selDate.getDate());
      const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        toast.error('Ngày mong muốn hoàn thiện không thể ở trong quá khứ.');
        return;
      }
      if (diffDays < 10) {
        toast.error(
          `Ngày mong muốn hoàn thiện phải cách thời điểm tạo đơn ít nhất 10 ngày (sớm nhất từ ngày ${formatDateVN(minExpectedDate)}).`
        );
        return;
      }
    }

    if (items.length === 0) {
      toast.error('Vui lòng nhập ít nhất một sản phẩm vào yêu cầu.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.itemName.trim()) {
        toast.error(`Sản phẩm thứ ${i + 1} chưa có tên sản phẩm.`);
        return;
      }
      if (!it.quantity || Number(it.quantity) <= 0) {
        toast.error(`Số lượng sản phẩm "${it.itemName}" phải lớn hơn 0.`);
        return;
      }
    }

    setSummaryModalOpen(true);
  };

  // ── Gửi đơn yêu cầu lên Owner thẩm định ──
  const handleConfirmSubmit = async () => {
    try {
      setSubmitting(true);

      const generatedTitle =
        customerInfo.title.trim() ||
        `${customerInfo.contactName.trim()} - Đơn đặt đóng nội thất theo yêu cầu`;

      const payload = {
        customerAccountId: customerInfo.customerAccountId,
        contactName: customerInfo.contactName.trim(),
        contactPhone: customerInfo.contactPhone.trim(),
        contactEmail: customerInfo.contactEmail.trim() || null,
        deliveryAddress: customerInfo.deliveryAddress.trim() || null,
        title: generatedTitle,
        expectedDate: customerInfo.expectedDate || null,
        orderType: customerInfo.orderType || 'CUSTOM',
        items: items.map((it) => ({
          requestItemId: null,
          itemName: it.itemName.trim(),
          categoryId: it.categoryId ? Number(it.categoryId) : null,
          roomId: it.roomId ? Number(it.roomId) : null,
          materialId: it.materialId ? Number(it.materialId) : null,
          colorId: it.colorId ? Number(it.colorId) : null,
          lengthCm: it.lengthCm ? Number(it.lengthCm) : null,
          widthCm: it.widthCm ? Number(it.widthCm) : null,
          heightCm: it.heightCm ? Number(it.heightCm) : null,
          quantity: Number(it.quantity) || 1,
          unitPrice: it.unitPrice ? Number(it.unitPrice) : 0,
          technicalNotes: it.technicalNotes?.trim() || null,
          images: (it.images || []).map((img, imgIdx) => ({
            imageUrl: typeof img === 'string' ? img : img.imageUrl,
            requestItemId: null,
            sortOrder: imgIdx,
          })),
        })),
        images: items.flatMap((it, itemIdx) =>
          (it.images || []).map((img, imgIdx) => ({
            imageUrl: typeof img === 'string' ? img : img.imageUrl,
            requestItemId: null,
            itemIndex: itemIdx,
            sortOrder: imgIdx,
          }))
        ),
      };

      await createSalesOrderRequest(payload);
      toast.success('Đã gửi yêu cầu đặt đóng cho Chủ xưởng thẩm định');

      setSummaryModalOpen(false);
      navigate('/sale/requests');
    } catch (err) {
      console.error('Lỗi khi gửi yêu cầu:', err);
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi gửi yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-stone-900">
      {/* ── 1. TIÊU ĐỀ TRANG ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Tạo yêu cầu đặt đóng nội thất
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Tiếp nhận kích thước đo đạc thực tế, đính kèm ảnh phác thảo và gửi Chủ xưởng duyệt bản vẽ kỹ thuật.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            title="Tải lại danh mục vật liệu và làm mới biểu mẫu"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/sale/requests')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <FileText className="h-3.5 w-3.5 text-stone-500" />
            <span>Danh sách yêu cầu</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleValidateAndOpenSummary} className="space-y-6">
        {/* ── 2. HỒ SƠ KHÁCH HÀNG & DỰ ÁN ─────────────────────────── */}
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-xs font-bold text-stone-900">
              1. Thông tin khách hàng &amp; địa điểm lắp đặt
            </h2>
            <p className="text-[11px] text-stone-500">Thông tin đại diện đặt làm nội thất và thời gian hẹn hoàn thiện</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Tên đơn hàng */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Tên đơn hàng / Tên dự án nội thất
              </label>
              <input
                type="text"
                value={customerInfo.title}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, title: e.target.value }))}
                placeholder="VD: Nội thất phòng khách & phòng ngủ theo thiết kế riêng căn hộ A12 Sunrise City"
                className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              />
            </div>

            {/* Họ tên khách hàng */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Họ và tên khách hàng <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={customerInfo.contactName}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, contactName: e.target.value }))}
                placeholder="VD: Nguyễn Văn A"
                className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              />
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Số điện thoại liên hệ <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                required
                value={customerInfo.contactPhone}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, contactPhone: e.target.value }))}
                placeholder="0912345678"
                className="w-full rounded-lg border border-stone-300 py-2 px-3 font-mono text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Địa chỉ Email
              </label>
              <input
                type="email"
                value={customerInfo.contactEmail}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, contactEmail: e.target.value }))}
                placeholder="khachhang@gmail.com"
                className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              />
            </div>

            {/* Địa chỉ giao hàng */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Địa chỉ giao hàng &amp; lắp đặt
              </label>
              <input
                type="text"
                value={customerInfo.deliveryAddress}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, deliveryAddress: e.target.value }))}
                placeholder="VD: Căn hộ A12-04 Chung cư Sunrise, 123 Nguyễn Hữu Thọ, Q.7, TP.HCM"
                className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              />
            </div>

            {/* Ngày hẹn hoàn thiện */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-stone-700">
                  Ngày hẹn hoàn thiện
                </label>
                <span className="text-[10px] text-stone-500">&ge; 10 ngày</span>
              </div>
              <input
                type="date"
                min={minExpectedDateStr}
                value={customerInfo.expectedDate}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, expectedDate: e.target.value }))}
                className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              />
            </div>
          </div>
        </section>

        {/* ── 3. DANH MỤC SẢN PHẨM ĐẶT ĐÓNG THEO YÊU CẦU ────────────── */}
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-stone-900">
                  2. Danh mục sản phẩm đặt đóng theo yêu cầu
                </h2>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                  {items.length} món
                </span>
              </div>
              <p className="text-[11px] text-stone-500">Khai báo kích thước đo đạc, chất liệu gỗ và bản vẽ phác thảo từng món</p>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm sản phẩm</span>
            </button>
          </div>

          <div className="space-y-5">
            {items.map((it, index) => (
              <div
                key={it.id}
                className="rounded-lg border border-stone-200 bg-stone-50/50 p-4 space-y-4"
              >
                {/* Header sản phẩm */}
                <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                  <span className="text-xs font-bold text-stone-900">
                    Sản phẩm #{index + 1}: {it.itemName || 'Chưa đặt tên'}
                  </span>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa món</span>
                    </button>
                  )}
                </div>

                {/* Các trường thông số kỹ thuật */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  {/* Tên sản phẩm */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Tên sản phẩm <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={it.itemName}
                      onChange={(e) => handleItemChange(it.id, 'itemName', e.target.value)}
                      placeholder="VD: Tủ quần áo 4 cánh lùa kịch trần"
                      className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 placeholder:text-stone-400 bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    />
                  </div>

                  {/* Danh mục */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Danh mục
                    </label>
                    <select
                      value={it.categoryId}
                      onChange={(e) => handleItemChange(it.id, 'categoryId', e.target.value)}
                      className="w-full rounded-lg border border-stone-300 py-2 px-2.5 text-xs text-stone-900 bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {metadata.categories.map((c, idx) => (
                        <option key={c.categoryId || idx} value={c.categoryId}>
                          {c.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phòng */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Không gian phòng
                    </label>
                    <select
                      value={it.roomId}
                      onChange={(e) => handleItemChange(it.id, 'roomId', e.target.value)}
                      className="w-full rounded-lg border border-stone-300 py-2 px-2.5 text-xs text-stone-900 bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    >
                      <option value="">-- Chọn không gian --</option>
                      {metadata.rooms.map((r, idx) => (
                        <option key={r.roomId || idx} value={r.roomId}>
                          {r.roomName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chất liệu gỗ */}
                  <div className="md:col-span-2">
                    <CreatableCombobox
                      id={`item-material-${it.id}`}
                      label="Chất liệu / Loại gỗ xưởng"
                      value={it.materialId}
                      options={metadata.materials}
                      valueKey="materialId"
                      labelKey="materialName"
                      placeholder="Chọn hoặc gõ để thêm loại gỗ mới..."
                      onChange={(val) => handleItemChange(it.id, 'materialId', val)}
                      onCreate={handleCreateMaterial}
                    />
                  </div>

                  {/* Màu sắc */}
                  <div>
                    <CreatableCombobox
                      id={`item-color-${it.id}`}
                      label="Màu sắc / Vân sơn"
                      isColor
                      value={it.colorId}
                      options={metadata.colors}
                      valueKey="colorId"
                      labelKey="colorName"
                      colorKey="hexValue"
                      placeholder="Chọn hoặc gõ thêm màu..."
                      onChange={(val) => handleItemChange(it.id, 'colorId', val)}
                      onCreate={handleCreateColor}
                    />
                  </div>

                  {/* Số lượng */}
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Số lượng đặt <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={it.quantity}
                      onChange={(e) => handleItemChange(it.id, 'quantity', e.target.value)}
                      className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs font-semibold text-stone-900 bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    />
                  </div>

                  {/* Kích thước kỹ thuật đo đạc (cm) */}
                  <div className="md:col-span-4 rounded-lg border border-stone-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                      <span className="text-xs font-semibold text-stone-800">
                        Kích thước đo đạc thực tế (cm)
                      </span>
                      <span className="font-mono text-xs text-stone-600">
                        {[it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).length > 0
                          ? `${it.lengthCm || 0} x ${it.widthCm || 0} x ${it.heightCm || 0} cm`
                          : 'Dài x Rộng x Cao'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-stone-600 block mb-1">Chiều dài (cm)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.lengthCm}
                          onChange={(e) => handleItemChange(it.id, 'lengthCm', e.target.value)}
                          placeholder="220"
                          className="w-full rounded-md border border-stone-300 p-2 text-xs font-mono font-medium text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-stone-600 block mb-1">Chiều rộng / sâu (cm)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.widthCm}
                          onChange={(e) => handleItemChange(it.id, 'widthCm', e.target.value)}
                          placeholder="60"
                          className="w-full rounded-md border border-stone-300 p-2 text-xs font-mono font-medium text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-stone-600 block mb-1">Chiều cao (cm)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.heightCm}
                          onChange={(e) => handleItemChange(it.id, 'heightCm', e.target.value)}
                          placeholder="260"
                          className="w-full rounded-md border border-stone-300 p-2 text-xs font-mono font-medium text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Đơn giá tạm tính */}
                  <div className="md:col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-stone-700">
                        Đơn giá tạm tính (VND) - Chủ xưởng sẽ báo giá chính thức khi duyệt bản vẽ
                      </label>
                      {it.unitPrice > 0 && (
                        <span className="text-xs font-semibold font-mono text-stone-900">
                          Thành tiền: {formatVND((Number(it.unitPrice) || 0) * (Number(it.quantity) || 1))}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(it.id, 'unitPrice', e.target.value)}
                      placeholder="VD: 15000000"
                      className="w-full rounded-lg border border-stone-300 py-2 px-3 font-mono text-xs text-stone-900 bg-white placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    />
                  </div>

                  {/* Mô tả chi tiết & yêu cầu kỹ thuật */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Mô tả chi tiết &amp; yêu cầu phụ kiện xưởng
                    </label>
                    <textarea
                      rows={2}
                      value={it.technicalNotes}
                      onChange={(e) => handleItemChange(it.id, 'technicalNotes', e.target.value)}
                      placeholder="VD: Cánh kính viền nhôm đen, bản lề giảm chấn Hafele, đèn LED cảm ứng âm tủ..."
                      className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 bg-white placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    />
                  </div>

                  {/* Ảnh phác thảo & bản vẽ của món này */}
                  <div className="md:col-span-4 rounded-lg border border-stone-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                      <span className="text-xs font-semibold text-stone-800">
                        Ảnh thiết kế &amp; bản vẽ phác thảo ({it.images.length})
                      </span>
                      <span className="text-[11px] text-stone-500">Món #{index + 1}</span>
                    </div>

                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 p-4 text-center hover:border-stone-400 hover:bg-stone-50 transition">
                      {it.uploading ? (
                        <div className="flex items-center gap-2 text-xs text-stone-600">
                          <RotateCw className="h-4 w-4 animate-spin text-stone-500" />
                          <span>Đang tải ảnh lên...</span>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-medium text-stone-800">
                            Nhấn để chọn ảnh hoặc kéo thả vào đây
                          </p>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            Định dạng JPG, PNG, WEBP tối đa 10MB
                          </p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={it.uploading}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleItemFileUpload(it.id, e.target.files);
                            e.target.value = '';
                          }
                        }}
                        className="hidden"
                      />
                    </label>

                    {it.images.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                        {it.images.map((img, imgIdx) => (
                          <div
                            key={img.id}
                            className="group relative aspect-square rounded-md border border-stone-200 bg-stone-100 overflow-hidden"
                          >
                            <img
                              src={img.imageUrl}
                              alt={`Bản vẽ ${imgIdx + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPreviewImageModal(img.imageUrl)}
                                className="p-1 rounded bg-white text-stone-800 hover:text-stone-900"
                                title="Xem lớn"
                              >
                                <Maximize2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItemImage(it.id, img.id)}
                                className="p-1 rounded bg-rose-600 text-white hover:bg-rose-700"
                                title="Xóa"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm sản phẩm đặt đóng tiếp theo</span>
          </button>
        </section>

        {/* ── 4. TỔNG KẾT & GỬI ───────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div>
            <span className="text-xs text-stone-500 block">Tổng kinh phí dự kiến ({items.length} món):</span>
            <span className="font-mono text-xl font-bold text-stone-900">
              {formatVND(totalEstimatedAmount)}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/sale/requests')}
              className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-950 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              <Send className="h-4 w-4" />
              <span>Kiểm tra &amp; Gửi yêu cầu thiết kế</span>
            </button>
          </div>
        </div>
      </form>

      {/* ── MODAL PHÓNG TO ẢNH ─────────────────────────────────── */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-xl bg-stone-900 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 px-3 py-2 text-white">
              <span className="text-xs font-medium">Bản vẽ phác thảo</span>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="rounded p-1 text-stone-400 hover:bg-stone-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[80vh] items-center justify-center p-2">
              <img
                src={previewImageModal}
                alt="Chi tiết bản vẽ"
                className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TÓM TẮT HỒ SƠ ─────────────────────────────────── */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl border border-stone-200 my-8">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Kiểm tra hồ sơ yêu cầu đặt đóng nội thất
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Đối chiếu thông số đo đạc và bản vẽ trước khi chuyển tiếp Chủ xưởng thẩm định
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSummaryModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 text-xs text-stone-700 space-y-4">
              {/* Khách hàng */}
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3.5 space-y-2">
                <span className="font-semibold text-stone-800 block border-b border-stone-200 pb-1">
                  Thông tin khách hàng &amp; tiến độ
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <p><span className="text-stone-500">Tên đơn hàng: </span><strong className="text-stone-900">{customerInfo.title || 'Đặt đóng nội thất theo yêu cầu'}</strong></p>
                  <p><span className="text-stone-500">Khách hàng: </span><strong className="text-stone-900">{customerInfo.contactName}</strong></p>
                  <p><span className="text-stone-500">Số điện thoại: </span><strong className="font-mono text-stone-900">{customerInfo.contactPhone}</strong></p>
                  <p><span className="text-stone-500">Email: </span><span>{customerInfo.contactEmail || '---'}</span></p>
                  <p className="sm:col-span-2"><span className="text-stone-500">Địa chỉ: </span><span>{customerInfo.deliveryAddress || '---'}</span></p>
                  <p><span className="text-stone-500">Hẹn ngày hoàn thiện: </span><strong className="font-mono text-stone-900">{customerInfo.expectedDate ? formatDateVN(new Date(customerInfo.expectedDate)) : 'Theo tiến độ xưởng'}</strong></p>
                </div>
              </div>

              {/* Bảng sản phẩm */}
              <div>
                <span className="font-semibold text-stone-800 block mb-2">
                  Danh mục sản phẩm đặt đóng ({items.length} món)
                </span>
                <div className="rounded-lg border border-stone-200 overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-700 border-b border-stone-200 font-semibold">
                      <tr>
                        <th className="p-2.5 text-center w-8">#</th>
                        <th className="p-2.5">Tên món &amp; Bản vẽ</th>
                        <th className="p-2.5">Kích thước (cm)</th>
                        <th className="p-2.5 text-center">SL</th>
                        <th className="p-2.5 text-right">Đơn giá</th>
                        <th className="p-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {items.map((it, idx) => {
                        const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' x ');
                        const unitPrice = Number(it.unitPrice) || 0;
                        const qty = Number(it.quantity) || 1;
                        return (
                          <tr key={it.id} className="hover:bg-stone-50">
                            <td className="p-2.5 text-center text-stone-400 font-mono align-top">{idx + 1}</td>
                            <td className="p-2.5 align-top">
                              <p className="font-medium text-stone-900">{it.itemName}</p>
                              {it.technicalNotes && (
                                <p className="text-[11px] text-stone-500 italic mt-0.5 max-w-xs truncate">
                                  {it.technicalNotes}
                                </p>
                              )}
                              {it.images && it.images.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {it.images.map((img, iIdx) => (
                                    <img
                                      key={img.id || iIdx}
                                      src={img.imageUrl}
                                      alt="Bản vẽ"
                                      className="h-9 w-9 object-cover rounded border border-stone-200"
                                    />
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 font-mono align-top text-stone-700">
                              {dim ? `${dim} cm` : '---'}
                            </td>
                            <td className="p-2.5 text-center align-top">{qty}</td>
                            <td className="p-2.5 text-right align-top font-mono text-stone-600">{formatVND(unitPrice)}</td>
                            <td className="p-2.5 text-right font-semibold font-mono text-stone-900 align-top">
                              {formatVND(unitPrice * qty)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-stone-200 bg-stone-50 font-semibold">
                      <tr>
                        <td colSpan="5" className="p-2.5 text-right text-stone-600">Tổng kinh phí dự kiến:</td>
                        <td className="p-2.5 text-right font-bold text-stone-900 font-mono">
                          {formatVND(totalEstimatedAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-stone-200 bg-stone-50 px-6 py-3.5">
              <button
                type="button"
                onClick={() => setSummaryModalOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition"
              >
                Chỉnh sửa lại
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-950 disabled:opacity-50 transition"
              >
                {submitting ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Xác nhận gửi Chủ xưởng</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrderRequestPage;
