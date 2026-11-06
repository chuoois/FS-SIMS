// =========================================================
// CreateOrderRequestPage.jsx
// Màn hình LẬP YÊU CẦU THIẾT KẾ & MAY ĐO RIÊNG BIỆT (Order Request)
// Tách biệt hoàn toàn khỏi Màn hình Bán hàng tại quầy (POS)
//
// Bố cục:
// 1. Header: Tiêu đề, nút quay lại danh sách yêu cầu, nút làm mới
// 2. Khu vực 3.1: Thông tin khách hàng & Giao nhận (Tái sử dụng API khách hàng, lưu cấu trúc chuẩn)
// 3. Khu vực 3.2: Thông tin yêu cầu kỹ thuật:
//    - Danh mục, Phòng, Chất liệu/Gỗ, Màu sắc (lấy từ API metadata, không hardcode)
//    - Thông số kỹ thuật: Dài x Rộng x Cao (cm), Số lượng, Giá ước tính, Ghi chú kỹ thuật
//    - Quản lý & Xem trước nhiều hình ảnh thiết kế
//    - Thêm/sửa/xóa nhiều món đồ trong 1 yêu cầu
//    - Modal tóm tắt thông tin trước khi xác nhận gửi Owner thẩm định
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getProductMetadata,
  getCustomers,
  createSalesOrderRequest,
  updateSalesOrderRequest,
  getRequestById,
} from '../../services/saleOrderService';

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
  // Mỗi ảnh: { id, imageUrl, requestItemId: null (toàn đơn) | item.id, previewUrl }
  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [selectedImageTarget, setSelectedImageTarget] = useState('ALL');
  const [previewModalImg, setPreviewModalImg] = useState(null);

  // ── 5. Modal tóm tắt thông tin trước khi gửi ──
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [editRejectReason, setEditRejectReason] = useState(null);

  // ── Tải metadata chuẩn từ API ──
  useEffect(() => {
    async function fetchMetadata() {
      try {
        setLoadingMetadata(true);
        const res = await getProductMetadata();
        if (res.data) {
          setMetadata({
            categories: res.data.categories || [],
            rooms: res.data.rooms || [],
            materials: res.data.materials || [],
            colors: res.data.colors || [],
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
        setCustomerInfo({
          customerAccountId: req.customerAccountId || null,
          contactName: req.contactName || '',
          contactPhone: req.contactPhone || '',
          contactEmail: req.contactEmail || '',
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
    setCustomerInfo((prev) => ({
      ...prev,
      customerAccountId: cust.customerAccountId,
      contactName: cust.fullName || '',
      contactPhone: cust.phoneNumber || '',
      contactEmail: cust.email || '',
      deliveryAddress: cust.address || prev.deliveryAddress,
    }));
    setCustomerSearch(cust.fullName || '');
    setShowCustomerDropdown(false);
    toast.success(`Đã chọn khách hàng: ${cust.fullName}`);
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

  // ── Xử lý upload / thêm hình ảnh thiết kế ──
  const handleAddImageUrl = (e) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;

    setImages((prev) => [
      ...prev,
      {
        id: Date.now(),
        imageUrl: newImageUrl.trim(),
        requestItemId: selectedImageTarget === 'ALL' ? null : Number(selectedImageTarget),
      },
    ]);
    setNewImageUrl('');
    toast.success('Đã thêm ảnh thiết kế.');
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            imageUrl: reader.result,
            requestItemId: selectedImageTarget === 'ALL' ? null : Number(selectedImageTarget),
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    toast.success(`Đã tải lên ${files.length} ảnh thiết kế.`);
    e.target.value = '';
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
        toast.success('Cập nhật và gửi lại yêu cầu thiết kế thành công!');
      } else {
        await createSalesOrderRequest(payload);
        toast.success('Đã gửi yêu cầu thiết kế may đo cho Chủ xưởng thẩm định!');
      }

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
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/sale/requests')}
              className="inline-flex items-center justify-center rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-100 transition"
              title="Quay lại danh sách yêu cầu"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-xl font-bold text-stone-900">
              {editId ? 'Chỉnh Sửa & Cập Nhật Yêu Cầu Thiết Kế' : 'Lập Yêu Cầu Thiết Kế & May Đo Mới'}
            </h1>
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-900">
              Order Request
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Dành cho Sales lập hồ sơ khảo sát, thông số kỹ thuật và hình ảnh thiết kế gửi Chủ xưởng thẩm định & chốt bản vẽ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/sale/requests')}
            className="rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-sm transition"
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
            className="rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-sm transition inline-flex items-center gap-1.5"
          >
            <RotateCw className="h-3.5 w-3.5 text-stone-500" />
            Làm mới form
          </button>
        </div>
      </div>

      {/* ── Banner nếu đang sửa theo phản hồi từ Owner ── */}
      {editRejectReason && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 shadow-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Chủ xưởng yêu cầu chỉnh sửa thiết kế:</h4>
            <p className="text-xs text-amber-800 mt-1">{editRejectReason}</p>
            <p className="text-[11px] text-amber-700 mt-1 italic">
              Vui lòng cập nhật lại thông số kỹ thuật hoặc hình ảnh đính kèm theo đúng yêu cầu trên trước khi gửi duyệt lại.
            </p>
          </div>
        </div>
      )}

      {loadingEditData && (
        <div className="flex items-center justify-center p-8 bg-white rounded-xl border border-stone-200">
          <RotateCw className="h-6 w-6 animate-spin text-amber-800" />
          <span className="ml-2 text-sm text-stone-600">Đang tải thông tin yêu cầu cần chỉnh sửa...</span>
        </div>
      )}

      <form onSubmit={handleValidateAndOpenSummary} className="space-y-6">
        {/* ── KHU VỰC 3.1: THÔNG TIN KHÁCH HÀNG & GIAO NHẬN ── */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-amber-800" />
              <h2 className="text-base font-bold text-stone-900">1. Thông tin khách hàng & Giao nhận</h2>
            </div>
            <span className="text-xs text-stone-500">Tái sử dụng dữ liệu & phân quyền khách hàng</span>
          </div>

          {/* Autocomplete tìm khách hàng */}
          <div className="relative">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Tìm kiếm khách hàng có sẵn (Role Khách Hàng)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Nhập tên, số điện thoại hoặc email khách hàng..."
                className="w-full rounded-lg border border-stone-200 pl-9 pr-4 py-2 text-xs focus:border-amber-800 focus:outline-none"
              />
              {searchingCustomers && (
                <RotateCw className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-stone-400" />
              )}
            </div>

            {/* Dropdown kết quả tìm kiếm */}
            {showCustomerDropdown && customerOptions.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-xl">
                {customerOptions.map((c) => (
                  <button
                    key={c.user_account_id || c.customerAccountId}
                    type="button"
                    onClick={() => handleSelectCustomer(c)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-xs hover:bg-stone-50 border-b border-stone-100 last:border-0"
                  >
                    <div>
                      <p className="font-semibold text-stone-900">{c.full_name || c.fullName}</p>
                      <p className="text-[11px] text-stone-500">
                        {c.phone_number || c.phoneNumber} — {c.email || 'Chưa có email'}
                      </p>
                    </div>
                    {c.address && (
                      <span className="text-[11px] text-stone-400 truncate max-w-[200px]">{c.address}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Form chi tiết khách hàng */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
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
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none"
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
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none"
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
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Địa chỉ giao hàng / lắp đặt
              </label>
              <input
                type="text"
                value={customerInfo.deliveryAddress}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, deliveryAddress: e.target.value }))}
                placeholder="VD: Số 123 Đường Nguyễn Trãi, Quận 1, TP.HCM"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ngày mong muốn hoàn thành
              </label>
              <input
                type="date"
                value={customerInfo.expectedDate}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, expectedDate: e.target.value }))}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Loại yêu cầu
              </label>
              <select
                value={customerInfo.orderType}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, orderType: e.target.value }))}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
              >
                <option value="CUSTOM">Đặt may đo theo thiết kế (CUSTOM)</option>
                <option value="READY">Gia công theo mẫu chuẩn (READY)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ngân sách ước tính tối thiểu (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="500000"
                value={customerInfo.budgetMin}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, budgetMin: e.target.value }))}
                placeholder="VD: 10000000"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ngân sách ước tính tối đa (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="500000"
                value={customerInfo.budgetMax}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, budgetMax: e.target.value }))}
                placeholder="VD: 30000000"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tiêu đề & Ghi chú tổng quan về công trình / căn hộ
              </label>
              <input
                type="text"
                value={customerInfo.title}
                onChange={(e) => setCustomerInfo((p) => ({ ...p, title: e.target.value }))}
                placeholder="VD: Thiết kế nội thất phòng ngủ & tủ âm tường Master"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── KHU VỰC 3.2: THÔNG TIN YÊU CẦU KỸ THUẬT VÀ SẢN PHẨM ── */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-800" />
                <h2 className="text-base font-bold text-stone-900">2. Chi tiết sản phẩm & Thông số kỹ thuật</h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Các danh mục lấy từ API dữ liệu thực tế: Loại sản phẩm, Phòng, Chất liệu gỗ, Màu sắc.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-900 transition shrink-0"
            >
              <Plus className="h-4 w-4" />
              Thêm món đồ
            </button>
          </div>

          {/* Danh sách các món sản phẩm */}
          <div className="space-y-4">
            {items.map((it, index) => (
              <div
                key={it.id}
                className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 transition hover:border-amber-300"
              >
                <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-800 text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <h3 className="text-xs font-bold text-stone-800">
                      Món {index + 1}: {it.itemName || 'Chưa đặt tên'}
                    </h3>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa món
                    </button>
                  )}
                </div>

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
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
                    />
                  </div>

                  {/* Danh mục sản phẩm */}
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Danh mục
                    </label>
                    <select
                      value={it.categoryId}
                      onChange={(e) => handleItemChange(it.id, 'categoryId', e.target.value)}
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {metadata.categories.map((c) => (
                        <option key={c.categoryId} value={c.categoryId}>
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
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
                    >
                      <option value="">-- Chọn không gian --</option>
                      {metadata.rooms.map((r) => (
                        <option key={r.roomId} value={r.roomId}>
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
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
                    >
                      <option value="">-- Chọn chất liệu --</option>
                      {metadata.materials.map((m) => (
                        <option key={m.materialId} value={m.materialId}>
                          {m.materialName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Màu sắc */}
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      Màu sắc
                    </label>
                    <select
                      value={it.colorId}
                      onChange={(e) => handleItemChange(it.id, 'colorId', e.target.value)}
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
                    >
                      <option value="">-- Chọn màu sắc --</option>
                      {metadata.colors.map((c) => (
                        <option key={c.colorId} value={c.colorId}>
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
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
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
                      step="100000"
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(it.id, 'unitPrice', e.target.value)}
                      placeholder="VD: 15000000"
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
                    />
                  </div>

                  {/* KÍCH THƯỚC KỸ THUẬT */}
                  <div className="md:col-span-4 rounded-lg border border-stone-200 bg-white p-3">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                      Thông số kích thước đo đạc thực tế (cm)
                    </span>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-stone-600 mb-1">Chiều dài (cm)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.lengthCm}
                          onChange={(e) => handleItemChange(it.id, 'lengthCm', e.target.value)}
                          placeholder="VD: 220"
                          className="w-full rounded border border-stone-200 px-2.5 py-1.5 text-xs focus:border-amber-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1">Chiều rộng / Sâu (cm)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.widthCm}
                          onChange={(e) => handleItemChange(it.id, 'widthCm', e.target.value)}
                          placeholder="VD: 60"
                          className="w-full rounded border border-stone-200 px-2.5 py-1.5 text-xs focus:border-amber-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 mb-1">Chiều cao (cm)</label>
                        <input
                          type="number"
                          min="0"
                          value={it.heightCm}
                          onChange={(e) => handleItemChange(it.id, 'heightCm', e.target.value)}
                          placeholder="VD: 260"
                          className="w-full rounded border border-stone-200 px-2.5 py-1.5 text-xs focus:border-amber-800 focus:outline-none"
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
                      placeholder="VD: Cánh kính viền nhôm đen, ray trượt giảm chấn Hafele, đèn LED cảm ứng âm tủ..."
                      className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tổng tiền dự kiến */}
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-lg bg-stone-100 p-4 border border-stone-200">
            <span className="text-xs text-stone-600">
              Tổng số lượng: <strong className="text-stone-900">{items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} sản phẩm</strong>
            </span>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <span className="text-xs text-stone-600">Tổng kinh phí dự kiến:</span>
              <span className="text-base font-extrabold text-amber-900">
                {formatVND(totalEstimatedAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* ── KHU VỰC HÌNH ẢNH THIẾT KẾ & BẢN VẼ ── */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-amber-800" />
              <h2 className="text-base font-bold text-stone-900">3. Hình ảnh thiết kế & Bản vẽ 3D/2D</h2>
            </div>
            <span className="text-xs text-stone-500">Hỗ trợ gắn ảnh vào toàn bộ yêu cầu hoặc từng sản phẩm</span>
          </div>

          {/* Form thêm ảnh */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs items-end">
            <div className="md:col-span-6">
              <label className="block font-semibold text-stone-700 mb-1">
                Đường dẫn hình ảnh (URL ảnh thiết kế hoặc mockup)
              </label>
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/ban-ve-thiet-ke-1.jpg"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block font-semibold text-stone-700 mb-1">
                Gắn cho món nào?
              </label>
              <select
                value={selectedImageTarget}
                onChange={(e) => setSelectedImageTarget(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white"
              >
                <option value="ALL">Toàn bộ yêu cầu</option>
                {items.map((it, idx) => (
                  <option key={it.id} value={it.id}>
                    Món {idx + 1}: {it.itemName || 'Sản phẩm ' + (idx + 1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="flex-1 rounded-lg border border-amber-800 bg-amber-50 px-3 py-2 font-semibold text-amber-900 hover:bg-amber-100 transition text-center"
              >
                Thêm URL ảnh
              </button>

              <label className="cursor-pointer rounded-lg border border-stone-300 bg-stone-50 p-2 text-stone-700 hover:bg-stone-100 transition" title="Tải ảnh từ máy tính">
                <UploadCloud className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
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
                    className="group relative rounded-xl border border-stone-200 bg-stone-50 overflow-hidden shadow-xs"
                  >
                    <img
                      src={img.imageUrl}
                      alt="Bản vẽ thiết kế"
                      className="h-28 w-full object-cover cursor-pointer transition group-hover:scale-105"
                      onClick={() => setPreviewModalImg(img.imageUrl)}
                    />
                    <div className="p-1.5 bg-white text-[10px] text-stone-600 truncate border-t border-stone-100">
                      {targetItem ? targetItem.itemName : 'Toàn đơn'}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      className="absolute top-1.5 right-1.5 rounded-full bg-red-600/80 p-1 text-white hover:bg-red-700 transition"
                      title="Xóa ảnh"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewModalImg(img.imageUrl)}
                      className="absolute top-1.5 left-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition"
                      title="Phóng to"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-xs text-stone-400">
              Chưa có hình ảnh thiết kế nào được thêm. Hãy dán URL hoặc bấm biểu tượng tải lên để đính kèm bản vẽ.
            </div>
          )}
        </div>

        {/* ── NÚT GỬI DUYỆT ── */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/sale/requests')}
            className="rounded-lg border border-stone-200 bg-white px-5 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 shadow-sm transition"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-800 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-900 transition"
          >
            <Send className="h-4 w-4" />
            {editId ? 'Cập Nhật & Gửi Lại Cho Chủ Xưởng' : 'Kiểm Tra & Gửi Chủ Xưởng Thẩm Định'}
          </button>
        </div>
      </form>

      {/* ── MODAL PHÓNG TO HÌNH ẢNH ── */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewModalImg(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img src={previewModalImg} alt="Phóng to bản vẽ" className="max-h-[85vh] rounded-lg shadow-2xl object-contain" />
            <button
              onClick={() => setPreviewModalImg(null)}
              className="absolute -top-3 -right-3 rounded-full bg-white p-1 text-stone-800 shadow-lg hover:bg-stone-100"
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
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-amber-800" />
                <h3 className="text-base font-bold text-stone-900">
                  Xác nhận thông tin yêu cầu trước khi gửi Chủ xưởng
                </h3>
              </div>
              <button
                onClick={() => setSummaryModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung tóm tắt */}
            <div className="overflow-y-auto p-6 text-xs text-stone-800 space-y-4">
              {/* Khách hàng & Giao nhận */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-amber-800" /> Thông tin khách hàng & Giao nhận
                </h4>
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
                        <th className="px-3 py-2">STT</th>
                        <th className="px-3 py-2">Tên món</th>
                        <th className="px-3 py-2">Kích thước (D x R x C)</th>
                        <th className="px-3 py-2 text-center">SL</th>
                        <th className="px-3 py-2 text-right">Đơn giá ước tính</th>
                        <th className="px-3 py-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {items.map((it, idx) => {
                        const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' x ');
                        const unitPrice = Number(it.unitPrice) || 0;
                        const qty = Number(it.quantity) || 1;
                        return (
                          <tr key={it.id}>
                            <td className="px-3 py-2 text-center text-stone-500">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <p className="font-semibold text-stone-900">{it.itemName}</p>
                              {it.technicalNotes && (
                                <p className="text-[11px] text-stone-500 italic truncate max-w-[200px]">
                                  {it.technicalNotes}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-stone-600 font-mono">
                              {dim ? `${dim} cm` : 'Theo thực tế'}
                            </td>
                            <td className="px-3 py-2 text-center font-bold">{qty}</td>
                            <td className="px-3 py-2 text-right">{formatVND(unitPrice)}</td>
                            <td className="px-3 py-2 text-right font-bold text-amber-900">
                              {formatVND(unitPrice * qty)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-stone-50/80 font-bold border-t border-stone-200">
                      <tr>
                        <td colSpan="5" className="px-3 py-2 text-right">Tổng kinh phí ước tính:</td>
                        <td className="px-3 py-2 text-right text-amber-900 text-sm">
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
                  <div className="flex flex-wrap gap-2">
                    {images.map((img) => (
                      <img
                        key={img.id}
                        src={img.imageUrl}
                        alt="Bản vẽ"
                        className="h-16 w-16 object-cover rounded-lg border border-stone-200"
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
                className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100 transition"
              >
                Chỉnh sửa lại
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-5 py-2 font-bold text-white shadow-md hover:bg-amber-900 disabled:opacity-50 transition"
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
