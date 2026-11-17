// =========================================================
// CreateOrderRequestPage.jsx
// Màn hình TẠO ĐƠN THEO YÊU CẦU (Order Request)
// Chuẩn hóa UI/UX 100% theo trang mẫu ManageProductsPage.jsx của Owner
//
// Đặc điểm:
// 1. Giao diện đơn giản, gọn gàng, tone màu stone-900 / stone-200 đồng nhất với ManageProductsPage
// 2. Chỉ giữ duy nhất 1 tên đơn hàng (bỏ các ghi chú/mô tả trùng lặp, bỏ ô tìm kiếm khách hàng nhanh)
// 3. Mỗi sản phẩm có danh sách ảnh riêng biệt: thêm/xóa/xem độc lập, tự động ánh xạ khi lưu/sửa
// =========================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  AlertTriangle,
  RotateCw,
  Layers,
  Upload,
  X,
  Send,
  Maximize2,
  Ruler,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getProductMetadata,
  createSalesOrderRequest,
  updateSalesOrderRequest,
  getRequestById,
  uploadRequestImages,
  createRequestMaterial,
  createRequestColor,
} from '../../services/saleOrderService';
import { CreatableCombobox } from '../../components/common/CreatableCombobox';

const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const CreateOrderRequestPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
  const [refreshing, setRefreshing] = useState(false);

  // ── 1. Metadata từ API hệ thống (Danh mục, phòng, vật liệu, màu sắc) ──
  const [metadata, setMetadata] = useState({
    categories: [],
    rooms: [],
    materials: [],
    colors: [],
  });
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // ── 2. Thông tin khách hàng & Tên đơn hàng (Duy nhất 1 tên đơn) ──
  const [customerInfo, setCustomerInfo] = useState({
    customerAccountId: null,
    title: '', // Tên đơn hàng duy nhất
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    deliveryAddress: '',
    expectedDate: '',
    orderType: 'CUSTOM',
  });

  // ── 3. Danh sách sản phẩm kỹ thuật - Mỗi món có mảng ảnh riêng ──
  const [items, setItems] = useState([
    {
      id: Date.now(),
      requestItemId: null,
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
    },
  ]);

  // Modal xem ảnh phóng to (Lightbox)
  const [previewModalImg, setPreviewModalImg] = useState(null);

  // Modal tóm tắt thông tin trước khi gửi
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [editRejectReason, setEditRejectReason] = useState(null);

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

  // ── Tải dữ liệu cũ nếu là chế độ chỉnh sửa (editId) ──
  const loadEditData = useCallback(async () => {
    if (!editId) return;
    try {
      setLoadingEditData(true);
      const res = await getRequestById(editId);
      const req = res.data;
      if (!req) return;

      setEditRejectReason(req.rejectReason || null);

      const contactName = req.contactName || req.customerName || '';
      setCustomerInfo({
        customerAccountId: req.customerAccountId || null,
        title: req.title || '',
        contactName: contactName,
        contactPhone: req.contactPhone || req.customerPhone || '',
        contactEmail: req.contactEmail || req.customerEmail || '',
        deliveryAddress: req.deliveryAddress || '',
        expectedDate: req.expectedDate ? req.expectedDate.split('T')[0] : '',
        orderType: req.orderType || 'CUSTOM',
      });

      const allImages = req.images || [];

      if (req.items && req.items.length > 0) {
        setItems(
          req.items.map((it, idx) => {
            let itemImgs = [];
            if (it.images && Array.isArray(it.images) && it.images.length > 0) {
              itemImgs = it.images;
            } else if (it.requestItemId) {
              itemImgs = allImages.filter(
                (img) => img.requestItemId && Number(img.requestItemId) === Number(it.requestItemId)
              );
            }

            // Gán ảnh cũ chưa có ID vào món đầu tiên để đảm bảo không mất ảnh
            if (idx === 0) {
              const unassignedImgs = allImages.filter((img) => !img.requestItemId);
              if (unassignedImgs.length > 0) {
                itemImgs = [...itemImgs, ...unassignedImgs];
              }
            }

            return {
              id: it.requestItemId || it.request_item_id || Date.now() + idx,
              requestItemId: it.requestItemId || it.request_item_id || null,
              itemName: it.itemName || it.item_name || '',
              categoryId: it.categoryId ?? it.category_id ?? '',
              roomId: it.roomId ?? it.room_id ?? '',
              materialId: it.materialId ?? it.material_id ?? '',
              colorId: it.colorId ?? it.color_id ?? '',
              lengthCm: it.lengthCm ?? it.length_cm ?? '',
              widthCm: it.widthCm ?? it.width_cm ?? '',
              heightCm: it.heightCm ?? it.height_cm ?? '',
              quantity: it.quantity || 1,
              unitPrice: it.unitPrice ?? it.unit_price ?? '',
              technicalNotes: it.technicalNotes || it.description || '',
              images: itemImgs.map((img, imgIdx) => ({
                id: img.imageId || img.requestImageId || Date.now() + imgIdx + Math.random(),
                imageUrl: typeof img === 'string' ? img : img.imageUrl,
                requestItemId: it.requestItemId || it.request_item_id || null,
              })),
              uploading: false,
            };
          })
        );
      }
    } catch (err) {
      console.error('Lỗi tải yêu cầu cũ:', err);
      toast.error('Không thể tải thông tin yêu cầu cần chỉnh sửa.');
    } finally {
      setLoadingEditData(false);
    }
  }, [editId]);

  useEffect(() => {
    loadEditData();
  }, [loadEditData]);

  // ── Làm mới trực tiếp không cần alert xác nhận ──
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMetadata();
      if (editId) {
        await loadEditData();
      } else {
        setCustomerInfo({
          customerAccountId: null,
          title: '',
          contactName: '',
          contactPhone: '',
          contactEmail: '',
          deliveryAddress: '',
          expectedDate: '',
          orderType: 'CUSTOM',
        });
        setItems([
          {
            id: Date.now(),
            requestItemId: null,
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
            images: [],
            uploading: false,
          },
        ]);
      }
      toast.success('Đã làm mới biểu mẫu.');
    } finally {
      setRefreshing(false);
    }
  };

  // ── Xử lý thêm mới Chất liệu (Loại gỗ) trực tiếp từ Combobox ──
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

  // ── Xử lý thêm mới Màu sắc (Màu sơn) trực tiếp từ Combobox ──
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

  // ── Xử lý thêm / xóa món sản phẩm ──
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        requestItemId: null,
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
        images: [],
        uploading: false,
      },
    ]);
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

  // ── Xử lý upload ảnh riêng cho từng sản phẩm ──
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
        `${customerInfo.contactName.trim()} - Đơn may đo nội thất`;

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
          requestItemId: it.requestItemId || null,
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
            requestItemId: it.requestItemId || null,
            sortOrder: imgIdx,
          })),
        })),
        images: items.flatMap((it, itemIdx) =>
          (it.images || []).map((img, imgIdx) => ({
            imageUrl: typeof img === 'string' ? img : img.imageUrl,
            requestItemId: it.requestItemId || null,
            itemIndex: itemIdx,
            sortOrder: imgIdx,
          }))
        ),
      };

      if (editId) {
        await updateSalesOrderRequest(editId, payload);
        toast.success('Cập nhật và gửi lại đơn theo yêu cầu thành công!');
      } else {
        await createSalesOrderRequest(payload);
        toast.success('Đã gửi đơn theo yêu cầu cho Chủ xưởng thẩm định!');
      }

      setSummaryModalOpen(false);
      navigate('/sale/requests');
    } catch (err) {
      console.error('Lỗi khi gửi yêu cầu:', err);
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi gửi đơn theo yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header chuẩn ManageProductsPage ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {editId ? 'Chỉnh sửa đơn theo yêu cầu' : 'Tạo đơn theo yêu cầu'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/sale/requests')}
            className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            Danh sách yêu cầu
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-60"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Banner cảnh báo nếu đang sửa theo phản hồi từ Owner ── */}
      {editRejectReason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-950">
              Chủ xưởng yêu cầu chỉnh sửa thiết kế / thông số kỹ thuật:
            </h4>
            <div className="rounded-lg bg-white p-3 border border-amber-200 text-xs text-amber-900 font-medium">
              {editRejectReason}
            </div>
            <p className="text-xs text-amber-800 italic">
              Vui lòng cập nhật lại thông số đo đạc hoặc bổ sung bản vẽ cho sản phẩm trước khi bấm gửi duyệt lại.
            </p>
          </div>
        </div>
      )}

      {loadingEditData && (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-stone-200 shadow-sm">
          <RotateCw className="h-6 w-6 animate-spin text-stone-400" />
          <span className="ml-3 text-sm font-medium text-stone-600">Đang tải thông tin đơn yêu cầu cần chỉnh sửa...</span>
        </div>
      )}

      <form onSubmit={handleValidateAndOpenSummary} className="space-y-6">
        {/* ── KHU VỰC 1: THÔNG TIN KHÁCH HÀNG ── */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
            <User className="h-4 w-4 text-amber-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
              1. Thông tin khách hàng
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tên đơn hàng duy nhất */}
            <div className="md:col-span-3">
              <label className="text-xs font-semibold uppercase text-stone-600 block">
                Tên đơn hàng
              </label>
              <div className="relative mt-1">
                <FileText className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={customerInfo.title}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, title: e.target.value }))}
                  placeholder="VD: May đo nội thất phòng khách & phòng ngủ căn hộ A12"
                  className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-sm focus:border-stone-900 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Họ tên khách hàng */}
            <div>
              <label className="text-xs font-semibold uppercase text-stone-600 block">
                Họ tên khách hàng <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  required
                  value={customerInfo.contactName}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, contactName: e.target.value }))}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="text-xs font-semibold uppercase text-stone-600 block">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  required
                  value={customerInfo.contactPhone}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, contactPhone: e.target.value }))}
                  placeholder="VD: 0912345678"
                  className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-sm focus:border-stone-900 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Email khách hàng */}
            <div>
              <label className="text-xs font-semibold uppercase text-stone-600 block">
                Email
              </label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="email"
                  value={customerInfo.contactEmail}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, contactEmail: e.target.value }))}
                  placeholder="VD: khachhang@gmail.com"
                  className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Địa chỉ giao hàng */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase text-stone-600 block">
                Địa chỉ giao hàng
              </label>
              <div className="relative mt-1">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={customerInfo.deliveryAddress}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, deliveryAddress: e.target.value }))}
                  placeholder="VD: Căn hộ A12-04 Chung cư Sunrise, 123 Nguyễn Hữu Thọ, Q.7, TP.HCM"
                  className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Ngày mong muốn hoàn thiện */}
            <div>
              <label className="text-xs font-semibold uppercase text-stone-600 block">
                Ngày mong muốn hoàn thiện
              </label>
              <div className="relative mt-1">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="date"
                  value={customerInfo.expectedDate}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, expectedDate: e.target.value }))}
                  className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── KHU VỰC 2: CHI TIẾT SẢN PHẨM ── */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-3 gap-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-700" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                2. Thông số kỹ thuật
              </h2>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-stone-800 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm sản phẩm ({items.length + 1})</span>
            </button>
          </div>

          {/* Danh sách sản phẩm */}
          <div className="space-y-4">
            {items.map((it, index) => (
              <div
                key={it.id}
                className="rounded-xl border border-stone-200 bg-stone-50/80 p-5 space-y-4 transition"
              >
                {/* Header sản phẩm */}
                <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900">
                      Sản phẩm {index + 1}: {it.itemName || 'Sản phẩm mới'}
                    </h3>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      className="text-xs text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 flex items-center gap-1 font-medium transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa</span>
                    </button>
                  )}
                </div>

                {/* Các trường thông số kỹ thuật */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  {/* Tên sản phẩm */}
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold uppercase text-stone-600 block">
                      Tên sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-1">
                      <Package className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={it.itemName}
                        onChange={(e) => handleItemChange(it.id, 'itemName', e.target.value)}
                        placeholder="VD: Tủ quần áo 4 cánh lùa kịch trần"
                        className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-sm font-medium focus:border-stone-900 focus:outline-none bg-white"
                      />
                    </div>
                  </div>

                  {/* Danh mục */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-stone-600 block">
                      Danh mục
                    </label>
                    <select
                      value={it.categoryId}
                      onChange={(e) => handleItemChange(it.id, 'categoryId', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-stone-900 focus:outline-none bg-white"
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {metadata.categories.map((c, idx) => (
                        <option key={c.categoryId || c.category_id || idx} value={c.categoryId || c.category_id}>
                          {c.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phòng / Không gian */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-stone-600 block">
                      Phòng
                    </label>
                    <select
                      value={it.roomId}
                      onChange={(e) => handleItemChange(it.id, 'roomId', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-stone-900 focus:outline-none bg-white"
                    >
                      <option value="">-- Chọn không gian --</option>
                      {metadata.rooms.map((r, idx) => (
                        <option key={r.roomId || r.room_id || idx} value={r.roomId || r.room_id}>
                          {r.roomName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chất liệu / Loại gỗ (cho phép chọn hoặc thêm mới) */}
                  <CreatableCombobox
                    id={`item-material-${it.id}`}
                    label="Chất liệu"
                    value={it.materialId}
                    options={metadata.materials}
                    valueKey="materialId"
                    labelKey="materialName"
                    placeholder="Chọn hoặc gõ để tìm/thêm chất liệu..."
                    onChange={(val) => handleItemChange(it.id, 'materialId', val)}
                    onCreate={handleCreateMaterial}
                  />

                  {/* Màu sắc / Màu sơn (cho phép chọn hoặc thêm mới kèm mã màu) */}
                  <CreatableCombobox
                    id={`item-color-${it.id}`}
                    label="Màu sắc"
                    isColor
                    value={it.colorId}
                    options={metadata.colors}
                    valueKey="colorId"
                    labelKey="colorName"
                    colorKey="hexValue"
                    placeholder="Chọn hoặc gõ để tìm/thêm màu sắc..."
                    onChange={(val) => handleItemChange(it.id, 'colorId', val)}
                    onCreate={handleCreateColor}
                  />

                  {/* Số lượng */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-stone-600 block">
                      Số lượng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={it.quantity}
                      onChange={(e) => handleItemChange(it.id, 'quantity', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm font-semibold focus:border-stone-900 focus:outline-none bg-white"
                    />
                  </div>

                  {/* Đơn giá ước tính */}
                  <div>
                    <label className="text-xs font-semibold uppercase text-stone-600 block">
                      Đơn giá ước tính (VNĐ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(it.id, 'unitPrice', e.target.value)}
                      placeholder="VD: 15000000"
                      className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none bg-white"
                    />
                    {it.unitPrice > 0 && (
                      <span className="block text-[11px] text-stone-500 font-medium mt-0.5">
                        ≈ {formatVND(it.unitPrice)}
                      </span>
                    )}
                  </div>

                  {/* KÍCH THƯỚC KỸ THUẬT ĐO ĐẠC (CM) */}
                  <div className="md:col-span-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Ruler className="h-4 w-4 text-stone-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                        Kích thước (cm)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-semibold uppercase text-stone-600 block">
                          Chiều dài (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={it.lengthCm}
                          onChange={(e) => handleItemChange(it.id, 'lengthCm', e.target.value)}
                          placeholder="VD: 220"
                          className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm font-mono focus:border-stone-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-stone-600 block">
                          Chiều rộng (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={it.widthCm}
                          onChange={(e) => handleItemChange(it.id, 'widthCm', e.target.value)}
                          placeholder="VD: 60"
                          className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm font-mono focus:border-stone-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase text-stone-600 block">
                          Chiều cao (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={it.heightCm}
                          onChange={(e) => handleItemChange(it.id, 'heightCm', e.target.value)}
                          placeholder="VD: 260"
                          className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-sm font-mono focus:border-stone-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mô tả chi tiết & Yêu cầu kỹ thuật */}
                  <div className="md:col-span-4">
                    <label className="text-xs font-semibold uppercase text-stone-600 block">
                      Mô tả chi tiết
                    </label>
                    <textarea
                      rows={2}
                      value={it.technicalNotes}
                      onChange={(e) => handleItemChange(it.id, 'technicalNotes', e.target.value)}
                      placeholder="VD: Cánh kính viền nhôm đen, bản lề giảm chấn Hafele, đèn LED cảm ứng thanh nhôm âm tủ..."
                      className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none bg-white"
                    />
                  </div>

                  {/* ── MỤC ẢNH THIẾT KẾ & BẢN VẼ RIÊNG CỦA MÓN NÀY ── */}
                  <div className="md:col-span-4 rounded-xl border border-stone-200 bg-white p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-stone-700" />
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                          3. Hình ảnh thiết kế 
                        </span>
                        <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-700 ml-1">
                          {it.images.length} ảnh
                        </span>
                      </div>
                      <span className="text-xs text-stone-400">
                        Sản phẩm {index + 1}
                      </span>
                    </div>

                    {/* Dropzone tải ảnh chuẩn ManageProductsPage */}
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 p-5 text-center hover:bg-stone-50 transition">
                      {it.uploading ? (
                        <>
                          <RotateCw className="h-7 w-7 animate-spin text-stone-400" />
                          <span className="mt-1.5 text-xs font-medium text-stone-700">Đang tải ảnh lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-7 w-7 text-stone-400" />
                          <span className="mt-1.5 text-xs font-medium text-stone-700">Tải ảnh lên</span>
                          <span className="text-[11px] text-stone-400">JPG, PNG, WEBP (Tối đa 5MB)</span>
                        </>
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

                    {/* Danh sách ảnh thu nhỏ của riêng món này */}
                    {it.images.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                        {it.images.map((img) => (
                          <div
                            key={img.id}
                            className="group relative rounded-lg border border-stone-200 bg-stone-50 overflow-hidden shadow-2xs"
                          >
                            <img
                              src={img.imageUrl}
                              alt="Bản vẽ"
                              className="h-20 w-full object-cover cursor-pointer transition group-hover:scale-105"
                              onClick={() => setPreviewModalImg(img.imageUrl)}
                            />

                            {/* Nút phóng to */}
                            <button
                              type="button"
                              onClick={() => setPreviewModalImg(img.imageUrl)}
                              className="absolute top-1 left-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition shadow"
                              title="Phóng to"
                            >
                              <Maximize2 className="h-3 w-3" />
                            </button>

                            {/* Nút xóa ảnh */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItemImage(it.id, img.id)}
                              className="absolute top-1 right-1 rounded-full bg-rose-600 p-1 text-white hover:bg-rose-700 transition shadow"
                              title="Xóa ảnh"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-stone-400 italic">
                        Chưa có ảnh cho sản phẩm này.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tổng tiền dự kiến */}
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl bg-stone-50 p-4 border border-stone-200">
            <span className="text-xs text-stone-700">
              Tổng số lượng: <strong className="text-stone-900 font-bold">{items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} sản phẩm</strong>
            </span>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <span className="text-xs text-stone-600">Tổng kinh phí dự kiến:</span>
              <span className="text-lg font-bold text-stone-900 font-mono">
                {formatVND(totalEstimatedAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* ── NÚT HÀNH ĐỘNG CUỐI TRANG ── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/sale/requests')}
            className="inline-flex items-center rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-stone-800"
          >
            <Send className="h-4 w-4" />
            <span>{editId ? 'Cập nhật & Gửi lại cho Chủ xưởng' : 'Kiểm Tra & Gửi Chủ Xưởng Thẩm Định'}</span>
          </button>
        </div>
      </form>

      {/* ── MODAL PHÓNG TO HÌNH ẢNH ── */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewModalImg(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img src={previewModalImg} alt="Phóng to bản vẽ" className="max-h-[85vh] rounded-xl shadow-2xl object-contain" />
            <button
              onClick={() => setPreviewModalImg(null)}
              className="absolute -top-3 -right-3 rounded-full bg-white p-1 text-stone-800 shadow-xl hover:bg-stone-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL TÓM TẮT THÔNG TIN TRƯỚC KHI GỬI CHÍNH THỨC ── */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-stone-900">
                  Xác nhận thông tin yêu cầu trước khi gửi Chủ xưởng
                </h3>
              </div>
              <button
                onClick={() => setSummaryModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung tóm tắt */}
            <div className="p-6 text-xs text-stone-800 space-y-4">
              {/* Thông tin khách hàng */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                <div className="flex items-center justify-between mb-3 border-b border-stone-200/60 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                    Thông tin khách hàng
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div className="col-span-2">
                    <span className="text-xs font-semibold uppercase text-stone-500">Tên đơn hàng</span>
                    <p className="mt-1 font-semibold text-stone-900 text-sm">
                      {customerInfo.title.trim() || `${customerInfo.contactName} - Đơn may đo nội thất`}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-stone-500">Ngày mong muốn</span>
                    <p className="mt-1 font-semibold text-stone-900 text-sm">{customerInfo.expectedDate || 'Thỏa thuận'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-stone-500">Khách hàng</span>
                    <p className="mt-1 font-semibold text-stone-900 text-sm">{customerInfo.contactName}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-stone-500">Số điện thoại</span>
                    <p className="mt-1 font-semibold text-stone-900 text-sm font-mono">{customerInfo.contactPhone}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-stone-500">Loại đơn</span>
                    <p className="mt-1 font-semibold text-stone-900 text-sm">
                      {customerInfo.orderType === 'CUSTOM' ? 'Đơn hàng theo yêu cầu' : 'Theo mẫu sẵn'}
                    </p>
                  </div>
                  <div className="col-span-3 border-t border-stone-200/60 pt-2">
                    <span className="text-xs font-semibold uppercase text-stone-500">Địa chỉ giao hàng</span>
                    <p className="mt-1 font-semibold text-stone-900">{customerInfo.deliveryAddress || 'Chưa cung cấp'}</p>
                  </div>
                </div>
              </div>

              {/* Bảng sản phẩm & Ảnh riêng từng món */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 block">
                  Danh sách sản phẩm ({items.length} sản phẩm)
                </span>
                <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-stone-200 bg-stone-50/75 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="px-3.5 py-2.5 text-center w-10">STT</th>
                        <th className="px-3.5 py-2.5">Sản phẩm & Ảnh</th>
                        <th className="px-3.5 py-2.5">Kích thước (D × R × C)</th>
                        <th className="px-3.5 py-2.5 text-center">SL</th>
                        <th className="px-3.5 py-2.5 text-right">Đơn giá ước tính</th>
                        <th className="px-3.5 py-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {items.map((it, idx) => {
                        const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' x ');
                        const unitPrice = Number(it.unitPrice) || 0;
                        const qty = Number(it.quantity) || 1;
                        return (
                          <tr key={it.id} className="hover:bg-stone-50/60">
                            <td className="px-3.5 py-2.5 text-center text-stone-400 font-mono align-top">{idx + 1}</td>
                            <td className="px-3.5 py-2.5 align-top">
                              <p className="font-semibold text-stone-900 text-sm">{it.itemName}</p>
                              {it.technicalNotes && (
                                <p className="text-[11px] text-stone-500 italic mt-0.5 max-w-xs truncate">
                                  {it.technicalNotes}
                                </p>
                              )}
                              {/* Hiển thị ảnh của riêng món này */}
                              {it.images && it.images.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {it.images.map((img) => (
                                    <img
                                      key={img.id}
                                      src={img.imageUrl}
                                      alt="Ảnh sản phẩm"
                                      className="h-10 w-10 object-cover rounded border border-stone-200 shadow-2xs"
                                    />
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-stone-700 font-mono align-top font-bold text-amber-900">
                              {dim ? `${dim} cm` : 'Theo thực tế'}
                            </td>
                            <td className="px-3.5 py-2.5 text-center font-bold align-top">{qty}</td>
                            <td className="px-3.5 py-2.5 text-right align-top">{formatVND(unitPrice)}</td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-stone-900 align-top">
                              {formatVND(unitPrice * qty)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-stone-200 bg-stone-50/70 font-semibold">
                      <tr>
                        <td colSpan="5" className="px-3.5 py-2.5 text-right text-stone-600">Tổng kinh phí ước tính:</td>
                        <td className="px-3.5 py-2.5 text-right text-stone-900 text-sm font-bold font-mono">
                          {formatVND(totalEstimatedAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setSummaryModalOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-medium text-stone-700 hover:bg-stone-50 text-sm"
              >
                Chỉnh sửa lại
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2 font-semibold text-white shadow hover:bg-stone-800 disabled:opacity-50 text-sm"
              >
                <span hidden={!submitting} className={submitting ? 'inline-flex' : 'hidden'} aria-hidden="true">
                  <RotateCw className="h-4 w-4 animate-spin" />
                </span>
                <span hidden={submitting} className={submitting ? 'hidden' : 'inline-flex'} aria-hidden="true">
                  <Send className="h-4 w-4" />
                </span>
                <span hidden={!submitting} className={submitting ? 'inline' : 'hidden'}>
                  Đang gửi...
                </span>
                <span hidden={submitting} className={submitting ? 'hidden' : 'inline'}>
                  Xác nhận gửi Chủ xưởng
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrderRequestPage;
