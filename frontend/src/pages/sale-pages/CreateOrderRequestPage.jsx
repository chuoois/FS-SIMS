// =========================================================
// CreateOrderRequestPage.jsx
// Màn hình TẠO ĐƠN THEO YÊU CẦU (Order Request)
// Tách biệt hoàn toàn khỏi Màn hình Bán hàng tại quầy (POS)
//
// Bố cục & Tính năng:
// 1. Header: Tiêu đề chuẩn "Tạo đơn theo yêu cầu", hiển thị ngày giờ rõ ràng, nút quay lại, làm mới
// 2. Stepper quy trình trực quan: Khách hàng -> Kỹ thuật -> Hình ảnh & Thẩm định
// 3. Khu vực 1: Thông tin khách hàng & Giao nhận (tìm kiếm nhanh, tự động điền)
// 4. Khu vực 2: Thông số kỹ thuật & Danh sách món đồ (Dài x Rộng x Cao cm, chất liệu, màu sắc, giá ước tính)
// 5. Khu vực 3: Hình ảnh thiết kế & Bản vẽ 3D/2D (Tải ảnh trực tiếp lên Cloudinary, không dùng base64 gây lỗi)
// 6. Modal xác nhận thông tin chi tiết trước khi gửi Chủ xưởng thẩm định
// =========================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ArrowLeft,
  Eye,
  Layers,
  Sparkles,
  Search,
  UploadCloud,
  X,
  Send,
  HelpCircle,
  Maximize2,
  Clock,
  Ruler,
  Palette,
  Check,
  Building,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getProductMetadata,
  getCustomers,
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

  // ── Đồng hồ thời gian thực cho ngày tạo đơn ──
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

  // ── 2. Thông tin khách hàng & Giao nhận ──
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [customerInfo, setCustomerInfo] = useState({
    customerAccountId: null,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    deliveryAddress: '',
    title: '',
    description: '',
    expectedDate: '',
    budgetMin: '',
    budgetMax: '',
    orderType: 'CUSTOM', // 'CUSTOM' hoặc 'READY'
  });

  // ── 3. Danh sách sản phẩm kỹ thuật trong yêu cầu ──
  const [items, setItems] = useState([
    {
      id: Date.now(),
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
    },
  ]);

  // ── 4. Hình ảnh thiết kế ──
  // Mỗi ảnh: { id, imageUrl, requestItemId: null (toàn đơn) | item.id }
  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [selectedImageTarget, setSelectedImageTarget] = useState('ALL');
  const [previewModalImg, setPreviewModalImg] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ── 5. Modal tóm tắt thông tin trước khi gửi ──
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
        setCustomerSearch(contactName);
        setCustomerInfo({
          customerAccountId: req.customerAccountId || null,
          contactName: contactName,
          contactPhone: req.contactPhone || req.customerPhone || '',
          contactEmail: req.contactEmail || req.customerEmail || '',
          deliveryAddress: req.deliveryAddress || '',
          title: req.title || '',
          description: req.description || '',
          expectedDate: req.expectedDate ? req.expectedDate.split('T')[0] : '',
          budgetMin: req.budgetMin || '',
          budgetMax: req.budgetMax || '',
          orderType: req.orderType || 'CUSTOM',
        });

        if (req.items && req.items.length > 0) {
          setItems(
            req.items.map((it, idx) => ({
              id: it.requestItemId || Date.now() + idx,
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
            }))
          );
        }

        if (req.images && req.images.length > 0) {
          setImages(
            req.images.map((img, idx) => ({
              id: img.requestImageId || Date.now() + idx,
              imageUrl: typeof img === 'string' ? img : img.imageUrl,
              requestItemId: img.requestItemId || null,
            }))
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

  // ── Tìm kiếm khách hàng (Role CUSTOMER) ──
  useEffect(() => {
    if (!customerSearch.trim() || customerSearch.length < 2) {
      setCustomerOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingCustomers(true);
        const res = await getCustomers({ search: customerSearch.trim() });
        setCustomerOptions(res.data || []);
      } catch (err) {
        console.error('Lỗi tìm kiếm khách hàng:', err);
      } finally {
        setSearchingCustomers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearch]);

  const handleSelectCustomer = (cust) => {
    const custId = cust.customerAccountId || cust.user_account_id;
    const name = cust.fullName || cust.full_name || '';
    const phone = cust.phoneNumber || cust.phone_number || '';
    setCustomerInfo((prev) => ({
      ...prev,
      customerAccountId: custId,
      customerId: custId,
      contactName: name,
      contactPhone: phone,
      contactEmail: cust.email || '',
      deliveryAddress: cust.address || prev.deliveryAddress,
    }));
    setCustomerSearch(name);
    setShowCustomerDropdown(false);
    toast.success(`Đã chọn khách hàng: ${name}`);
  };

  // ── Xử lý thêm / sửa / xóa sản phẩm kỹ thuật ──
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
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
      },
    ]);
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) {
      toast.error('Đơn yêu cầu phải có ít nhất một sản phẩm.');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  // ── Xử lý upload / thêm hình ảnh thiết kế (Cloudinary API chuẩn) ──
  const processFilesUpload = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      toast.error('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP).');
      return;
    }

    try {
      setUploadingImages(true);
      const res = await uploadRequestImages(files);
      const uploadedUrls = res.urls || res.images || [];

      if (!uploadedUrls || uploadedUrls.length === 0) {
        throw new Error('Máy chủ không trả về URL hình ảnh.');
      }

      const targetId = selectedImageTarget === 'ALL' ? null : Number(selectedImageTarget);
      const newImgs = uploadedUrls.map((url, idx) => ({
        id: Date.now() + Math.random() + idx,
        imageUrl: url,
        requestItemId: targetId,
      }));

      setImages((prev) => [...prev, ...newImgs]);
      toast.success(`Đã tải lên thành công ${uploadedUrls.length} ảnh thiết kế.`);
    } catch (err) {
      console.error('Lỗi khi tải ảnh lên:', err);
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi tải ảnh lên máy chủ. Vui lòng thử lại hoặc thêm bằng URL.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFilesUpload(files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      await processFilesUpload(e.dataTransfer.files);
    }
  };

  const handleAddImageUrl = (e) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;

    setImages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        imageUrl: newImageUrl.trim(),
        requestItemId: selectedImageTarget === 'ALL' ? null : Number(selectedImageTarget),
      },
    ]);
    setNewImageUrl('');
    toast.success('Đã thêm liên kết ảnh thiết kế.');
  };

  const handleRemoveImage = (imgId) => {
    setImages((prev) => prev.filter((img) => img.id !== imgId));
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

      const payload = {
        customerAccountId: customerInfo.customerAccountId,
        contactName: customerInfo.contactName.trim(),
        contactPhone: customerInfo.contactPhone.trim(),
        contactEmail: customerInfo.contactEmail.trim() || null,
        deliveryAddress: customerInfo.deliveryAddress.trim() || null,
        title: customerInfo.title.trim() || customerInfo.contactName + ' - May đo nội thất',
        description: customerInfo.description.trim() || null,
        budgetMin: customerInfo.budgetMin ? Number(customerInfo.budgetMin) : null,
        budgetMax: customerInfo.budgetMax ? Number(customerInfo.budgetMax) : null,
        expectedDate: customerInfo.expectedDate || null,
        orderType: customerInfo.orderType || 'CUSTOM',
        items: items.map((it) => ({
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
          technicalNotes: it.technicalNotes.trim() || null,
        })),
        images: images.map((img, idx) => ({
          imageUrl: img.imageUrl,
          requestItemId: img.requestItemId,
          sortOrder: idx,
        })),
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
    <div className="w-full space-y-6 pb-16">
      {/* ── Header ── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/sale/requests')}
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 p-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition"
                title="Quay lại danh sách yêu cầu"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                {editId ? 'Chỉnh sửa đơn theo yêu cầu' : 'Tạo đơn theo yêu cầu'}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-200">
                <Sparkles className="h-3 w-3 text-amber-700" />
                Thiết kế theo yêu cầu 
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500">
              Khảo sát kích thước may đo, thông số kỹ thuật và hình ảnh thiết kế 3D/2D gửi Chủ xưởng thẩm định & sản xuất.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Hiển thị thời gian tạo rõ ràng */}
            <div className="inline-flex items-center gap-2 rounded-xl bg-stone-50 border border-stone-200/80 px-3.5 py-2 text-xs text-stone-700 shadow-xs">
              <Clock className="h-3.5 w-3.5 text-amber-800" />
              <span className="font-medium text-stone-500">
                {editId && editCreatedAt ? 'Thời gian tạo đơn:' : 'Thời gian lập:'}
              </span>
              <span className="font-semibold text-stone-900 font-mono">
                {editId && editCreatedAt ? formatDateTime(editCreatedAt) : currentTime}
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/sale/requests')}
              className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs transition"
            >
              Danh sách yêu cầu
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Bạn có chắc muốn làm mới toàn bộ biểu mẫu?')) {
                  window.location.href = '/sale/requests/create';
                }
              }}
              className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-xs transition inline-flex items-center gap-1.5"
            >
              <RotateCw className="h-3.5 w-3.5 text-stone-500" />
              Làm mới
            </button>
          </div>
        </div>

        {/* Stepper chỉ dẫn 3 bước */}
        <div className="mt-6 pt-5 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200/60">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-800 text-xs font-bold text-white shrink-0">
              1
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">Khách hàng & Giao nhận</p>
              <p className="text-[11px] text-amber-800/80">Chọn khách hàng & lịch hẹn</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200/70">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-800 text-xs font-bold text-white shrink-0">
              2
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900">Thông số kỹ thuật</p>
              <p className="text-[11px] text-stone-500">Dài x Rộng x Cao cm & Gỗ</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200/70">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-800 text-xs font-bold text-white shrink-0">
              3
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900">Bản vẽ & Thẩm định</p>
              <p className="text-[11px] text-stone-500">Tải ảnh thiết kế & gửi Owner</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Banner cảnh báo nếu đang sửa theo phản hồi từ Owner ── */}
      {editRejectReason && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-5 shadow-xs flex items-start gap-3.5">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-950">
              Chủ xưởng yêu cầu chỉnh sửa thiết kế / thông số kỹ thuật:
            </h4>
            <div className="rounded-xl bg-white/80 p-3 border border-amber-200 text-xs text-amber-900 font-medium">
              {editRejectReason}
            </div>
            <p className="text-[11px] text-amber-800 italic">
              Vui lòng cập nhật lại thông số đo đạc hoặc bổ sung bản vẽ trước khi bấm gửi duyệt lại.
            </p>
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
        {/* ── KHU VỰC 1: THÔNG TIN KHÁCH HÀNG & GIAO NHẬN ── */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100/70 text-amber-800">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">1. Thông tin khách hàng & Giao nhận</h2>
                <p className="text-xs text-stone-500">Tìm kiếm nhanh tài khoản khách hàng hoặc nhập thông tin người liên hệ</p>
              </div>
            </div>
          </div>

          {/* Autocomplete tìm khách hàng */}
          <div className="relative">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Tìm kiếm khách hàng có sẵn trong hệ thống (Họ tên, SĐT, Email)
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Nhập tên, số điện thoại hoặc email khách hàng..."
                className="w-full rounded-xl border border-stone-200 pl-10 pr-10 py-2.5 text-xs sm:text-sm focus:border-amber-800 focus:ring-2 focus:ring-amber-800/10 focus:outline-none bg-stone-50/40 hover:bg-white transition"
              />
              {searchingCustomers && (
                <RotateCw className="absolute right-3.5 top-3 h-4 w-4 animate-spin text-stone-400" />
              )}
            </div>

            {/* Dropdown kết quả tìm kiếm */}
            {showCustomerDropdown && customerOptions.length > 0 && (
              <div className="absolute z-30 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xl divide-y divide-stone-100">
                {customerOptions.map((c) => (
                  <button
                    key={c.user_account_id || c.customerAccountId}
                    type="button"
                    onClick={() => handleSelectCustomer(c)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-xs hover:bg-amber-50/60 transition"
                  >
                    <div>
                      <p className="font-semibold text-stone-900">{c.full_name || c.fullName}</p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {c.phone_number || c.phoneNumber} • {c.email || 'Chưa có email'}
                      </p>
                    </div>
                    {c.address && (
                      <span className="text-[11px] text-stone-400 truncate max-w-[240px] bg-stone-50 px-2 py-1 rounded border border-stone-100">
                        {c.address}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Form chi tiết khách hàng */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
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
                className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs sm:text-sm focus:border-amber-800 focus:ring-2 focus:ring-amber-800/10 focus:outline-none"
              />
            </div>

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
                className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs sm:text-sm focus:border-amber-800 focus:ring-2 focus:ring-amber-800/10 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email khách hàng
              </label>
              <input
                type="email"
                value={customerInfo.contactEmail}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, contactEmail: e.target.value }))}
                placeholder="VD: khachhang@gmail.com"
                className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs sm:text-sm focus:border-amber-800 focus:ring-2 focus:ring-amber-800/10 focus:outline-none"
              />
            </div>

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
                  className="w-full rounded-xl border border-stone-200 pl-9 pr-3.5 py-2.5 text-xs sm:text-sm focus:border-amber-800 focus:ring-2 focus:ring-amber-800/10 focus:outline-none"
                />
              </div>
            </div>

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
                  className="w-full rounded-xl border border-stone-200 pl-9 pr-3.5 py-2.5 text-xs sm:text-sm focus:border-amber-800 focus:ring-2 focus:ring-amber-800/10 focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tiêu đề & Ghi chú tổng quan về công trình / căn hộ
              </label>
              <input
                type="text"
                value={customerInfo.title}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, title: e.target.value }))}
                placeholder="VD: May đo nội thất phòng ngủ Master & hệ tủ âm tường cánh kính"
                className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs sm:text-sm focus:border-amber-800 focus:ring-2 focus:ring-amber-800/10 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── KHU VỰC 2: THÔNG TIN YÊU CẦU KỸ THUẬT VÀ SẢN PHẨM ── */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100/70 text-amber-800">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">2. Chi tiết sản phẩm & Thông số kỹ thuật</h2>
                <p className="text-xs text-stone-500">
                  Kích thước Dài x Rộng x Cao (cm), chất liệu, màu sắc lấy từ dữ liệu hệ thống
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-900 transition shrink-0"
            >
              <Plus className="h-4 w-4" />
              Thêm món đồ ({items.length + 1})
            </button>
          </div>

          {/* Danh sách các món sản phẩm */}
          <div className="space-y-4">
            {items.map((it, index) => (
              <div
                key={it.id}
                className="rounded-2xl border border-stone-200 bg-stone-50/50 p-5 transition hover:border-amber-300 hover:shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-800 text-xs font-bold text-white shadow-xs">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-bold text-stone-800">
                      Món {index + 1}: {it.itemName || 'Sản phẩm mới'}
                    </h3>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/70 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa món này
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 text-xs">
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
                      className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white font-medium"
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
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
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
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
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
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
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
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
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
                      className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white font-medium"
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
                      className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
                    />
                    {it.unitPrice > 0 && (
                      <span className="block text-[11px] text-amber-800 font-medium mt-0.5">
                        ≈ {formatVND(it.unitPrice)}
                      </span>
                    )}
                  </div>

                  {/* KÍCH THƯỚC KỸ THUẬT */}
                  <div className="md:col-span-4 rounded-xl border border-stone-200 bg-white p-4 shadow-2xs">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Ruler className="h-4 w-4 text-amber-800" />
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Thông số kích thước đo đạc thực tế (cm)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">Chiều dài (cm)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.lengthCm}
                          onChange={(e) => handleItemChange(it.id, 'lengthCm', e.target.value)}
                          placeholder="VD: 220"
                          className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs focus:border-amber-800 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">Chiều rộng / Sâu (cm)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.widthCm}
                          onChange={(e) => handleItemChange(it.id, 'widthCm', e.target.value)}
                          placeholder="VD: 60"
                          className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs focus:border-amber-800 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1 font-medium">Chiều cao (cm)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.heightCm}
                          onChange={(e) => handleItemChange(it.id, 'heightCm', e.target.value)}
                          placeholder="VD: 260"
                          className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs focus:border-amber-800 focus:outline-none font-mono"
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
                      placeholder="VD: Cánh kính viền nhôm đen, bản lề giảm chấn Hafele, đèn LED cảm ứng thanh nhôm âm tủ, hậu tủ phủ Melamine chống ẩm..."
                      className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tổng tiền dự kiến */}
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-xl bg-amber-50/70 p-4 border border-amber-200/80">
            <span className="text-xs text-stone-700">
              Tổng số lượng: <strong className="text-stone-900 font-bold">{items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} sản phẩm</strong>
            </span>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <span className="text-xs text-stone-600">Tổng kinh phí dự kiến:</span>
              <span className="text-lg font-extrabold text-amber-900">
                {formatVND(totalEstimatedAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* ── KHU VỰC 3: HÌNH ẢNH THIẾT KẾ & BẢN VẼ ── */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100/70 text-amber-800">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">3. Hình ảnh thiết kế & Bản vẽ 3D/2D</h2>
                <p className="text-xs text-stone-500">Tải ảnh trực tiếp lên hệ thống Cloudinary hoặc dán đường dẫn ảnh</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-stone-500">
              {images.length} hình ảnh đã đính kèm
            </span>
          </div>

          {/* Upload Dropzone hiện đại */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition ${
              isDragging
                ? 'border-amber-600 bg-amber-50/70'
                : 'border-stone-300 bg-stone-50/40 hover:bg-stone-50/80 hover:border-amber-400'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              disabled={uploadingImages}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 rounded-full bg-amber-100/80 text-amber-800">
                {uploadingImages ? (
                  <RotateCw className="h-6 w-6 animate-spin text-amber-800" />
                ) : (
                  <UploadCloud className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-stone-800">
                  {uploadingImages ? 'Đang tải ảnh lên Cloudinary...' : 'Kéo thả hoặc nhấn để tải ảnh bản vẽ'}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Hỗ trợ định dạng JPG, PNG, WEBP tối đa 5MB / tệp
                </p>
              </div>
            </div>
          </div>

          {/* Phân loại & Thêm qua URL */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs items-end pt-1">
            <div className="md:col-span-4">
              <label className="block font-semibold text-stone-700 mb-1">
                Gắn ảnh cho món nào trong đơn?
              </label>
              <select
                value={selectedImageTarget}
                onChange={(e) => setSelectedImageTarget(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs focus:border-amber-800 focus:outline-none bg-white font-medium"
              >
                <option value="ALL">Toàn bộ đơn theo yêu cầu</option>
                {items.map((it, idx) => (
                  <option key={it.id} value={it.id}>
                    Món {idx + 1}: {it.itemName || 'Sản phẩm ' + (idx + 1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-6">
              <label className="block font-semibold text-stone-700 mb-1">
                Hoặc dán link ảnh trực tiếp (URL)
              </label>
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/ban-ve-thiet-ke-1.jpg"
                className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs focus:border-amber-800 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="w-full rounded-xl border border-amber-800 bg-amber-50 px-3.5 py-2.5 font-bold text-amber-900 hover:bg-amber-100 transition text-center"
              >
                + Thêm URL
              </button>
            </div>
          </div>

          {/* Danh sách ảnh đã đính kèm */}
          {images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
              {images.map((img) => {
                const targetItem = items.find((it) => it.id === img.requestItemId);
                return (
                  <div
                    key={img.id}
                    className="group relative rounded-xl border border-stone-200 bg-white overflow-hidden shadow-xs transition hover:shadow-md"
                  >
                    <img
                      src={img.imageUrl}
                      alt="Bản vẽ thiết kế"
                      className="h-28 w-full object-cover cursor-pointer transition group-hover:scale-105"
                      onClick={() => setPreviewModalImg(img.imageUrl)}
                    />
                    <div className="p-2 bg-white text-[11px] text-stone-700 font-medium truncate border-t border-stone-100">
                      {targetItem ? targetItem.itemName : 'Toàn đơn'}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      className="absolute top-1.5 right-1.5 rounded-full bg-red-600/90 p-1 text-white hover:bg-red-700 transition shadow-xs"
                      title="Xóa ảnh"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewModalImg(img.imageUrl)}
                      className="absolute top-1.5 left-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition shadow-xs"
                      title="Phóng to"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-xs text-stone-400">
              Chưa có hình ảnh thiết kế nào được thêm. Hãy tải ảnh từ máy tính hoặc dán URL để Chủ xưởng xem trước khi thẩm định.
            </div>
          )}
        </div>

        {/* ── NÚT GỬI DUYỆT ── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/sale/requests')}
            className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-50 shadow-xs transition"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-800 px-7 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-amber-900 transition"
          >
            <Send className="h-4 w-4" />
            {editId ? 'Cập nhật & Gửi lại cho Chủ xưởng' : 'Kiểm tra & Gửi Chủ xưởng thẩm định'}
          </button>
        </div>
      </form>

      {/* ── MODAL PHÓNG TO HÌNH ẢNH ── */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setPreviewModalImg(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img src={previewModalImg} alt="Phóng to bản vẽ" className="max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-amber-800" />
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
                    <User className="h-4 w-4 text-amber-800" /> Thông tin khách hàng & Giao nhận
                  </h4>
                  <span className="text-[11px] font-mono text-stone-500 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-800" />
                    {currentTime}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-stone-500">Khách hàng:</span>
                    <p className="font-semibold text-stone-900">{customerInfo.contactName}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Số điện thoại:</span>
                    <p className="font-semibold text-stone-900">{customerInfo.contactPhone}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Ngày mong muốn:</span>
                    <p className="font-semibold text-stone-900">{customerInfo.expectedDate || 'Thỏa thuận'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-stone-500">Địa chỉ giao:</span>
                    <p className="font-semibold text-stone-900">{customerInfo.deliveryAddress || 'Chưa cung cấp'}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Loại đơn:</span>
                    <p className="font-semibold text-stone-900">
                      {customerInfo.orderType === 'CUSTOM' ? 'May đo thiết kế' : 'Theo mẫu sẵn'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bảng sản phẩm */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-amber-800" /> Danh sách món đồ ({items.length} món)
                </h4>
                <div className="rounded-xl border border-stone-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="px-3.5 py-2.5">STT</th>
                        <th className="px-3.5 py-2.5">Tên món</th>
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
                            <td className="px-3.5 py-2 text-center text-stone-500 font-mono">{idx + 1}</td>
                            <td className="px-3.5 py-2">
                              <p className="font-semibold text-stone-900">{it.itemName}</p>
                              {it.technicalNotes && (
                                <p className="text-[11px] text-stone-500 italic truncate max-w-[220px]">
                                  {it.technicalNotes}
                                </p>
                              )}
                            </td>
                            <td className="px-3.5 py-2 text-stone-600 font-mono">
                              {dim ? `${dim} cm` : 'Theo thực tế'}
                            </td>
                            <td className="px-3.5 py-2 text-center font-bold">{qty}</td>
                            <td className="px-3.5 py-2 text-right">{formatVND(unitPrice)}</td>
                            <td className="px-3.5 py-2 text-right font-bold text-amber-900">
                              {formatVND(unitPrice * qty)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-stone-50/80 font-bold border-t border-stone-200">
                      <tr>
                        <td colSpan="5" className="px-3.5 py-2.5 text-right">Tổng kinh phí ước tính:</td>
                        <td className="px-3.5 py-2.5 text-right text-amber-900 text-sm">
                          {formatVND(totalEstimatedAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Ảnh thiết kế đính kèm */}
              {images.length > 0 && (
                <div>
                  <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-amber-800" /> Ảnh thiết kế đính kèm ({images.length} ảnh)
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {images.map((img) => (
                      <img
                        key={img.id}
                        src={img.imageUrl}
                        alt="Bản vẽ"
                        className="h-16 w-16 object-cover rounded-xl border border-stone-200 shadow-xs"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setSummaryModalOpen(false)}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100 transition"
              >
                Chỉnh sửa lại
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-800 px-6 py-2 font-bold text-white shadow-md hover:bg-amber-900 disabled:opacity-50 transition"
              >
                {submitting ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Xác nhận gửi Chủ xưởng
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
