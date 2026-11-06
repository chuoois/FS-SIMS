import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Sparkles,
  Package,
  Layers,
  Ruler,
  DollarSign,
  Palette,
  Home,
  Check,
  RotateCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
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

export const CustomOrderForm = ({ metadata, products = [], editRequestId, onCancelEdit }) => {
  const navigate = useNavigate();

  // 1. Danh sách khách hàng
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isManualCustomer, setIsManualCustomer] = useState(false);

  // 2. Thông tin khách hàng
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // 3. Thông tin chung đơn hàng
  const [orderTitle, setOrderTitle] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [generalNote, setGeneralNote] = useState('');

  // 4. Danh sách sản phẩm kỹ thuật
  const [items, setItems] = useState([
    {
      id: 1,
      productId: '',
      categoryId: '',
      roomId: '',
      materialId: '',
      colorId: '',
      lengthCm: '',
      widthCm: '',
      heightCm: '',
      quantity: 1,
      unitPrice: 0,
      customRequirements: '',
      technicalNotes: '',
    },
  ]);

  // 5. Danh sách hình ảnh thiết kế
  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageType, setNewImageType] = useState('OVERALL'); // OVERALL | DETAILED
  const [newImageItemIndex, setNewImageItemIndex] = useState('');

  // 6. Modal xác nhận
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingEditData, setLoadingEditData] = useState(false);

  // Load danh sách khách hàng
  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoadingCustomers(true);
        const res = await getCustomers();
        if (res.data) {
          setCustomers(res.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách khách hàng:', err);
      } finally {
        setLoadingCustomers(false);
      }
    }
    fetchCustomers();
  }, []);

  // Nếu có editRequestId -> Load dữ liệu cũ
  useEffect(() => {
    if (!editRequestId) return;
    async function loadRequestData() {
      try {
        setLoadingEditData(true);
        const res = await getRequestById(editRequestId);
        if (res.data) {
          const req = res.data;
          setOrderTitle(req.title || '');
          setExpectedDate(req.expectedCompletionDate ? req.expectedCompletionDate.substring(0, 10) : '');
          setGeneralNote(req.generalNote || '');
          setCustomerName(req.customerName || '');
          setCustomerPhone(req.customerPhone || '');
          setCustomerEmail(req.customerEmail || '');
          setCustomerAddress(req.customerAddress || '');
          if (req.customerId) {
            setSelectedCustomerId(String(req.customerId));
          } else {
            setIsManualCustomer(true);
          }

          if (req.items && req.items.length > 0) {
            setItems(
              req.items.map((it, idx) => ({
                id: idx + 1,
                productId: it.productId ? String(it.productId) : '',
                categoryId: it.categoryId ? String(it.categoryId) : '',
                roomId: it.roomId ? String(it.roomId) : '',
                materialId: it.materialId ? String(it.materialId) : '',
                colorId: it.colorId ? String(it.colorId) : '',
                lengthCm: it.lengthCm ?? '',
                widthCm: it.widthCm ?? '',
                heightCm: it.heightCm ?? '',
                quantity: it.quantity || 1,
                unitPrice: it.unitPrice || 0,
                customRequirements: it.customRequirements || '',
                technicalNotes: it.technicalNotes || '',
              }))
            );
          }

          if (req.images && req.images.length > 0) {
            setImages(
              req.images.map((img) => ({
                imageUrl: img.imageUrl,
                imageType: img.imageType || 'OVERALL',
                itemIndex: img.itemIndex != null ? String(img.itemIndex) : '',
              }))
            );
          }
        }
      } catch (err) {
        console.error('Lỗi tải yêu cầu thiết kế để sửa:', err);
        toast.error('Không thể tải thông tin đơn hàng cần chỉnh sửa');
      } finally {
        setLoadingEditData(false);
      }
    }
    loadRequestData();
  }, [editRequestId]);

  // Xử lý chọn khách hàng từ dropdown
  const handleSelectCustomer = (customerId) => {
    setSelectedCustomerId(customerId);
    if (!customerId) return;
    const c = customers.find((cust) => String(cust.userId || cust.customer_id) === String(customerId));
    if (c) {
      setCustomerName(c.fullName || c.full_name || '');
      setCustomerPhone(c.phone || '');
      setCustomerEmail(c.email || '');
      setCustomerAddress(c.address || '');
    }
  };

  // Thêm / Xóa / Cập nhật sản phẩm
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        productId: '',
        categoryId: '',
        roomId: '',
        materialId: '',
        colorId: '',
        lengthCm: '',
        widthCm: '',
        heightCm: '',
        quantity: 1,
        unitPrice: 0,
        customRequirements: '',
        technicalNotes: '',
      },
    ]);
  };

  const handleRemoveItem = (id) => {
    if (items.length <= 1) {
      toast.error('Đơn hàng cần có ít nhất một sản phẩm!');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Khi chọn sản phẩm mẫu: tự động điền các thông tin tham chiếu
          if (field === 'productId' && value) {
            const p = products.find((prod) => String(prod.productId) === String(value));
            if (p) {
              if (p.categoryId) updated.categoryId = String(p.categoryId);
              if (p.roomId) updated.roomId = String(p.roomId);
              if (p.materialId) updated.materialId = String(p.materialId);
              if (p.colorId) updated.colorId = String(p.colorId);
              if (p.dimensions?.length) updated.lengthCm = p.dimensions.length;
              if (p.dimensions?.width) updated.widthCm = p.dimensions.width;
              if (p.dimensions?.height) updated.heightCm = p.dimensions.height;
              if (p.price) updated.unitPrice = p.price;
              if (p.description && !updated.customRequirements) updated.customRequirements = p.description;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Thêm / Xóa ảnh thiết kế
  const handleAddImage = () => {
    if (!newImageUrl.trim()) {
      toast.error('Vui lòng nhập đường dẫn (URL) hình ảnh thiết kế!');
      return;
    }
    setImages((prev) => [
      ...prev,
      {
        imageUrl: newImageUrl.trim(),
        imageType: newImageType,
        itemIndex: newImageItemIndex !== '' ? Number(newImageItemIndex) : null,
      },
    ]);
    setNewImageUrl('');
    setNewImageItemIndex('');
    toast.success('Đã thêm hình ảnh thiết kế');
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Tính tổng số lượng & giá trị ước tính
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0), 0);
  }, [items]);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  }, [items]);

  // Mở modal kiểm tra trước khi gửi
  const handleValidateAndReview = (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error('Vui lòng nhập họ và tên khách hàng');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Vui lòng nhập số điện thoại khách hàng');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.quantity || Number(it.quantity) < 1) {
        toast.error(`Sản phẩm #${i + 1}: Số lượng phải từ 1 trở lên`);
        return;
      }
    }

    setReviewModalOpen(true);
  };

  // Gửi đơn cho Owner duyệt
  const handleSubmitToOwner = async () => {
    try {
      setIsSubmitting(true);
      const payload = {
        customer_id: selectedCustomerId && !isManualCustomer ? Number(selectedCustomerId) : null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        customer_address: customerAddress.trim() || null,
        title: orderTitle.trim() || `Đơn hàng thiết kế - ${customerName}`,
        order_type: 'CUSTOM',
        expected_completion_date: expectedDate || null,
        general_note: generalNote.trim() || null,
        items: items.map((it) => ({
          product_id: it.productId ? Number(it.productId) : null,
          category_id: it.categoryId ? Number(it.categoryId) : null,
          room_id: it.roomId ? Number(it.roomId) : null,
          material_id: it.materialId ? Number(it.materialId) : null,
          color_id: it.colorId ? Number(it.colorId) : null,
          length_cm: it.lengthCm !== '' ? Number(it.lengthCm) : null,
          width_cm: it.widthCm !== '' ? Number(it.widthCm) : null,
          height_cm: it.heightCm !== '' ? Number(it.heightCm) : null,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unitPrice) || 0,
          custom_requirements: it.customRequirements.trim() || null,
          technical_notes: it.technicalNotes.trim() || null,
        })),
        images: images.map((img) => ({
          image_url: img.imageUrl,
          image_type: img.imageType || 'OVERALL',
          item_index: img.itemIndex != null ? Number(img.itemIndex) : null,
        })),
      };

      if (editRequestId) {
        await updateSalesOrderRequest(editRequestId, payload);
        toast.success('Cập nhật và gửi lại đơn hàng cho Chủ xưởng thành công!');
      } else {
        await createSalesOrderRequest(payload);
        toast.success('Đã gửi đơn hàng thiết kế cho Chủ xưởng duyệt thành công!');
      }

      setReviewModalOpen(false);
      navigate('/sale/requests');
    } catch (err) {
      console.error('Lỗi khi gửi đơn hàng thiết kế:', err);
      toast.error(err.response?.data?.message || err.message || 'Không thể gửi đơn hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingEditData) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <RotateCw className="h-6 w-6 animate-spin text-amber-800" />
        <span className="ml-2 text-sm text-stone-600">Đang tải thông tin đơn hàng cần chỉnh sửa...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleValidateAndReview} className="flex flex-col gap-6">
      {editRequestId && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-700" />
            <div>
              <p className="font-bold text-sm">Chế độ chỉnh sửa đơn hàng #{editRequestId}</p>
              <p className="text-xs text-amber-800">
                Cập nhật thông số kỹ thuật hoặc hình ảnh theo phản hồi của Chủ xưởng, sau đó gửi lại phê duyệt.
              </p>
            </div>
          </div>
          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Hủy chỉnh sửa
            </button>
          )}
        </div>
      )}

      {/* ── THẺ 1: THÔNG TIN KHÁCH HÀNG & TIẾN ĐỘ ──────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-amber-800" />
            <h2 className="text-base font-bold text-stone-900">1. Thông tin Khách hàng & Kế hoạch</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsManualCustomer(!isManualCustomer);
              if (!isManualCustomer) setSelectedCustomerId('');
            }}
            className="text-xs font-medium text-amber-800 hover:underline"
          >
            {isManualCustomer ? '← Chọn từ danh sách tài khoản khách hàng' : '+ Nhập khách hàng vãng lai / mới'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Dropdown Khách hàng */}
          {!isManualCustomer ? (
            <div className="lg:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-stone-700">
                Chọn tài khoản Khách hàng từ hệ thống <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomer(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs font-medium text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              >
                <option value="">-- Chọn khách hàng sẵn có --</option>
                {customers.map((c) => (
                  <option key={c.userId || c.customer_id} value={c.userId || c.customer_id}>
                    {c.fullName || c.full_name} - SĐT: {c.phone || 'Chưa có'} - Email: {c.email || 'Chưa có'}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700">
              Họ và tên khách hàng <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                required
                placeholder="Nguyễn Văn A"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-xs text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700">
              Số điện thoại liên hệ <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="tel"
                required
                placeholder="0912345678"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-xs text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700">Email khách hàng</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="email"
                placeholder="khachhang@gmail.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-xs text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-stone-700">Địa chỉ giao hàng</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-xs text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700">Ngày hẹn hoàn thành dự kiến</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-xs text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-stone-700">Tiêu đề / Tên dự án may đo</label>
            <input
              type="text"
              placeholder="VD: May đo bàn ghế sofa gỗ óc chó phòng khách..."
              value={orderTitle}
              onChange={(e) => setOrderTitle(e.target.value)}
              className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700">Ghi chú chung cho đơn hàng</label>
            <input
              type="text"
              placeholder="Ghi chú về khách hàng, yêu cầu tiến độ đặc biệt..."
              value={generalNote}
              onChange={(e) => setGeneralNote(e.target.value)}
              className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>
        </div>
      </div>

      {/* ── THẺ 2: DANH SÁCH SẢN PHẨM MAY ĐO (ITEMS) ─────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-800" />
            <h2 className="text-base font-bold text-stone-900">
              2. Danh sách Sản phẩm May đo ({items.length} món)
            </h2>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 rounded-lg bg-amber-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-900 transition"
          >
            <Plus className="h-4 w-4" />
            Thêm sản phẩm vào đơn
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 transition hover:border-amber-300"
            >
              {/* Header của từng sản phẩm */}
              <div className="mb-3 flex items-center justify-between border-b border-stone-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-800 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="font-bold text-sm text-stone-900">
                    Sản phẩm #{index + 1}
                  </span>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa sản phẩm này
                  </button>
                )}
              </div>

              {/* Lưới các trường danh mục & kỹ thuật */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                {/* 1. Mẫu sản phẩm tham khảo (tùy chọn) */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-stone-700">
                    Mẫu sản phẩm có sẵn (tùy chọn tự điền)
                  </label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleUpdateItem(item.id, 'productId', e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                  >
                    <option value="">-- Tùy chỉnh tự do (hoặc chọn mẫu) --</option>
                    {products.map((p) => (
                      <option key={p.productId} value={p.productId}>
                        {p.productCode} - {p.productName} ({formatVND(p.price)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Loại / Danh mục sản phẩm */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={item.categoryId}
                    onChange={(e) => handleUpdateItem(item.id, 'categoryId', e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {(metadata.categories || []).map((cat) => (
                      <option key={cat.categoryId || cat.category_id} value={cat.categoryId || cat.category_id}>
                        {cat.categoryName || cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Không gian phòng */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Không gian phòng</label>
                  <select
                    value={item.roomId}
                    onChange={(e) => handleUpdateItem(item.id, 'roomId', e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                  >
                    <option value="">-- Chọn phòng --</option>
                    {(metadata.rooms || []).map((rm) => (
                      <option key={rm.roomId || rm.room_id} value={rm.roomId || rm.room_id}>
                        {rm.roomName || rm.room_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Chất liệu / Loại gỗ */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">
                    Chất liệu / Gỗ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={item.materialId}
                    onChange={(e) => handleUpdateItem(item.id, 'materialId', e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                  >
                    <option value="">-- Chọn chất liệu --</option>
                    {(metadata.materials || []).map((m) => (
                      <option key={m.materialId || m.material_id} value={m.materialId || m.material_id}>
                        {m.materialName || m.material_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Màu sắc */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Màu sắc</label>
                  <select
                    value={item.colorId}
                    onChange={(e) => handleUpdateItem(item.id, 'colorId', e.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                  >
                    <option value="">-- Chọn màu sắc --</option>
                    {(metadata.colors || []).map((c) => (
                      <option key={c.colorId || c.color_id} value={c.colorId || c.color_id}>
                        {c.colorName || c.color_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Chiều dài (cm) */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Dài (cm)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 180"
                    value={item.lengthCm}
                    onChange={(e) => handleUpdateItem(item.id, 'lengthCm', e.target.value)}
                    className="w-full rounded-lg border border-stone-300 py-1.5 px-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                {/* 7. Chiều rộng (cm) */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Rộng (cm)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 90"
                    value={item.widthCm}
                    onChange={(e) => handleUpdateItem(item.id, 'widthCm', e.target.value)}
                    className="w-full rounded-lg border border-stone-300 py-1.5 px-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                {/* 8. Chiều cao (cm) */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Cao (cm)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 75"
                    value={item.heightCm}
                    onChange={(e) => handleUpdateItem(item.id, 'heightCm', e.target.value)}
                    className="w-full rounded-lg border border-stone-300 py-1.5 px-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                {/* 9. Số lượng */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">
                    Số lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full rounded-lg border border-stone-300 py-1.5 px-2 text-xs font-bold text-stone-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                {/* 10. Đơn giá ước tính */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Đơn giá ước tính (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={item.unitPrice}
                    onChange={(e) => handleUpdateItem(item.id, 'unitPrice', Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full rounded-lg border border-stone-300 py-1.5 px-2 text-xs font-bold text-amber-800 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                {/* 11. Thành tiền ước tính */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-500">Thành tiền món</label>
                  <div className="rounded-lg bg-stone-200/60 py-1.5 px-2 text-xs font-bold text-stone-900">
                    {formatVND((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0))}
                  </div>
                </div>

                {/* 12. Mô tả yêu cầu gia công */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Mô tả yêu cầu thiết kế</label>
                  <textarea
                    rows="2"
                    placeholder="Mô tả kiểu dáng, họa tiết, bo góc, rãnh trang trí..."
                    value={item.customRequirements}
                    onChange={(e) => handleUpdateItem(item.id, 'customRequirements', e.target.value)}
                    className="w-full rounded-lg border border-stone-300 p-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                {/* 13. Ghi chú kỹ thuật */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Ghi chú kỹ thuật thợ xưởng</label>
                  <textarea
                    rows="2"
                    placeholder="Loại sơn, độ dày gỗ, phụ kiện bản lề, ray trượt..."
                    value={item.technicalNotes}
                    onChange={(e) => handleUpdateItem(item.id, 'technicalNotes', e.target.value)}
                    className="w-full rounded-lg border border-stone-300 p-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── THẺ 3: HÌNH ẢNH BẢN VẼ / THIẾT KẾ ──────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-amber-800" />
            <h2 className="text-base font-bold text-stone-900">
              3. Hình ảnh Bản vẽ & Phối cảnh Thiết kế ({images.length} ảnh)
            </h2>
          </div>
        </div>

        {/* Input thêm URL ảnh */}
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-dashed border-stone-300 bg-stone-50/50 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-stone-700">
              Đường dẫn hình ảnh thiết kế (Image URL)
            </label>
            <input
              type="url"
              placeholder="https://example.com/images/thiet-ke-1.jpg"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              className="w-full rounded-lg border border-stone-300 p-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
            />
          </div>

          <div className="w-48">
            <label className="mb-1 block text-xs font-semibold text-stone-700">Phân loại ảnh</label>
            <select
              value={newImageType}
              onChange={(e) => setNewImageType(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
            >
              <option value="OVERALL">Toàn đơn (Tổng thể)</option>
              <option value="DETAILED">Chi tiết từng món</option>
            </select>
          </div>

          <div className="w-48">
            <label className="mb-1 block text-xs font-semibold text-stone-700">Gán cho món cụ thể</label>
            <select
              value={newImageItemIndex}
              onChange={(e) => setNewImageItemIndex(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
            >
              <option value="">Toàn bộ đơn hàng</option>
              {items.map((_, idx) => (
                <option key={idx} value={idx}>
                  Sản phẩm #{idx + 1}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleAddImage}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-800 px-4 py-2 text-xs font-bold text-white hover:bg-stone-900 transition"
          >
            <Plus className="h-4 w-4" />
            Thêm ảnh
          </button>
        </div>

        {/* Danh sách ảnh đã thêm */}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-sm"
              >
                <div className="aspect-square w-full overflow-hidden bg-stone-200">
                  <img
                    src={img.imageUrl}
                    alt={`Thiết kế #${idx + 1}`}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/400x400/e2e8f0/64748b?text=Anh+Thiet+Ke';
                    }}
                  />
                </div>
                <div className="p-2 text-[11px] text-stone-700">
                  <span className="font-bold text-amber-800">
                    {img.imageType === 'OVERALL' ? 'Toàn bộ đơn' : 'Chi tiết món'}
                  </span>
                  {img.itemIndex != null && (
                    <span className="ml-1 text-stone-500">• Món #{Number(img.itemIndex) + 1}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-red-600/80 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-700"
                  title="Xóa ảnh"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs text-stone-400 py-4 italic">
            Chưa có hình ảnh thiết kế nào. Bạn có thể thêm nhiều ảnh phối cảnh hoặc bản vẽ kỹ thuật để Chủ xưởng phê duyệt.
          </p>
        )}
      </div>

      {/* ── THẺ 4: TỔNG KẾT & NÚT GỬI DUYỆT ──────────────────── */}
      <div className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-stone-500">Tổng số món sản phẩm</p>
            <p className="text-lg font-bold text-stone-900">{items.length} hạng mục</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Tổng số lượng</p>
            <p className="text-lg font-bold text-stone-900">{totalQuantity} cái</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Tổng giá trị ước tính</p>
            <p className="text-xl font-extrabold text-amber-900">{formatVND(totalAmount)}</p>
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-800 px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-amber-900 transition"
        >
          <Sparkles className="h-4 w-4" />
          {editRequestId ? 'XEM LẠI & GỬI LẠI CHỦ XƯỞNG DUYỆT' : 'XEM LẠI & GỬI CHỦ XƯỞNG DUYỆT THIẾT KẾ'}
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════
          MODAL XEM LẠI VÀ XÁC NHẬN GỬI CHO OWNER DUYỆT
          ═════════════════════════════════════════════════════════ */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold">Xác nhận Đơn hàng May đo & Thiết kế</h3>
                  <p className="text-xs text-stone-400">
                    Vui lòng kiểm tra lại đầy đủ thông số trước khi gửi Chủ xưởng phê duyệt
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="overflow-y-auto p-6 space-y-5">
              {/* Thông tin Khách hàng */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 text-xs">
                <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-amber-800" />
                  Thông tin Khách hàng
                </h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <span className="text-stone-500">Khách hàng:</span>
                    <p className="font-semibold text-stone-800">{customerName}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Số điện thoại:</span>
                    <p className="font-semibold text-stone-800">{customerPhone}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Email:</span>
                    <p className="font-semibold text-stone-800">{customerEmail || '—'}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Ngày hẹn hoàn thành:</span>
                    <p className="font-semibold text-stone-800">{expectedDate || 'Thỏa thuận'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-stone-500">Địa chỉ giao:</span>
                    <p className="font-semibold text-stone-800">{customerAddress || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-stone-500">Tiêu đề đơn:</span>
                    <p className="font-semibold text-stone-800">{orderTitle || `Đơn hàng thiết kế - ${customerName}`}</p>
                  </div>
                </div>
              </div>

              {/* Danh sách sản phẩm */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5 text-xs">
                  <Package className="h-4 w-4 text-amber-800" />
                  Chi tiết kỹ thuật từng sản phẩm ({items.length} món)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-stone-200 bg-stone-100 text-[11px] font-bold text-stone-700">
                      <tr>
                        <th className="p-2.5">STT</th>
                        <th className="p-2.5">Danh mục / Không gian</th>
                        <th className="p-2.5">Chất liệu & Màu</th>
                        <th className="p-2.5">Kích thước (D x R x C cm)</th>
                        <th className="p-2.5 text-center">SL</th>
                        <th className="p-2.5 text-right">Đơn giá ước tính</th>
                        <th className="p-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {items.map((it, idx) => {
                        const cat = (metadata.categories || []).find(
                          (c) => String(c.categoryId || c.category_id) === String(it.categoryId)
                        );
                        const rm = (metadata.rooms || []).find(
                          (r) => String(r.roomId || r.room_id) === String(it.roomId)
                        );
                        const mat = (metadata.materials || []).find(
                          (m) => String(m.materialId || m.material_id) === String(it.materialId)
                        );
                        const clr = (metadata.colors || []).find(
                          (c) => String(c.colorId || c.color_id) === String(it.colorId)
                        );
                        const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' x ');

                        return (
                          <tr key={it.id} className="hover:bg-stone-50">
                            <td className="p-2.5 font-bold text-stone-500">#{idx + 1}</td>
                            <td className="p-2.5">
                              <p className="font-bold text-stone-900">{cat?.categoryName || cat?.category_name || 'Tùy chỉnh'}</p>
                              <p className="text-[10px] text-stone-500">{rm?.roomName || rm?.room_name || 'Phòng chung'}</p>
                            </td>
                            <td className="p-2.5">
                              <p className="font-semibold text-stone-800">{mat?.materialName || mat?.material_name || 'Gỗ tự nhiên'}</p>
                              <p className="text-[10px] text-stone-500">{clr?.colorName || clr?.color_name || 'Màu tiêu chuẩn'}</p>
                            </td>
                            <td className="p-2.5 font-mono text-stone-700">
                              {dim ? `${dim} cm` : 'Theo tỷ lệ xưởng'}
                            </td>
                            <td className="p-2.5 text-center font-bold text-stone-900">{it.quantity}</td>
                            <td className="p-2.5 text-right text-stone-700">{formatVND(it.unitPrice)}</td>
                            <td className="p-2.5 text-right font-bold text-amber-800">
                              {formatVND((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t border-stone-200 bg-stone-50 font-bold">
                      <tr>
                        <td colSpan="4" className="p-2.5 text-right text-stone-700">
                          Tổng cộng:
                        </td>
                        <td className="p-2.5 text-center text-stone-900">{totalQuantity} cái</td>
                        <td></td>
                        <td className="p-2.5 text-right text-base text-amber-900">{formatVND(totalAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Hình ảnh thiết kế */}
              {images.length > 0 && (
                <div>
                  <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5 text-xs">
                    <ImageIcon className="h-4 w-4 text-amber-800" />
                    Hình ảnh thiết kế ({images.length} ảnh)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="h-16 w-16 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                        <img
                          src={img.imageUrl}
                          alt="preview"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/100x100/e2e8f0/64748b?text=Img';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                Quay lại chỉnh sửa
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitToOwner}
                className="flex items-center gap-2 rounded-lg bg-amber-800 px-6 py-2 text-xs font-bold text-white hover:bg-amber-900 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Đang gửi đơn...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {editRequestId ? 'Xác nhận cập nhật & Gửi lại' : 'Xác nhận gửi Chủ xưởng phê duyệt'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
