// =========================================================
// ManageProductionOrdersPage.jsx
// Quản lý Lệnh Gia Công (Manage Production Orders) dành cho Chủ xưởng (Owner)
// Chức năng:
// 1. Xem danh sách lệnh gia công (mã, loại, đơn hàng liên kết, trưởng nhóm, ngày dự kiến, trạng thái)
// 2. Tạo lệnh gia công cho đơn hàng CONFIRMED + CUSTOM
// 3. Phân công trưởng nhóm sản xuất (Staff Leader)
// 4. Hủy lệnh gia công (đơn hàng liên kết trở về trạng thái CONFIRMED)
// 5. Upload ảnh thiết kế / bản vẽ mẫu gửi thợ tham khảo
// 6. Xem ảnh nghiệm thu từ thợ gửi lên + Duyệt / Từ chối
// =========================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Hammer,
  Plus,
  Search,
  RotateCw,
  UserCheck,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  Calendar,
  Layers,
  ShoppingBag,
  User,
  Eye,
  Package,
  Image,
  Upload,
  CheckCheck,
  ThumbsDown,
  Camera,
  Trash2,
  ZoomIn,
  Ruler,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  getProductionOrders,
  getProductionOrderDetail,
  getEligibleOrders,
  getStaffLeaders,
  createProductionOrder,
  assignLeader,
  cancelProductionOrder,
  uploadProductionDesignImages,
  inspectProductionOrder,
} from '../../services/productionOrderService';
import { TablePagination } from '../../components/common/TablePagination';

// Format ngày tháng hiển thị
const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

// Huy hiệu trạng thái lệnh gia công
const StatusBadge = ({ status }) => {
  switch (status) {
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
          <Clock className="h-3.5 w-3.5" />
          Chờ sản xuất
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
          <Hammer className="h-3.5 w-3.5" />
          Đang gia công
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Hoàn thành
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
          <XCircle className="h-3.5 w-3.5" />
          Đã hủy
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
          {status}
        </span>
      );
  }
};

export const ManageProductionOrdersPage = () => {
  // ── States ────────────────────────────────────────────────
  const [productionOrders, setProductionOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Metadata dropdowns
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [staffLeaders, setStaffLeaders] = useState([]);

  // Bộ lọc & Phân trang
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── States cho ảnh thiết kế & nghiệm thu ─────────────────
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalOrder, setImageModalOrder] = useState(null);
  const [designImages, setDesignImages] = useState([]);      // ảnh Chủ gửi thợ
  const [inspectionImages, setInspectionImages] = useState([]); // ảnh thợ gửi Chủ
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const [newDesignUrl, setNewDesignUrl] = useState('');
  const [pendingDesignFiles, setPendingDesignFiles] = useState([]);
  const [pendingDesignPreviews, setPendingDesignPreviews] = useState([]);
  const [selectedUploadItemId, setSelectedUploadItemId] = useState(null); // ID sản phẩm muốn tải ảnh riêng
  const [activeImageTab, setActiveImageTab] = useState('ALL'); // 'ALL' | 'GENERAL' | order_item_id

  // ── States cho Modal Nghiệm Thu ───────────────────────────
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [inspectOrder, setInspectOrder] = useState(null);
  const [inspectNote, setInspectNote] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null); // xem ảnh phóng to

  const handleOpenDetailModal = async (order) => {
    setDetailOrder(order);
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await getProductionOrderDetail(order.production_id);
      const full = res?.productionOrder;
      if (full) {
        setDetailOrder((prev) => ({ ...prev, ...full }));
      }
    } catch (err) {
      console.warn('Không thể tải chi tiết lệnh gia công:', err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  // Đối tượng đang chọn & Loading
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    order_id: '',
    planned_start: '',
    planned_end: '',
  });

  const [assignForm, setAssignForm] = useState({
    assigned_to: '',
  });

  // ── Tải metadata (Đơn hàng đủ điều kiện & Trưởng nhóm) ────
  const loadMetadata = async () => {
    try {
      const [ordersRes, leadersRes] = await Promise.all([
        getEligibleOrders(),
        getStaffLeaders(),
      ]);
      setEligibleOrders(ordersRes?.data || []);
      setStaffLeaders(leadersRes?.data || []);
    } catch (err) {
      console.error('Lỗi khi tải metadata:', err);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  // Tự động mở modal Tạo lệnh gia công nếu chuyển sang từ trang Quản lý đơn hàng (?orderId=...)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.search) {
      const sp = new URLSearchParams(window.location.search);
      const oId = sp.get('orderId');
      if (oId) {
        const today = new Date().toISOString().slice(0, 10);
        const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        setCreateForm((prev) => ({
          ...prev,
          order_id: String(oId),
          planned_start: prev.planned_start || today,
          planned_end: prev.planned_end || nextTwoWeeks,
        }));
        setIsCreateOpen(true);
      }
    }
  }, []);

  // ── Tải danh sách lệnh gia công ───────────────────────────
  const fetchProductionOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      };

      const res = await getProductionOrders(params);
      setProductionOrders(res?.productionOrders || []);
      if (res?.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách lệnh gia công:', err);
      toast.error('Không thể tải danh sách lệnh gia công');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  useEffect(() => {
    fetchProductionOrders();
  }, [fetchProductionOrders]);

  // Thống kê nhanh từ danh sách hiện tại
  const stats = useMemo(() => {
    const total = pagination.totalItems || productionOrders.length;
    const draft = productionOrders.filter((po) => po.status === 'DRAFT').length;
    const inProgress = productionOrders.filter((po) => po.status === 'IN_PROGRESS').length;
    const completed = productionOrders.filter((po) => po.status === 'COMPLETED').length;
    const cancelled = productionOrders.filter((po) => po.status === 'CANCELLED').length;
    return { total, draft, inProgress, completed, cancelled };
  }, [pagination.totalItems, productionOrders]);

  // Làm mới dữ liệu
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProductionOrders(), loadMetadata()]);
    setRefreshing(false);
    toast.success('Đã làm mới dữ liệu');
  };

  // Reset bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  // ── Mở Modal Tạo mới ───────────────────────────────────────
  const handleOpenCreateModal = () => {
    loadMetadata();
    const today = new Date().toISOString().slice(0, 10);
    // Mặc định kết thúc sau 14 ngày
    const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    setCreateForm({
      order_id: '',
      planned_start: today,
      planned_end: nextTwoWeeks,
    });
    setIsCreateOpen(true);
  };

  // ── Submit Tạo lệnh gia công ───────────────────────────────
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.order_id) {
      toast.error('Vui lòng chọn đơn hàng cần gia công');
      return;
    }
    if (!createForm.planned_start) {
      toast.error('Vui lòng chọn ngày bắt đầu dự kiến');
      return;
    }
    if (!createForm.planned_end) {
      toast.error('Vui lòng chọn ngày kết thúc dự kiến');
      return;
    }
    if (createForm.planned_end < createForm.planned_start) {
      toast.error('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createProductionOrder({
        order_id: Number(createForm.order_id),
        planned_start: createForm.planned_start,
        planned_end: createForm.planned_end,
      });

      toast.success(res?.message || 'Tạo lệnh gia công thành công');
      setIsCreateOpen(false);
      fetchProductionOrders();
      loadMetadata();
    } catch (err) {
      console.error('Lỗi khi tạo lệnh gia công:', err);
      toast.error(err.response?.data?.message || 'Không thể tạo lệnh gia công');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Mở Modal Phân công Trưởng nhóm ────────────────────────
  const handleOpenAssignModal = (order) => {
    setSelectedOrder(order);
    setAssignForm({
      assigned_to: order.assigned_to || '',
    });
    loadMetadata();
    setIsAssignOpen(true);
  };

  // ── Submit Phân công Trưởng nhóm ──────────────────────────
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.assigned_to) {
      toast.error('Vui lòng chọn trưởng nhóm sản xuất');
      return;
    }

    setSubmitting(true);
    try {
      const res = await assignLeader(selectedOrder.production_id, {
        assigned_to: Number(assignForm.assigned_to),
      });

      toast.success(res?.message || 'Phân công trưởng nhóm thành công');
      setIsAssignOpen(false);
      fetchProductionOrders();
    } catch (err) {
      console.error('Lỗi khi gán trưởng nhóm:', err);
      toast.error(err.response?.data?.message || 'Không thể gán trưởng nhóm');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Mở Modal Xác nhận Hủy lệnh ────────────────────────────
  const handleOpenCancelModal = (order) => {
    setSelectedOrder(order);
    setIsCancelOpen(true);
  };

  // ── Xác nhận Hủy lệnh ─────────────────────────────────────
  const handleCancelConfirm = async () => {
    if (!selectedOrder) return;

    setSubmitting(true);
    try {
      const res = await cancelProductionOrder(selectedOrder.production_id);
      toast.success(res?.message || 'Hủy lệnh gia công thành công');
      setIsCancelOpen(false);
      fetchProductionOrders();
      loadMetadata();
    } catch (err) {
      console.error('Lỗi khi hủy lệnh gia công:', err);
      toast.error(err.response?.data?.message || 'Không thể hủy lệnh gia công');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Mở Modal Ảnh Thiết Kế & Nghiệm Thu ───────────────────────
  const handleOpenImageModal = async (order, targetItemId = null) => {
    setImageModalOrder(order);
    setDesignImages([]);
    setInspectionImages([]);
    setPendingDesignFiles([]);
    setPendingDesignPreviews([]);
    setNewDesignUrl('');
    setSelectedUploadItemId(targetItemId);
    setActiveImageTab(targetItemId || 'ALL');
    setIsImageModalOpen(true);
    try {
      const res = await getProductionOrderDetail(order.production_id);
      const full = res?.productionOrder;
      if (full) {
        setDesignImages(full.designImages || []);
        setInspectionImages(full.inspectionImages || []);
        setImageModalOrder((prev) => ({ ...prev, ...full }));
        if (targetItemId) {
          setActiveImageTab(targetItemId);
          setSelectedUploadItemId(targetItemId);
        }
      }
    } catch (err) {
      toast.error('Không thể tải ảnh lệnh gia công');
    }
  };

  // Chọn tab trong Modal Ảnh (tất cả, món cụ thể, hoặc ảnh chung)
  const handleSelectImageTab = (tabKey) => {
    setActiveImageTab(tabKey);
    if (tabKey === 'ALL' || tabKey === 'GENERAL') {
      setSelectedUploadItemId(null);
    } else {
      setSelectedUploadItemId(tabKey);
    }
    setPendingDesignFiles([]);
    setPendingDesignPreviews([]);
    setNewDesignUrl('');
  };

  // Chọn file ảnh thiết kế (preview local, chưa upload)
  const handleDesignFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPendingDesignFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPendingDesignPreviews((prev) => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Thêm URL ảnh thiết kế thủ công
  const handleAddDesignUrl = () => {
    if (!newDesignUrl.trim()) return;
    setPendingDesignPreviews((prev) => [...prev, newDesignUrl.trim()]);
    setPendingDesignFiles((prev) => [...prev, { _url: newDesignUrl.trim() }]);
    setNewDesignUrl('');
  };

  // Xóa ảnh đang chờ
  const handleRemovePendingDesign = (idx) => {
    setPendingDesignFiles((prev) => prev.filter((_, i) => i !== idx));
    setPendingDesignPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit upload ảnh thiết kế
  const handleSubmitDesignImages = async () => {
    if (!pendingDesignFiles.length) {
      toast.error('Chưa chọn ảnh nào để gửi');
      return;
    }
    setUploadingDesign(true);
    try {
      const realFiles = pendingDesignFiles.filter((f) => f instanceof File);
      const urlItems = pendingDesignFiles.filter((f) => f._url).map((f) => f._url);
      const res = await uploadProductionDesignImages(
        imageModalOrder.production_id,
        realFiles,
        urlItems,
        selectedUploadItemId
      );
      toast.success(res?.message || 'Đã gửi ảnh thiết kế cho thợ thành công');
      setPendingDesignFiles([]);
      setPendingDesignPreviews([]);
      // Tải lại chi tiết để cập nhật ảnh theo từng item
      const refresh = await getProductionOrderDetail(imageModalOrder.production_id);
      if (refresh?.productionOrder) {
        setImageModalOrder(refresh.productionOrder);
        setDesignImages(refresh.productionOrder.designImages || []);
        setInspectionImages(refresh.productionOrder.inspectionImages || []);
      }
      fetchProductionOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể upload ảnh thiết kế');
    } finally {
      setUploadingDesign(false);
    }
  };

  // Mở Modal Nghiệm Thu (nhập lý do từ chối)
  const handleOpenInspectModal = (order) => {
    setInspectOrder(order);
    setInspectNote('');
    setIsInspectOpen(true);
  };

  // Duyệt hoặc Từ chối nghiệm thu
  const handleInspectSubmit = async (passed) => {
    const target = inspectOrder || imageModalOrder;
    if (!target) return;
    if (!passed && !inspectNote.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setSubmitting(true);
    try {
      const res = await inspectProductionOrder(target.production_id, {
        passed,
        rejectReason: passed ? undefined : inspectNote.trim(),
      });
      toast.success(res?.message || (passed ? 'Đã duyệt nghiệm thu' : 'Đã từ chối nghiệm thu'));
      setIsInspectOpen(false);
      setIsImageModalOpen(false);
      fetchProductionOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật kết quả nghiệm thu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Tiêu đề & Nút thao tác ───────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                Quản Lý Lệnh Gia Công
              </h1>
              <p className="text-sm text-stone-500">
                Theo dõi tiến độ, tạo lệnh sản xuất cho đơn đặt làm, phân công trưởng nhóm và quản lý trạng thái.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo lệnh gia công</span>
          </button>
        </div>
      </div>

      {/* ── Thống kê tổng quan (Cards) ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số lệnh */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-500">Tổng số lệnh gia công</span>
            <div className="rounded-lg bg-stone-100 p-2 text-stone-700">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{stats.total}</span>
            <span className="text-xs text-stone-400">lệnh</span>
          </div>
        </div>

        {/* Chờ sản xuất (DRAFT) */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">Chờ sản xuất</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900">{stats.draft}</span>
            <span className="text-xs text-amber-600">chưa bắt đầu</span>
          </div>
        </div>

        {/* Đang gia công */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">Đang gia công</span>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <Hammer className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-900">{stats.inProgress}</span>
            <span className="text-xs text-blue-600">trong xưởng</span>
          </div>
        </div>

        {/* Hoàn thành */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">Đã hoàn thành</span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900">{stats.completed}</span>
            <span className="text-xs text-emerald-600">xong thành phẩm</span>
          </div>
        </div>
      </div>

      {/* ── Bộ lọc & Tìm kiếm ─────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã lệnh gia công, mã đơn hàng..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          {/* Lọc Trạng thái */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Chờ sản xuất (DRAFT)</option>
              <option value="IN_PROGRESS">Đang gia công (IN_PROGRESS)</option>
              <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>

            {(searchTerm || statusFilter !== 'ALL') && (
              <button
                onClick={handleResetFilters}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bảng danh sách lệnh gia công ──────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3.5 pl-4 pr-3 sm:pl-6">Mã lệnh</th>
                <th className="px-3 py-3.5">Loại</th>
                <th className="px-3 py-3.5">Đơn hàng liên kết</th>
                <th className="px-3 py-3.5">Trưởng nhóm phụ trách</th>
                <th className="px-3 py-3.5">Thời gian dự kiến</th>
                <th className="px-3 py-3.5 text-center">Trạng thái</th>
                <th className="py-3.5 pl-3 pr-4 text-center sm:pr-6">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="h-6 w-6 animate-spin text-amber-700" />
                      <span>Đang tải danh sách lệnh gia công...</span>
                    </div>
                  </td>
                </tr>
              ) : productionOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Hammer className="h-10 w-10 text-stone-300" />
                      <p className="font-medium text-stone-700">Không tìm thấy lệnh gia công nào</p>
                      <p className="text-xs text-stone-400">
                        Bấm &quot;Tạo lệnh gia công&quot; để tạo lệnh mới cho các đơn hàng CUSTOM đã chốt.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                productionOrders.map((order) => {
                  const canAct = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';

                  return (
                    <tr key={order.production_id} className="transition hover:bg-stone-50/80">
                      {/* Mã lệnh */}
                      <td className="whitespace-nowrap py-3.5 pl-4 pr-3 sm:pl-6 font-semibold text-amber-800">
                        {order.production_code}
                      </td>

                      {/* Loại lệnh */}
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                          {order.production_type === 'CUSTOM' ? 'Hàng đặt làm' : 'Hàng nhập kho'}
                        </span>
                      </td>

                      {/* Đơn hàng liên kết */}
                      <td className="px-3 py-3.5">
                        {order.order_code ? (
                          <div>
                            <div className="font-medium text-stone-800 flex items-center gap-1.5">
                              <ShoppingBag className="h-3.5 w-3.5 text-stone-400" />
                              <span>{order.order_code}</span>
                            </div>
                            {order.customer_name && (
                              <div className="text-xs text-stone-500">
                                Khách: {order.customer_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>

                      {/* Trưởng nhóm phụ trách */}
                      <td className="px-3 py-3.5">
                        {order.leader_name ? (
                          <div>
                            <div className="font-medium text-stone-800 flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-amber-700" />
                              <span>{order.leader_name}</span>
                            </div>
                            {order.leader_phone && (
                              <div className="text-xs text-stone-400">{order.leader_phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-stone-400 italic">
                            Chưa phân công
                          </span>
                        )}
                      </td>

                      {/* Thời gian dự kiến */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-stone-600 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-stone-400" />
                          <span>
                            {formatDate(order.planned_start)} → {formatDate(order.planned_end)}
                          </span>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-center">
                        <StatusBadge status={order.status} />
                      </td>

                      {/* Thao tác */}
                      <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-center sm:pr-6">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* Nút Xem chi tiết */}
                          <button
                            onClick={() => handleOpenDetailModal(order)}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 hover:text-amber-700 active:scale-95"
                            title="Xem chi tiết lệnh gia công và sản phẩm"
                          >
                            <Eye className="h-3.5 w-3.5 text-stone-400" />
                            <span>Chi tiết</span>
                          </button>

                          {/* Nút Ảnh Thiết Kế & Nghiệm Thu */}
                          {(() => {
                            const isUnderInspection =
                              order.order_status === 'UNDER_INSPECTION' ||
                              order.status === 'UNDER_INSPECTION';
                            return (
                              <button
                                onClick={() => handleOpenImageModal(order)}
                                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                                  isUnderInspection
                                    ? 'border border-amber-400 bg-amber-100 text-amber-900 font-bold ring-2 ring-amber-400 ring-offset-1 animate-pulse'
                                    : 'border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                                }`}
                                title={isUnderInspection ? 'Có ảnh nghiệm thu từ thợ chờ duyệt!' : 'Xem ảnh thiết kế / nghiệm thu'}
                              >
                                <Camera className="h-3.5 w-3.5" />
                                <span>{isUnderInspection ? 'Duyệt ảnh' : 'Ảnh'}</span>
                                {isUnderInspection && (
                                  <span className="ml-0.5 inline-block h-2 w-2 rounded-full bg-red-600" />
                                )}
                              </button>
                            );
                          })()}

                          {canAct && (
                            <>
                              {/* Nút Phân công trưởng nhóm */}
                              <button
                                onClick={() => handleOpenAssignModal(order)}
                                className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 hover:text-amber-700 active:scale-95"
                                title="Phân công trưởng nhóm"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                                <span>Phân công</span>
                              </button>

                              {/* Nút Hủy lệnh */}
                              <button
                                onClick={() => handleOpenCancelModal(order)}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 active:scale-95"
                                title="Hủy lệnh gia công"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                <span>Hủy</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <TablePagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          currentCount={productionOrders.length}
          itemsPerPage={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          itemLabel="lệnh gia công"
          loading={loading}
        />
      </div>

      {/* ── Modal 1: Tạo Lệnh Gia Công Mới ────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-800">
                  <Hammer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Tạo Lệnh Gia Công</h3>
                  <p className="text-xs text-stone-500">
                    Chọn đơn hàng CUSTOM đang xử lý để giao cho xưởng sản xuất
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {/* Chọn đơn hàng */}
              <div>
                <label htmlFor="create-order-select" className="block text-sm font-semibold text-stone-700">
                  Đơn hàng cần gia công <span className="text-rose-500">*</span>
                </label>
                {eligibleOrders.length === 0 ? (
                  <div className="mt-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      Hiện không có đơn hàng đặt làm (CUSTOM) nào ở trạng thái Đang xử lý cần tạo lệnh gia công.
                    </span>
                  </div>
                ) : (
                  <select
                    id="create-order-select"
                    value={createForm.order_id}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, order_id: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    required
                  >
                    <option value="">-- Chọn đơn hàng CUSTOM --</option>
                    {eligibleOrders.map((ord) => (
                      <option key={ord.order_id} value={ord.order_id}>
                        {ord.order_code} - {ord.contact_name} (
                        {Number(ord.total_amount || 0).toLocaleString('vi-VN')} đ)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Ngày bắt đầu & kết thúc */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="create-planned-start" className="block text-sm font-semibold text-stone-700">
                    Ngày bắt đầu dự kiến <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="create-planned-start"
                    type="date"
                    value={createForm.planned_start}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, planned_start: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="create-planned-end" className="block text-sm font-semibold text-stone-700">
                    Ngày kết thúc dự kiến <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="create-planned-end"
                    type="date"
                    value={createForm.planned_end}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, planned_end: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    required
                  />
                </div>
              </div>

              {/* Nút hành động */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting || eligibleOrders.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-800 disabled:opacity-50"
                >
                  {submitting && <RotateCw className="h-4 w-4 animate-spin" />}
                  <span>Tạo lệnh</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Phân Công Trưởng Nhóm ────────────────── */}
      {isAssignOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-800">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Phân Công Trưởng Nhóm</h3>
                  <p className="text-xs text-stone-500">
                    Chỉ định thợ trưởng chịu trách nhiệm cho lệnh này
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="mt-4 space-y-4">
              {/* Thông tin lệnh */}
              <div className="rounded-lg bg-stone-50 p-3 text-xs space-y-1">
                <div>
                  <span className="font-semibold text-stone-700">Mã lệnh:</span>{' '}
                  <span className="font-bold text-amber-800">{selectedOrder.production_code}</span>
                </div>
                {selectedOrder.order_code && (
                  <div>
                    <span className="font-semibold text-stone-700">Đơn hàng:</span>{' '}
                    <span>{selectedOrder.order_code} ({selectedOrder.customer_name})</span>
                  </div>
                )}
              </div>

              {/* Dropdown Trưởng nhóm */}
              <div>
                <label htmlFor="assign-leader-select" className="block text-sm font-semibold text-stone-700">
                  Chọn Trưởng nhóm sản xuất <span className="text-rose-500">*</span>
                </label>
                {staffLeaders.length === 0 ? (
                  <p className="mt-1.5 text-xs text-stone-500 italic">
                    Chưa có tài khoản nào thuộc vai trò Trưởng nhóm (LEADERSTAFF) đang hoạt động.
                  </p>
                ) : (
                  <select
                    id="assign-leader-select"
                    value={assignForm.assigned_to}
                    onChange={(e) =>
                      setAssignForm({ assigned_to: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                    required
                  >
                    <option value="">-- Chọn Trưởng nhóm --</option>
                    {staffLeaders.map((ldr) => {
                      const ldrId = ldr.user_account_id || ldr.userAccountId;
                      const name = ldr.full_name || ldr.fullName;
                      const contact = ldr.phone_number || ldr.phoneNumber || ldr.email;
                      return (
                        <option key={ldrId} value={ldrId}>
                          {name} ({contact})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Nút hành động */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting || staffLeaders.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-800 disabled:opacity-50"
                >
                  {submitting && <RotateCw className="h-4 w-4 animate-spin" />}
                  <span>Lưu phân công</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Xác Nhận Hủy Lệnh Gia Công ───────────── */}
      {isCancelOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-rose-100 p-3 text-rose-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">Hủy Lệnh Gia Công</h3>
                <p className="text-xs text-stone-500">Hành động này sẽ dừng quy trình sản xuất</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-stone-600">
              <p>
                Bạn có chắc chắn muốn hủy lệnh gia công{' '}
                <strong className="text-stone-900">{selectedOrder.production_code}</strong>?
              </p>
              {selectedOrder.order_code && (
                <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  Đơn hàng liên kết <strong>{selectedOrder.order_code}</strong> sẽ được tự động hoàn
                  trả về trạng thái <strong>CONFIRMED</strong>.
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCancelOpen(false)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Giữ lại
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting && <RotateCw className="h-4 w-4 animate-spin" />}
                <span>Xác nhận hủy lệnh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 4: Chi Tiết Lệnh Gia Công & Sản Phẩm ────── */}
      {isDetailOpen && detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 my-auto border border-stone-200 overflow-hidden">
            {/* Header cố định */}
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800 shadow-2xs">
                  <Hammer className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-stone-900">
                      Chi Tiết Lệnh #{detailOrder.production_code}
                    </h3>
                    <StatusBadge status={detailOrder.status} />
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                      {detailOrder.production_type === 'CUSTOM' ? 'Hàng đặt làm theo yêu cầu' : 'Hàng sản xuất kho'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Hồ sơ chi tiết sản phẩm, bản vẽ kỹ thuật và ảnh thành phẩm đối chiếu
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                title="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung cuộn */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-stone-50/30">
              {/* Thẻ tóm tắt thông tin: 3 cột thanh lịch */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Cột 1: Đơn hàng liên kết */}
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                    Đơn hàng liên kết
                  </span>
                  {detailOrder.order_code ? (
                    <>
                      <div className="flex items-center gap-1.5 font-bold text-stone-800 text-sm">
                        <ShoppingBag className="h-4 w-4 text-amber-700" />
                        <span>#{detailOrder.order_code}</span>
                      </div>
                      {detailOrder.customer_name && (
                        <div className="text-xs text-stone-600 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-stone-400" />
                          <span>Khách: {detailOrder.customer_name}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-stone-400 italic">Hàng sản xuất kho (không có đơn khách)</span>
                  )}
                </div>

                {/* Cột 2: Phụ trách sản xuất */}
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                    Thợ trưởng phụ trách
                  </span>
                  <div className="flex items-center gap-1.5 text-stone-800 text-sm font-bold">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    <span>{detailOrder.leader_name || 'Chưa phân công'}</span>
                  </div>
                  <div className="text-xs text-stone-500 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-stone-400" />
                    <span>Kế hoạch: {formatDate(detailOrder.planned_start)} → {formatDate(detailOrder.planned_end)}</span>
                  </div>
                </div>

                {/* Cột 3: Tổng quan tiến độ & Nút nhanh */}
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                      Quy mô & Thao tác
                    </span>
                    <div className="text-xs text-stone-700 font-semibold mt-1">
                      {detailOrder.items?.length || 0} sản phẩm cần gia công
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenImageModal(detailOrder);
                    }}
                    className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-800 transition active:scale-95"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Mở kho ảnh & Duyệt nghiệm thu</span>
                  </button>
                </div>
              </div>

              {/* Danh sách từng sản phẩm dưới dạng Modern Product Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-700" />
                    <span>Danh Sách Sản Phẩm Cần Gia Công ({detailOrder.items?.length || 0})</span>
                  </h4>
                  <span className="text-xs text-stone-500 hidden sm:inline">
                    Bản vẽ thiết kế & ảnh thành phẩm tách riêng theo từng món
                  </span>
                </div>

                {detailOrder.items && detailOrder.items.length > 0 ? (
                  <div className="space-y-3">
                    {detailOrder.items.map((it, idx) => {
                      const itemDesigns = it.designImages && it.designImages.length > 0
                        ? it.designImages
                        : (it.imageUrl ? [it.imageUrl] : []);
                      const itemInspections = it.inspectionImages || [];

                      return (
                        <div
                          key={idx}
                          className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs hover:border-amber-300 transition-all space-y-3"
                        >
                          {/* Header của thẻ sản phẩm */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">
                                {idx + 1}
                              </span>
                              <span className="text-base font-bold text-stone-900">
                                {it.item_name}
                              </span>
                              {it.product_code && (
                                <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-xs text-stone-600">
                                  {it.product_code}
                                </span>
                              )}
                            </div>

                            {/* Số lượng & Tiến độ */}
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                                Kế hoạch: <strong className="text-amber-900">{it.quantity_planned}</strong> cái
                              </span>
                              <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                it.quantity_done >= it.quantity_planned
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                Đã xong: {it.quantity_done} / {it.quantity_planned}
                              </span>
                            </div>
                          </div>

                          {/* Thông số kỹ thuật & quy cách */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {/* Kích thước */}
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 font-semibold text-amber-950 font-mono">
                              <Ruler className="h-3.5 w-3.5 text-amber-700" />
                              <span>
                                Kích thước:{' '}
                                {it.dimensions ? (
                                  it.dimensions
                                ) : (it.length_cm || it.width_cm || it.height_cm) ? (
                                  `${it.length_cm || '—'} × ${it.width_cm || '—'} × ${it.height_cm || '—'} cm`
                                ) : (
                                  'Kích thước tiêu chuẩn'
                                )}
                              </span>
                            </div>

                            {/* Chất liệu */}
                            {it.materialName && (
                              <div className="inline-flex items-center gap-1 rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-stone-700">
                                <span>🪵 Chất liệu: <strong>{it.materialName}</strong></span>
                              </div>
                            )}

                            {/* Màu sắc */}
                            {it.colorName && (
                              <div className="inline-flex items-center gap-1 rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-stone-700">
                                <span>🎨 Màu: <strong>{it.colorName}</strong></span>
                              </div>
                            )}
                          </div>

                          {/* Yêu cầu / Mô tả chi tiết nếu có */}
                          {it.description && (
                            <div className="rounded-lg bg-stone-50 border border-stone-100 px-3 py-2 text-xs text-stone-600">
                              <span className="font-semibold text-stone-700">Yêu cầu gia công: </span>
                              {it.description}
                            </div>
                          )}

                          {/* KHU VỰC HÌNH ẢNH CỦA RIÊNG MÓN NÀY: Chia 2 cột đối chiếu */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {/* Cột Trái: Bản vẽ kỹ thuật mẫu */}
                            <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                  <Image className="h-3.5 w-3.5 text-amber-700" />
                                  Bản vẽ kỹ thuật ({itemDesigns.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsDetailOpen(false);
                                    handleOpenImageModal(detailOrder, it.order_item_id);
                                  }}
                                  className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 hover:underline inline-flex items-center gap-0.5"
                                >
                                  <Upload className="h-3 w-3" />
                                  <span>+ Thêm bản vẽ</span>
                                </button>
                              </div>

                              {itemDesigns.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {itemDesigns.map((url, dIdx) => (
                                    <div
                                      key={dIdx}
                                      className="relative group rounded-xl overflow-hidden border border-amber-300 aspect-square h-16 w-16 bg-white cursor-pointer shadow-2xs hover:scale-105 transition"
                                      onClick={() => setLightboxSrc(url)}
                                      title={`Bản vẽ ${it.item_name} (#${dIdx + 1}) - Bấm phóng to`}
                                    >
                                      <img src={url} alt={`Bản vẽ ${dIdx + 1}`} className="h-full w-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <ZoomIn className="h-4 w-4 text-white" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-stone-400 italic py-1">
                                  Chưa có ảnh bản vẽ riêng cho món này
                                </p>
                              )}
                            </div>

                            {/* Cột Phải: Ảnh thành phẩm thực tế từ thợ */}
                            <div className="rounded-xl border border-purple-200/80 bg-purple-50/30 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                                  <Camera className="h-3.5 w-3.5 text-purple-700" />
                                  Ảnh thành phẩm thợ nộp ({itemInspections.length})
                                </span>
                                {itemInspections.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsDetailOpen(false);
                                      handleOpenImageModal(detailOrder, it.order_item_id);
                                    }}
                                    className="text-[11px] font-semibold text-purple-700 hover:underline inline-flex items-center gap-0.5"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>Đối chiếu lớn</span>
                                  </button>
                                )}
                              </div>

                              {itemInspections.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {itemInspections.map((url, fIdx) => (
                                    <div
                                      key={fIdx}
                                      className="relative group rounded-xl overflow-hidden border border-purple-300 aspect-square h-16 w-16 bg-white cursor-pointer shadow-2xs hover:scale-105 transition"
                                      onClick={() => setLightboxSrc(url)}
                                      title={`Thành phẩm ${it.item_name} (#${fIdx + 1}) - Bấm phóng to`}
                                    >
                                      <img src={url} alt={`Thành phẩm ${fIdx + 1}`} className="h-full w-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <ZoomIn className="h-4 w-4 text-white" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-stone-400 italic py-1">
                                  Thợ đang gia công, chưa nộp ảnh thành phẩm
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Nút shortcut mở đối chiếu sản phẩm này */}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsDetailOpen(false);
                                handleOpenImageModal(detailOrder, it.order_item_id);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-lg border border-amber-200 transition"
                            >
                              <Camera className="h-3.5 w-3.5" />
                              <span>Mở đối chiếu & duyệt ảnh món này</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center text-xs text-stone-400 bg-white">
                    Chưa có thông tin sản phẩm chi tiết cho lệnh này
                  </div>
                )}
              </div>

              {/* Bản vẽ thiết kế phối cảnh chung của toàn đơn hàng (nếu có) */}
              {detailOrder.generalDesignImages && detailOrder.generalDesignImages.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-2xs space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Image className="h-4 w-4 text-amber-700" />
                    <span>Bản Vẽ Phối Cảnh Không Gian Chung Toàn Đơn ({detailOrder.generalDesignImages.length} ảnh)</span>
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Bản vẽ bố trí không gian hoặc phối cảnh tổng thể áp dụng chung cho toàn bộ đơn hàng
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-1">
                    {detailOrder.generalDesignImages.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden border border-amber-300 aspect-video bg-stone-100 cursor-pointer shadow-2xs hover:scale-105 transition"
                        onClick={() => setLightboxSrc(url)}
                        title="Bấm để xem lớn"
                      >
                        <img src={url} alt={`Phối cảnh ${idx + 1}`} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <ZoomIn className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ảnh nghiệm thu tổng thể từ thợ (nếu có) */}
              {detailOrder.generalInspectionImages && detailOrder.generalInspectionImages.length > 0 && (
                <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-2xs space-y-2">
                  <h4 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-purple-700" />
                    <span>Ảnh Thành Phẩm Nghiệm Thu Tổng Thể ({detailOrder.generalInspectionImages.length} ảnh)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {detailOrder.generalInspectionImages.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl overflow-hidden border border-purple-300 aspect-video bg-stone-100 cursor-pointer shadow-2xs hover:scale-105 transition"
                        onClick={() => setLightboxSrc(url)}
                      >
                        <img src={url} alt={`Nghiệm thu chung ${idx + 1}`} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <ZoomIn className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ghi chú */}
              {detailOrder.note && (
                <div className="rounded-xl bg-amber-50/60 border border-amber-200 p-3.5 text-xs text-amber-900">
                  <span className="font-bold">Ghi chú lệnh: </span>
                  {detailOrder.note}
                </div>
              )}
            </div>

            {/* Footer cố định */}
            <div className="flex items-center justify-between border-t border-stone-100 px-6 py-4 bg-stone-50/50">
              <button
                type="button"
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenImageModal(detailOrder);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-800 transition active:scale-95"
              >
                <Camera className="h-4 w-4" />
                <span>Mở Xem Ảnh & Duyệt Nghiệm Thu</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-xl border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX phóng to ảnh ── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Phóng to"
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ── Modal 5: Ảnh Thiết Kế & Nghiệm Thu (Tabs Phân Loại Từng Món) ── */}
      {isImageModalOpen && imageModalOrder && (() => {
        const isOrderUnderInspection =
          imageModalOrder.order_status === 'UNDER_INSPECTION' ||
          imageModalOrder.orderStatus === 'UNDER_INSPECTION' ||
          imageModalOrder.status === 'UNDER_INSPECTION';

        const itemsList = imageModalOrder.items || [];
        const isSingleItemSelected =
          activeImageTab !== 'ALL' && activeImageTab !== 'GENERAL';
        const selectedItem = isSingleItemSelected
          ? itemsList.find((it) => it.order_item_id === activeImageTab) || itemsList[0]
          : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 my-auto border border-stone-200 overflow-hidden">
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 bg-stone-50/60 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-purple-100 p-2.5 text-purple-800 shadow-2xs">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-stone-900">
                        Hồ Sơ Ảnh & Duyệt Nghiệm Thu — Lệnh #{imageModalOrder.production_code}
                      </h3>
                      <StatusBadge status={imageModalOrder.status} />
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Bản vẽ thiết kế đối chiếu trực tiếp với ảnh thành phẩm từ xưởng thợ
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsImageModalOpen(false)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                  title="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Thanh Tab Phân Loại Sản Phẩm (Tabs Pills) */}
              <div className="border-b border-stone-200 bg-white px-6 py-3 flex items-center gap-2 overflow-x-auto shrink-0 shadow-2xs">
                {/* Tab: Tất cả sản phẩm */}
                <button
                  type="button"
                  onClick={() => handleSelectImageTab('ALL')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                    activeImageTab === 'ALL'
                      ? 'bg-amber-700 text-white shadow-sm ring-2 ring-amber-700/20'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>Tất cả sản phẩm ({itemsList.length})</span>
                </button>

                {/* Các Tab riêng của từng sản phẩm */}
                {itemsList.map((it, idx) => {
                  const designsCount = (it.designImages?.length || (it.imageUrl ? 1 : 0));
                  const inspectsCount = (it.inspectionImages?.length || 0);
                  const isActive = activeImageTab === it.order_item_id;

                  return (
                    <button
                      key={it.order_item_id || idx}
                      type="button"
                      onClick={() => handleSelectImageTab(it.order_item_id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-amber-700 text-white shadow-sm ring-2 ring-amber-700/20'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span>#{idx + 1}. {it.item_name}</span>
                      <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                        isActive ? 'bg-amber-800 text-amber-100' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {designsCount} vẽ
                      </span>
                      {inspectsCount > 0 && (
                        <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          isActive ? 'bg-purple-900 text-purple-100' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {inspectsCount} thật
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Tab: Phối cảnh chung toàn đơn */}
                <button
                  type="button"
                  onClick={() => handleSelectImageTab('GENERAL')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                    activeImageTab === 'GENERAL'
                      ? 'bg-amber-700 text-white shadow-sm ring-2 ring-amber-700/20'
                      : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <Image className="h-3.5 w-3.5" />
                  <span>Phối cảnh chung ({imageModalOrder.generalDesignImages?.length || 0})</span>
                </button>
              </div>

              {/* Nội dung theo Tab (Cuộn mượt mà) */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-stone-50/40">

                {/* ── CASE 1: Xem chi tiết 1 sản phẩm được chọn (Side-by-Side) ── */}
                {isSingleItemSelected && selectedItem && (() => {
                  const itemDesigns = selectedItem.designImages && selectedItem.designImages.length > 0
                    ? selectedItem.designImages
                    : (selectedItem.imageUrl ? [selectedItem.imageUrl] : []);
                  const itemInspections = selectedItem.inspectionImages || [];

                  return (
                    <div className="space-y-5">
                      {/* Thẻ tóm tắt thông số của sản phẩm đang xem */}
                      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-bold text-stone-900">
                              {selectedItem.item_name}
                            </span>
                            {selectedItem.product_code && (
                              <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-xs text-stone-600">
                                {selectedItem.product_code}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                            <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-950 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Ruler className="h-3 w-3 text-amber-700" />
                              {selectedItem.dimensions || `${selectedItem.length_cm || '—'} × ${selectedItem.width_cm || '—'} × ${selectedItem.height_cm || '—'} cm`}
                            </span>
                            {selectedItem.materialName && <span>🪵 Chất liệu: <strong>{selectedItem.materialName}</strong></span>}
                            {selectedItem.colorName && <span>🎨 Màu: <strong>{selectedItem.colorName}</strong></span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700">
                            Kế hoạch: <strong className="text-amber-900">{selectedItem.quantity_planned}</strong> cái
                          </span>
                        </div>
                      </div>

                      {/* Bố cục 2 Cột Đối Chiếu Song Song (Bản vẽ mẫu VS Ảnh thành phẩm) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* CỘT TRÁI: Bản vẽ kỹ thuật mẫu */}
                        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-2xs space-y-4">
                          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                            <div>
                              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                                <Image className="h-4 w-4 text-amber-700" />
                                <span>Bản Vẽ Kỹ Thuật Mẫu</span>
                                <span className="rounded-full bg-amber-100 px-2 py-0.2 text-xs text-amber-800 font-bold">
                                  {itemDesigns.length}
                                </span>
                              </h4>
                              <p className="text-[11px] text-stone-500 mt-0.5">
                                Hồ sơ thiết kế & quy cách gửi cho xưởng gia công
                              </p>
                            </div>
                          </div>

                          {/* Gallery ảnh bản vẽ */}
                          {itemDesigns.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {itemDesigns.map((url, idx) => (
                                <div
                                  key={idx}
                                  className="relative group rounded-xl overflow-hidden border border-amber-300 aspect-square bg-amber-50/30 cursor-pointer shadow-2xs hover:scale-105 transition"
                                  onClick={() => setLightboxSrc(url)}
                                  title={`Xem lớn bản vẽ ${idx + 1}`}
                                >
                                  <img src={url} alt={`Bản vẽ ${idx + 1}`} className="h-full w-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <ZoomIn className="h-5 w-5 text-white" />
                                  </div>
                                  <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-medium">
                                    Bản vẽ {idx + 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-400">
                              Chưa có bản vẽ kỹ thuật riêng cho món này
                            </div>
                          )}

                          {/* Khung tải thêm bản vẽ cho riêng món này */}
                          <div className="rounded-xl border border-amber-300/80 bg-amber-50/50 p-4 space-y-3 pt-3">
                            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                              <Upload className="h-3.5 w-3.5 text-amber-700" />
                              <span>Tải thêm bản vẽ kỹ thuật cho món này</span>
                            </span>

                            {/* Preview ảnh đang chờ upload */}
                            {pendingDesignPreviews.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[11px] text-amber-800 font-medium">
                                  Ảnh mới chờ gửi ({pendingDesignPreviews.length}):
                                </span>
                                <div className="grid grid-cols-4 gap-2">
                                  {pendingDesignPreviews.map((src, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className="relative group rounded-lg overflow-hidden border-2 border-dashed border-amber-400 aspect-square bg-amber-50"
                                    >
                                      <img src={src} alt={`Preview ${pIdx + 1}`} className="h-full w-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePendingDesign(pIdx)}
                                        className="absolute top-1 right-1 rounded-full bg-rose-600 p-0.5 opacity-0 group-hover:opacity-100 transition text-white"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-dashed border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition shadow-2xs">
                                <Upload className="h-3.5 w-3.5" />
                                Chọn ảnh từ máy
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleDesignFileSelect} />
                              </label>
                            </div>

                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={newDesignUrl}
                                onChange={(e) => setNewDesignUrl(e.target.value)}
                                placeholder="Hoặc dán URL ảnh thiết kế (https://...)"
                                className="flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs focus:border-amber-600 focus:outline-none bg-white"
                              />
                              <button
                                type="button"
                                onClick={handleAddDesignUrl}
                                className="rounded-lg bg-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-300 transition"
                              >
                                Thêm URL
                              </button>
                            </div>

                            {pendingDesignFiles.length > 0 && (
                              <button
                                type="button"
                                onClick={handleSubmitDesignImages}
                                disabled={uploadingDesign}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50 shadow-xs transition"
                              >
                                {uploadingDesign ? (
                                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Upload className="h-3.5 w-3.5" />
                                )}
                                <span>
                                  {uploadingDesign ? 'Đang gửi...' : `Lưu & Gửi ${pendingDesignFiles.length} bản vẽ cho thợ`}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* CỘT PHẢI: Ảnh thành phẩm thực tế từ thợ gửi lên */}
                        <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-2xs space-y-4">
                          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                            <div>
                              <h4 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                                <Camera className="h-4 w-4 text-purple-700" />
                                <span>Ảnh Thành Phẩm Thực Tế</span>
                                <span className="rounded-full bg-purple-100 px-2 py-0.2 text-xs text-purple-800 font-bold">
                                  {itemInspections.length}
                                </span>
                              </h4>
                              <p className="text-[11px] text-stone-500 mt-0.5">
                                Thợ hoàn thiện chụp từ xưởng gửi sang để chủ duyệt
                              </p>
                            </div>
                          </div>

                          {/* Gallery ảnh thành phẩm */}
                          {itemInspections.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {itemInspections.map((url, idx) => (
                                <div
                                  key={idx}
                                  className="relative group rounded-xl overflow-hidden border border-purple-300 aspect-square bg-purple-50/30 cursor-pointer shadow-2xs hover:scale-105 transition"
                                  onClick={() => setLightboxSrc(url)}
                                  title={`Xem lớn thành phẩm thực tế ${idx + 1}`}
                                >
                                  <img src={url} alt={`Thành phẩm ${idx + 1}`} className="h-full w-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <ZoomIn className="h-5 w-5 text-white" />
                                  </div>
                                  <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-medium">
                                    Ảnh thực tế {idx + 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center space-y-2 bg-stone-50/50">
                              <Camera className="h-8 w-8 text-stone-300 mx-auto" />
                              <p className="text-xs text-stone-500 font-medium">
                                Thợ đang gia công, chưa chụp ảnh nghiệm thu cho món này
                              </p>
                              <p className="text-[11px] text-stone-400">
                                Sau khi hoàn thành, thợ sẽ tải ảnh lên và hiển thị ở đây để bạn đối chiếu
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── CASE 2: Tab 'ALL' (Xem tổng hợp tất cả các sản phẩm) ── */}
                {activeImageTab === 'ALL' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-amber-700" />
                        <span>Hồ Sơ Toàn Bộ Sản Phẩm ({itemsList.length})</span>
                      </h4>
                      <span className="text-xs text-stone-500">
                        Bấm vào từng tab sản phẩm phía trên để đối chiếu lớn 1-1
                      </span>
                    </div>

                    {itemsList.map((it, idx) => {
                      const itemDesigns = it.designImages && it.designImages.length > 0
                        ? it.designImages
                        : (it.imageUrl ? [it.imageUrl] : []);
                      const itemInspections = it.inspectionImages || [];

                      return (
                        <div
                          key={idx}
                          className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs space-y-3 hover:border-amber-300 transition"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-stone-900 text-sm">
                                  #{idx + 1}. {it.item_name}
                                </span>
                                {it.product_code && (
                                  <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] text-stone-600">
                                    {it.product_code}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-stone-500 flex flex-wrap gap-2 mt-0.5">
                                <span>
                                  Kích thước:{' '}
                                  <strong className="text-amber-950 font-mono">
                                    {it.dimensions || `${it.length_cm || '—'} × ${it.width_cm || '—'} × ${it.height_cm || '—'} cm`}
                                  </strong>
                                </span>
                                <span>SL: <strong className="text-stone-700">{it.quantity_planned}</strong></span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectImageTab(it.order_item_id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition shrink-0"
                            >
                              <span>Xem đối chiếu lớn món này</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* 2 hàng: Bản vẽ và Thành phẩm */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {/* Bản vẽ */}
                            <div className="rounded-xl bg-amber-50/40 border border-amber-200/80 p-3 space-y-1.5">
                              <span className="text-xs font-bold text-amber-900 block">
                                📐 Bản vẽ kỹ thuật ({itemDesigns.length}):
                              </span>
                              {itemDesigns.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {itemDesigns.map((url, dIdx) => (
                                    <img
                                      key={dIdx}
                                      src={url}
                                      alt={`Bản vẽ ${dIdx + 1}`}
                                      onClick={() => setLightboxSrc(url)}
                                      className="h-14 w-14 rounded-lg border border-amber-300 object-cover cursor-pointer hover:scale-105 transition shadow-2xs"
                                      title="Bấm xem lớn"
                                    />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-stone-400 italic">Chưa có bản vẽ riêng</span>
                              )}
                            </div>

                            {/* Thành phẩm */}
                            <div className="rounded-xl bg-purple-50/40 border border-purple-200/80 p-3 space-y-1.5">
                              <span className="text-xs font-bold text-purple-900 block">
                                📸 Ảnh thành phẩm thực tế ({itemInspections.length}):
                              </span>
                              {itemInspections.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {itemInspections.map((url, fIdx) => (
                                    <img
                                      key={fIdx}
                                      src={url}
                                      alt={`Thành phẩm ${fIdx + 1}`}
                                      onClick={() => setLightboxSrc(url)}
                                      className="h-14 w-14 rounded-lg border border-purple-300 object-cover cursor-pointer hover:scale-105 transition shadow-2xs"
                                      title="Bấm xem lớn"
                                    />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-stone-400 italic">Chưa có ảnh thành phẩm</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── CASE 3: Tab 'GENERAL' (Phối cảnh không gian chung) ── */}
                {activeImageTab === 'GENERAL' && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                          <Image className="h-4 w-4 text-amber-700" />
                          <span>Bản Vẽ Phối Cảnh & Không Gian Chung Toàn Đơn</span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.2 text-xs text-amber-800 font-bold">
                            {imageModalOrder.generalDesignImages?.length || 0}
                          </span>
                        </h4>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Bản vẽ 3D tổng thể, bố cục phòng khách/phòng ngủ hoặc hồ sơ áp dụng cho toàn bộ lệnh
                        </p>
                      </div>

                      {imageModalOrder.generalDesignImages && imageModalOrder.generalDesignImages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {imageModalOrder.generalDesignImages.map((url, idx) => (
                            <div
                              key={idx}
                              className="relative group rounded-xl overflow-hidden border border-amber-300 aspect-video bg-stone-100 cursor-pointer shadow-2xs hover:scale-105 transition"
                              onClick={() => setLightboxSrc(url)}
                              title="Bấm xem lớn"
                            >
                              <img src={url} alt={`Phối cảnh ${idx + 1}`} className="h-full w-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <ZoomIn className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center text-xs text-stone-400">
                          Chưa có ảnh phối cảnh chung cho toàn đơn
                        </div>
                      )}

                      {/* Khung tải thêm bản vẽ không gian chung */}
                      <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-4 space-y-3 pt-3">
                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                          <Upload className="h-3.5 w-3.5 text-amber-700" />
                          <span>Tải thêm bản vẽ không gian chung toàn đơn</span>
                        </span>

                        {pendingDesignPreviews.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] text-amber-800 font-medium">
                              Ảnh mới chờ gửi ({pendingDesignPreviews.length}):
                            </span>
                            <div className="grid grid-cols-4 gap-2">
                              {pendingDesignPreviews.map((src, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="relative group rounded-lg overflow-hidden border-2 border-dashed border-amber-400 aspect-square bg-amber-50"
                                >
                                  <img src={src} alt={`Preview ${pIdx + 1}`} className="h-full w-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePendingDesign(pIdx)}
                                    className="absolute top-1 right-1 rounded-full bg-rose-600 p-0.5 opacity-0 group-hover:opacity-100 transition text-white"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-dashed border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition shadow-2xs">
                            <Upload className="h-3.5 w-3.5" />
                            Chọn ảnh từ máy
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleDesignFileSelect} />
                          </label>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={newDesignUrl}
                            onChange={(e) => setNewDesignUrl(e.target.value)}
                            placeholder="Hoặc dán URL ảnh thiết kế (https://...)"
                            className="flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs focus:border-amber-600 focus:outline-none bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleAddDesignUrl}
                            className="rounded-lg bg-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-300 transition"
                          >
                            Thêm URL
                          </button>
                        </div>

                        {pendingDesignFiles.length > 0 && (
                          <button
                            type="button"
                            onClick={handleSubmitDesignImages}
                            disabled={uploadingDesign}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50 shadow-xs transition"
                          >
                            {uploadingDesign ? (
                              <RotateCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {uploadingDesign ? 'Đang gửi...' : `Lưu & Gửi ${pendingDesignFiles.length} bản vẽ chung cho thợ`}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Cố Định: Quyết Định Nghiệm Thu & Đóng */}
              <div className="border-t border-stone-100 bg-stone-50/70 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                {/* Trạng thái nghiệm thu */}
                <div className="w-full sm:w-auto">
                  {isOrderUnderInspection ? (
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Thợ đã nộp ảnh thành phẩm nghiệm thu. Vui lòng đối chiếu và duyệt:</span>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 italic">
                      {imageModalOrder.order_status === 'READY_TO_DELIVER' ||
                      imageModalOrder.status === 'COMPLETED'
                        ? '✅ Đã nghiệm thu ĐẠT — Sản phẩm sẵn sàng xuất kho / giao hàng'
                        : `Trạng thái lệnh: ${imageModalOrder.status}`}
                    </p>
                  )}
                </div>

                {/* Nút hành động */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {isOrderUnderInspection && (
                    <>
                      <button
                        onClick={() => handleInspectSubmit(true)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700 shadow-sm transition active:scale-95 disabled:opacity-50"
                      >
                        <CheckCheck className="h-4 w-4" />
                        <span>Duyệt — Nghiệm thu ĐẠT</span>
                      </button>
                      <button
                        onClick={() => handleOpenInspectModal(imageModalOrder)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs sm:text-sm font-bold text-rose-700 hover:bg-rose-100 transition active:scale-95 disabled:opacity-50"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span>Từ chối — Bắt sửa lại</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setIsImageModalOpen(false)}
                    className="rounded-xl border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal 6: Từ Chối Nghiệm Thu (nhập lý do) ── */}
      {isInspectOpen && inspectOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
                  <ThumbsDown className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">Từ Chối Nghiệm Thu</h3>
              </div>
              <button onClick={() => setIsInspectOpen(false)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Nhập lý do từ chối để thợ biết cần sửa gì trước khi gửi lại ảnh nghiệm thu.
            </p>
            <textarea
              rows={4}
              value={inspectNote}
              onChange={(e) => setInspectNote(e.target.value)}
              placeholder="VD: Mối ghép không khít, cần đánh bóng lại bề mặt, thiếu phụ kiện..."
              className="w-full rounded-lg border border-stone-200 p-3 text-sm focus:border-rose-500 focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setIsInspectOpen(false)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleInspectSubmit(false)}
                disabled={submitting || !inspectNote.trim()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
