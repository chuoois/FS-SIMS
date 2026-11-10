// =========================================================
// CreateOrderPage.jsx
// Giao diện Tạo Đơn Hàng Tại Quầy (POS) cho Nhân viên Bán hàng (Role Sale)
//
// Bố cục:
// - Bên phải: Danh sách sản phẩm trong kho (giá bán, tồn kho, lọc, xem chi tiết)
// - Bên trái: Giỏ hàng & Thông tin khách hàng (chỉnh số lượng, tính tiền)
// - Quy trình: Tạo hợp đồng -> Chốt & Ký hợp đồng -> Tạo đơn hàng
//
// Kết nối trực tiếp qua saleOrderService (Controller riêng biệt, không conflict)
// =========================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  RotateCw,
  Eye,
  Plus,
  Minus,
  Trash2,
  Package,
  Layers,
  FileText,
  CheckCircle2,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ChevronRight,
  X,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Printer,
  PenTool,
} from 'lucide-react';
import { PrintContractModal } from '../../components/common/PrintContractModal';
import toast from 'react-hot-toast';
import {
  getWarehouseProducts,
  getProductMetadata,
  getProductDetail,
  createOfflineContract,
  signContract,
  createOrderFromContract,
} from '../../services/saleOrderService';
import { TablePagination } from '../../components/common/TablePagination';

// Hàm định dạng tiền tệ VND
const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const CreateOrderPage = () => {
  const navigate = useNavigate();

  // ── 1. States Sản phẩm trong kho (Bên phải) ────────────────
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [metadata, setMetadata] = useState({ categories: [], rooms: [], materials: [], colors: [] });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRoom, setSelectedRoom] = useState('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 12,
  });

  // ── 2. Modal Chi tiết Sản phẩm ──────────────────────────────
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── 3. States Giỏ hàng (Bên trái) ───────────────────────────
  const [cartItems, setCartItems] = useState([]);

  // ── 4. Form Thông tin Khách hàng ────────────────────────────
  const [customerInfo, setCustomerInfo] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    deliveryDate: '',
    depositAmount: 0,
    signedPlace: 'Cửa hàng Góc Nhà',
    note: '',
  });

  // ── 5. Modal Biên bản Hợp đồng & Chốt đơn ──────────────────
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [currentContract, setCurrentContract] = useState(null);
  const [isSubmittingContract, setIsSubmittingContract] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderCreatedResult, setOrderCreatedResult] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [paperSignedContractFileUrl, setPaperSignedContractFileUrl] = useState('');

  // ── Lấy danh mục, phòng phục vụ lọc ────────────────────────
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const res = await getProductMetadata();
        if (res.data) setMetadata(res.data);
      } catch (err) {
        console.error('Lỗi khi tải metadata sản phẩm:', err);
      }
    }
    fetchMetadata();
  }, []);

  // ── Tải danh sách sản phẩm theo bộ lọc & phân trang ────────
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const params = {
        page,
        limit,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedCategory !== 'ALL') params.category_id = selectedCategory;
      if (selectedRoom !== 'ALL') params.room_id = selectedRoom;
      if (selectedStockStatus !== 'ALL') params.stock_status = selectedStockStatus;

      const res = await getWarehouseProducts(params);
      setProducts(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Lỗi khi tải danh sách sản phẩm:', err);
      toast.error('Không thể tải danh sách sản phẩm trong kho');
    } finally {
      setLoadingProducts(false);
    }
  }, [page, limit, search, selectedCategory, selectedRoom, selectedStockStatus]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Xử lý Xem Chi tiết Sản phẩm ─────────────────────────────
  const handleOpenDetail = async (product) => {
    try {
      setDetailModalOpen(true);
      setSelectedProduct(product);
      setLoadingDetail(true);
      const res = await getProductDetail(product.productId);
      if (res.data) {
        setSelectedProduct(res.data);
      }
    } catch (err) {
      console.error('Lỗi lấy chi tiết sản phẩm:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Xử lý Giỏ hàng ──────────────────────────────────────────
  const handleAddToCart = (product) => {
    if (!product || product.stockQuantity <= 0) {
      toast.error('Sản phẩm đã hết hàng trong kho!');
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.productId === product.productId);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          toast.error(`Sản phẩm "${product.productName}" chỉ còn ${product.stockQuantity} cái trong kho.`);
          return prev;
        }
        toast.success(`Đã tăng số lượng "${product.productName}"`);
        return prev.map((item) =>
          item.product.productId === product.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        toast.success(`Đã thêm "${product.productName}" vào đơn`);
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: product.price,
          },
        ];
      }
    });
  };

  const handleUpdateQuantity = (productId, newQty) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.product.productId === productId) {
            const maxStock = item.product.stockQuantity;
            if (newQty <= 0) return null; // Sẽ bị xóa
            if (newQty > maxStock) {
              toast.error(`Kho chỉ còn ${maxStock} sản phẩm "${item.product.productName}".`);
              return { ...item, quantity: maxStock };
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const handleRemoveFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.product.productId !== productId));
    toast.success('Đã bỏ sản phẩm khỏi giỏ');
  };

  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ sản phẩm trong giỏ hàng?')) {
      setCartItems([]);
      toast.success('Đã làm trống giỏ hàng');
    }
  };

  // ── Tính tổng tiền giỏ hàng ─────────────────────────────────
  const { totalQuantity, totalAmount } = useMemo(() => {
    return cartItems.reduce(
      (acc, item) => ({
        totalQuantity: acc.totalQuantity + item.quantity,
        totalAmount: acc.totalAmount + item.quantity * item.unitPrice,
      }),
      { totalQuantity: 0, totalAmount: 0 }
    );
  }, [cartItems]);

  // ── Tự động tính tiền cọc theo quy tắc nghiệp vụ ──────────
  // Đơn hàng > 10.000.000 VNĐ: mặc định cọc 30%
  // Đơn hàng ≤ 10.000.000 VNĐ: mặc định cọc 0đ (không bắt buộc)
  useEffect(() => {
    if (totalAmount > 10000000) {
      const defaultDeposit = Math.round(totalAmount * 0.3);
      setCustomerInfo((prev) => ({ ...prev, depositAmount: defaultDeposit }));
    } else {
      setCustomerInfo((prev) => ({ ...prev, depositAmount: 0 }));
    }
  }, [totalAmount]);

  // ── BƯỚC 1: BẤM NÚT TẠO HỢP ĐỒNG ────────────────────────────
  const handleStartContractCreation = async (e) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất một sản phẩm từ danh sách bên phải.');
      return;
    }

    if (!customerInfo.customerName.trim()) {
      toast.error('Vui lòng nhập họ tên khách hàng.');
      return;
    }

    if (!customerInfo.customerPhone.trim()) {
      toast.error('Vui lòng nhập số điện thoại khách hàng.');
      return;
    }

    const minRequiredDeposit = totalAmount > 10000000 ? Math.round(totalAmount * 0.3) : 0;
    if (totalAmount > 10000000 && Number(customerInfo.depositAmount) < minRequiredDeposit) {
      toast.error(
        `Đơn hàng trên 10 triệu yêu cầu đặt cọc tối thiểu 30% (${formatVND(minRequiredDeposit)}).`
      );
      return;
    }

    if (customerInfo.depositAmount > totalAmount) {
      toast.error('Số tiền đặt cọc không được lớn hơn tổng giá trị đơn hàng.');
      return;
    }

    try {
      setIsSubmittingContract(true);
      const payload = {
        customer_name: customerInfo.customerName.trim(),
        customer_phone: customerInfo.customerPhone.trim(),
        customer_address: customerInfo.customerAddress.trim() || null,
        deposit_amount: Number(customerInfo.depositAmount) || 0,
        delivery_date: customerInfo.deliveryDate || null,
        signed_place: customerInfo.signedPlace.trim() || 'Cửa hàng Góc Nhà',
        note: customerInfo.note.trim() || null,
        items: cartItems.map((it) => ({
          productId: it.product.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      };

      const res = await createOfflineContract(payload);
      if (res.data) {
        setCurrentContract(res.data);
        setOrderCreatedResult(null);
        setContractModalOpen(true);
        toast.success('Đã lập biên bản hợp đồng! Vui lòng kiểm tra và ký chốt.');
      }
    } catch (err) {
      console.error('Lỗi tạo hợp đồng:', err);
      toast.error(err.response?.data?.message || err.message || 'Không thể tạo hợp đồng');
    } finally {
      setIsSubmittingContract(false);
    }
  };

  // ── BƯỚC 2: CHỐT VÀ KÝ HỢP ĐỒNG (SIGNED) ─────────────────────
  const handleSignContract = async () => {
    if (!currentContract) return;

    try {
      setIsSigning(true);
      const res = await signContract(currentContract.contractId, {
        signed_place: customerInfo.signedPlace || 'Cửa hàng Góc Nhà',
      });
      if (res.data) {
        setCurrentContract(res.data);
        toast.success('Hợp đồng đã được ký kết thành công! Bây giờ bạn có thể tạo đơn hàng.');
      }
    } catch (err) {
      console.error('Lỗi khi ký hợp đồng:', err);
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi ký hợp đồng');
    } finally {
      setIsSigning(false);
    }
  };

  // ── BƯỚC 3: TẠO ĐƠN HÀNG TỪ HỢP ĐỒNG ĐÃ KÝ ──────────────────
  const handleCreateOrder = async () => {
    if (!currentContract || currentContract.status !== 'SIGNED') {
      toast.error('Hợp đồng phải được ký trước khi tạo đơn hàng.');
      return;
    }

    try {
      setIsCreatingOrder(true);
      const res = await createOrderFromContract(currentContract.contractId);
      if (res.data) {
        setOrderCreatedResult(res.data);
        toast.success(`Tạo đơn hàng ${res.data.orderCode} thành công!`);

        // Làm trống giỏ hàng và reset thông tin khách hàng
        setCartItems([]);
        setCustomerInfo({
          customerName: '',
          customerPhone: '',
          customerAddress: '',
          deliveryDate: '',
          depositAmount: 0,
          signedPlace: 'Cửa hàng Góc Nhà',
          note: '',
        });

        // Tải lại sản phẩm trong kho để cập nhật tồn kho vừa trừ
        fetchProducts();
      }
    } catch (err) {
      console.error('Lỗi khi tạo đơn hàng:', err);
      toast.error(err.response?.data?.message || err.message || 'Không thể tạo đơn hàng');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // ── Đóng modal và reset trạng thái hợp đồng ──────────────────
  const handleCloseContractModal = () => {
    setContractModalOpen(false);
    setCurrentContract(null);
    setOrderCreatedResult(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header trang POS ─────────────────────────────────── */}
      <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Tạo Đơn Hàng Tại Quầy (POS)</h1>
          <p className="text-xs text-stone-500">
            Chọn sản phẩm từ kho bên phải, lập hợp đồng và chốt đơn hàng nhanh chóng
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
              setSelectedRoom('ALL');
              setSelectedStockStatus('ALL');
              setPage(1);
              fetchProducts();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Làm mới kho
          </button>
          <button
            onClick={() => navigate('/sale/orders')}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            <Package className="h-3.5 w-3.5 text-stone-500" />
            Danh sách đơn hàng
          </button>
          <button
            onClick={() => navigate('/sale/contracts')}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            <FileText className="h-3.5 w-3.5 text-amber-600" />
            Danh sách hợp đồng
          </button>
        </div>
      </div>

      {/* ── BỐ CỤC 2 CỘT CHÍNH ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ═════════════════════════════════════════════════════
            CỘT BÊN TRÁI: GIỎ HÀNG & THÔNG TIN KHÁCH HÀNG (lg:col-span-5)
            ═════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          {/* Card Giỏ hàng */}
          <div className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-amber-700" />
                <h2 className="text-sm font-bold text-stone-900">Giỏ hàng đã chọn</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {totalQuantity} món
                </span>
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa tất cả
                </button>
              )}
            </div>

            {/* Danh sách các món trong giỏ */}
            <div className="max-h-[340px] divide-y divide-stone-100 overflow-y-auto p-2">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-stone-700">Giỏ hàng đang trống</p>
                  <p className="mt-1 text-xs text-stone-500">
                    Hãy chọn sản phẩm từ danh sách trong kho bên phải để thêm vào đây.
                  </p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.product.productId}
                    className="flex items-center justify-between gap-3 p-2.5 transition hover:bg-stone-50/80 rounded-lg"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-stone-400">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-amber-700">
                            {item.product.productCode}
                          </span>
                          {item.product.isSet && (
                            <span className="rounded bg-stone-100 px-1 text-[9px] font-medium text-stone-600">
                              Bộ
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs font-semibold text-stone-900" title={item.product.productName}>
                          {item.product.productName}
                        </p>
                        <p className="text-xs font-bold text-amber-800">
                          {formatVND(item.unitPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Bộ điều khiển số lượng */}
                      <div className="flex items-center rounded-lg border border-stone-200 bg-white">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.productId, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center text-stone-600 hover:bg-stone-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stockQuantity}
                          className="flex h-7 w-7 items-center justify-center text-stone-600 hover:bg-stone-100 disabled:opacity-40"
                          title={item.quantity >= item.product.stockQuantity ? 'Đã đạt giới hạn tồn kho' : 'Tăng'}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-stone-900">
                          {formatVND(item.quantity * item.unitPrice)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.product.productId)}
                          className="text-[11px] text-red-500 hover:underline"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Tóm tắt tiền hàng */}
            {cartItems.length > 0 && (
              <div className="border-t border-stone-200 bg-stone-50/50 p-4">
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Tổng số lượng sản phẩm:</span>
                  <span className="font-semibold text-stone-900">{totalQuantity} cái</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-stone-600">
                  <span>Tổng tiền hàng:</span>
                  <span className="text-sm font-bold text-stone-900">{formatVND(totalAmount)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-stone-600">
                  <span>Tiền cọc mặc định:</span>
                  <span className="font-semibold text-amber-800">
                    {formatVND(customerInfo.depositAmount)}
                    {totalAmount > 10000000 && (
                      <span className="ml-1 rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[10px] font-bold text-amber-800">
                        (30%)
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-stone-200 pt-2 text-xs font-bold text-stone-900">
                  <span>Còn lại cần thu:</span>
                  <span className="text-sm font-extrabold text-stone-900">
                    {formatVND(Math.max(0, totalAmount - (customerInfo.depositAmount || 0)))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card Form Thông tin Khách hàng */}
          <form
            onSubmit={handleStartContractCreation}
            className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
              <User className="h-4 w-4 text-amber-700" />
              <h2 className="text-sm font-bold text-stone-900">Thông tin khách hàng & Giao nhận</h2>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Họ và tên khách hàng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={customerInfo.customerName}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({ ...prev, customerName: e.target.value }))
                    }
                    className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Số điện thoại liên hệ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Ví dụ: 0912345678"
                    value={customerInfo.customerPhone}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({ ...prev, customerPhone: e.target.value }))
                    }
                    className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Địa chỉ giao hàng (nếu có)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Địa chỉ số nhà, đường, phường, thành phố..."
                    value={customerInfo.customerAddress}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({ ...prev, customerAddress: e.target.value }))
                    }
                    className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">
                    Ngày hẹn giao (dự kiến)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="date"
                      value={customerInfo.deliveryDate}
                      onChange={(e) =>
                        setCustomerInfo((prev) => ({ ...prev, deliveryDate: e.target.value }))
                      }
                      className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-xs text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">
                    Địa điểm ký kết
                  </label>
                  <input
                    type="text"
                    value={customerInfo.signedPlace}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({ ...prev, signedPlace: e.target.value }))
                    }
                    className="w-full rounded-lg border border-stone-200 py-2 px-3 text-xs text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Tiền đặt cọc */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700">
                    Tiền đặt cọc trước (VND)
                  </label>
                  {totalAmount > 10000000 ? (
                    <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                      Mặc định cọc 30% (Đơn {'>'} 10 triệu)
                    </span>
                  ) : (
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">
                      Không bắt buộc cọc (Đơn ≤ 10 triệu)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="number"
                    min={0}
                    max={totalAmount}
                    value={customerInfo.depositAmount}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        depositAmount: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-xs font-bold text-amber-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  {totalAmount > 10000000
                    ? `* Theo chính sách bán hàng: Đơn trên 10 triệu mặc định cọc 30% (${formatVND(Math.round(totalAmount * 0.3))}).`
                    : '* Đơn hàng từ 10 triệu trở xuống không yêu cầu đặt cọc trước.'}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Ghi chú đơn hàng
                </label>
                <textarea
                  rows="2"
                  placeholder="Ghi chú thêm về vận chuyển, đóng gói, bảo quản..."
                  value={customerInfo.note}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-200 p-2 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Nút chính Tạo hợp đồng */}
              <div className="mt-2">
                <button
                  type="submit"
                  disabled={cartItems.length === 0 || isSubmittingContract}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-800 py-3 text-sm font-bold text-white shadow-md transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  {isSubmittingContract ? 'Đang tạo hợp đồng...' : 'TẠO HỢP ĐỒNG & CHỐT ĐƠN'}
                </button>
                <p className="mt-1 text-center text-[11px] text-stone-500">
                  Quy trình: Tạo biên bản hợp đồng → Ký chốt tại quầy → Tạo đơn hàng chính thức
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* ═════════════════════════════════════════════════════
            CỘT BÊN PHẢI: DANH SÁCH SẢN PHẨM TRONG KHO (lg:col-span-7)
            ═════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          {/* Thanh tìm kiếm & bộ lọc */}
          <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên sản phẩm hoặc mã (PRD-...)"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <span className="text-xs text-stone-500">
                Tìm thấy <strong className="text-stone-900">{pagination.totalItems}</strong> sản phẩm
              </span>
            </div>

            {/* Các dropdown lọc */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-stone-200 py-1.5 px-2.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                >
                  <option value="ALL">Tất cả danh mục</option>
                  {metadata.categories?.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedRoom}
                  onChange={(e) => {
                    setSelectedRoom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-stone-200 py-1.5 px-2.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                >
                  <option value="ALL">Tất cả không gian phòng</option>
                  {metadata.rooms?.map((rm) => (
                    <option key={rm.room_id} value={rm.room_id}>
                      {rm.room_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedStockStatus}
                  onChange={(e) => {
                    setSelectedStockStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-stone-200 py-1.5 px-2.5 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
                >
                  <option value="ALL">Tất cả trạng thái kho</option>
                  <option value="IN_STOCK">Còn hàng trong kho</option>
                  <option value="LOW_STOCK">Sắp hết hàng (≤ 5)</option>
                  <option value="OUT_OF_STOCK">Hết hàng (0)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lưới hiển thị sản phẩm */}
          <div className="min-h-[460px]">
            {loadingProducts ? (
              <div className="flex h-64 flex-col items-center justify-center gap-2">
                <RotateCw className="h-6 w-6 animate-spin text-amber-800" />
                <span className="text-xs text-stone-500">Đang tải sản phẩm trong kho...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-white p-6 text-center">
                <Package className="h-10 w-10 text-stone-300" />
                <p className="mt-2 text-sm font-semibold text-stone-800">Không tìm thấy sản phẩm nào</p>
                <p className="mt-1 text-xs text-stone-500">
                  Thử tìm kiếm với từ khóa khác hoặc bỏ các bộ lọc để xem toàn bộ kho.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {products.map((product) => {
                  const isOutOfStock = product.stockQuantity <= 0;
                  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;
                  const inCartQty =
                    cartItems.find((ci) => ci.product.productId === product.productId)?.quantity || 0;

                  return (
                    <div
                      key={product.productId}
                      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md ${
                        isOutOfStock
                          ? 'border-stone-200 opacity-60'
                          : 'border-stone-200 hover:border-amber-300'
                      }`}
                    >
                      {/* Ảnh & Badges */}
                      <div className="relative aspect-square w-full overflow-hidden bg-stone-100">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.productName}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-stone-300">
                            <Package className="h-12 w-12" />
                          </div>
                        )}

                        {/* Badge loại sản phẩm */}
                        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
                          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                            {product.productCode}
                          </span>
                          {product.isSet && (
                            <span className="flex items-center gap-1 rounded bg-amber-800 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                              <Layers className="h-2.5 w-2.5" />
                              Bộ combo
                            </span>
                          )}
                        </div>

                        {/* Badge Tồn kho nổi bật */}
                        <div className="absolute right-2.5 top-2.5">
                          {isOutOfStock ? (
                            <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                              Hết hàng
                            </span>
                          ) : isLowStock ? (
                            <span className="rounded bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                              Kho: {product.stockQuantity} cái
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                              Kho: {product.stockQuantity}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Thông tin sản phẩm */}
                      <div className="flex flex-1 flex-col p-3">
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                          <span>{product.categoryName || 'Nội thất'}</span>
                          {product.roomName && (
                            <>
                              <span>•</span>
                              <span>{product.roomName}</span>
                            </>
                          )}
                        </div>

                        <h3
                          className="mt-1 line-clamp-1 text-xs font-bold text-stone-900 group-hover:text-amber-800"
                          title={product.productName}
                        >
                          {product.productName}
                        </h3>

                        {/* Kích thước / chất liệu tóm tắt */}
                        <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                          <span className="truncate">{product.materialName || 'Gỗ tự nhiên'}</span>
                          {product.colorName && (
                            <span className="flex items-center gap-1">
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full border border-stone-300"
                                style={{ backgroundColor: product.colorHex || '#a87954' }}
                              />
                              {product.colorName}
                            </span>
                          )}
                        </div>

                        {/* Giá tiền */}
                        <div className="mt-2.5 flex items-baseline justify-between border-t border-stone-100 pt-2">
                          <span className="text-[10px] font-semibold text-stone-500">Giá bán:</span>
                          <span className="text-sm font-extrabold text-amber-900">
                            {formatVND(product.price)}
                          </span>
                        </div>
                      </div>

                      {/* Các nút hành động */}
                      <div className="grid grid-cols-2 gap-1.5 border-t border-stone-100 bg-stone-50/50 p-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(product)}
                          className="flex items-center justify-center gap-1 rounded-md border border-stone-200 bg-white py-1.5 text-[11px] font-medium text-stone-700 transition hover:bg-stone-100"
                        >
                          <Eye className="h-3 w-3 text-stone-500" />
                          Chi tiết
                        </button>

                        <button
                          type="button"
                          disabled={isOutOfStock || inCartQty >= product.stockQuantity}
                          onClick={() => handleAddToCart(product)}
                          className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-bold text-white transition ${
                            isOutOfStock || inCartQty >= product.stockQuantity
                              ? 'cursor-not-allowed bg-stone-300'
                              : 'bg-amber-800 hover:bg-amber-900 shadow-sm'
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {inCartQty > 0 ? `Đã chọn (${inCartQty})` : 'Chọn mua'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Phân trang */}
          {pagination.totalPages > 1 && (
            <div className="mt-2 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
              <TablePagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════
          MODAL 1: CHI TIẾT SẢN PHẨM (ProductDetailModal)
          ═════════════════════════════════════════════════════════ */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-800" />
                <h3 className="text-base font-bold text-stone-900">Chi tiết sản phẩm trong kho</h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5">
              {loadingDetail ? (
                <div className="flex h-48 items-center justify-center">
                  <RotateCw className="h-6 w-6 animate-spin text-amber-800" />
                </div>
              ) : selectedProduct ? (
                <div className="flex flex-col gap-5 sm:flex-row">
                  {/* Cột ảnh */}
                  <div className="flex flex-col items-center gap-2 sm:w-1/2">
                    <div className="aspect-square w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                      {selectedProduct.imageUrl ? (
                        <img
                          src={selectedProduct.imageUrl}
                          alt={selectedProduct.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-stone-400">
                          <Package className="h-16 w-16" />
                        </div>
                      )}
                    </div>

                    <div className="w-full rounded-lg bg-amber-50 p-3 text-center">
                      <p className="text-xs text-stone-600">Giá bán niêm yết</p>
                      <p className="text-xl font-extrabold text-amber-900">
                        {formatVND(selectedProduct.price)}
                      </p>
                      <div className="mt-1 flex items-center justify-center gap-1.5">
                        <span className="text-xs text-stone-600">Số lượng có sẵn:</span>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold ${
                            selectedProduct.stockQuantity > 5
                              ? 'bg-emerald-100 text-emerald-800'
                              : selectedProduct.stockQuantity > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {selectedProduct.stockQuantity} sản phẩm
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cột thông số */}
                  <div className="flex flex-1 flex-col gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-700">
                          {selectedProduct.productCode}
                        </span>
                        {selectedProduct.isSet && (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                            Bộ sản phẩm combo
                          </span>
                        )}
                      </div>
                      <h2 className="mt-1 text-lg font-bold text-stone-900">
                        {selectedProduct.productName}
                      </h2>
                    </div>

                    {/* Danh sách thông số kỹ thuật */}
                    <div className="rounded-xl border border-stone-100 bg-stone-50/70 p-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-stone-500">Danh mục:</span>
                          <p className="font-semibold text-stone-800">
                            {selectedProduct.categoryName || '---'}
                          </p>
                        </div>
                        <div>
                          <span className="text-stone-500">Không gian:</span>
                          <p className="font-semibold text-stone-800">
                            {selectedProduct.roomName || '---'}
                          </p>
                        </div>
                        <div>
                          <span className="text-stone-500">Chất liệu:</span>
                          <p className="font-semibold text-stone-800">
                            {selectedProduct.materialName || '---'}
                          </p>
                        </div>
                        <div>
                          <span className="text-stone-500">Màu sắc:</span>
                          <p className="flex items-center gap-1 font-semibold text-stone-800">
                            {selectedProduct.colorHex && (
                              <span
                                className="inline-block h-3 w-3 rounded-full border border-stone-300"
                                style={{ backgroundColor: selectedProduct.colorHex }}
                              />
                            )}
                            {selectedProduct.colorName || '---'}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-stone-500">Kích thước (Dài x Rộng x Cao):</span>
                          <p className="font-semibold text-stone-800">
                            {selectedProduct.dimensions?.formatted || 'Theo quy chuẩn xưởng'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Mô tả sản phẩm */}
                    <div>
                      <h4 className="text-xs font-bold text-stone-700">Mô tả sản phẩm:</h4>
                      <p className="mt-1 text-xs leading-relaxed text-stone-600">
                        {selectedProduct.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
                      </p>
                    </div>

                    {/* Nếu là bộ sản phẩm (SET) -> Hiển thị danh sách món con */}
                    {selectedProduct.isSet && selectedProduct.setItems?.length > 0 && (
                      <div className="mt-1 border-t border-stone-200 pt-2">
                        <h4 className="text-xs font-bold text-stone-800">
                          Thành phần trong bộ ({selectedProduct.totalSetItems || selectedProduct.setItems.length} món):
                        </h4>
                        <div className="mt-1.5 flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                          {selectedProduct.setItems.map((item, idx) => {
                            const itemName =
                              item.productName ||
                              item.product_name ||
                              item.itemProduct?.product_name ||
                              `Món con #${item.productId || item.item_product_id || item.setItemId || idx + 1}`;
                            const itemCode =
                              item.productCode ||
                              item.product_code ||
                              item.itemProduct?.product_code ||
                              '';
                            const itemImg =
                              item.imageUrl ||
                              item.image_url ||
                              item.itemProduct?.image_url ||
                              '';
                            const itemQty = item.quantity || 1;
                            const itemDim =
                              item.dimensions ||
                              (item.itemProduct
                                ? [item.itemProduct.length_cm, item.itemProduct.width_cm, item.itemProduct.height_cm]
                                    .filter(Boolean)
                                    .join(' x ')
                                : null);

                            return (
                              <div
                                key={item.setItemId || item.productId || idx}
                                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-2 text-xs hover:bg-stone-50/80 transition"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="h-9 w-9 rounded-md bg-stone-100 flex-shrink-0 overflow-hidden border border-stone-200 flex items-center justify-center">
                                    {itemImg ? (
                                      <img
                                        src={itemImg}
                                        alt={itemName}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <Package className="h-4 w-4 text-stone-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-stone-900" title={itemName}>
                                      {itemName}
                                    </p>
                                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-stone-500">
                                      {itemCode && <span className="text-amber-800 font-semibold">{itemCode}</span>}
                                      {itemCode && itemDim && <span>•</span>}
                                      {itemDim && <span>{itemDim}</span>}
                                    </div>
                                  </div>
                                </div>
                                <span className="font-bold text-amber-800 flex-shrink-0 ml-2 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  x{itemQty} cái
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                Đóng
              </button>
              {selectedProduct && selectedProduct.stockQuantity > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    handleAddToCart(selectedProduct);
                    setDetailModalOpen(false);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-xs font-bold text-white hover:bg-amber-900"
                >
                  <Plus className="h-4 w-4" />
                  Thêm vào đơn hàng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          MODAL IN HỢP ĐỒNG BẢN GIẤY KHỔ A4 (PrintContractModal)
          ═════════════════════════════════════════════════════════ */}
      <PrintContractModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        contract={currentContract}
      />

      {/* ═════════════════════════════════════════════════════════
          MODAL 2: BIÊN BẢN HỢP ĐỒNG & CHỐT ĐƠN (ContractSigningModal)
          ═════════════════════════════════════════════════════════ */}
      {contractModalOpen && currentContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header Biên bản */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Biên Bản Hợp Đồng Bán Hàng Tại Quầy</h3>
                  <p className="text-xs text-stone-400">
                    Mã hợp đồng:{' '}
                    <span className="font-mono font-bold text-amber-300">
                      {currentContract.contractCode}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseContractModal}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thân Biên bản hợp đồng */}
            <div className="overflow-y-auto p-6 text-stone-800">
              {/* Thông báo kết quả tạo đơn hàng thành công (nếu đã tạo xong) */}
              {orderCreatedResult ? (
                <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-emerald-900">
                    ĐÃ TẠO ĐƠN HÀNG THÀNH CÔNG!
                  </h3>
                  <p className="mt-1 text-sm text-emerald-800">
                    Mã đơn hàng chính thức:{' '}
                    <strong className="font-mono text-base">{orderCreatedResult.orderCode}</strong>
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-700">
                    Hợp đồng liên kết: <strong>{orderCreatedResult.contractCode || currentContract.contractCode}</strong>
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseContractModal();
                        navigate('/sale/orders');
                      }}
                      className="rounded-lg bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-900"
                    >
                      Xem danh sách đơn hàng
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseContractModal}
                      className="rounded-lg border border-stone-200 bg-white px-5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
                    >
                      Tiếp tục tạo đơn mới (POS)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {/* Hướng dẫn Quy trình ký ngoài bản giấy */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-950">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <h4 className="flex items-center gap-2 font-bold text-amber-900">
                          <PenTool className="h-4 w-4 text-amber-700" />
                          Quy trình ký hợp đồng bản giấy ngoài quầy (Không dùng chữ ký số):
                        </h4>
                        <ol className="mt-1.5 list-decimal pl-4 space-y-1 text-stone-700">
                          <li>
                            Bấm nút <strong>"In / Xuất bản giấy (A4)"</strong> để in hợp đồng ra máy in hoặc lưu file PDF.
                          </li>
                          <li>
                            Khách hàng và nhân viên bán hàng <strong>ký tên trực tiếp bằng bút mực</strong> trên bản giấy in.
                          </li>
                          <li>
                            Sau khi đã ký tay bản giấy xong, bấm nút <strong>"Xác nhận đã ký bản giấy tại quầy"</strong> bên dưới để mở khóa tạo đơn hàng.
                          </li>
                        </ol>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPrintModalOpen(true)}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-xs font-bold text-white shadow hover:bg-amber-900 transition shrink-0"
                      >
                        <Printer className="h-4 w-4" />
                        In hợp đồng giấy
                      </button>
                    </div>

                    {currentContract.status === 'DRAFT' && (
                      <div className="mt-3 border-t border-amber-200/80 pt-2.5">
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                          Link ảnh chụp / scan hợp đồng giấy đã ký (tùy chọn lưu trữ):
                        </label>
                        <input
                          type="url"
                          placeholder="https://... (đường dẫn lưu trữ hình ảnh hoặc bản scan hợp đồng giấy nếu có)"
                          value={paperSignedContractFileUrl}
                          onChange={(e) => setPaperSignedContractFileUrl(e.target.value)}
                          className="w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-600 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Trạng thái hợp đồng */}
                  <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <div>
                      <span className="text-xs text-stone-500">Trạng thái hợp đồng:</span>
                      <div className="mt-0.5 flex items-center gap-2">
                        {currentContract.status === 'SIGNED' ? (
                          <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="h-4 w-4" />
                            ĐÃ KÝ KẾT HỢP ĐỒNG (SIGNED)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                            <Clock className="h-4 w-4" />
                            BIÊN BẢN CHỜ KÝ (DRAFT)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <p className="text-stone-500">Địa điểm ký:</p>
                      <p className="font-semibold text-stone-900">
                        {currentContract.signedPlace || 'Cửa hàng Góc Nhà'}
                      </p>
                    </div>
                  </div>

                  {/* Thông tin 2 bên */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-stone-200 p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        Bên A: Đại diện xưởng Góc Nhà
                      </h4>
                      <p className="mt-2 text-xs text-stone-700">
                        Nhân viên phụ trách:{' '}
                        <strong>{currentContract.signerName || 'Nhân viên kinh doanh'}</strong>
                      </p>
                      <p className="text-xs text-stone-700">
                        Đơn vị: Xưởng Sản Xuất & Nội Thất Góc Nhà
                      </p>
                    </div>

                    <div className="rounded-xl border border-stone-200 p-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                        Bên B: Khách hàng
                      </h4>
                      <p className="mt-2 text-xs text-stone-700">
                        Họ và tên: <strong>{currentContract.customerName}</strong>
                      </p>
                      <p className="text-xs text-stone-700">
                        Số điện thoại: <strong>{currentContract.customerPhone}</strong>
                      </p>
                      {currentContract.customerAddress && (
                        <p className="text-xs text-stone-700">
                          Địa chỉ: {currentContract.customerAddress}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bảng danh sách sản phẩm trong hợp đồng */}
                  <div>
                    <h4 className="mb-2 text-xs font-bold text-stone-900">Danh mục sản phẩm chốt mua:</h4>
                    <div className="overflow-x-auto rounded-lg border border-stone-200">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-stone-200 bg-stone-50 font-semibold text-stone-700">
                          <tr>
                            <th className="px-3 py-2">STT</th>
                            <th className="px-3 py-2">Mã SP</th>
                            <th className="px-3 py-2">Tên sản phẩm</th>
                            <th className="px-3 py-2 text-center">SL</th>
                            <th className="px-3 py-2 text-right">Đơn giá</th>
                            <th className="px-3 py-2 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {(currentContract.items || []).map((item, index) => (
                            <tr key={item.contractItemId || index}>
                              <td className="px-3 py-2 text-stone-500">{index + 1}</td>
                              <td className="px-3 py-2 font-mono font-medium text-amber-800">
                                {item.productCode || '---'}
                              </td>
                              <td className="px-3 py-2 font-semibold text-stone-900">
                                {item.productName}
                              </td>
                              <td className="px-3 py-2 text-center font-bold text-stone-900">
                                {item.quantity}
                              </td>
                              <td className="px-3 py-2 text-right text-stone-700">
                                {formatVND(item.unitPrice)}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-stone-900">
                                {formatVND(item.totalPrice)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-stone-200 bg-stone-50/70 font-semibold">
                          <tr>
                            <td colSpan="5" className="px-3 py-2 text-right text-stone-700">
                              Tổng giá trị hợp đồng:
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-extrabold text-amber-900">
                              {formatVND(currentContract.totalAmount)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan="5" className="px-3 py-2 text-right text-stone-700">
                              Tiền đặt cọc đã nhận:
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-800">
                              {formatVND(currentContract.depositAmount)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan="5" className="px-3 py-2 text-right text-stone-900">
                              Số tiền còn lại cần thanh toán khi nhận hàng:
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-extrabold text-stone-900">
                              {formatVND(currentContract.remainingAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Điều khoản cam kết */}
                  <div className="rounded-lg bg-stone-50 p-3 text-[11px] text-stone-600">
                    <p className="font-semibold text-stone-800">Điều khoản & Cam kết:</p>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                      <li>Hàng hóa bảo đảm đúng tiêu chuẩn xưởng và hình ảnh mô tả.</li>
                      <li>Khách hàng kiểm tra sản phẩm trước khi thanh toán phần tiền còn lại.</li>
                      <li>Bảo hành kỹ thuật theo tiêu chuẩn của xưởng nội thất Góc Nhà.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: Nút bấm quy trình nghiệp vụ */}
            {!orderCreatedResult && (
              <div className="flex flex-col gap-2 border-t border-stone-200 bg-stone-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseContractModal}
                    className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                  >
                    Đóng lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
                  >
                    <Printer className="h-4 w-4 text-amber-700" />
                    In / Xuất bản giấy
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Nếu hợp đồng đang là DRAFT -> Nút Xác nhận đã ký bản giấy */}
                  {currentContract.status === 'DRAFT' && (
                    <button
                      type="button"
                      disabled={isSigning}
                      onClick={handleSignContract}
                      className="flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow transition hover:bg-emerald-800 disabled:opacity-50"
                      title="Xác nhận khách hàng và nhân viên đã ký tay bằng bút mực trên bản in giấy"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isSigning ? 'Đang xác nhận...' : 'XÁC NHẬN ĐÃ KÝ BẢN GIẤY TẠI QUẦY'}
                    </button>
                  )}
                  {currentContract.status === 'SIGNED' && (
                    <button
                      type="button"
                      disabled={isCreatingOrder}
                      onClick={handleCreateOrder}
                      className="flex items-center gap-2 rounded-lg bg-amber-800 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg transition hover:bg-amber-900 animate-pulse disabled:opacity-50"
                    >
                      <Package className="h-4 w-4" />
                      {isCreatingOrder ? 'Đang tạo đơn hàng...' : 'TẠO ĐƠN HÀNG NGAY'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrderPage;
