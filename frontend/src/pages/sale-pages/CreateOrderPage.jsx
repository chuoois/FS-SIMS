// =========================================================
// CreateOrderPage.jsx
// Giao diện Tạo Đơn Hàng Tại Quầy cho Nhân viên Bán hàng (Role Sale)
//
// Bố cục:
// - Bên phải: Danh sách sản phẩm trong kho (giá bán, tồn kho, lọc, xem chi tiết)
// - Bên trái: Giỏ hàng & Thông tin khách hàng (chỉnh số lượng, tính tiền)
// - Quy trình: Tạo hợp đồng -> Chốt & Ký hợp đồng -> Tạo đơn hàng
//
// Kết nối trực tiếp qua saleOrderService (Controller riêng biệt, không conflict)
// =========================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  UserPlus,
  UploadCloud,
  Camera,
  Store,
  ZoomIn,
  Info,
  Check,
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
  getSaleCustomers,
  uploadContractProof,
} from '../../services/saleOrderService';
import { TablePagination } from '../../components/common/TablePagination';
import { formatVND, formatDateVN } from '../../utils/formatters';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800';

// Hàm định dạng tiền tệ VND
// Tính ngày hẹn giao tối thiểu (cách hôm nay ít nhất 10 ngày)
const getMinDeliveryDate = (days = 10) => {
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

export const CreateOrderPage = () => {
  const navigate = useNavigate();
  const minDeliveryDate = useMemo(() => getMinDeliveryDate(10), []);
  const minDeliveryDateStr = useMemo(() => formatDateInputStr(minDeliveryDate), [minDeliveryDate]);

  // ── 1. States Sản phẩm trong kho (Bên phải) ────────────────
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [metadata, setMetadata] = useState({ categories: [], rooms: [], materials: [], colors: [] });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRoom, setSelectedRoom] = useState('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 6,
  });

  // ── 2. Modal Chi tiết Sản phẩm ──────────────────────────────
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [searchParams] = useSearchParams();

  // ── 3. States Giỏ hàng (Bên trái) ───────────────────────────
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pos_cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Tự động lưu giỏ hàng vào sessionStorage để không bị mất khi chuyển sang trang Khách hàng
  useEffect(() => {
    try {
      sessionStorage.setItem('pos_cart_items', JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  // ── 4. Form Thông tin Khách hàng ────────────────────────────
  const [customerInfo, setCustomerInfo] = useState({
    customerAccountId: null,
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    deliveryDate: '',
    depositAmount: 0,
    signedPlace: 'Cửa hàng Góc Nhà',
    note: '',
  });

  // Autocomplete & Tìm kiếm khách hàng
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [activeDropdownField, setActiveDropdownField] = useState(null); // 'name' | 'phone' | null
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const searchTimeoutRef = useRef(null);
  const customerDropdownRef = useRef(null);

  // Tự động điền khách hàng nếu nhận từ URL query params (sau khi tạo mới ở trang Khách hàng)
  useEffect(() => {
    const pName = searchParams.get('customerName') || searchParams.get('name');
    const pPhone = searchParams.get('customerPhone') || searchParams.get('phone');
    const pAddress = searchParams.get('customerAddress') || searchParams.get('address');
    const pId = searchParams.get('customerAccountId');

    if (pName || pPhone) {
      const custObj = {
        customerAccountId: pId ? Number(pId) : null,
        fullName: pName || '',
        phoneNumber: pPhone || '',
        address: pAddress || '',
      };
      setCustomerInfo((prev) => ({
        ...prev,
        customerAccountId: custObj.customerAccountId,
        customerName: custObj.fullName || prev.customerName,
        customerPhone: custObj.phoneNumber || prev.customerPhone,
        customerAddress: custObj.address || prev.customerAddress,
      }));
      setSelectedCustomer(custObj);
      toast.success(`Đã tự động chọn khách hàng: ${custObj.fullName || custObj.phoneNumber}`);
    }
  }, [searchParams]);

  // Xử lý tìm kiếm khách hàng khi gõ (debounce 250ms)
  const handleCustomerQueryChange = useCallback((value, field) => {
    setActiveDropdownField(field);
    setSelectedCustomer(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value || !value.trim()) {
      setCustomerSuggestions([]);
      setSearchingCustomers(false);
      return;
    }

    setSearchingCustomers(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await getSaleCustomers({ search: value.trim(), mode: 'dropdown' });
        setCustomerSuggestions(res.data || []);
      } catch (err) {
        console.error('Lỗi tìm kiếm khách hàng:', err);
      } finally {
        setSearchingCustomers(false);
      }
    }, 250);
  }, []);

  const handleSelectCustomer = (customer) => {
    setCustomerInfo((prev) => ({
      ...prev,
      customerAccountId: customer.customerAccountId,
      customerName: customer.fullName || '',
      customerPhone: customer.phoneNumber || '',
      customerAddress: customer.address || prev.customerAddress,
    }));
    setSelectedCustomer(customer);
    setActiveDropdownField(null);
    setCustomerSuggestions([]);
    toast.success(`Đã chọn khách hàng: ${customer.fullName}`);
  };

  const handleUnlinkCustomer = () => {
    setSelectedCustomer(null);
    setCustomerInfo((prev) => ({
      ...prev,
      customerAccountId: null,
    }));
  };

  const handleNavigateToCreateCustomer = () => {
    const params = new URLSearchParams();
    params.set('action', 'create');
    params.set('returnUrl', '/sale/create-order');
    if (customerInfo.customerName) params.set('name', customerInfo.customerName);
    if (customerInfo.customerPhone) params.set('phone', customerInfo.customerPhone);
    navigate(`/sale/customers?${params.toString()}`);
  };

  // Đóng dropdown tìm kiếm khách hàng khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setActiveDropdownField(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // ── 5. Modal Biên bản Hợp đồng & Chốt đơn ──────────────────
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [currentContract, setCurrentContract] = useState(null);
  const [isSubmittingContract, setIsSubmittingContract] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderCreatedResult, setOrderCreatedResult] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [contractProofFile, setContractProofFile] = useState(null);
  const [contractProofPreview, setContractProofPreview] = useState('');
  const [proofPreviewModalOpen, setProofPreviewModalOpen] = useState(false);
  const contractFileInputRef = useRef(null);

  const handleProofFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP...)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Dung lượng ảnh tối đa là 10MB.');
      return;
    }

    setContractProofFile(file);
    const localUrl = URL.createObjectURL(file);
    setContractProofPreview(localUrl);
    toast.success('Đã chọn ảnh chụp hợp đồng đã ký.');
  };

  const handleRemoveProofFile = () => {
    setContractProofFile(null);
    setContractProofPreview('');
    if (contractFileInputRef.current) {
      contractFileInputRef.current.value = '';
    }
  };

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
      sessionStorage.removeItem('pos_cart_items');
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

    if (!customerInfo.deliveryDate) {
      toast.error('Vui lòng chọn ngày hẹn giao hàng.');
      return;
    }

    const selectedDeliveryDate = new Date(customerInfo.deliveryDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(
      selectedDeliveryDate.getFullYear(),
      selectedDeliveryDate.getMonth(),
      selectedDeliveryDate.getDate()
    );
    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      toast.error('Ngày hẹn giao hàng không thể ở trong quá khứ.');
      return;
    }

    if (diffDays < 10) {
      toast.error(
        `Ngày hẹn giao hàng phải cách thời điểm tạo đơn ít nhất 10 ngày (sớm nhất từ ngày ${formatDateVN(minDeliveryDate)}).`
      );
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
        customer_account_id: customerInfo.customerAccountId || null,
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
        setContractProofFile(null);
        setContractProofPreview(res.data.contractFileUrl || '');
        setContractModalOpen(true);
        toast.success('Đã lập biên bản hợp đồng! Vui lòng in, ký tay và chụp ảnh bằng chứng.');
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

    if (!contractProofFile && !contractProofPreview && !currentContract.contractFileUrl) {
      toast.error('Bắt buộc phải tải lên ảnh chụp/scan hợp đồng đã ký để làm bằng chứng!');
      return;
    }

    try {
      setIsSigning(true);
      let finalFileUrl = currentContract.contractFileUrl || '';

      if (contractProofFile) {
        toast.loading('Đang tải ảnh bằng chứng lên máy chủ...', { id: 'upload-proof' });
        const uploadRes = await uploadContractProof(contractProofFile);
        const uploadedUrls = uploadRes.urls || uploadRes.images || [];
        if (!uploadedUrls[0]) {
          toast.dismiss('upload-proof');
          toast.error('Không thể tải ảnh hợp đồng lên máy chủ. Vui lòng thử lại.');
          return;
        }
        finalFileUrl = uploadedUrls[0];
        toast.dismiss('upload-proof');
      }

      if (!finalFileUrl) {
        toast.error('Bắt buộc phải có ảnh bằng chứng hợp đồng đã ký!');
        return;
      }

      const res = await signContract(currentContract.contractId, {
        signed_place: customerInfo.signedPlace || 'Cửa hàng Góc Nhà',
        contract_file_url: finalFileUrl,
      });
      if (res.data) {
        setCurrentContract(res.data);
        setContractProofPreview(res.data.contractFileUrl || finalFileUrl);
        setContractProofFile(null);
        toast.success('Hợp đồng đã được ký kết và lưu ảnh bằng chứng thành công! Bạn có thể tạo đơn hàng.');
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
        sessionStorage.removeItem('pos_cart_items');
        setSelectedCustomer(null);
        setContractProofFile(null);
        setContractProofPreview('');
        setCustomerInfo({
          customerAccountId: null,
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
    setContractProofFile(null);
    setContractProofPreview('');
    if (contractFileInputRef.current) {
      contractFileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-6 text-stone-900">
      {/* ── 1. HEADER TRANG: TẠO ĐƠN HÀNG TẠI QUẦY (SHOWROOM POS) ─────────── */}
      <header className="flex flex-col gap-4 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm transition sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-amber-400 shadow-sm ring-1 ring-stone-900/10">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
                Tạo Đơn Hàng Tại Quầy
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                <Sparkles className="h-3 w-3 text-amber-700" />
                Showroom POS
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500 sm:text-sm">
              Hệ thống bán hàng trực tiếp: chọn sản phẩm có sẵn tại kho, lập biên bản hợp đồng in A4 và khởi tạo đơn hàng.
            </p>
          </div>
        </div>

        {/* Cụm nút chuyển trang & làm mới */}
        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
              setSelectedRoom('ALL');
              setSelectedStockStatus('ALL');
              setPage(1);
              fetchProducts();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            title="Tải lại dữ liệu tồn kho mới nhất"
          >
            <RotateCw className="h-3.5 w-3.5 text-stone-500" />
            <span>Làm mới kho</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/sale/orders')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            <Package className="h-3.5 w-3.5 text-stone-500" />
            <span>Danh sách đơn hàng</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/sale/contracts')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/90 bg-amber-50/70 px-3.5 py-2 text-xs font-semibold text-amber-900 shadow-xs transition hover:bg-amber-100 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            <FileText className="h-3.5 w-3.5 text-amber-700" />
            <span>Danh sách hợp đồng</span>
          </button>
        </div>
      </header>

      {/* Dải thông tin quy chuẩn nhanh */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-stone-200/80 bg-stone-50/70 px-4 py-2.5 text-xs text-stone-600">
        <div className="flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>Sản phẩm có sẵn tại kho giao ngay</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <ShieldCheck className="h-4 w-4 text-amber-700" />
          <span>Đơn hàng trên 10.000.000 ₫ đặt cọc tối thiểu 30%</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <Printer className="h-4 w-4 text-stone-600" />
          <span>In biên bản hợp đồng giấy A4 ký tay trực tiếp tại quầy</span>
        </div>
      </div>

      {/* ── 2. BỐ CỤC 2 CỘT CHÍNH ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ═════════════════════════════════════════════════════════════
            CỘT BÊN TRÁI: GIỎ HÀNG & THÔNG TIN KHÁCH HÀNG (lg:col-span-5)
            ═════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {/* Card Giỏ hàng */}
          <section className="flex flex-col rounded-2xl border border-stone-200/90 bg-white shadow-sm">
            {/* Header giỏ hàng */}
            <div className="flex items-center justify-between rounded-t-2xl border-b border-stone-800 bg-stone-900 px-4 py-3.5 text-white">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="h-5 w-5 text-amber-400" />
                <h2 className="text-sm font-bold tracking-tight text-white">Giỏ hàng giao dịch</h2>
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30">
                  {totalQuantity} món
                </span>
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="flex items-center gap-1 text-xs font-medium text-stone-300 hover:text-red-400 transition"
                  title="Xóa toàn bộ sản phẩm trong giỏ hàng"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa tất cả</span>
                </button>
              )}
            </div>

            {/* Danh sách các món trong giỏ */}
            <div className="max-h-[360px] divide-y divide-stone-100 overflow-y-auto p-2">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 shadow-inner">
                    <ShoppingCart className="h-7 w-7" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-stone-800">Giỏ hàng đang trống</p>
                  <p className="mt-1 text-xs text-stone-500 max-w-xs leading-relaxed">
                    Chọn sản phẩm có sẵn từ danh mục kho bên phải để thêm vào giỏ hàng tại quầy.
                  </p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.product.productId}
                    className="flex items-center justify-between gap-3 p-3 transition rounded-xl hover:bg-stone-50/90"
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-amber-800">
                            {item.product.productCode}
                          </span>
                          {item.product.isSet && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-900">
                              Bộ combo
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs font-semibold text-stone-900" title={item.product.productName}>
                          {item.product.productName}
                        </p>
                        <p className="text-xs font-bold text-amber-900">
                          {formatVND(item.unitPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Bộ điều khiển số lượng */}
                      <div className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.productId, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 hover:text-stone-900 active:scale-95 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-600"
                          title="Giảm số lượng"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stockQuantity}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 hover:text-stone-900 active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-600"
                          title={item.quantity >= item.product.stockQuantity ? 'Đã đạt giới hạn tồn kho' : 'Tăng số lượng'}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Thành tiền & nút Xóa */}
                      <div className="text-right min-w-[75px]">
                        <p className="text-xs font-bold text-stone-900">
                          {formatVND(item.quantity * item.unitPrice)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.product.productId)}
                          className="text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:underline transition"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Tóm tắt tiền hàng & Đặt cọc */}
            {cartItems.length > 0 && (
              <div className="border-t border-stone-200/90 bg-stone-50/70 p-4 rounded-b-2xl space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Tổng số lượng sản phẩm:</span>
                  <span className="font-bold text-stone-900">{totalQuantity} món</span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Tổng tiền hàng:</span>
                  <span className="text-sm font-bold text-stone-900">{formatVND(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <div className="flex items-center gap-1.5">
                    <span>Tiền đặt cọc theo quy chuẩn:</span>
                    {totalAmount > 10000000 ? (
                      <span className="rounded border border-amber-300 bg-amber-100/90 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                        30% (Đơn &gt; 10.000.000 ₫)
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400">(Không yêu cầu cọc)</span>
                    )}
                  </div>
                  <span className="font-bold text-amber-900">
                    {formatVND(customerInfo.depositAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-stone-300 pt-2.5 text-xs text-stone-900">
                  <span className="font-bold">Còn lại cần thu khi nhận:</span>
                  <span className="text-base font-extrabold text-stone-900">
                    {formatVND(Math.max(0, totalAmount - (customerInfo.depositAmount || 0)))}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Card Form Thông tin Khách hàng */}
          <form
            onSubmit={handleStartContractCreation}
            className="flex flex-col rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-stone-900">Hồ sơ Khách hàng & Giao nhận</h2>
                  <p className="text-[11px] text-stone-500">Thông tin ký kết biên bản hợp đồng bán lẻ tại quầy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleNavigateToCreateCustomer}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                title="Chuyển sang trang Quản lý khách hàng để tạo mới tài khoản"
              >
                <UserPlus className="h-3.5 w-3.5 text-amber-700" />
                <span>Tạo mới khách</span>
              </button>
            </div>

            {/* Thông báo khi đã chọn khách hàng có sẵn */}
            {selectedCustomer && (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/90 px-3.5 py-2.5 text-xs text-emerald-950 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                  <div className="truncate">
                    <span className="font-bold">Khách hàng hệ thống: </span>
                    <span className="font-semibold">{customerInfo.customerName}</span>
                    <span className="ml-1 font-mono font-semibold text-emerald-800 text-[11px]">
                      ({customerInfo.customerPhone})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUnlinkCustomer}
                  className="shrink-0 text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950 transition"
                >
                  Đổi khách khác
                </button>
              </div>
            )}

            <div ref={customerDropdownRef} className="flex flex-col gap-3.5">
              {/* Họ và tên khách hàng kèm tìm kiếm tự động */}
              <div className="relative">
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700">
                    Họ và tên khách hàng <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-stone-400">Gõ để tìm kiếm khách cũ</span>
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    required
                    placeholder="Nhập hoặc tìm theo họ tên khách hàng..."
                    value={customerInfo.customerName}
                    onFocus={() => handleCustomerQueryChange(customerInfo.customerName, 'name')}
                    onChange={(e) => {
                      setCustomerInfo((prev) => ({ ...prev, customerName: e.target.value, customerAccountId: null }));
                      handleCustomerQueryChange(e.target.value, 'name');
                    }}
                    className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-xs text-stone-900 placeholder-stone-400 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                {/* Dropdown danh sách khách hàng tìm thấy theo tên */}
                {activeDropdownField === 'name' && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
                    {searchingCustomers ? (
                      <div className="flex items-center justify-center gap-2 p-3 text-xs text-stone-500">
                        <RotateCw className="h-3.5 w-3.5 animate-spin text-amber-700" />
                        <span>Đang tìm kiếm khách hàng...</span>
                      </div>
                    ) : customerSuggestions.length > 0 ? (
                      <div>
                        <div className="px-2.5 py-1 text-[11px] font-semibold text-stone-400">
                          Khách hàng tìm thấy ({customerSuggestions.length})
                        </div>
                        {customerSuggestions.map((cust) => (
                          <button
                            key={cust.customerAccountId}
                            type="button"
                            onClick={() => handleSelectCustomer(cust)}
                            className="flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-amber-50/80"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-stone-900">{cust.fullName}</span>
                              <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-800">
                                <Phone className="h-3 w-3" />
                                {cust.phoneNumber}
                              </span>
                            </div>
                            {cust.address && (
                              <span className="truncate text-[11px] text-stone-500">{cust.address}</span>
                            )}
                          </button>
                        ))}
                        <div className="mt-1 border-t border-stone-100 pt-1">
                          <button
                            type="button"
                            onClick={handleNavigateToCreateCustomer}
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50 transition"
                          >
                            <UserPlus className="h-3.5 w-3.5 text-amber-700" />
                            <span>Khách hàng mới? Mở trang tạo mới tài khoản</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 text-center">
                        <p className="text-xs text-stone-500">
                          Không tìm thấy khách hàng nào khớp với <strong className="text-stone-800">"{customerInfo.customerName}"</strong>
                        </p>
                        <button
                          type="button"
                          onClick={handleNavigateToCreateCustomer}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-900"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          <span>Tạo mới khách hàng</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Số điện thoại liên hệ kèm tìm kiếm tự động */}
              <div className="relative">
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700">
                    Số điện thoại liên hệ <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-stone-400">Gõ để tìm kiếm theo SĐT</span>
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="tel"
                    required
                    placeholder="0912345678..."
                    value={customerInfo.customerPhone}
                    onFocus={() => handleCustomerQueryChange(customerInfo.customerPhone, 'phone')}
                    onChange={(e) => {
                      setCustomerInfo((prev) => ({ ...prev, customerPhone: e.target.value, customerAccountId: null }));
                      handleCustomerQueryChange(e.target.value, 'phone');
                    }}
                    className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 font-mono text-xs text-stone-900 placeholder-stone-400 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                {/* Dropdown danh sách khách hàng tìm thấy theo SĐT */}
                {activeDropdownField === 'phone' && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
                    {searchingCustomers ? (
                      <div className="flex items-center justify-center gap-2 p-3 text-xs text-stone-500">
                        <RotateCw className="h-3.5 w-3.5 animate-spin text-amber-700" />
                        <span>Đang tìm kiếm theo số điện thoại...</span>
                      </div>
                    ) : customerSuggestions.length > 0 ? (
                      <div>
                        <div className="px-2.5 py-1 text-[11px] font-semibold text-stone-400">
                          Số điện thoại trùng khớp ({customerSuggestions.length})
                        </div>
                        {customerSuggestions.map((cust) => (
                          <button
                            key={cust.customerAccountId}
                            type="button"
                            onClick={() => handleSelectCustomer(cust)}
                            className="flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-amber-50/80"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-amber-900">{cust.phoneNumber}</span>
                              <span className="text-xs font-semibold text-stone-800">{cust.fullName}</span>
                            </div>
                            {cust.address && (
                              <span className="truncate text-[11px] text-stone-500">{cust.address}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center">
                        <p className="text-xs text-stone-500">
                          Chưa có khách hàng dùng số điện thoại <strong className="text-stone-800">"{customerInfo.customerPhone}"</strong>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Địa chỉ nhận hàng */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Địa chỉ giao hàng nhận sản phẩm <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    required
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                    value={customerInfo.deliveryAddress}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({ ...prev, deliveryAddress: e.target.value }))
                    }
                    className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-xs text-stone-900 placeholder-stone-400 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>
              </div>

              {/* Ngày hẹn giao hàng & Tiền cọc */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-semibold text-stone-700">
                      Ngày hẹn giao hàng <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-amber-800 font-medium">&ge; 10 ngày tới</span>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="date"
                      required
                      min={formatDateInputStr(getMinDeliveryDate(10))}
                      value={customerInfo.expectedDeliveryDate}
                      onChange={(e) =>
                        setCustomerInfo((prev) => ({
                          ...prev,
                          expectedDeliveryDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-xs text-stone-900 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                </div>

                {/* Tiền đặt cọc */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-semibold text-stone-700">
                      Tiền đặt cọc (VND)
                    </label>
                    {totalAmount > 10000000 && (
                      <span className="text-[10px] font-bold text-amber-800">Tối thiểu 30%</span>
                    )}
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      placeholder="0"
                      value={customerInfo.depositAmount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCustomerInfo((prev) => ({ ...prev, depositAmount: val }));
                      }}
                      className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 font-mono text-xs font-bold text-amber-900 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    />
                  </div>
                </div>
              </div>

              {/* Ghi chú giao hàng */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">
                  Ghi chú cho xưởng & đội vận chuyển
                </label>
                <textarea
                  rows="2"
                  placeholder="Yêu cầu giờ giao, lắp đặt, tầng lầu, bọc lót bảo quản..."
                  value={customerInfo.note}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="w-full rounded-xl border border-stone-200 p-2.5 text-xs text-stone-900 placeholder-stone-400 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>

              {/* Nút chính Tạo hợp đồng */}
              <div className="mt-2 pt-1">
                <button
                  type="submit"
                  disabled={cartItems.length === 0 || isSubmittingContract}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-900 py-3.5 text-xs font-bold tracking-wide text-white shadow-md transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  <span>{isSubmittingContract ? 'Đang khởi tạo hợp đồng...' : 'TẠO HỢP ĐỒNG BÁN HÀNG TẠI QUẦY'}</span>
                </button>
                <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
                  <span className="font-semibold text-stone-700">Quy trình quầy:</span>
                  <span>1. Lập hợp đồng</span>
                  <span>&rarr;</span>
                  <span>2. In &amp; ký giấy</span>
                  <span>&rarr;</span>
                  <span>3. Chốt tạo đơn</span>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            CỘT BÊN PHẢI: DANH SÁCH SẢN PHẨM TRONG KHO (lg:col-span-7)
            ═════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          {/* Thanh tìm kiếm & bộ lọc */}
          <section className="flex flex-col gap-3 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên sản phẩm hoặc mã kho (PRD-...)"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-stone-200 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder-stone-400 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-stone-500 shrink-0">
                <span>Kho sẵn có:</span>
                <strong className="font-bold text-stone-900">{pagination.totalItems}</strong>
                <span>sản phẩm</span>
              </div>
            </div>

            {/* Các dropdown lọc */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-xl border border-stone-200 py-2 px-3 text-xs text-stone-800 shadow-2xs transition focus:border-amber-600 focus:outline-none"
                >
                  <option value="ALL">Tất cả danh mục sản phẩm</option>
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
                  className="w-full rounded-xl border border-stone-200 py-2 px-3 text-xs text-stone-800 shadow-2xs transition focus:border-amber-600 focus:outline-none"
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
                  className="w-full rounded-xl border border-stone-200 py-2 px-3 text-xs text-stone-800 shadow-2xs transition focus:border-amber-600 focus:outline-none"
                >
                  <option value="ALL">Tất cả trạng thái kho</option>
                  <option value="IN_STOCK">Còn hàng trong kho (&gt;0)</option>
                  <option value="LOW_STOCK">Sắp hết hàng (&le; 5)</option>
                  <option value="OUT_OF_STOCK">Hết hàng (0)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Lưới hiển thị sản phẩm */}
          <div className="min-h-[460px]">
            {loadingProducts ? (
              <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <RotateCw className="h-7 w-7 animate-spin text-amber-800" />
                <span className="text-xs font-medium text-stone-600">Đang tải dữ liệu sản phẩm trong kho...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center shadow-sm">
                <Package className="h-12 w-12 text-stone-300" />
                <p className="mt-3 text-sm font-bold text-stone-800">Không tìm thấy sản phẩm nào</p>
                <p className="mt-1 text-xs text-stone-500 max-w-sm">
                  Thử tìm kiếm với từ khóa khác hoặc chuyển các bộ lọc về "Tất cả" để hiển thị toàn bộ kho hàng.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {products.map((product) => {
                  const isOutOfStock = product.stockQuantity <= 0;
                  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;
                  const inCartItem = cartItems.find((ci) => ci.product.productId === product.productId);
                  const inCartQty = inCartItem?.quantity || 0;

                  return (
                    <div
                      key={product.productId}
                      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-2xs transition duration-200 hover:shadow-md ${
                        isOutOfStock
                          ? 'border-stone-200 opacity-60'
                          : 'border-stone-200/90 hover:border-amber-300'
                      }`}
                    >
                      {/* Ảnh & Badges */}
                      <div className="relative aspect-square w-full overflow-hidden bg-stone-100">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.productName}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-stone-300">
                            <Package className="h-12 w-12" />
                          </div>
                        )}

                        {/* Badge loại sản phẩm & Mã */}
                        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
                          <span className="rounded-md bg-stone-900/80 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 backdrop-blur-sm shadow-xs">
                            {product.productCode}
                          </span>
                          {product.isSet && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-800/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-sm">
                              <Layers className="h-2.5 w-2.5" />
                              Bộ combo
                            </span>
                          )}
                        </div>

                        {/* Badge Tồn kho nổi bật */}
                        <div className="absolute right-2.5 top-2.5">
                          {isOutOfStock ? (
                            <span className="rounded-md bg-stone-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                              Hết hàng
                            </span>
                          ) : isLowStock ? (
                            <span className="rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                              Kho: {product.stockQuantity} cái
                            </span>
                          ) : (
                            <span className="rounded-md bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                              Kho: {product.stockQuantity} cái
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Thông tin sản phẩm */}
                      <div className="flex flex-1 flex-col p-3.5">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[11px] text-stone-500">
                            <span className="truncate">{product.categoryName || 'Nội thất gỗ'}</span>
                            <span className="truncate">{product.roomName || ''}</span>
                          </div>
                          <h3
                            className="mt-1 text-xs font-bold text-stone-900 line-clamp-2 leading-snug group-hover:text-amber-900 transition"
                            title={product.productName}
                          >
                            {product.productName}
                          </h3>

                          {/* Kích thước / chất liệu tóm tắt */}
                          <p className="mt-1 text-[11px] text-stone-500 truncate">
                            {product.dimensions?.formatted
                              ? product.dimensions.formatted
                              : product.materialName
                              ? product.materialName
                              : 'Kích thước tiêu chuẩn xưởng'}
                          </p>
                        </div>

                        {/* Giá tiền */}
                        <div className="mt-2.5 flex items-baseline justify-between border-t border-stone-100 pt-2">
                          <span className="text-[11px] text-stone-500">Giá bán:</span>
                          <span className="text-sm font-extrabold text-amber-900">
                            {formatVND(product.price)}
                          </span>
                        </div>
                      </div>

                      {/* Các nút hành động */}
                      <div className="grid grid-cols-2 gap-1.5 border-t border-stone-100 bg-stone-50/70 p-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(product)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-stone-200 bg-white py-1.5 px-2 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-600"
                        >
                          <Eye className="h-3.5 w-3.5 text-stone-500" />
                          <span>Chi tiết</span>
                        </button>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleAddToCart(product)}
                          className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-xs font-bold transition shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-600 ${
                            isOutOfStock
                              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                              : inCartQty > 0
                              ? 'bg-amber-800 text-white hover:bg-amber-900'
                              : 'bg-stone-900 text-white hover:bg-stone-800'
                          }`}
                          title={
                            isOutOfStock
                              ? 'Sản phẩm đã hết hàng trong kho'
                              : inCartQty > 0
                              ? `Đã có ${inCartQty} cái trong giỏ, bấm để thêm`
                              : 'Thêm vào giỏ hàng'
                          }
                        >
                          {inCartQty > 0 ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-amber-300" />
                              <span>Thêm ({inCartQty})</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              <span>Thêm đơn</span>
                            </>
                          )}
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
            <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
              <TablePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                pageSize={pagination.pageSize}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          MODAL 1: CHI TIẾT SẢN PHẨM & BỘ MÓN CON (Detail Modal)
          ═════════════════════════════════════════════════════════════ */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-5 py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
                  <Package className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <h3 className="truncate text-sm font-bold text-stone-900">
                    {selectedProduct?.productName || 'Chi tiết sản phẩm'}
                  </h3>
                  <span className="font-mono text-[11px] font-bold text-amber-800">
                    {selectedProduct?.productCode}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 text-xs text-stone-700">
              {loadingDetail ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2">
                  <RotateCw className="h-6 w-6 animate-spin text-amber-800" />
                  <span>Đang tải thông số kỹ thuật...</span>
                </div>
              ) : selectedProduct ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {/* Cột ảnh */}
                  <div>
                    <div className="aspect-square w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                      {selectedProduct.imageUrl ? (
                        <img
                          src={selectedProduct.imageUrl}
                          alt={selectedProduct.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-stone-300">
                          <Package className="h-14 w-14" />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-xl bg-stone-50 p-2.5 border border-stone-200">
                      <span className="text-xs text-stone-600">Tồn kho sẵn có:</span>
                      <span className="font-bold text-emerald-800">
                        {selectedProduct.stockQuantity} sản phẩm
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-xl bg-amber-50 p-2.5 border border-amber-200">
                      <span className="text-xs text-amber-900 font-medium">Giá bán niêm yết:</span>
                      <span className="text-sm font-extrabold text-amber-900">
                        {formatVND(selectedProduct.price)}
                      </span>
                    </div>
                  </div>

                  {/* Cột thông số */}
                  <div className="flex flex-col gap-3.5">
                    {/* Bảng thông số kỹ thuật */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3">
                      <h4 className="font-bold text-stone-800 mb-2 border-b border-stone-200 pb-1.5">
                        Thông số quy chuẩn xưởng
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-stone-500">Danh mục:</span>
                          <p className="font-bold text-stone-800">{selectedProduct.categoryName || '---'}</p>
                        </div>
                        <div>
                          <span className="text-stone-500">Không gian:</span>
                          <p className="font-bold text-stone-800">{selectedProduct.roomName || '---'}</p>
                        </div>
                        <div>
                          <span className="text-stone-500">Chất liệu gỗ:</span>
                          <p className="font-bold text-stone-800">{selectedProduct.materialName || '---'}</p>
                        </div>
                        <div>
                          <span className="text-stone-500">Màu sắc:</span>
                          <p className="flex items-center gap-1.5 font-bold text-stone-800">
                            {selectedProduct.colorHex && (
                              <span
                                className="inline-block h-3.5 w-3.5 rounded-full border border-stone-300 shadow-2xs"
                                style={{ backgroundColor: selectedProduct.colorHex }}
                              />
                            )}
                            <span>{selectedProduct.colorName || '---'}</span>
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-stone-500">Kích thước (Dài x Rộng x Cao):</span>
                          <p className="font-bold text-stone-800">
                            {selectedProduct.dimensions?.formatted || 'Theo quy chuẩn mẫu xưởng'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Mô tả sản phẩm */}
                    <div>
                      <h4 className="font-bold text-stone-800 mb-1">Mô tả chi tiết:</h4>
                      <p className="text-[11px] leading-relaxed text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                        {selectedProduct.description || 'Chưa có ghi chú mô tả đặc biệt cho sản phẩm này.'}
                      </p>
                    </div>

                    {/* Nếu là bộ sản phẩm (SET) -> Hiển thị danh sách món con */}
                    {selectedProduct.isSet && selectedProduct.setItems?.length > 0 && (
                      <div className="mt-1 border-t border-stone-200 pt-2.5">
                        <h4 className="font-bold text-stone-800 mb-2">
                          Thành phần trong bộ ({selectedProduct.totalSetItems || selectedProduct.setItems.length} món):
                        </h4>
                        <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                          {selectedProduct.setItems.map((item, idx) => {
                            const itemName =
                              item.productName ||
                              item.product_name ||
                              item.itemProduct?.product_name ||
                              `Món thành phần #${item.productId || item.item_product_id || item.setItemId || idx + 1}`;
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
                                className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-2 text-xs shadow-2xs hover:bg-stone-50 transition"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="h-10 w-10 rounded-lg bg-stone-100 flex-shrink-0 overflow-hidden border border-stone-200 flex items-center justify-center">
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
                                    <p className="truncate font-bold text-stone-900" title={itemName}>
                                      {itemName}
                                    </p>
                                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-stone-500">
                                      {itemCode && <span className="text-amber-800 font-bold">{itemCode}</span>}
                                      {itemCode && itemDim && <span>&bull;</span>}
                                      {itemDim && <span>{itemDim}</span>}
                                    </div>
                                  </div>
                                </div>
                                <span className="font-bold text-amber-900 flex-shrink-0 ml-2 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
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
            <div className="flex items-center justify-end gap-2.5 border-t border-stone-200 bg-stone-50 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-100 transition"
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
                  className="flex items-center gap-1.5 rounded-xl bg-amber-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-950 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm vào đơn hàng</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          MODAL IN HỢP ĐỒNG BẢN GIẤY KHỔ A4 (PrintContractModal)
          ═════════════════════════════════════════════════════════════ */}
      <PrintContractModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        contract={currentContract}
      />

      {/* ═════════════════════════════════════════════════════════════
          MODAL 2: BIÊN BẢN HỢP ĐỒNG & CHỐT ĐƠN (ContractSigningModal)
          ═════════════════════════════════════════════════════════════ */}
      {contractModalOpen && currentContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header Biên bản */}
            <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white">Biên Bản Hợp Đồng Bán Hàng Tại Quầy</h3>
                  <p className="text-xs text-stone-300">
                    Mã hợp đồng: <span className="font-mono font-bold text-amber-300">{currentContract.contractCode}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseContractModal}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thân Biên bản hợp đồng */}
            <div className="overflow-y-auto p-6 text-xs text-stone-700 space-y-5">
              {/* Thông báo kết quả tạo đơn hàng thành công (nếu đã tạo xong) */}
              {orderCreatedResult && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 text-emerald-950 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
                    <span>ĐÃ KHỞI TẠO ĐƠN HÀNG THÀNH CÔNG!</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span>Mã đơn hàng: </span>
                      <strong className="font-mono font-bold text-emerald-900">
                        {orderCreatedResult.customerOrderCode || orderCreatedResult.customerOrderId}
                      </strong>
                    </div>
                    <div>
                      <span>Trạng thái đơn: </span>
                      <span className="rounded-md bg-emerald-200/80 px-2 py-0.5 font-bold text-emerald-900 text-[11px]">
                        {orderCreatedResult.status || 'NEW'} (Mới tạo)
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/sale/orders')}
                      className="rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-900 transition"
                    >
                      Đến trang Quản lý Đơn hàng
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseContractModal}
                      className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 transition"
                    >
                      Đóng cửa sổ
                    </button>
                  </div>
                </div>
              )}

              {/* Hướng dẫn Quy trình ký ngoài bản giấy */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-xs mb-2">
                  <PenTool className="h-4 w-4 text-amber-800" />
                  <span>QUY TRÌNH KÝ HỢP ĐỒNG BẢN GIẤY TẠI SHOWROOM:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-amber-950">
                  <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-[10px] font-bold text-white">1</span>
                    <span>Bấm nút <strong>"In bản giấy A4"</strong> để in 02 bản hợp đồng cho khách và showroom.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-[10px] font-bold text-white">2</span>
                    <span>Khách hàng &amp; Nhân viên ký tên bút mực vào mục đại diện 2 bên.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-[10px] font-bold text-white">3</span>
                    <span>Chụp ảnh bản ký tải lên bên dưới, sau đó bấm <strong>"Xác nhận đã ký"</strong>.</span>
                  </div>
                </div>
              </div>

              {/* Bằng chứng ảnh chụp hợp đồng đã ký */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-stone-800 text-xs">
                    <Camera className="h-4 w-4 text-amber-800" />
                    <span>ẢNH CHỤP BẰNG CHỨNG HỢP ĐỒNG ĐÃ KÝ TAY</span>
                    <span className="text-red-500 font-bold">* Bắt buộc</span>
                  </div>
                  {(contractProofPreview || currentContract.contractFileUrl) && (
                    <button
                      type="button"
                      onClick={() => setProofPreviewModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 underline transition"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                      <span>Xem ảnh lớn</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-stone-500">
                  Vui lòng tải lên ảnh chụp rõ nét trang hợp đồng có đầy đủ chữ ký của khách hàng và nhân viên bán hàng.
                </p>

                {/* Khung upload & xem trước ảnh */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <input
                    type="file"
                    ref={contractFileInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleProofFileSelect}
                    className="hidden"
                  />

                  {contractProofPreview || currentContract.contractFileUrl ? (
                    <div className="relative flex items-center gap-3 w-full sm:w-auto bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs">
                      <div
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-stone-300 bg-stone-100 cursor-pointer group"
                        onClick={() => setProofPreviewModalOpen(true)}
                      >
                        <img
                          src={contractProofPreview || currentContract.contractFileUrl}
                          alt="Bằng chứng hợp đồng"
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition text-white">
                          <ZoomIn className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span>Đã có ảnh bằng chứng</span>
                        </div>
                        <p className="text-[11px] text-stone-500 truncate mt-0.5">
                          {contractProofFile?.name || 'Ảnh hợp đồng đã lưu trữ trên hệ thống'}
                        </p>
                        {currentContract.status === 'DRAFT' && (
                          <div className="mt-1.5 flex gap-2">
                            <button
                              type="button"
                              onClick={() => contractFileInputRef.current?.click()}
                              className="text-[11px] font-semibold text-amber-800 hover:underline"
                            >
                              Chọn ảnh khác
                            </button>
                            <span className="text-stone-300">|</span>
                            <button
                              type="button"
                              onClick={handleRemoveProofFile}
                              className="text-[11px] font-semibold text-rose-600 hover:underline"
                            >
                              Xóa ảnh này
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full">
                      <button
                        type="button"
                        onClick={() => contractFileInputRef.current?.click()}
                        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 bg-white p-5 text-center transition hover:border-amber-400 hover:bg-amber-50/30"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-900">
                          <UploadCloud className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-800">
                            Bấm vào đây để chọn ảnh hoặc chụp bằng điện thoại / máy tính bảng
                          </p>
                          <p className="text-[10px] text-stone-500 mt-0.5">
                            Hỗ trợ file JPG, PNG, WEBP (Tối đa 10MB)
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Trạng thái hợp đồng */}
              <div className="flex items-center justify-between rounded-xl bg-stone-100/80 px-4 py-2.5">
                <span className="font-semibold text-stone-700">Trạng thái pháp lý biên bản:</span>
                <div>
                  {currentContract.status === 'SIGNED' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800 text-xs ring-1 ring-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      ĐÃ KÝ HỢP ĐỒNG (Sẵn sàng tạo đơn)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-900 text-xs ring-1 ring-amber-300">
                      <Clock className="h-3.5 w-3.5" />
                      DỰ THẢO CHỜ KÝ BẢN GIẤY
                    </span>
                  )}
                </div>
              </div>

              {/* Thông tin 2 bên */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3.5">
                  <h4 className="font-bold text-stone-900 border-b border-stone-200 pb-1.5 mb-2">
                    BÊN BÁN (ĐẠI DIỆN SHOWROOM FSSIMS):
                  </h4>
                  <p>Người lập hợp đồng: <strong>{currentContract.signerName || 'Nhân viên kinh doanh'}</strong></p>
                  <p>Số điện thoại: <strong>{currentContract.signerPhone || '0987.654.321'}</strong></p>
                  <p>Địa chỉ xưởng: <strong>Khu Công Nghệ Cao, Hà Nội</strong></p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3.5">
                  <h4 className="font-bold text-stone-900 border-b border-stone-200 pb-1.5 mb-2">
                    BÊN MUA (KHÁCH HÀNG):
                  </h4>
                  <p>Họ tên: <strong>{currentContract.signerName || customerInfo.customerName}</strong></p>
                  <p>Điện thoại: <strong>{currentContract.signerPhone || customerInfo.customerPhone}</strong></p>
                  <p>Địa chỉ nhận: <strong>{currentContract.deliveryAddress || customerInfo.deliveryAddress}</strong></p>
                </div>
              </div>

              {/* Bảng danh sách sản phẩm trong hợp đồng */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2">DANH MỤC HÀNG HÓA VÀ GIÁ TRỊ HỢP ĐỒNG:</h4>
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Mã SP</th>
                        <th className="p-2.5">Tên sản phẩm</th>
                        <th className="p-2.5 text-right">Đơn giá</th>
                        <th className="p-2.5 text-center">Số lượng</th>
                        <th className="p-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {currentContract.items?.map((item, idx) => (
                        <tr key={item.contractItemId || idx} className="hover:bg-stone-50">
                          <td className="p-2.5 text-stone-400">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-amber-900">{item.productCode}</td>
                          <td className="p-2.5 font-medium text-stone-900">{item.productName}</td>
                          <td className="p-2.5 text-right font-medium text-stone-700">
                            {formatVND(item.unitPrice)}
                          </td>
                          <td className="p-2.5 text-center font-bold text-stone-900">{item.quantity}</td>
                          <td className="p-2.5 text-right font-bold text-stone-900">
                            {formatVND(item.subtotal || item.unitPrice * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-stone-50 border-t border-stone-200 font-bold text-stone-900">
                      <tr>
                        <td colSpan="5" className="p-2.5 text-right">Tổng giá trị hàng hóa:</td>
                        <td className="p-2.5 text-right text-sm text-stone-900">
                          {formatVND(currentContract.totalAmount)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="5" className="p-2.5 text-right text-amber-900">
                          Tiền đặt cọc tại quầy:
                        </td>
                        <td className="p-2.5 text-right text-amber-900">
                          {formatVND(currentContract.depositAmount)}
                        </td>
                      </tr>
                      <tr className="border-t border-stone-300">
                        <td colSpan="5" className="p-2.5 text-right text-stone-900">
                          Còn lại thanh toán khi nhận hàng:
                        </td>
                        <td className="p-2.5 text-right text-sm font-extrabold text-stone-900">
                          {formatVND(
                            Math.max(0, currentContract.totalAmount - (currentContract.depositAmount || 0))
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Điều khoản cam kết */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-[11px] text-stone-600 leading-relaxed">
                <strong className="text-stone-800">Cam kết chất lượng: </strong>
                Toàn bộ sản phẩm được gia công đúng theo tiêu chuẩn kỹ thuật của xưởng FSSIMS, bảo hành kết cấu gỗ 12 tháng.
                Bên Mua có trách nhiệm kiểm tra hàng hóa trước khi ký nhận và hoàn tất thanh toán phần tiền còn lại.
              </div>
            </div>

            {/* Modal Footer: Nút bấm quy trình nghiệp vụ */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseContractModal}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-100 transition"
                >
                  Đóng lại
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-2xs hover:bg-amber-100 transition"
                >
                  <Printer className="h-4 w-4 text-amber-800" />
                  <span>In bản giấy A4</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Nếu hợp đồng đang là DRAFT -> Nút Xác nhận đã ký bản giấy */}
                {currentContract.status === 'DRAFT' && (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      disabled={isSigning || (!contractProofFile && !contractProofPreview && !currentContract.contractFileUrl)}
                      onClick={handleSignContract}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-900 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
                      title={
                        !contractProofFile && !contractProofPreview && !currentContract.contractFileUrl
                          ? 'Vui lòng tải lên ảnh chụp bản hợp đồng đã ký trước khi xác nhận'
                          : 'Xác nhận khách hàng và nhân viên đã ký tay bằng bút mực trên bản in giấy'
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{isSigning ? 'Đang xác nhận...' : 'XÁC NHẬN ĐÃ KÝ BẢN GIẤY TẠI QUẦY'}</span>
                    </button>
                    {!contractProofFile && !contractProofPreview && !currentContract.contractFileUrl && (
                      <span className="text-[10px] font-medium text-rose-600">
                        * Bắt buộc có ảnh bằng chứng hợp đồng đã ký
                      </span>
                    )}
                  </div>
                )}
                {currentContract.status === 'SIGNED' && (
                  <button
                    type="button"
                    disabled={isCreatingOrder}
                    onClick={handleCreateOrder}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-6 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:bg-amber-950 active:scale-[0.99] disabled:opacity-50"
                  >
                    <Package className="h-4 w-4" />
                    <span>{isCreatingOrder ? 'Đang tạo đơn hàng...' : 'TẠO ĐƠN HÀNG NGAY'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox xem ảnh bằng chứng kích thước lớn */}
      {proofPreviewModalOpen && (contractProofPreview || currentContract?.contractFileUrl) && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setProofPreviewModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-stone-900 p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 px-4 py-2.5 text-white">
              <span className="text-xs font-bold flex items-center gap-2">
                <Camera className="h-4 w-4 text-amber-400" />
                <span>Ảnh chụp bằng chứng hợp đồng đã ký bản giấy</span>
              </span>
              <button
                type="button"
                onClick={() => setProofPreviewModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[80vh] items-center justify-center overflow-auto p-2">
              <img
                src={contractProofPreview || currentContract?.contractFileUrl}
                alt="Ảnh hợp đồng chi tiết"
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrderPage;
