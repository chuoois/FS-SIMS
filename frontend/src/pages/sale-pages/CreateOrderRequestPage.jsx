// =========================================================
// CreateOrderRequestPage.jsx
// Màn hình TẠO ĐƠN THEO YÊU CẦU (Order Request)
// Chuẩn hóa UI/UX theo phong cách Owner: đơn giản, gọn gàng, tone stone-900
//
// Đặc điểm chính:
// 1. Chỉ giữ MỘT tên đơn hàng duy nhất, loại bỏ trường ghi chú / tìm khách hàng nhanh dư thừa
// 2. Quản lý HÌNH ẢNH THIẾT KẾ RIÊNG BIỆT CHO TỪNG SẢN PHẨM:
//    - Mỗi món có danh sách ảnh riêng, tải ảnh / dán URL / xóa / xem độc lập
//    - Đảm bảo tương thích ngược: khi load đơn cũ, tự động ánh xạ ảnh theo request_item_id
// 3. Modal xác nhận trực quan trước khi gửi Chủ xưởng thẩm định
// =========================================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  User,
  MapPin,
  Calendar,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ArrowLeft,
  Layers,
  UploadCloud,
  X,
  Send,
  Maximize2,
  Clock,
  Ruler,
  Link as LinkIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getProductMetadata,
  createSalesOrderRequest,
  updateSalesOrderRequest,
  getRequestById,
  uploadRequestImages,
} from '../../services/saleOrderService';

const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${timeStr} - ${dateStr}`;
  } catch {
    return dateString;
  }
};

export const CreateOrderRequestPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('editId');

  // ── Đồng hồ hiển thị thời gian tạo đơn ──
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${timeStr} • ${dateStr}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      setCurrentTime(`${timeStr} • ${dateStr}`);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // ── 1. Metadata từ API hệ thống (Danh mục, phòng, vật liệu, màu sắc) ──
  const [metadata, setMetadata] = useState({
    categories: [],
    rooms: [],
    materials: [],
    colors: [],
  });
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // ── 2. Thông tin khách hàng & Tên đơn hàng (Tối giản, duy nhất 1 tên đơn) ──
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
      images: [], // Mảng ảnh riêng của sản phẩm này: [{ id, imageUrl }]
      urlInput: '', // Input dán link ảnh riêng cho món này
      uploading: false, // Trạng thái tải ảnh riêng của món này
    },
  ]);

  // Modal xem ảnh phóng to
  const [previewModalImg, setPreviewModalImg] = useState(null);

  // Modal tóm tắt thông tin trước khi gửi
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [editRejectReason, setEditRejectReason] = useState(null);
  const [editCreatedAt, setEditCreatedAt] = useState(null);

  // ── Tải metadata chuẩn từ API ──
  useEffect(() => {
    async function fetchMetadata() {
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
    }
    fetchMetadata();
  }, []);

  // ── Tải dữ liệu cũ nếu là chế độ chỉnh sửa (editId) ──
  useEffect(() => {
    if (!editId) return;

    async function loadEditData() {
      try {
        setLoadingEditData(true);
        const res = await getRequestById(editId);
        const req = res.data;
        if (!req) return;

        setEditRejectReason(req.rejectReason || null);
        setEditCreatedAt(req.createdAt || null);

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

        // Ánh xạ ảnh vào từng sản phẩm (hỗ trợ cả cấu trúc mới it.images và cấu trúc cũ req.images)
        const allImages = req.images || [];

        if (req.items && req.items.length > 0) {
          setItems(
            req.items.map((it, idx) => {
              // Lấy ảnh gắn với requestItemId này từ allImages hoặc it.images
              let itemImgs = [];
              if (it.images && Array.isArray(it.images) && it.images.length > 0) {
                itemImgs = it.images;
              } else if (it.requestItemId) {
                itemImgs = allImages.filter(
                  (img) => img.requestItemId && Number(img.requestItemId) === Number(it.requestItemId)
                );
              }

              // Nếu là món đầu tiên và có ảnh chung chưa gắn requestItemId (dữ liệu cũ), gán vào món đầu để không mất ảnh
              if (idx === 0) {
                const unassignedImgs = allImages.filter((img) => !img.requestItemId);
                if (unassignedImgs.length > 0) {
                  itemImgs = [...itemImgs, ...unassignedImgs];
                }
              }

              return {
                id: it.requestItemId || Date.now() + idx,
                requestItemId: it.requestItemId || null,
                itemName: it.itemName || '',
                categoryId: it.categoryId || '',
                roomId: it.roomId || '',
                materialId: it.materialId || '',
                colorId: it.colorId || '',
                lengthCm: it.lengthCm ?? '',
                widthCm: it.widthCm ?? '',
                heightCm: it.heightCm ?? '',
                quantity: it.quantity || 1,
                unitPrice: it.unitPrice ?? '',
                technicalNotes: it.technicalNotes || it.description || '',
                images: itemImgs.map((img, imgIdx) => ({
                  id: img.imageId || img.requestImageId || Date.now() + imgIdx + Math.random(),
                  imageUrl: typeof img === 'string' ? img : img.imageUrl,
                  requestItemId: it.requestItemId || null,
                })),
                urlInput: '',
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
    }

    loadEditData();
  }, [editId]);

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
        urlInput: '',
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

  // ── Xử lý thêm / xóa ảnh RIÊNG CHO TỪNG SẢN PHẨM ──
  const handleItemFileUpload = async (itemId, fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      toast.error('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP).');
      return;
    }

    // Đánh dấu uploading cho riêng món này
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

  const handleAddItemImageUrl = (itemId) => {
    const targetItem = items.find((it) => it.id === itemId);
    if (!targetItem || !targetItem.urlInput || !targetItem.urlInput.trim()) return;

    const url = targetItem.urlInput.trim();
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              images: [...it.images, { id: Date.now() + Math.random(), imageUrl: url }],
              urlInput: '',
            }
          : it
      )
    );
    toast.success('Đã thêm liên kết ảnh cho sản phẩm.');
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
        toast.error(`Sản phẩm món thứ ${i + 1} chưa có tên sản phẩm.`);
        return;
      }
      if (!it.quantity || Number(it.quantity) <= 0) {
        toast.error(`Số lượng món "${it.itemName}" phải lớn hơn 0.`);
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

      // Cấu trúc payload chuẩn: mỗi item mang mảng images riêng của nó
      // Đồng thời cung cấp mảng images cấp cao nhất với itemIndex để tương thích ngược 100%
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
    <div className="space-y-6">
      {/* ── Tiêu đề trang & Nút hành động chuẩn Owner ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-white shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              {editId ? 'Chỉnh sửa đơn theo yêu cầu' : 'Tạo đơn theo yêu cầu'}
            </h1>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Khảo sát kích thước may đo, thông số kỹ thuật và hình ảnh thiết kế riêng cho từng sản phẩm gửi Chủ xưởng thẩm định.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Đồng hồ thời gian lập đơn */}
          <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3.5 text-xs text-stone-700 shadow-xs">
            <Clock className="h-4 w-4 text-stone-500" />
            <span className="font-medium text-stone-500">
              {editId && editCreatedAt ? 'Thời gian tạo:' : 'Thời gian lập:'}
            </span>
            <span className="font-semibold text-stone-900 font-mono">
              {editId && editCreatedAt ? formatDateTime(editCreatedAt) : currentTime}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/sale/requests')}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95"
            title="Quay lại danh sách yêu cầu"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Danh sách yêu cầu</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Bạn có chắc muốn làm mới toàn bộ biểu mẫu?')) {
                window.location.href = '/sale/requests/create';
              }
            }}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95"
            title="Làm mới biểu mẫu"
          >
            <RotateCw className="h-4 w-4 text-stone-500" />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── Banner cảnh báo nếu đang sửa theo phản hồi từ Owner ── */}
      {editRejectReason && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-xs flex items-start gap-3">
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
          <RotateCw className="h-6 w-6 animate-spin text-stone-700" />
          <span className="ml-3 text-sm font-medium text-stone-600">Đang tải thông tin đơn yêu cầu cần chỉnh sửa...</span>
        </div>
      )}

      <form onSubmit={handleValidateAndOpenSummary} className="space-y-6">
        {/* ── KHU VỰC 1: THÔNG TIN ĐƠN HÀNG & KHÁCH HÀNG (TỐI GIẢN) ── */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">1. Thông tin khách hàng & Giao nhận</h2>
              <p className="text-xs text-stone-500">Thông tin tên đơn hàng, người liên hệ và địa điểm thi công</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Tên đơn hàng duy nhất */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tên đơn hàng <span className="text-stone-400 font-normal">(Tiêu đề yêu cầu may đo)</span>
              </label>
              <input
                type="text"
                value={customerInfo.title}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, title: e.target.value }))}
                placeholder="VD: May đo nội thất phòng khách & phòng ngủ căn hộ A12"
                className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:ring-1 focus:ring-stone-900 font-medium"
              />
            </div>

            {/* Họ tên khách hàng */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Họ tên khách hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerInfo.contactName}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, contactName: e.target.value }))}
                placeholder="VD: Nguyễn Văn A"
                className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
              />
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Số điện thoại liên hệ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerInfo.contactPhone}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, contactPhone: e.target.value }))}
                placeholder="VD: 0912345678"
                className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
              />
            </div>

            {/* Email khách hàng */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email khách hàng
              </label>
              <input
                type="email"
                value={customerInfo.contactEmail}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, contactEmail: e.target.value }))}
                placeholder="VD: khachhang@gmail.com"
                className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
              />
            </div>

            {/* Địa chỉ giao hàng */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Địa chỉ giao hàng & thi công lắp đặt
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={customerInfo.deliveryAddress}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, deliveryAddress: e.target.value }))}
                  placeholder="VD: Căn hộ A12-04 Chung cư Sunrise, 123 Nguyễn Hữu Thọ, Q.7, TP.HCM"
                  className="h-10 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                />
              </div>
            </div>

            {/* Ngày mong muốn hoàn thiện */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ngày mong muốn hoàn thiện
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="date"
                  value={customerInfo.expectedDate}
                  onChange={(e) => setCustomerInfo((p) => ({ ...p, expectedDate: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── KHU VỰC 2: CHI TIẾT SẢN PHẨM & HÌNH ẢNH THIẾT KẾ RIÊNG TỪNG MÓN ── */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">2. Chi tiết sản phẩm & Thông số kỹ thuật</h2>
                <p className="text-xs text-stone-500">
                  Thông số đo đạc Dài x Rộng x Cao (cm) và ảnh bản vẽ thiết kế độc lập theo từng món
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-stone-800 transition shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm món đồ ({items.length + 1})</span>
            </button>
          </div>

          {/* Danh sách các món sản phẩm */}
          <div className="space-y-4">
            {items.map((it, index) => (
              <div
                key={it.id}
                className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3.5 transition hover:border-stone-300"
              >
                {/* Header món */}
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-stone-900 text-xs font-bold text-white shadow-2xs">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900">
                      Món {index + 1}: {it.itemName || 'Sản phẩm mới'}
                    </h3>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xóa món</span>
                    </button>
                  )}
                </div>

                {/* Các trường thông số sản phẩm */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  {/* Tên sản phẩm */}
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-stone-700 mb-1">
                      Tên sản phẩm / Món đồ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={it.itemName}
                      onChange={(e) => handleItemChange(it.id, 'itemName', e.target.value)}
                      placeholder="VD: Tủ quần áo 4 cánh lùa kịch trần"
                      className="h-9 w-full rounded-lg border border-stone-300 bg-white px-3 text-xs font-medium focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                    />
                  </div>

                  {/* Danh mục sản phẩm */}
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Danh mục sản phẩm
                    </label>
                    <select
                      value={it.categoryId}
                      onChange={(e) => handleItemChange(it.id, 'categoryId', e.target.value)}
                      className="h-9 w-full rounded-lg border border-stone-300 bg-white px-3 text-xs focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
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
                    <label className="block font-semibold text-stone-700 mb-1">
                      Phòng / Không gian
                    </label>
                    <select
                      value={it.roomId}
                      onChange={(e) => handleItemChange(it.id, 'roomId', e.target.value)}
                      className="h-9 w-full rounded-lg border border-stone-300 bg-white px-3 text-xs focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                    >
                      <option value="">-- Chọn không gian --</option>
                      {metadata.rooms.map((r, idx) => (
                        <option key={r.roomId || r.room_id || idx} value={r.roomId || r.room_id}>
                          {r.roomName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chất liệu / Loại gỗ */}
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Chất liệu / Loại gỗ
                    </label>
                    <select
                      value={it.materialId}
                      onChange={(e) => handleItemChange(it.id, 'materialId', e.target.value)}
                      className="h-9 w-full rounded-lg border border-stone-300 bg-white px-3 text-xs focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                    >
                      <option value="">-- Chọn chất liệu --</option>
                      {metadata.materials.map((m, idx) => (
                        <option key={m.materialId || m.material_id || idx} value={m.materialId || m.material_id}>
                          {m.materialName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Màu sắc */}
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Màu sắc hoàn thiện
                    </label>
                    <select
                      value={it.colorId}
                      onChange={(e) => handleItemChange(it.id, 'colorId', e.target.value)}
                      className="h-9 w-full rounded-lg border border-stone-300 bg-white px-3 text-xs focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                    >
                      <option value="">-- Chọn màu sắc --</option>
                      {metadata.colors.map((c, idx) => (
                        <option key={c.colorId || c.color_id || idx} value={c.colorId || c.color_id}>
                          {c.colorName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Số lượng */}
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Số lượng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={it.quantity}
                      onChange={(e) => handleItemChange(it.id, 'quantity', e.target.value)}
                      className="h-9 w-full rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                    />
                  </div>

                  {/* Đơn giá ước tính */}
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Đơn giá ước tính (VNĐ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(it.id, 'unitPrice', e.target.value)}
                      placeholder="VD: 15000000"
                      className="h-9 w-full rounded-lg border border-stone-300 bg-white px-3 text-xs focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                    />
                    {it.unitPrice > 0 && (
                      <span className="block text-[11px] text-stone-600 font-medium mt-0.5">
                        ≈ {formatVND(it.unitPrice)}
                      </span>
                    )}
                  </div>

                  {/* KÍCH THƯỚC KỸ THUẬT */}
                  <div className="md:col-span-4 rounded-lg border border-stone-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Ruler className="h-4 w-4 text-stone-700" />
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Thông số kích thước đo đạc thực tế (cm)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium text-xs">Chiều dài (cm)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.lengthCm}
                          onChange={(e) => handleItemChange(it.id, 'lengthCm', e.target.value)}
                          placeholder="VD: 220"
                          className="h-9 w-full rounded-lg border border-stone-300 px-3 text-xs font-mono focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium text-xs">Chiều rộng / Sâu (cm)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.widthCm}
                          onChange={(e) => handleItemChange(it.id, 'widthCm', e.target.value)}
                          placeholder="VD: 60"
                          className="h-9 w-full rounded-lg border border-stone-300 px-3 text-xs font-mono focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium text-xs">Chiều cao (cm)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.heightCm}
                          onChange={(e) => handleItemChange(it.id, 'heightCm', e.target.value)}
                          placeholder="VD: 260"
                          className="h-9 w-full rounded-lg border border-stone-300 px-3 text-xs font-mono focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mô tả yêu cầu / Ghi chú kỹ thuật */}
                  <div className="md:col-span-4">
                    <label className="block font-semibold text-stone-700 mb-1">
                      Mô tả chi tiết & Yêu cầu kỹ thuật gia công
                    </label>
                    <textarea
                      rows="2"
                      value={it.technicalNotes}
                      onChange={(e) => handleItemChange(it.id, 'technicalNotes', e.target.value)}
                      placeholder="VD: Cánh kính viền nhôm đen, bản lề giảm chấn Hafele, hậu Melamine chống ẩm..."
                      className="w-full rounded-lg border border-stone-300 p-2.5 text-xs focus:border-stone-900 focus:ring-1 focus:ring-stone-900 bg-white"
                    />
                  </div>

                  {/* ── MỤC ẢNH THIẾT KẾ & BẢN VẼ RIÊNG CỦA MÓN NÀY ── */}
                  <div className="md:col-span-4 rounded-lg border border-stone-200 bg-white p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-stone-700" />
                        <span className="text-xs font-bold text-stone-800">
                          3. Hình ảnh thiết kế & Bản vẽ 3D/2D ({it.images.length} ảnh)
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500">
                        Gắn ảnh riêng cho món {index + 1}
                      </span>
                    </div>

                    {/* Điều khiển thêm ảnh: Tải tệp hoặc Thêm link URL */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {/* Nút tải tệp */}
                      <label className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer transition shrink-0">
                        {it.uploading ? (
                          <>
                            <RotateCw className="h-3.5 w-3.5 animate-spin text-stone-700" />
                            <span>Đang tải...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-3.5 w-3.5 text-stone-600" />
                            <span>Tải ảnh từ máy</span>
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

                      {/* Nhập URL ảnh */}
                      <div className="relative flex-1 flex items-center">
                        <LinkIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
                        <input
                          type="url"
                          value={it.urlInput}
                          onChange={(e) => handleItemChange(it.id, 'urlInput', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddItemImageUrl(it.id);
                            }
                          }}
                          placeholder="Hoặc dán link ảnh trực tiếp (https://...)..."
                          className="h-9 w-full rounded-l-lg border border-stone-300 pl-8 pr-3 text-xs focus:border-stone-900 focus:ring-1 focus:ring-stone-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddItemImageUrl(it.id)}
                          className="inline-flex h-9 items-center rounded-r-lg border border-l-0 border-stone-300 bg-stone-100 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition shrink-0"
                        >
                          + Thêm URL
                        </button>
                      </div>
                    </div>

                    {/* Danh sách ảnh của riêng món này */}
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
                              className="absolute top-1 left-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition shadow-xs"
                              title="Phóng to"
                            >
                              <Maximize2 className="h-3 w-3" />
                            </button>

                            {/* Nút xóa ảnh */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItemImage(it.id, img.id)}
                              className="absolute top-1 right-1 rounded-full bg-red-600/90 p-1 text-white hover:bg-red-700 transition shadow-xs"
                              title="Xóa ảnh"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-stone-400 italic">
                        Chưa có ảnh bản vẽ cho món này. Hãy tải ảnh hoặc dán URL để Chủ xưởng xem mẫu gia công.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tổng tiền dự kiến */}
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-lg bg-stone-50 p-3.5 border border-stone-200">
            <span className="text-xs text-stone-700">
              Tổng số lượng: <strong className="text-stone-900 font-bold">{items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} sản phẩm</strong>
            </span>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <span className="text-xs text-stone-600">Tổng kinh phí dự kiến:</span>
              <span className="text-base font-bold text-stone-900 font-mono">
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
            className="inline-flex h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-stone-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 active:scale-95"
          >
            <Send className="h-4 w-4" />
            <span>{editId ? 'Cập nhật & Gửi lại cho Chủ xưởng' : 'Kiểm Tra & Gửi Chủ Xưởng Thẩm Định'}</span>
          </button>
        </div>
      </form>

      {/* ── MODAL PHÓNG TO HÌNH ẢNH ── */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setPreviewModalImg(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img src={previewModalImg} alt="Phóng to bản vẽ" className="max-h-[85vh] rounded-xl shadow-2xl object-contain" />
            <button
              onClick={() => setPreviewModalImg(null)}
              className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-stone-800 shadow-xl hover:bg-stone-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL TÓM TẮT THÔNG TIN TRƯỚC KHI GỬI CHÍNH THỨC ── */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-stone-900" />
                <h3 className="text-base font-bold text-stone-900">
                  Xác nhận thông tin yêu cầu trước khi gửi Chủ xưởng
                </h3>
              </div>
              <button
                onClick={() => setSummaryModalOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung tóm tắt */}
            <div className="overflow-y-auto p-6 text-xs text-stone-800 space-y-4">
              {/* Khách hàng & Giao nhận */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-stone-700" /> Thông tin đơn hàng & Khách hàng
                  </h4>
                  <span className="text-[11px] font-mono text-stone-500 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-stone-500" />
                    {currentTime}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <span className="text-stone-500">Tên đơn hàng:</span>
                    <p className="font-semibold text-stone-900">
                      {customerInfo.title.trim() || `${customerInfo.contactName} - Đơn may đo nội thất`}
                    </p>
                  </div>
                  <div>
                    <span className="text-stone-500">Ngày mong muốn:</span>
                    <p className="font-semibold text-stone-900">{customerInfo.expectedDate || 'Thỏa thuận'}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Khách hàng:</span>
                    <p className="font-semibold text-stone-900">{customerInfo.contactName}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Số điện thoại:</span>
                    <p className="font-semibold text-stone-900">{customerInfo.contactPhone}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Loại đơn:</span>
                    <p className="font-semibold text-stone-900">
                      {customerInfo.orderType === 'CUSTOM' ? 'May đo thiết kế' : 'Theo mẫu sẵn'}
                    </p>
                  </div>
                  <div className="col-span-3">
                    <span className="text-stone-500">Địa chỉ giao & thi công:</span>
                    <p className="font-semibold text-stone-900">{customerInfo.deliveryAddress || 'Chưa cung cấp'}</p>
                  </div>
                </div>
              </div>

              {/* Bảng sản phẩm & Ảnh riêng từng món */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-stone-700" /> Danh sách món đồ ({items.length} món)
                </h4>
                <div className="rounded-xl border border-stone-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="px-3.5 py-2.5">STT</th>
                        <th className="px-3.5 py-2.5">Tên món & Ảnh</th>
                        <th className="px-3.5 py-2.5">Kích thước (D x R x C)</th>
                        <th className="px-3.5 py-2.5 text-center">SL</th>
                        <th className="px-3.5 py-2.5 text-right">Đơn giá ước tính</th>
                        <th className="px-3.5 py-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {items.map((it, idx) => {
                        const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' x ');
                        const unitPrice = Number(it.unitPrice) || 0;
                        const qty = Number(it.quantity) || 1;
                        return (
                          <tr key={it.id}>
                            <td className="px-3.5 py-2 text-center text-stone-500 font-mono align-top">{idx + 1}</td>
                            <td className="px-3.5 py-2 align-top">
                              <p className="font-semibold text-stone-900">{it.itemName}</p>
                              {it.technicalNotes && (
                                <p className="text-[11px] text-stone-500 italic truncate max-w-[220px]">
                                  {it.technicalNotes}
                                </p>
                              )}
                              {/* Hiển thị ảnh của riêng món này */}
                              {it.images && it.images.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {it.images.map((img) => (
                                    <img
                                      key={img.id}
                                      src={img.imageUrl}
                                      alt="Ảnh món"
                                      className="h-10 w-10 object-cover rounded border border-stone-200 shadow-2xs"
                                    />
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-2 text-stone-600 font-mono align-top">
                              {dim ? `${dim} cm` : 'Theo thực tế'}
                            </td>
                            <td className="px-3.5 py-2 text-center font-bold align-top">{qty}</td>
                            <td className="px-3.5 py-2 text-right align-top">{formatVND(unitPrice)}</td>
                            <td className="px-3.5 py-2 text-right font-bold text-stone-900 align-top">
                              {formatVND(unitPrice * qty)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-stone-50/80 font-bold border-t border-stone-200">
                      <tr>
                        <td colSpan="5" className="px-3.5 py-2.5 text-right">Tổng kinh phí ước tính:</td>
                        <td className="px-3.5 py-2.5 text-right text-stone-900 text-sm">
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
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-medium text-stone-700 hover:bg-stone-100 transition text-sm"
              >
                Chỉnh sửa lại
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2 font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 transition text-sm"
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
