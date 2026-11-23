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
  Sparkles,
  DollarSign,
  Check,
  Info,
  ShieldCheck,
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
import { formatVND, formatDateVN } from '../../utils/formatters';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800';

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

export const CreateOrderRequestPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');
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
  const previewImageModal = previewModalImg;
  const setPreviewImageModal = setPreviewModalImg;

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
    <div className="space-y-6 pb-12 text-stone-900">
      {/* ── 1. HEADER TRANG: TẠO ĐƠN THEO YÊU CẦU (BESPOKE WOODCRAFT) ─────────── */}
      <header className="flex flex-col gap-4 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm transition sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-amber-400 shadow-sm ring-1 ring-stone-900/10">
            <Ruler className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
                {editId ? 'Chỉnh Sửa Đơn Theo Yêu Cầu' : 'Tạo Đơn Hàng Theo Yêu Cầu'}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                <Sparkles className="h-3 w-3 text-amber-700" />
                {editId ? 'Cập nhật thiết kế' : 'May đo đồ gỗ nội thất'}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500 sm:text-sm">
              Hồ sơ tiếp nhận may đo &amp; đóng mới theo kích thước thực tế: đính kèm bản vẽ phác thảo và gửi Chủ xưởng duyệt thiết kế.
            </p>
          </div>
        </div>

        {/* Cụm nút điều hướng & làm mới */}
        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
          <button
            type="button"
            onClick={() => navigate('/sale/requests')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            <FileText className="h-3.5 w-3.5 text-stone-500" />
            <span>Danh sách yêu cầu</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            title="Tải lại danh mục vật liệu và dữ liệu mới nhất"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </header>

      {/* Dải thông tin quy trình may đo xưởng */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-stone-200/80 bg-stone-50/70 px-4 py-2.5 text-xs text-stone-600">
        <div className="flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>Đo đạc kích thước thực tế (D x R x C cm)</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="h-4 w-4 text-amber-700" />
          <span>Đính kèm ảnh phác thảo / bản vẽ riêng cho từng món</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <Package className="h-4 w-4 text-stone-600" />
          <span>Chủ xưởng (Owner) tiếp nhận, ra bản vẽ và báo giá chính thức</span>
        </div>
      </div>

      {/* ── 2. BANNER CẢNH BÁO NẾU ĐANG SỬA THEO PHẢN HỒI TỪ OWNER ── */}
      {editRejectReason && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-5 shadow-sm space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-800" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h4 className="text-sm font-bold text-amber-950">
                Chủ xưởng yêu cầu chỉnh sửa thiết kế / thông số kỹ thuật:
              </h4>
              <div className="rounded-xl bg-white p-3.5 border border-amber-200/90 text-xs text-amber-900 font-medium leading-relaxed shadow-2xs">
                {editRejectReason}
              </div>
              <p className="text-xs text-amber-800 italic flex items-center gap-1">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>Vui lòng kiểm tra lại kích thước đo đạc hoặc đính kèm bản vẽ mới trước khi bấm gửi duyệt lại.</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {loadingEditData && (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-stone-200 shadow-sm">
          <RotateCw className="h-6 w-6 animate-spin text-amber-800" />
          <span className="ml-3 text-sm font-medium text-stone-600">Đang tải thông tin đơn yêu cầu cần chỉnh sửa...</span>
        </div>
      )}

      <form onSubmit={handleValidateAndOpenSummary} className="space-y-6">
        {/* ── KHU VỰC 1: HỒ SƠ ĐƠN HÀNG & THÔNG TIN KHÁCH HÀNG ── */}
        <section className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                1. Hồ sơ Đơn hàng &amp; Khách hàng
              </h2>
              <p className="text-[11px] text-stone-500">Thông tin liên hệ của khách và địa điểm giao hàng lắp đặt</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
            {/* Tên đơn hàng duy nhất */}
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Tên đơn hàng / Tên dự án may đo
              </label>
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={customerInfo.title}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, title: e.target.value }))}
                  placeholder="VD: May đo nội thất phòng khách & phòng ngủ căn hộ A12 Sunrise City"
                  className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-xs font-medium text-stone-900 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 placeholder-stone-400"
                />
              </div>
            </div>

            {/* Họ tên khách hàng */}
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Họ và tên khách hàng <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  required
                  value={customerInfo.contactName}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, contactName: e.target.value }))}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-xs text-stone-900 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 placeholder-stone-400"
                />
              </div>
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Số điện thoại liên hệ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="tel"
                  required
                  value={customerInfo.contactPhone}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, contactPhone: e.target.value }))}
                  placeholder="0912345678"
                  className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 font-mono text-xs text-stone-900 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 placeholder-stone-400"
                />
              </div>
            </div>

            {/* Email khách hàng */}
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="email"
                  value={customerInfo.contactEmail}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, contactEmail: e.target.value }))}
                  placeholder="khachhang@gmail.com"
                  className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-xs text-stone-900 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 placeholder-stone-400"
                />
              </div>
            </div>

            {/* Địa chỉ giao hàng */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Địa chỉ giao hàng &amp; Lắp đặt
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={customerInfo.deliveryAddress}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, deliveryAddress: e.target.value }))}
                  placeholder="VD: Căn hộ A12-04 Chung cư Sunrise, 123 Nguyễn Hữu Thọ, Q.7, TP.HCM"
                  className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-xs text-stone-900 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 placeholder-stone-400"
                />
              </div>
            </div>

            {/* Ngày mong muốn hoàn thiện */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700 block">
                  Ngày hẹn hoàn thiện
                </label>
                <span className="text-[10px] font-bold text-amber-800">&ge; 10 ngày tới</span>
              </div>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="date"
                  min={minExpectedDateStr}
                  value={customerInfo.expectedDate}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, expectedDate: e.target.value }))}
                  className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-xs text-stone-900 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Tối thiểu 10 ngày kể từ hôm nay (từ {formatDateVN(minExpectedDate)}).
              </p>
            </div>
          </div>
        </section>

        {/* ── KHU VỰC 2: DANH MỤC SẢN PHẨM MAY ĐO / ĐẶT ĐÓNG ── */}
        <section className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3.5 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-stone-900">
                    2. Danh mục Sản phẩm Đặt đóng theo Yêu cầu
                  </h2>
                  <span className="rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                    {items.length} sản phẩm
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">Khai báo kích thước đo đạc, chất liệu gỗ và bản vẽ phác thảo từng món</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-stone-800 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm sản phẩm ({items.length + 1})</span>
            </button>
          </div>

          {/* Danh sách sản phẩm */}
          <div className="space-y-6">
            {items.map((it, index) => (
              <div
                key={it.id}
                className="rounded-2xl border border-stone-200/90 bg-stone-50/60 p-5 space-y-5 transition duration-200 hover:border-amber-300 hover:bg-stone-50/90 shadow-2xs"
              >
                {/* Header sản phẩm */}
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-white text-xs font-bold shrink-0">
                      #{index + 1}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900 truncate">
                      {it.itemName ? `Sản phẩm ${index + 1}: ${it.itemName}` : `Sản phẩm may đo #${index + 1}`}
                    </h3>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      className="text-xs text-rose-600 hover:text-rose-700 px-2.5 py-1 rounded-lg hover:bg-rose-50 flex items-center gap-1 font-semibold transition"
                      title="Xóa món sản phẩm này khỏi đơn yêu cầu"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa món</span>
                    </button>
                  )}
                </div>

                {/* Các trường thông số kỹ thuật */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  {/* Tên sản phẩm */}
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Tên sản phẩm may đo <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Package className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={it.itemName}
                        onChange={(e) => handleItemChange(it.id, 'itemName', e.target.value)}
                        placeholder="VD: Tủ quần áo 4 cánh lùa kịch trần"
                        className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-xs font-medium text-stone-900 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 bg-white placeholder-stone-400"
                      />
                    </div>
                  </div>

                  {/* Danh mục */}
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Danh mục sản phẩm
                    </label>
                    <select
                      value={it.categoryId}
                      onChange={(e) => handleItemChange(it.id, 'categoryId', e.target.value)}
                      className="w-full rounded-xl border border-stone-200 py-2.5 px-3 text-xs text-stone-900 shadow-2xs transition focus:border-amber-600 focus:outline-none bg-white"
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
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Không gian phòng
                    </label>
                    <select
                      value={it.roomName}
                      onChange={(e) => handleItemChange(it.id, 'roomName', e.target.value)}
                      className="w-full rounded-xl border border-stone-200 py-2.5 px-3 text-xs text-stone-900 shadow-2xs transition focus:border-amber-600 focus:outline-none bg-white"
                    >
                      <option value="">-- Chọn không gian --</option>
                      {metadata.rooms.map((r, idx) => (
                        <option key={r.roomId || r.room_id || idx} value={r.roomName}>
                          {r.roomName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chất liệu / Loại gỗ (cho phép chọn hoặc thêm mới) */}
                  <div className="md:col-span-2">
                    <CreatableCombobox
                      id={`item-material-${it.id}`}
                      label="Chất liệu / Loại gỗ xưởng"
                      value={it.materialId}
                      options={metadata.materials}
                      valueKey="materialId"
                      labelKey="materialName"
                      placeholder="Chọn hoặc gõ để tìm/thêm chất liệu gỗ mới..."
                      onChange={(val) => handleItemChange(it.id, 'materialId', val)}
                      onCreate={handleCreateMaterial}
                    />
                  </div>

                  {/* Màu sắc / Màu sơn (cho phép chọn hoặc thêm mới kèm mã màu) */}
                  <div>
                    <CreatableCombobox
                      id={`item-color-${it.id}`}
                      label="Màu sắc / Vân sơn hoàn thiện"
                      isColor
                      value={it.colorId}
                      options={metadata.colors}
                      valueKey="colorId"
                      labelKey="colorName"
                      colorKey="hexValue"
                      placeholder="Chọn màu hoặc gõ thêm..."
                      onChange={(val) => handleItemChange(it.id, 'colorId', val)}
                      onCreate={handleCreateColor}
                    />
                  </div>

                  {/* Số lượng */}
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Số lượng đặt <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={it.quantity}
                      onChange={(e) => handleItemChange(it.id, 'quantity', e.target.value)}
                      className="w-full rounded-xl border border-stone-200 py-2.5 px-3 text-xs font-bold text-stone-900 shadow-2xs transition focus:border-amber-600 focus:outline-none bg-white"
                    />
                  </div>

                  {/* Đơn giá ước tính */}
                  <div className="md:col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-stone-700 block">
                        Đơn giá dự kiến tạm tính (VND)
                      </label>
                      {it.unitPrice > 0 && (
                        <span className="text-xs font-bold text-amber-900">
                          Thành tiền: {formatVND((Number(it.unitPrice) || 0) * (Number(it.quantity) || 1))}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <DollarSign className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <input
                        type="number"
                        min="0"
                        step="50000"
                        value={it.unitPrice}
                        onChange={(e) => handleItemChange(it.id, 'unitPrice', e.target.value)}
                        placeholder="VD: 15000000 (Chủ xưởng sẽ báo giá chính thức khi duyệt bản vẽ)"
                        className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-xs font-mono font-bold text-amber-900 shadow-2xs transition focus:border-amber-600 focus:outline-none bg-white placeholder-stone-400"
                      />
                    </div>
                  </div>

                  {/* KÍCH THƯỚC KỸ THUẬT ĐO ĐẠC (CM) */}
                  <div className="md:col-span-4 rounded-xl border border-amber-200/90 bg-amber-50/40 p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-3 border-b border-amber-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <Ruler className="h-4 w-4 text-amber-800" />
                        <span className="text-xs font-bold text-stone-900">
                          Kích thước đo đạc thực tế (Quy chuẩn cm)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-amber-900 font-semibold">
                        {[it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).length > 0
                          ? `${it.lengthCm || 0} x ${it.widthCm || 0} x ${it.heightCm || 0} cm`
                          : 'Dài x Rộng x Cao'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                          Chiều dài (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={it.lengthCm}
                          onChange={(e) => handleItemChange(it.id, 'lengthCm', e.target.value)}
                          placeholder="VD: 220"
                          className="w-full rounded-lg border border-stone-200 p-2 text-xs font-mono font-bold text-stone-900 bg-white shadow-2xs transition focus:border-amber-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                          Chiều rộng / Độ sâu (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={it.widthCm}
                          onChange={(e) => handleItemChange(it.id, 'widthCm', e.target.value)}
                          placeholder="VD: 60"
                          className="w-full rounded-lg border border-stone-200 p-2 text-xs font-mono font-bold text-stone-900 bg-white shadow-2xs transition focus:border-amber-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                          Chiều cao (cm)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={it.heightCm}
                          onChange={(e) => handleItemChange(it.id, 'heightCm', e.target.value)}
                          placeholder="VD: 260"
                          className="w-full rounded-lg border border-stone-200 p-2 text-xs font-mono font-bold text-stone-900 bg-white shadow-2xs transition focus:border-amber-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mô tả chi tiết & Yêu cầu kỹ thuật */}
                  <div className="md:col-span-4">
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Mô tả chi tiết &amp; Yêu cầu phụ kiện xưởng
                    </label>
                    <textarea
                      rows={2}
                      value={it.technicalNotes}
                      onChange={(e) => handleItemChange(it.id, 'technicalNotes', e.target.value)}
                      placeholder="VD: Cánh kính viền nhôm đen, bản lề giảm chấn Hafele, đèn LED cảm ứng thanh nhôm âm tủ, khoang để vali kịch trần..."
                      className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 shadow-2xs transition focus:border-amber-600 focus:outline-none bg-white placeholder-stone-400"
                    />
                  </div>

                  {/* ── MỤC ẢNH THIẾT KẾ & BẢN VẼ RIÊNG CỦA MÓN NÀY ── */}
                  <div className="md:col-span-4 rounded-xl border border-stone-200 bg-white p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-amber-800" />
                        <span className="text-xs font-bold text-stone-900">
                          Ảnh thiết kế, mặt bằng &amp; Bản vẽ phác thảo
                        </span>
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                          {it.images.length} ảnh
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400 font-medium">
                        Dành riêng cho sản phẩm #{index + 1}
                      </span>
                    </div>

                    {/* Dropzone tải ảnh chuẩn xưởng */}
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 p-5 text-center transition hover:border-amber-400 hover:bg-amber-50/20">
                      {it.uploading ? (
                        <>
                          <RotateCw className="h-7 w-7 animate-spin text-amber-800" />
                          <span className="mt-2 text-xs font-semibold text-stone-800">Đang tải ảnh lên hệ thống...</span>
                        </>
                      ) : (
                        <>
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-900 mb-1">
                            <Upload className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-bold text-stone-800">Bấm để chọn ảnh hoặc kéo thả vào đây</span>
                          <span className="text-[10px] text-stone-400 mt-0.5">Hỗ trợ JPG, PNG, WEBP (Tối đa 10MB mỗi ảnh)</span>
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
                    {it.images.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
                        {it.images.map((img, imgIdx) => (
                          <div
                            key={img.id}
                            className="group relative aspect-square rounded-xl border border-stone-200 bg-stone-100 overflow-hidden shadow-2xs transition hover:border-amber-400"
                          >
                            <img
                              src={img.imageUrl}
                              alt={`Bản vẽ ${imgIdx + 1}`}
                              className="h-full w-full object-cover"
                            />
                            {/* Overlay hover nút xem to và xóa */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 p-1">
                              <button
                                type="button"
                                onClick={() => setPreviewImageModal(img.imageUrl)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-stone-800 hover:bg-white hover:text-stone-900 shadow transition"
                                title="Phóng to ảnh"
                              >
                                <Maximize2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveItemImage(it.id, img.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow transition"
                                title="Xóa ảnh này"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] font-mono text-white backdrop-blur-2xs">
                              #{imgIdx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Nút thêm sản phẩm lớn ở chân danh sách */}
          <button
            type="button"
            onClick={handleAddItem}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 py-3.5 text-xs font-bold text-stone-700 hover:border-amber-500 hover:bg-amber-50/40 hover:text-amber-900 transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm sản phẩm may đo tiếp theo ({items.length + 1})</span>
          </button>
        </section>

        {/* ── 3. KHỐI TỔNG KẾT DỰ TOÁN & NÚT HÀNH ĐỘNG CUỐI TRANG ── */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-stone-800 bg-stone-900 p-5 text-white shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Tổng kết dự toán tạm tính
              </span>
              <span className="rounded-full bg-stone-800 px-2 py-0.5 text-[11px] font-bold text-stone-300">
                {items.length} sản phẩm
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Chủ xưởng sẽ kiểm duyệt chi tiết bản vẽ kỹ thuật và phản hồi báo giá chính thức.
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] text-stone-400 block">Kinh phí ước tính:</span>
            <span className="font-mono text-xl sm:text-2xl font-extrabold text-amber-300">
              {formatVND(totalEstimatedAmount)}
            </span>
          </div>
        </section>

        {/* Cụm nút hành động */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/sale/requests')}
            className="rounded-xl border border-stone-200 bg-white px-5 py-3 text-xs font-bold text-stone-700 shadow-2xs transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            Hủy bỏ / Quay lại
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-6 py-3 text-xs font-bold tracking-wide text-white shadow-md transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            <Send className="h-4 w-4" />
            <span>Kiểm tra & Gửi yêu cầu thiết kế</span>
          </button>
        </div>
      </form>

      {/* ── MODAL PHÓNG TO HÌNH ẢNH ── */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-stone-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 px-4 py-2 text-white">
              <span className="text-xs font-bold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-amber-400" />
                <span>Chi tiết hình ảnh phác thảo / bản vẽ</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[80vh] items-center justify-center overflow-auto p-2">
              <img
                src={previewImageModal}
                alt="Chi tiết bản vẽ"
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TÓM TẮT THÔNG TIN TRƯỚC KHI GỬI CHÍNH THỨC ── */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-stone-900">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white">
                    Kiểm Tra Hồ Sơ Yêu Cầu May Đo
                  </h3>
                  <p className="text-xs text-stone-300">
                    Đối chiếu thông số đo đạc &amp; bản vẽ kỹ thuật trước khi gửi Chủ xưởng duyệt
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSummaryModalOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung tóm tắt */}
            <div className="overflow-y-auto p-6 text-xs text-stone-700 space-y-5">
              {/* Thông tin khách hàng */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <h4 className="font-bold text-stone-900 border-b border-stone-200 pb-2 mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-800" />
                  <span>HỒ SƠ KHÁCH HÀNG &amp; TIẾN ĐỘ:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-stone-500">Tên đơn hàng: </span>
                    <strong className="text-stone-900">{customerInfo.title || 'May đo đồ gỗ nội thất'}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500">Họ tên khách: </span>
                    <strong className="text-stone-900">{customerInfo.contactName}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500">Số điện thoại: </span>
                    <strong className="font-mono text-stone-900">{customerInfo.contactPhone}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500">Email: </span>
                    <span className="text-stone-800">{customerInfo.contactEmail || '---'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-stone-500">Địa chỉ giao hàng: </span>
                    <span className="text-stone-900 font-medium">{customerInfo.deliveryAddress || '---'}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">Hẹn ngày hoàn thiện: </span>
                    <strong className="text-amber-900 font-mono">
                      {customerInfo.expectedDate ? formatDateVN(new Date(customerInfo.expectedDate)) : 'Theo tiến độ xưởng'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Bảng sản phẩm & Ảnh riêng từng món */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2.5 flex items-center justify-between">
                  <span>DANH MỤC SẢN PHẨM MAY ĐO ({items.length} món):</span>
                  <span className="text-[11px] text-stone-500 font-normal">Kèm bản vẽ phác thảo &amp; kích thước cm</span>
                </h4>
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                      <tr>
                        <th className="p-2.5 text-center w-10">#</th>
                        <th className="p-2.5">Tên món &amp; Bản vẽ</th>
                        <th className="p-2.5">Kích thước (D x R x C)</th>
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
                          <tr key={it.id} className="hover:bg-stone-50/70">
                            <td className="p-2.5 text-center text-stone-400 font-mono align-top">{idx + 1}</td>
                            <td className="p-2.5 align-top">
                              <p className="font-bold text-stone-900 text-xs">{it.itemName}</p>
                              {it.technicalNotes && (
                                <p className="text-[11px] text-stone-500 italic mt-0.5 max-w-xs truncate">
                                  {it.technicalNotes}
                                </p>
                              )}
                              {/* Hiển thị ảnh của riêng món này */}
                              {it.images && it.images.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {it.images.map((img, iIdx) => (
                                    <img
                                      key={img.id || iIdx}
                                      src={img.imageUrl}
                                      alt="Bản vẽ"
                                      className="h-10 w-10 object-cover rounded-lg border border-stone-200 shadow-2xs"
                                    />
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-amber-900 font-mono font-bold align-top">
                              {dim ? `${dim} cm` : 'Theo thực tế'}
                            </td>
                            <td className="p-2.5 text-center font-bold align-top text-stone-900">{qty}</td>
                            <td className="p-2.5 text-right align-top text-stone-700">{formatVND(unitPrice)}</td>
                            <td className="p-2.5 text-right font-bold text-stone-900 align-top">
                              {formatVND(unitPrice * qty)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-stone-200 bg-stone-50 font-bold">
                      <tr>
                        <td colSpan="5" className="p-2.5 text-right text-stone-600">Tổng kinh phí ước tính:</td>
                        <td className="p-2.5 text-right text-amber-900 font-mono text-sm font-extrabold">
                          {formatVND(totalEstimatedAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Ghi chú quy trình tiếp theo */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-[11px] text-stone-600 leading-relaxed">
                <strong className="text-stone-800">Quy trình xử lý tiếp theo: </strong>
                Sau khi gửi, đơn yêu cầu sẽ được chuyển sang trạng thái <strong>PENDING</strong> (Chờ duyệt).
                Chủ xưởng sẽ kiểm tra kỹ tính khả thi, phân bổ thợ mộc thiết kế bản vẽ 2D/3D chi tiết, và phản hồi phê duyệt để Sales tiến hành tạo hợp đồng bán lẻ cho khách.
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setSummaryModalOpen(false)}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-100 transition"
              >
                Chỉnh sửa lại
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-950 disabled:opacity-50 active:scale-95"
              >
                {submitting ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    <span>Đang gửi yêu cầu...</span>
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
