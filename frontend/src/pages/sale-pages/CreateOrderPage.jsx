// =========================================================
// CreateOrderPage.jsx
// Giao diện Tạo Đơn Hàng Tại Quầy cho Nhân viên Bán hàng (Role Sale)
// Bố cục 2 cột:
// - Bên trái: Giỏ hàng giao dịch & Thông tin khách hàng
// - Bên phải: Danh sách sản phẩm có sẵn trong kho
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
  X,
  Clock,
  Printer,
  UserPlus,
  UploadCloud,
  Camera,
  ZoomIn,
  AlertCircle,
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

  // Autocomplete khách hàng
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [activeDropdownField, setActiveDropdownField] = useState(null); // 'name' | 'phone' | null
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const searchTimeoutRef = useRef(null);
  const customerDropdownRef = useRef(null);

  // Tự động điền khách hàng nếu nhận từ query params
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
      toast.error('Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Dung lượng ảnh tối đa là 10MB');
      return;
    }

    setContractProofFile(file);
    const localUrl = URL.createObjectURL(file);
    setContractProofPreview(localUrl);
    toast.success('Đã chọn ảnh chụp hợp đồng đã ký');
  };

  const handleRemoveProofFile = () => {
    setContractProofFile(null);
    setContractProofPreview('');
    if (contractFileInputRef.current) {
      contractFileInputRef.current.value = '';
    }
  };

  // ── Tải metadata sản phẩm ───────────────────────────────────
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

  // ── Tải danh sách sản phẩm theo bộ lọc ───────────────────────
  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const params = { page, limit };
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

  // ── Xem Chi tiết Sản phẩm ────────────────────────────────────
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

  // ── Quản lý Giỏ hàng ─────────────────────────────────────────
  const handleAddToCart = (product) => {
    if (!product || product.stockQuantity <= 0) {
      toast.error('Sản phẩm đã hết hàng trong kho');
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.productId === product.productId);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          toast.error(`Sản phẩm "${product.productName}" chỉ còn ${product.stockQuantity} món trong kho`);
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
            if (newQty <= 0) return null;
            if (newQty > maxStock) {
              toast.error(`Kho chỉ còn ${maxStock} sản phẩm "${item.product.productName}"`);
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

  // Tự động tính tiền cọc 30% cho đơn > 10 triệu
  useEffect(() => {
    if (totalAmount > 10000000) {
      const defaultDeposit = Math.round(totalAmount * 0.3);
      setCustomerInfo((prev) => ({ ...prev, depositAmount: defaultDeposit }));
    } else {
      setCustomerInfo((prev) => ({ ...prev, depositAmount: 0 }));
    }
  }, [totalAmount]);

  // ── BƯỚC 1: TẠO HỢP ĐỒNG ─────────────────────────────────────
  const handleStartContractCreation = async (e) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất một sản phẩm từ kho bên phải');
      return;
    }

    if (!customerInfo.customerName.trim()) {
      toast.error('Vui lòng nhập họ tên khách hàng');
      return;
    }

    if (!customerInfo.customerPhone.trim()) {
      toast.error('Vui lòng nhập số điện thoại khách hàng');
      return;
    }

    if (!customerInfo.deliveryDate) {
      toast.error('Vui lòng chọn ngày hẹn giao hàng');
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
      toast.error('Ngày hẹn giao hàng không thể ở trong quá khứ');
      return;
    }

    if (diffDays < 10) {
      toast.error(
        `Ngày hẹn giao hàng phải cách hôm nay ít nhất 10 ngày (sớm nhất từ ngày ${formatDateVN(minDeliveryDate)})`
      );
      return;
    }

    const minRequiredDeposit = totalAmount > 10000000 ? Math.round(totalAmount * 0.3) : 0;
    if (totalAmount > 10000000 && Number(customerInfo.depositAmount) < minRequiredDeposit) {
      toast.error(
        `Đơn hàng trên 10 triệu yêu cầu đặt cọc tối thiểu 30% (${formatVND(minRequiredDeposit)})`
      );
      return;
    }

    if (customerInfo.depositAmount > totalAmount) {
      toast.error('Số tiền đặt cọc không được lớn hơn tổng giá trị đơn hàng');
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
        toast.success('Đã lập hợp đồng thành công! Vui lòng in biên bản để ký bút mực.');
      }
    } catch (err) {
      console.error('Lỗi tạo hợp đồng:', err);
      toast.error(err.response?.data?.message || err.message || 'Không thể tạo hợp đồng');
    } finally {
      setIsSubmittingContract(false);
    }
  };

  // ── BƯỚC 2: XÁC NHẬN KÝ BẢN GIẤY ─────────────────────────────
  const handleSignContract = async () => {
    if (!currentContract) return;

    if (!contractProofFile && !contractProofPreview && !currentContract.contractFileUrl) {
      toast.error('Bắt buộc phải tải lên ảnh chụp bản hợp đồng đã ký');
      return;
    }

    try {
      setIsSigning(true);
      let finalFileUrl = currentContract.contractFileUrl || '';

      if (contractProofFile) {
        toast.loading('Đang tải ảnh bằng chứng lên hệ thống...', { id: 'upload-proof' });
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
        toast.error('Bắt buộc phải có ảnh bằng chứng hợp đồng đã ký');
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
        toast.success('Hợp đồng đã ký kết thành công. Bạn có thể tiến hành tạo đơn hàng.');
      }
    } catch (err) {
      console.error('Lỗi khi ký hợp đồng:', err);
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi ký hợp đồng');
    } finally {
      setIsSigning(false);
    }
  };

  // ── BƯỚC 3: TẠO ĐƠN HÀNG ────────────────────────────────────
  const handleCreateOrder = async () => {
    if (!currentContract || currentContract.status !== 'SIGNED') {
      toast.error('Hợp đồng phải được xác nhận ký trước khi tạo đơn hàng');
      return;
    }

    try {
      setIsCreatingOrder(true);
      const res = await createOrderFromContract(currentContract.contractId);
      if (res.data) {
        setOrderCreatedResult(res.data);
        toast.success(`Đã tạo đơn hàng ${res.data.orderCode}`);

        // Làm trống giỏ hàng
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

        // Tải lại tồn kho
        fetchProducts();
      }
    } catch (err) {
      console.error('Lỗi khi tạo đơn hàng:', err);
      toast.error(err.response?.data?.message || err.message || 'Không thể tạo đơn hàng');
    } finally {
      setIsCreatingOrder(false);
    }
  };

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
      {/* ── 1. TIÊU ĐỀ TRANG ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Tạo hợp đồng bán hàng tại quầy
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Chọn sản phẩm có sẵn tại showroom, nhập hồ sơ khách hàng, in biên bản A4 và khởi tạo đơn hàng.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            title="Tải lại tồn kho mới nhất"
          >
            <RotateCw className="h-3.5 w-3.5 text-stone-500" />
            <span>Làm mới kho</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/sale/contracts')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <FileText className="h-3.5 w-3.5 text-stone-500" />
            <span>Danh sách hợp đồng</span>
          </button>
        </div>
      </div>

      {/* ── 2. BỐ CỤC 2 CỘT: TRÁI (GIỎ HÀNG & KHÁCH HÀNG) - PHẢI (KHO SẢN PHẨM) ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* ═════════════════════════════════════════════════════════════
            CỘT BÊN TRÁI: GIỎ HÀNG & THÔNG TIN KHÁCH HÀNG (lg:col-span-5)
            ═════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {/* Card Giỏ hàng */}
          <section className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 bg-stone-50/70 rounded-t-xl">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-stone-700" />
                <h2 className="text-xs font-bold text-stone-900">Giỏ hàng tại quầy</h2>
                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-700 font-mono">
                  {totalQuantity} món
                </span>
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs font-medium text-rose-700 hover:text-rose-800 transition"
                  title="Xóa toàn bộ sản phẩm trong giỏ"
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {/* Danh sách món trong giỏ */}
            <div className="max-h-[340px] divide-y divide-stone-100 overflow-y-auto p-2">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <ShoppingCart className="h-8 w-8 text-stone-300" />
                  <p className="mt-2 text-xs font-semibold text-stone-800">Giỏ hàng đang trống</p>
                  <p className="mt-1 text-[11px] text-stone-500 max-w-xs">
                    Chọn sản phẩm có sẵn từ danh mục kho bên phải để thêm vào giỏ.
                  </p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.product.productId}
                    className="flex items-center justify-between gap-3 p-2.5 transition rounded-lg hover:bg-stone-50"
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-stone-400">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[10px] font-medium text-stone-500">
                          {item.product.productCode}
                        </span>
                        <p className="truncate text-xs font-medium text-stone-900" title={item.product.productName}>
                          {item.product.productName}
                        </p>
                        <p className="text-xs font-semibold font-mono text-stone-900">
                          {formatVND(item.unitPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center rounded-md border border-stone-300 bg-white">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.productId, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center text-stone-600 hover:bg-stone-100 transition"
                          title="Giảm số lượng"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold text-stone-900 font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stockQuantity}
                          className="flex h-6 w-6 items-center justify-center text-stone-600 hover:bg-stone-100 transition disabled:opacity-30"
                          title="Tăng số lượng"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <p className="text-xs font-bold font-mono text-stone-900">
                          {formatVND(item.quantity * item.unitPrice)}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.product.productId)}
                          className="text-[11px] text-stone-400 hover:text-rose-600 transition"
                        >
                          Bỏ
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Tóm tắt tiền giỏ hàng */}
            {cartItems.length > 0 && (
              <div className="border-t border-stone-200 bg-stone-50/70 p-3.5 rounded-b-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-stone-600">
                  <span>Tổng tiền hàng:</span>
                  <span className="font-bold text-stone-900 font-mono">{formatVND(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span>Tiền đặt cọc:</span>
                  <span className="font-semibold text-emerald-800 font-mono">
                    {formatVND(customerInfo.depositAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-stone-900 font-bold">
                  <span>Còn lại thu khi giao hàng:</span>
                  <span className="font-mono text-stone-900">
                    {formatVND(Math.max(0, totalAmount - (customerInfo.depositAmount || 0)))}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Form Thông tin Khách hàng */}
          <form
            onSubmit={handleStartContractCreation}
            className="flex flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-xs font-bold text-stone-900">Thông tin khách hàng &amp; giao nhận</h2>
                <p className="text-[11px] text-stone-500">Ghi nhận thông tin đại diện ký hợp đồng mua lẻ</p>
              </div>
              <button
                type="button"
                onClick={handleNavigateToCreateCustomer}
                className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
                title="Tạo mới tài khoản khách hàng trên hệ thống"
              >
                <UserPlus className="h-3.5 w-3.5 text-stone-500" />
                <span>Thêm khách mới</span>
              </button>
            </div>

            {selectedCustomer && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span className="truncate font-medium">
                    {customerInfo.customerName} ({customerInfo.customerPhone})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleUnlinkCustomer}
                  className="shrink-0 text-[11px] font-semibold text-emerald-800 underline hover:text-emerald-950"
                >
                  Đổi
                </button>
              </div>
            )}

            <div ref={customerDropdownRef} className="space-y-3">
              {/* Họ tên khách hàng */}
              <div className="relative">
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Họ và tên khách hàng <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập hoặc tìm theo họ tên..."
                  value={customerInfo.customerName}
                  onFocus={() => handleCustomerQueryChange(customerInfo.customerName, 'name')}
                  onChange={(e) => {
                    setCustomerInfo((prev) => ({ ...prev, customerName: e.target.value, customerAccountId: null }));
                    handleCustomerQueryChange(e.target.value, 'name');
                  }}
                  className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />

                {activeDropdownField === 'name' && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-lg">
                    {searchingCustomers ? (
                      <div className="flex items-center justify-center gap-2 p-3 text-xs text-stone-500">
                        <RotateCw className="h-3.5 w-3.5 animate-spin text-stone-400" />
                        <span>Đang tìm khách hàng...</span>
                      </div>
                    ) : customerSuggestions.length > 0 ? (
                      customerSuggestions.map((cust) => (
                        <button
                          key={cust.customerAccountId}
                          type="button"
                          onClick={() => handleSelectCustomer(cust)}
                          className="flex w-full flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-left hover:bg-stone-50 transition"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-stone-900">{cust.fullName}</span>
                            <span className="font-mono text-stone-600">{cust.phoneNumber}</span>
                          </div>
                          {cust.address && (
                            <span className="truncate text-[11px] text-stone-500">{cust.address}</span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-2.5 text-center text-xs text-stone-500">
                        Không tìm thấy khách hàng trùng khớp
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Số điện thoại */}
              <div className="relative">
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Số điện thoại liên hệ <span className="text-rose-600">*</span>
                </label>
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
                  className="w-full rounded-lg border border-stone-300 py-2 px-3 font-mono text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />

                {activeDropdownField === 'phone' && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-lg">
                    {searchingCustomers ? (
                      <div className="flex items-center justify-center gap-2 p-3 text-xs text-stone-500">
                        <RotateCw className="h-3.5 w-3.5 animate-spin text-stone-400" />
                        <span>Đang tìm...</span>
                      </div>
                    ) : customerSuggestions.length > 0 ? (
                      customerSuggestions.map((cust) => (
                        <button
                          key={cust.customerAccountId}
                          type="button"
                          onClick={() => handleSelectCustomer(cust)}
                          className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left hover:bg-stone-50 transition text-xs"
                        >
                          <span className="font-mono font-semibold text-stone-900">{cust.phoneNumber}</span>
                          <span className="text-stone-600">{cust.fullName}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-2.5 text-center text-xs text-stone-500">
                        Không tìm thấy số điện thoại
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Địa chỉ giao hàng */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Địa chỉ giao hàng <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                  value={customerInfo.customerAddress}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({ ...prev, customerAddress: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              {/* Ngày hẹn giao hàng & Tiền cọc */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-stone-700">
                      Ngày hẹn giao <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[10px] text-stone-500">&ge; 10 ngày</span>
                  </div>
                  <input
                    type="date"
                    required
                    min={minDeliveryDateStr}
                    value={customerInfo.deliveryDate}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({
                        ...prev,
                        deliveryDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-stone-300 py-2 px-3 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-stone-700">
                      Tiền đặt cọc (VND)
                    </label>
                    {totalAmount > 10000000 && (
                      <span className="text-[10px] text-emerald-800 font-semibold">Tối thiểu 30%</span>
                    )}
                  </div>
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
                    className="w-full rounded-lg border border-stone-300 py-2 px-3 font-mono text-xs font-semibold text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Ghi chú đơn hàng
                </label>
                <textarea
                  rows="2"
                  placeholder="Yêu cầu giờ giao, lắp đặt, tầng lầu..."
                  value={customerInfo.note}
                  onChange={(e) =>
                    setCustomerInfo((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              {/* Nút submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={cartItems.length === 0 || isSubmittingContract}
                  className="w-full rounded-lg bg-amber-900 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmittingContract ? 'Đang tạo hợp đồng...' : 'Tạo hợp đồng bán hàng tại quầy'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ═════════════════════════════════════════════════════════════
            CỘT BÊN PHẢI: DANH SÁCH SẢN PHẨM TRONG KHO (lg:col-span-7)
            ═════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4 lg:col-span-7">
          {/* Thanh tìm kiếm & bộ lọc kho */}
          <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên sản phẩm hoặc mã (PRD-...)"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              <div className="text-xs text-stone-500 shrink-0">
                Kho có: <strong className="font-semibold text-stone-900">{pagination.totalItems}</strong> sản phẩm
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <select
                aria-label="Lọc theo danh mục"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-stone-300 py-1.5 px-2.5 text-xs text-stone-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              >
                <option value="ALL">Tất cả danh mục</option>
                {metadata.categories?.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Lọc theo không gian phòng"
                value={selectedRoom}
                onChange={(e) => {
                  setSelectedRoom(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-stone-300 py-1.5 px-2.5 text-xs text-stone-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              >
                <option value="ALL">Tất cả không gian</option>
                {metadata.rooms?.map((rm) => (
                  <option key={rm.room_id} value={rm.room_id}>
                    {rm.room_name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Lọc theo trạng thái tồn kho"
                value={selectedStockStatus}
                onChange={(e) => {
                  setSelectedStockStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-stone-300 py-1.5 px-2.5 text-xs text-stone-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              >
                <option value="ALL">Tất cả trạng thái kho</option>
                <option value="IN_STOCK">Còn hàng (&gt; 0)</option>
                <option value="LOW_STOCK">Sắp hết hàng (&le; 5)</option>
                <option value="OUT_OF_STOCK">Hết hàng (0)</option>
              </select>
            </div>
          </section>

          {/* Lưới sản phẩm */}
          <div className="min-h-[460px]">
            {loadingProducts ? (
              <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white p-6">
                <RotateCw className="h-6 w-6 animate-spin text-stone-400" />
                <span className="text-xs text-stone-600">Đang tải sản phẩm trong kho...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-stone-200 bg-white p-6 text-center">
                <Package className="h-10 w-10 text-stone-300" />
                <p className="mt-2 text-sm font-semibold text-stone-800">Không tìm thấy sản phẩm nào</p>
                <p className="mt-1 text-xs text-stone-500 max-w-sm">
                  Thử tìm kiếm với từ khóa khác hoặc chuyển các bộ lọc về &ldquo;Tất cả&rdquo;.
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
                      className={`flex flex-col justify-between overflow-hidden rounded-xl border bg-white shadow-xs transition hover:border-stone-400 ${
                        isOutOfStock ? 'opacity-60' : 'border-stone-200'
                      }`}
                    >
                      {/* Ảnh & Badges */}
                      <div className="relative aspect-square w-full overflow-hidden bg-stone-100">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-stone-300">
                            <Package className="h-10 w-10" />
                          </div>
                        )}

                        <div className="absolute left-2 top-2">
                          <span className="rounded bg-stone-900/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                            {product.productCode}
                          </span>
                        </div>

                        <div className="absolute right-2 top-2">
                          {isOutOfStock ? (
                            <span className="rounded bg-stone-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              Hết hàng
                            </span>
                          ) : isLowStock ? (
                            <span className="rounded bg-amber-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              Còn {product.stockQuantity}
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              Còn {product.stockQuantity}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Chi tiết nội dung */}
                      <div className="flex flex-1 flex-col p-3">
                        <div className="flex-1">
                          <span className="text-[11px] text-stone-500 block truncate">
                            {product.categoryName || 'Nội thất'}
                          </span>
                          <h3
                            className="mt-0.5 text-xs font-semibold text-stone-900 line-clamp-2"
                            title={product.productName}
                          >
                            {product.productName}
                          </h3>
                        </div>

                        <div className="mt-2 flex items-baseline justify-between border-t border-stone-100 pt-1.5">
                          <span className="text-[11px] text-stone-500">Giá:</span>
                          <span className="text-xs font-bold font-mono text-stone-900">
                            {formatVND(product.price)}
                          </span>
                        </div>
                      </div>

                      {/* Nút hành động */}
                      <div className="grid grid-cols-2 gap-1.5 border-t border-stone-100 p-2 bg-stone-50/50">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(product)}
                          className="rounded-md border border-stone-300 bg-white py-1.5 px-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
                        >
                          Chi tiết
                        </button>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleAddToCart(product)}
                          className={`rounded-md py-1.5 px-2 text-xs font-semibold transition ${
                            isOutOfStock
                              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                              : inCartQty > 0
                              ? 'bg-stone-900 text-white hover:bg-stone-800'
                              : 'bg-amber-900 text-white hover:bg-amber-950'
                          }`}
                        >
                          {inCartQty > 0 ? `Thêm (${inCartQty})` : 'Thêm giỏ'}
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
            <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-xs">
              <TablePagination
                currentPage={pagination.currentPage || page}
                totalPages={pagination.totalPages || 1}
                totalItems={pagination.totalItems}
                currentCount={products.length}
                itemsPerPage={limit}
                pageSizeOptions={[6, 12, 24]}
                onPageChange={(newPage) => setPage(newPage)}
                onPageSizeChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
                itemLabel="sản phẩm"
                loading={loadingProducts}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── 3. MODAL CHI TIẾT SẢN PHẨM ───────────────────────────── */}
      {detailModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5 bg-stone-50">
              <div className="truncate">
                <h3 className="text-sm font-bold text-stone-900 truncate">
                  {selectedProduct.productName}
                </h3>
                <span className="font-mono text-xs font-semibold text-stone-600">
                  {selectedProduct.productCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 text-xs text-stone-700 space-y-4">
              {loadingDetail ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2">
                  <RotateCw className="h-6 w-6 animate-spin text-stone-400" />
                  <span>Đang tải thông số kỹ thuật...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="aspect-square w-full overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                      {selectedProduct.imageUrl ? (
                        <img
                          src={selectedProduct.imageUrl}
                          alt={selectedProduct.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-stone-300">
                          <Package className="h-12 w-12" />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-stone-50 p-2 border border-stone-200">
                      <span className="text-stone-600">Kho sẵn có:</span>
                      <span className="font-semibold text-emerald-800">
                        {selectedProduct.stockQuantity} sản phẩm
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-2">
                      <span className="font-semibold text-stone-800 block border-b border-stone-200 pb-1">
                        Thông số kỹ thuật
                      </span>
                      <div className="space-y-1 text-[11px]">
                        <p><span className="text-stone-500">Danh mục: </span><span className="font-medium text-stone-800">{selectedProduct.categoryName || '---'}</span></p>
                        <p><span className="text-stone-500">Không gian: </span><span className="font-medium text-stone-800">{selectedProduct.roomName || '---'}</span></p>
                        <p><span className="text-stone-500">Chất liệu: </span><span className="font-medium text-stone-800">{selectedProduct.materialName || '---'}</span></p>
                        <p><span className="text-stone-500">Màu sắc: </span><span className="font-medium text-stone-800">{selectedProduct.colorName || '---'}</span></p>
                        <p><span className="text-stone-500">Kích thước: </span><span className="font-medium text-stone-800">{selectedProduct.dimensions?.formatted || 'Theo quy chuẩn xưởng'}</span></p>
                      </div>
                    </div>

                    <div>
                      <span className="font-semibold text-stone-800 block mb-1">Mô tả sản phẩm</span>
                      <p className="text-[11px] text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                        {selectedProduct.description || 'Chưa có mô tả chi tiết.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-stone-600">Đơn giá:</span>
                      <span className="text-sm font-bold font-mono text-stone-900">
                        {formatVND(selectedProduct.price)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-stone-200 bg-stone-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition"
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
                  className="rounded-lg bg-amber-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-950 transition"
                >
                  Thêm vào giỏ
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. MODAL BIÊN BẢN HỢP ĐỒNG & CHỐT ĐƠN ───────────────────── */}
      {contractModalOpen && currentContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl border border-stone-200 my-8">
            {/* Header Biên bản */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Biên bản hợp đồng {currentContract.contractCode}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Khách hàng: <span className="font-semibold text-stone-800">{customerInfo.customerName}</span> • SĐT: <span className="font-mono text-stone-700">{customerInfo.customerPhone}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseContractModal}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                aria-label="Đóng cửa sổ"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung hợp đồng */}
            <div className="overflow-y-auto p-6 text-xs text-stone-700 space-y-4">
              {/* Kết quả tạo đơn hàng thành công */}
              {orderCreatedResult && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
                    <span>Đã khởi tạo đơn hàng thành công</span>
                  </div>
                  <div className="mt-2 text-xs space-y-1">
                    <p>
                      Mã đơn hàng: <strong className="font-mono text-emerald-900">{orderCreatedResult.customerOrderCode || orderCreatedResult.customerOrderId}</strong>
                    </p>
                    <p>
                      Trạng thái: <span className="font-semibold text-emerald-900">Đơn mới</span>
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/sale/orders')}
                      className="rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-900 transition"
                    >
                      Xem danh sách đơn hàng
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseContractModal}
                      className="rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100 transition"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}

              {/* Tóm tắt hợp đồng */}
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                  <span className="font-semibold text-stone-700">Trạng thái hợp đồng:</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    currentContract.status === 'SIGNED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {currentContract.status === 'SIGNED' ? 'Đã ký kết' : 'Chờ ký bản giấy'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-md bg-white p-3 border border-stone-200">
                    <span className="text-[11px] text-stone-500 block">Tổng giá trị:</span>
                    <span className="text-sm font-bold font-mono text-stone-900">
                      {formatVND(currentContract.totalAmount)}
                    </span>
                  </div>
                  <div className="rounded-md bg-white p-3 border border-stone-200">
                    <span className="text-[11px] text-stone-500 block">Tiền đặt cọc:</span>
                    <span className="text-sm font-bold font-mono text-emerald-800">
                      {formatVND(currentContract.depositAmount)}
                    </span>
                  </div>
                  <div className="rounded-md bg-white p-3 border border-stone-200">
                    <span className="text-[11px] text-stone-500 block">Còn lại khi giao hàng:</span>
                    <span className="text-sm font-bold font-mono text-stone-900">
                      {formatVND(Math.max(0, currentContract.totalAmount - (currentContract.depositAmount || 0)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bằng chứng ảnh chụp chữ ký */}
              <div className="rounded-lg border border-stone-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-800">
                    Bản chụp hợp đồng có chữ ký bút mực
                  </span>
                  {currentContract.status === 'DRAFT' && (
                    <span className="text-[11px] text-stone-500">Bắt buộc để xác nhận ký</span>
                  )}
                </div>

                <input
                  type="file"
                  ref={contractFileInputRef}
                  accept="image/*"
                  onChange={handleProofFileSelect}
                  className="hidden"
                />

                {contractProofPreview || currentContract.contractFileUrl ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3.5 rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <div
                      className="relative h-18 w-20 shrink-0 overflow-hidden rounded-md border border-stone-300 bg-white cursor-pointer"
                      onClick={() => setProofPreviewModalOpen(true)}
                    >
                      <img
                        src={contractProofPreview || currentContract.contractFileUrl}
                        alt="Ảnh chụp hợp đồng"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-800 font-semibold text-xs">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Đã có ảnh bằng chứng</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setProofPreviewModalOpen(true)}
                          className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                        >
                          Xem ảnh lớn
                        </button>
                        {currentContract.status === 'DRAFT' && (
                          <>
                            <button
                              type="button"
                              onClick={() => contractFileInputRef.current?.click()}
                              className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                            >
                              Đổi ảnh
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveProofFile}
                              className="rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => contractFileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-50/70 p-5 text-center cursor-pointer hover:border-stone-400 hover:bg-stone-100/60 transition"
                  >
                    <Camera className="h-5 w-5 text-stone-500 mb-1.5" />
                    <p className="text-xs font-medium text-stone-800">
                      Nhấn để tải lên ảnh chụp bản hợp đồng giấy đã ký
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Hỗ trợ JPG, PNG, WEBP tối đa 10MB
                    </p>
                  </div>
                )}
              </div>

              {/* Bảng danh sách hàng hóa trong hợp đồng */}
              <div>
                <span className="font-semibold text-stone-800 block mb-2">
                  Danh mục hàng hóa trong hợp đồng
                </span>
                <div className="rounded-lg border border-stone-200 overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-700 border-b border-stone-200 font-semibold">
                      <tr>
                        <th className="p-2.5">Sản phẩm</th>
                        <th className="p-2.5 text-center">Số lượng</th>
                        <th className="p-2.5 text-right">Đơn giá</th>
                        <th className="p-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {currentContract.items?.map((item, idx) => (
                        <tr key={item.contractItemId || idx} className="hover:bg-stone-50">
                          <td className="p-2.5 font-medium text-stone-900">{item.productName}</td>
                          <td className="p-2.5 text-center text-stone-700">{item.quantity}</td>
                          <td className="p-2.5 text-right font-mono text-stone-600">{formatVND(item.unitPrice)}</td>
                          <td className="p-2.5 text-right font-semibold font-mono text-stone-900">
                            {formatVND(item.subtotal || item.unitPrice * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-6 py-3.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseContractModal}
                  className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-800 hover:bg-stone-100 transition"
                  title="In biên bản giấy A4"
                >
                  <Printer className="h-4 w-4 text-stone-600" />
                  <span>In bản giấy A4</span>
                </button>
              </div>

              <div>
                {currentContract.status === 'DRAFT' && (
                  <button
                    type="button"
                    disabled={
                      isSigning ||
                      (!contractProofFile && !contractProofPreview && !currentContract.contractFileUrl)
                    }
                    onClick={handleSignContract}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isSigning ? 'Đang xác nhận...' : 'Xác nhận đã ký bản giấy'}</span>
                  </button>
                )}

                {currentContract.status === 'SIGNED' && (
                  <button
                    type="button"
                    disabled={isCreatingOrder}
                    onClick={handleCreateOrder}
                    className="rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 disabled:opacity-50 transition"
                  >
                    <span>{isCreatingOrder ? 'Đang tạo...' : 'Tạo đơn hàng'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. LIGHTBOX XEM ẢNH LỚN ───────────────────────────── */}
      {proofPreviewModalOpen && (contractProofPreview || currentContract?.contractFileUrl) && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setProofPreviewModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-xl bg-stone-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 px-4 py-2 text-white">
              <span className="text-xs font-medium">Ảnh chụp hợp đồng đã ký</span>
              <button
                type="button"
                onClick={() => setProofPreviewModalOpen(false)}
                className="rounded-md p-1 text-stone-400 hover:bg-stone-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[80vh] items-center justify-center overflow-auto p-2">
              <img
                src={contractProofPreview || currentContract?.contractFileUrl}
                alt="Ảnh hợp đồng chi tiết"
                className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 6. MODAL IN HỢP ĐỒNG KHỔ A4 (PrintContractModal) ─────────── */}
      <PrintContractModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        contract={currentContract}
      />
    </div>
  );
};

export default CreateOrderPage;
