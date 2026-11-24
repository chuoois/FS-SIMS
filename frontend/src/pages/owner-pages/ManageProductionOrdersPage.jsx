// =========================================================
// ManageProductionOrdersPage.jsx
// Quản lý Lệnh Gia Công (Manage Production Orders) dành cho Chủ xưởng (Owner)
// Chức năng:
// 1. Xem danh sách lệnh gia công (mã, loại, đơn hàng liên kết, trưởng nhóm, ngày dự kiến, trạng thái)
// 2. Tạo lệnh gia công cho đơn hàng CONFIRMED + CUSTOM
// 3. Phân công trưởng nhóm sản xuất (Staff Leader)
// 4. Hủy lệnh gia công (đơn hàng liên kết trở về trạng thái CONFIRMED)
// 5. Upload ảnh thiết kế / bản vẽ mẫu gửi thợ tham khảo
// 6. Xem ảnh nghiệm thu từ thợ gửi lên + Duyệt / Từ chối chất lượng thành phẩm Góc Nhà
// Chuẩn hóa 100% theo FSSIMS Design System (Xưởng sản xuất đồ gỗ nội thất Góc Nhà)
// =========================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
  AlertTriangle,
  AlertCircle,
  Calendar,
  Layers,
  ShoppingBag,
  User,
  Eye,
  Package,
  Image as ImageIcon,
  Upload,
  CheckCheck,
  ThumbsDown,
  Camera,
  Trash2,
  ZoomIn,
  ChevronRight,
  ExternalLink,
  Phone,
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
import { ProductionOrderStatusBadge } from '../../components/common/StatusBadge';
import { formatDateVN as formatDate } from '../../utils/formatters';

// ─── Hằng số trạng thái & tab lọc ──────────────────────────
const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả lệnh' },
  { key: 'DRAFT', label: 'Chờ sản xuất' },
  { key: 'IN_PROGRESS', label: 'Đang gia công' },
  { key: 'COMPLETED', label: 'Đã hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

export const ManageProductionOrdersPage = () => {
  let location = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    location = useLocation();
  } catch {
    location = null;
  }

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
  const [designImages, setDesignImages] = useState([]);         // ảnh Chủ gửi thợ
  const [inspectionImages, setInspectionImages] = useState([]); // ảnh thợ gửi Chủ
  const [uploadingDesign, setUploadingDesign] = useState(false);
  const [newDesignUrl, setNewDesignUrl] = useState('');
  const [pendingDesignFiles, setPendingDesignFiles] = useState([]);
  const [pendingDesignPreviews, setPendingDesignPreviews] = useState([]);
  const [selectedUploadItemId, setSelectedUploadItemId] = useState(null); // ID sản phẩm muốn tải ảnh riêng
  const [activeImageTab, setActiveImageTab] = useState('ALL');            // 'ALL' | order_item_id

  // ── States cho Modal Nghiệm Thu ───────────────────────────
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [inspectOrder, setInspectOrder] = useState(null);
  const [inspectNote, setInspectNote] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null); // xem ảnh phóng to

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    order_id: '',
    planned_start: '',
    planned_end: '',
    assigned_to: '',
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
    let oId = null;
    if (location?.search) {
      const sp = new URLSearchParams(location.search);
      oId = sp.get('orderId');
    } else if (location?.state?.orderId) {
      oId = location.state.orderId;
    } else if (typeof window !== 'undefined' && window.location?.search) {
      const sp = new URLSearchParams(window.location.search);
      oId = sp.get('orderId');
    }
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
  }, [location]);

  // ── Tải danh sách lệnh gia công ───────────────────────────
  const fetchProductionOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm.trim() || undefined,
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
    const draft = productionOrders.filter((po) => po.status === 'DRAFT' || po.status === 'ASSIGNED').length;
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
    const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    setCreateForm({
      order_id: '',
      planned_start: today,
      planned_end: nextTwoWeeks,
      assigned_to: '',
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
        assigned_to: createForm.assigned_to ? Number(createForm.assigned_to) : undefined,
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

  // ── Mở Modal Xem Chi Tiết Lệnh ────────────────────────────
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

  // Chọn tab trong Modal Ảnh (tất cả, hoặc món cụ thể)
  const handleSelectImageTab = (tabKey) => {
    setActiveImageTab(tabKey);
    if (tabKey === 'ALL') {
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
      toast.success(res?.message || (passed ? 'Đã duyệt nghiệm thu đạt chuẩn' : 'Đã từ chối nghiệm thu'));
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
      {/* ── 1. HEADER & HÀNH ĐỘNG CHÍNH ──────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Quản Lý Lệnh Gia Công
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Theo dõi tiến độ, tạo lệnh sản xuất cho đơn đặt làm, phân công trưởng nhóm và nghiệm thu thành phẩm Góc Nhà.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${refreshing ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-950 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo lệnh gia công</span>
          </button>
        </div>
      </div>

      {/* ── 2. THỐNG KÊ TỔNG QUAN (4 CARDS) ───────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số lệnh */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:border-stone-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Tổng lệnh gia công</span>
            <div className="rounded-lg bg-stone-100 p-1.5 text-stone-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-stone-900 sm:text-2xl">
            {stats.total}
            <span className="ml-1.5 text-xs font-sans font-normal text-stone-400">lệnh</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            Toàn bộ lệnh gia công xưởng
          </div>
        </div>

        {/* Chờ sản xuất */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-xs transition hover:border-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Chờ sản xuất</span>
            <div className="rounded-lg bg-amber-100 p-1.5 text-amber-800">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-amber-900 sm:text-2xl">
            {stats.draft}
            <span className="ml-1.5 text-xs font-sans font-normal text-amber-700/70">chưa bắt đầu</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700/80">
            Lệnh mới tạo hoặc đã giao việc
          </div>
        </div>

        {/* Đang gia công */}
        <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-4 shadow-xs transition hover:border-amber-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">Đang gia công</span>
            <div className="rounded-lg bg-amber-200/60 p-1.5 text-amber-900">
              <Hammer className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-amber-950 sm:text-2xl">
            {stats.inProgress}
            <span className="ml-1.5 text-xs font-sans font-normal text-amber-800">trong xưởng</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-800">
            Thợ đang chế tác gỗ tại xưởng
          </div>
        </div>

        {/* Hoàn thành */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-xs transition hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Đã hoàn thành</span>
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-emerald-900 sm:text-2xl">
            {stats.completed}
            <span className="ml-1.5 text-xs font-sans font-normal text-emerald-700/70">thành phẩm</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700/80">
            Đạt nghiệm thu chất lượng
          </div>
        </div>
      </section>

      {/* ── 3. TABS TRẠNG THÁI (PILL TABS CÓ COUNT) ───────────── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-200 pb-3">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          let count = stats.total;
          if (tab.key === 'DRAFT') count = stats.draft;
          if (tab.key === 'IN_PROGRESS') count = stats.inProgress;
          if (tab.key === 'COMPLETED') count = stats.completed;
          if (tab.key === 'CANCELLED') count = stats.cancelled;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key);
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                isActive
                  ? 'bg-stone-900 text-white font-semibold shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  isActive
                    ? 'bg-stone-800 text-stone-200'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 4. THANH TÌM KIẾM & BỘ LỌC ────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã lệnh gia công, mã đơn hàng, tên khách..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-9 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-600"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-600 shadow-xs transition hover:bg-stone-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* ── 5. BẢNG DANH SÁCH LỆNH GIA CÔNG ───────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3 pl-4 pr-3 sm:pl-6">Mã lệnh</th>
                <th className="px-3 py-3">Loại gia công</th>
                <th className="px-3 py-3">Đơn hàng liên kết</th>
                <th className="px-3 py-3">Trưởng nhóm phụ trách</th>
                <th className="px-3 py-3">Thời gian dự kiến</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
                <th className="py-3 pl-3 pr-4 text-center sm:pr-6">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="h-5 w-5 animate-spin text-amber-800" />
                      <span className="text-xs">Đang tải danh sách lệnh gia công...</span>
                    </div>
                  </td>
                </tr>
              ) : productionOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Hammer className="h-8 w-8 text-stone-300" />
                      <p className="font-semibold text-stone-700 text-sm">Không tìm thấy lệnh gia công nào</p>
                      <p className="text-xs text-stone-400">
                        Bấm &quot;Tạo lệnh gia công&quot; để giao việc cho các đơn hàng đã xác nhận.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                productionOrders.map((order) => {
                  const canAct = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';
                  const isUnderInspection =
                    order.order_status === 'UNDER_INSPECTION' ||
                    order.status === 'UNDER_INSPECTION';

                  return (
                    <tr key={order.production_id} className="transition hover:bg-stone-50/70">
                      {/* Mã lệnh */}
                      <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(order)}
                          className="font-mono font-semibold text-amber-900 hover:underline hover:text-amber-950 focus-visible:outline-none"
                        >
                          {order.production_code}
                        </button>
                      </td>

                      {/* Loại lệnh */}
                      <td className="whitespace-nowrap px-3 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold border ${
                            order.production_type === 'CUSTOM'
                              ? 'bg-amber-100 text-amber-900 border-amber-200'
                              : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {order.production_type === 'CUSTOM'
                            ? 'Đặt làm theo mẫu'
                            : order.production_type === 'READY'
                            ? 'Hàng sẵn có'
                            : 'Sản xuất kho'}
                        </span>
                      </td>

                      {/* Đơn hàng liên kết */}
                      <td className="px-3 py-3">
                        {order.order_code ? (
                          <div className="space-y-0.5">
                            <div className="font-mono font-medium text-stone-800 flex items-center gap-1.5">
                              <ShoppingBag className="h-3 w-3 text-stone-400" />
                              <span>{order.order_code}</span>
                            </div>
                            {order.customer_name && (
                              <div className="text-[11px] text-stone-500">
                                Khách: <span className="font-medium text-stone-700">{order.customer_name}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>

                      {/* Trưởng nhóm phụ trách */}
                      <td className="px-3 py-3">
                        {order.leader_name ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-stone-800 flex items-center gap-1.5">
                              <Hammer className="h-3 w-3 text-amber-900" />
                              <span>{order.leader_name}</span>
                            </div>
                            {order.leader_phone && (
                              <div className="text-[11px] font-mono text-stone-400 flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5 text-stone-400" />
                                <span>{order.leader_phone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-stone-400 italic">
                            Chưa phân công
                          </span>
                        )}
                      </td>

                      {/* Thời gian dự kiến */}
                      <td className="whitespace-nowrap px-3 py-3 text-stone-600">
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar className="h-3 w-3 text-stone-400" />
                          <span>
                            {formatDate(order.planned_start)} → {formatDate(order.planned_end)}
                          </span>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <ProductionOrderStatusBadge status={order.status} />
                      </td>

                      {/* Thao tác */}
                      <td className="whitespace-nowrap py-3 pl-3 pr-4 text-center sm:pr-6">
                        <div className="inline-flex items-center justify-center gap-1">
                          {/* Nút Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(order)}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            title="Xem chi tiết lệnh gia công"
                          >
                            <Eye className="h-3 w-3 text-stone-400" />
                            <span>Chi tiết</span>
                          </button>

                          {/* Nút Ảnh Thiết Kế & Nghiệm Thu */}
                          <button
                            type="button"
                            onClick={() => handleOpenImageModal(order)}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium shadow-xs transition active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
                              isUnderInspection
                                ? 'border border-amber-300 bg-amber-100 text-amber-900 font-bold animate-pulse'
                                : 'border border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100'
                            }`}
                            title={isUnderInspection ? 'Có ảnh nghiệm thu từ thợ chờ duyệt!' : 'Xem ảnh thiết kế & thành phẩm'}
                          >
                            <Camera className="h-3 w-3" />
                            <span>{isUnderInspection ? 'Duyệt ảnh' : 'Ảnh'}</span>
                            {isUnderInspection && (
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                            )}
                          </button>

                          {canAct && (
                            <>
                              {/* Nút Phân công trưởng nhóm */}
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(order)}
                                className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                                title="Phân công trưởng nhóm"
                              >
                                <UserCheck className="h-3 w-3 text-stone-400" />
                                <span>Phân công</span>
                              </button>

                              {/* Nút Hủy lệnh */}
                              <button
                                type="button"
                                onClick={() => handleOpenCancelModal(order)}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 shadow-xs transition hover:bg-rose-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                                title="Hủy lệnh gia công này"
                              >
                                <Ban className="h-3 w-3" />
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

      {/* ── MODAL 1: TẠO LỆNH GIA CÔNG MỚI ─────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <Hammer className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">Tạo Lệnh Gia Công</h2>
                  <p className="text-xs text-stone-500">
                    Giao đơn hàng đã xác nhận cho xưởng mộc Góc Nhà
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none"
                aria-label="Đóng modal tạo lệnh"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
              {/* Chọn đơn hàng */}
              <div>
                <label htmlFor="create-order-select" className="block text-xs font-semibold text-stone-700 mb-1">
                  Đơn hàng cần gia công <span className="text-rose-500">*</span>
                </label>
                {eligibleOrders.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
                    <span>
                      Hiện không có đơn hàng nào ở trạng thái Chờ xử lý cần tạo lệnh gia công.
                    </span>
                  </div>
                ) : (
                  <select
                    id="create-order-select"
                    value={createForm.order_id}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, order_id: e.target.value }))
                    }
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    required
                  >
                    <option value="">-- Chọn đơn hàng cần giao việc --</option>
                    {eligibleOrders.map((ord) => (
                      <option key={ord.order_id} value={ord.order_id}>
                        {ord.order_code} - {ord.contact_name} (
                        {Number(ord.total_amount || 0).toLocaleString('vi-VN')} đ)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Chọn Trưởng nhóm sản xuất */}
              <div>
                <label htmlFor="create-leader-select" className="block text-xs font-semibold text-stone-700 mb-1">
                  Trưởng nhóm sản xuất <span className="text-stone-400 font-normal">(Có thể phân công ngay)</span>
                </label>
                <select
                  id="create-leader-select"
                  value={createForm.assigned_to}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, assigned_to: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                >
                  <option value="">-- Để trống (Chủ xưởng phân công sau) --</option>
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
              </div>

              {/* Ngày bắt đầu & kết thúc */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="create-planned-start" className="block text-xs font-semibold text-stone-700 mb-1">
                    Ngày bắt đầu dự kiến <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="create-planned-start"
                    type="date"
                    value={createForm.planned_start}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, planned_start: e.target.value }))
                    }
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="create-planned-end" className="block text-xs font-semibold text-stone-700 mb-1">
                    Ngày kết thúc dự kiến <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="create-planned-end"
                    type="date"
                    value={createForm.planned_end}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, planned_end: e.target.value }))
                    }
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    required
                  />
                </div>
              </div>

              {/* Nút hành động */}
              <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting || eligibleOrders.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                >
                  {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Tạo lệnh gia công</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PHÂN CÔNG TRƯỞNG NHÓM ───────────────── */}
      {isAssignOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">Phân Công Trưởng Nhóm</h2>
                  <p className="text-xs text-stone-500">
                    Chỉ định thợ trưởng chịu trách nhiệm cho lệnh gia công này
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none"
                aria-label="Đóng modal phân công"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200 space-y-1.5">
                <div>
                  <span className="font-semibold text-stone-600">Mã lệnh:</span>{' '}
                  <span className="font-mono font-bold text-amber-900">{selectedOrder.production_code}</span>
                </div>
                {selectedOrder.order_code && (
                  <div>
                    <span className="font-semibold text-stone-600">Đơn hàng:</span>{' '}
                    <span className="font-mono font-medium text-stone-800">{selectedOrder.order_code}</span>{' '}
                    <span className="text-stone-500">({selectedOrder.customer_name})</span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="assign-leader-select" className="block text-xs font-semibold text-stone-700 mb-1">
                  Chọn Trưởng nhóm sản xuất <span className="text-rose-500">*</span>
                </label>
                {staffLeaders.length === 0 ? (
                  <p className="mt-1 text-xs text-stone-500 italic">
                    Chưa có tài khoản nào thuộc vai trò Trưởng nhóm (LEADERSTAFF) đang hoạt động.
                  </p>
                ) : (
                  <select
                    id="assign-leader-select"
                    value={assignForm.assigned_to}
                    onChange={(e) =>
                      setAssignForm({ assigned_to: e.target.value })
                    }
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
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

              <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting || staffLeaders.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                >
                  {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Lưu phân công</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: XÁC NHẬN HỦY LỆNH GIA CÔNG ───────────── */}
      {isCancelOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">Xác nhận hủy lệnh gia công</h2>
                <p className="text-xs text-stone-500">Mã lệnh: <span className="font-mono text-amber-900">{selectedOrder.production_code}</span></p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-rose-50/50 p-3.5 border border-rose-200 text-xs space-y-1.5">
              <p className="text-stone-700">
                Bạn có chắc chắn muốn hủy lệnh gia công <strong className="font-mono text-rose-900">{selectedOrder.production_code}</strong>?
              </p>
              {selectedOrder.order_code && (
                <p className="text-stone-600">
                  ⚠️ Đơn hàng liên kết <strong className="font-mono text-stone-800">{selectedOrder.order_code}</strong> sẽ được tự động chuyển về trạng thái <strong>CONFIRMED (Đã xác nhận)</strong>.
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCancelOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                Giữ lại
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
              >
                {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Xác nhận hủy lệnh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: CHI TIẾT LỆNH GIA CÔNG & SẢN PHẨM ────── */}
      {isDetailOpen && detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-stone-200 my-8 overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <Hammer className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-stone-900 sm:text-lg">
                      Chi tiết lệnh gia công — <span className="font-mono text-amber-900">#{detailOrder.production_code}</span>
                    </h2>
                    <ProductionOrderStatusBadge status={detailOrder.status} />
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Hồ sơ quy cách sản phẩm gỗ, bản vẽ kỹ thuật và ảnh thành phẩm đối chiếu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition focus-visible:outline-none"
                aria-label="Đóng chi tiết lệnh"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto bg-stone-50/20 text-xs">
              {/* Tóm tắt 3 cột */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                    Đơn hàng liên kết
                  </span>
                  {detailOrder.order_code ? (
                    <>
                      <div className="flex items-center gap-1.5 font-bold font-mono text-stone-800 text-sm">
                        <ShoppingBag className="h-4 w-4 text-amber-900" />
                        <span>#{detailOrder.order_code}</span>
                      </div>
                      {detailOrder.customer_name && (
                        <div className="text-stone-600 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-stone-400" />
                          <span>Khách: <strong className="font-semibold text-stone-800">{detailOrder.customer_name}</strong></span>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-stone-400 italic">Sản xuất kho dự trữ</span>
                  )}
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                    Thợ trưởng phụ trách
                  </span>
                  <div className="flex items-center gap-1.5 text-stone-800 text-sm font-semibold">
                    <UserCheck className="h-4 w-4 text-emerald-700" />
                    <span>{detailOrder.leader_name || 'Chưa phân công'}</span>
                  </div>
                  <div className="text-stone-500 flex items-center gap-1 font-mono text-[11px]">
                    <Calendar className="h-3 w-3 text-stone-400" />
                    <span>Kế hoạch: {formatDate(detailOrder.planned_start)} → {formatDate(detailOrder.planned_end)}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-3.5 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                      Quy mô & Thao tác
                    </span>
                    <div className="text-stone-700 font-semibold mt-1">
                      {detailOrder.items?.length || 0} sản phẩm cần chế tác
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenImageModal(detailOrder);
                    }}
                    className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 transition active:scale-95"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Kho ảnh & Nghiệm thu</span>
                  </button>
                </div>
              </div>

              {/* Danh sách sản phẩm trong lệnh */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-amber-900" />
                    <span>Sản phẩm trong lệnh ({detailOrder.items?.length || 0})</span>
                  </h3>
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
                          className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-3"
                        >
                          {/* Header của sản phẩm */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-900">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-stone-900 text-sm">
                                {it.item_name}
                              </span>
                              {it.product_code && (
                                <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] text-stone-600">
                                  {it.product_code}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="rounded bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                                Kế hoạch: <strong className="font-mono text-amber-900">{it.quantity_planned}</strong> cái
                              </span>
                              <span className={`rounded px-2.5 py-1 text-xs font-medium ${
                                it.quantity_done >= it.quantity_planned
                                  ? 'bg-emerald-100 text-emerald-800 font-semibold'
                                  : 'bg-amber-100 text-amber-800 font-semibold'
                              }`}>
                                Đã xong: {it.quantity_done} / {it.quantity_planned}
                              </span>
                            </div>
                          </div>

                          {/* Thông số kỹ thuật & quy cách */}
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 font-semibold text-amber-950 font-mono text-xs">
                              <span>
                                Quy cách:{' '}
                                {it.dimensions ? (
                                  it.dimensions
                                ) : (it.length_cm || it.width_cm || it.height_cm) ? (
                                  `${it.length_cm || '—'} × ${it.width_cm || '—'} × ${it.height_cm || '—'} cm`
                                ) : (
                                  'Theo thiết kế duyệt'
                                )}
                              </span>
                            </div>

                            {it.materialName && (
                              <div className="inline-flex items-center gap-1 rounded-md bg-stone-100 border border-stone-200 px-2.5 py-1 text-stone-700">
                                <span>Chất liệu: <strong>{it.materialName}</strong></span>
                              </div>
                            )}

                            {it.colorName && (
                              <div className="inline-flex items-center gap-1 rounded-md bg-stone-100 border border-stone-200 px-2.5 py-1 text-stone-700">
                                <span>Màu: <strong>{it.colorName}</strong></span>
                              </div>
                            )}
                          </div>

                          {/* Đối chiếu ảnh bản vẽ vs ảnh thành phẩm */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {/* Cột Trái: Bản vẽ */}
                            <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-amber-900 flex items-center gap-1">
                                  Bản vẽ kỹ thuật ({itemDesigns.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsDetailOpen(false);
                                    handleOpenImageModal(detailOrder, it.order_item_id);
                                  }}
                                  className="text-[11px] font-semibold text-amber-800 hover:underline inline-flex items-center gap-0.5"
                                >
                                  <Upload className="h-3 w-3" />
                                  <span>+ Tải thêm</span>
                                </button>
                              </div>

                              {itemDesigns.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {itemDesigns.map((url, dIdx) => (
                                    <button
                                      key={dIdx}
                                      type="button"
                                      onClick={() => setLightboxSrc(url)}
                                      className="relative group rounded-lg overflow-hidden border border-amber-300 h-14 w-14 bg-white shadow-2xs hover:scale-105 transition"
                                      title="Bấm xem lớn bản vẽ"
                                    >
                                      <img src={url} alt={`Bản vẽ ${dIdx + 1}`} className="h-full w-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-stone-400 italic">Chưa có bản vẽ riêng cho món này</p>
                              )}
                            </div>

                            {/* Cột Phải: Ảnh thành phẩm từ thợ */}
                            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-stone-800 flex items-center gap-1">
                                  <Camera className="h-3 w-3 text-stone-500" />
                                  Ảnh thành phẩm thợ nộp ({itemInspections.length})
                                </span>
                              </div>

                              {itemInspections.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {itemInspections.map((url, fIdx) => (
                                    <button
                                      key={fIdx}
                                      type="button"
                                      onClick={() => setLightboxSrc(url)}
                                      className="relative group rounded-lg overflow-hidden border border-stone-300 h-14 w-14 bg-white shadow-2xs hover:scale-105 transition"
                                      title="Bấm xem lớn ảnh thành phẩm"
                                    >
                                      <img src={url} alt={`Thành phẩm ${fIdx + 1}`} className="h-full w-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-stone-400 italic">Thợ đang gia công, chưa nộp ảnh thành phẩm</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center text-stone-400 bg-white">
                    Chưa có thông tin sản phẩm chi tiết cho lệnh này
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-between border-t border-stone-200 px-6 py-4 bg-stone-50">
              <button
                type="button"
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenImageModal(detailOrder);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 transition active:scale-95"
              >
                <Camera className="h-4 w-4" />
                <span>Xem ảnh & Duyệt nghiệm thu</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 transition active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX PHÓNG TO ẢNH ──────────────────────────── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxSrc}
              alt="Phóng to"
              className="max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setLightboxSrc(null)}
              className="absolute -top-3 -right-3 rounded-full bg-stone-800 p-2 text-white hover:bg-stone-700 shadow-lg"
              aria-label="Đóng ảnh xem lớn"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 5: ẢNH THIẾT KẾ & NGHIỆM THU ─────────────── */}
      {isImageModalOpen && imageModalOrder && (() => {
        const isOrderUnderInspection =
          imageModalOrder.order_status === 'UNDER_INSPECTION' ||
          imageModalOrder.orderStatus === 'UNDER_INSPECTION' ||
          imageModalOrder.status === 'UNDER_INSPECTION';

        const itemsList = imageModalOrder.items || [];
        const isSingleItemSelected = activeImageTab !== 'ALL';
        const selectedItem = isSingleItemSelected
          ? itemsList.find((it) => it.order_item_id === activeImageTab) || itemsList[0]
          : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-stone-200 my-8 overflow-hidden">
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-stone-900">
                        Hồ sơ ảnh & Nghiệm thu — <span className="font-mono text-amber-900">#{imageModalOrder.production_code}</span>
                      </h2>
                      <ProductionOrderStatusBadge status={imageModalOrder.status} />
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Đối chiếu bản vẽ thiết kế kỹ thuật với ảnh chụp thành phẩm thực tế từ thợ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(false)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition focus-visible:outline-none"
                  aria-label="Đóng hồ sơ ảnh"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tabs Phân loại theo món */}
              <div className="border-b border-stone-200 bg-white px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => handleSelectImageTab('ALL')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                    activeImageTab === 'ALL'
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>Tất cả sản phẩm ({itemsList.length})</span>
                </button>

                {itemsList.map((it, idx) => {
                  const designsCount = (it.designImages?.length || (it.imageUrl ? 1 : 0));
                  const inspectsCount = (it.inspectionImages?.length || 0);
                  const isActive = activeImageTab === it.order_item_id;

                  return (
                    <button
                      key={it.order_item_id || idx}
                      type="button"
                      onClick={() => handleSelectImageTab(it.order_item_id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                        isActive
                          ? 'bg-amber-900 text-white shadow-xs'
                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span>#{idx + 1}. {it.item_name}</span>
                      <span className={`rounded px-1.5 py-0.2 text-[10px] ${
                        isActive ? 'bg-amber-950 text-amber-200' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {designsCount} vẽ
                      </span>
                      {inspectsCount > 0 && (
                        <span className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                          isActive ? 'bg-emerald-900 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {inspectsCount} thật
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Nội dung ảnh (Cuộn) */}
              <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto text-xs bg-stone-50/20">
                {/* Trường hợp 1: Xem 1 món riêng */}
                {isSingleItemSelected && selectedItem && (() => {
                  const itemDesigns = selectedItem.designImages && selectedItem.designImages.length > 0
                    ? selectedItem.designImages
                    : (selectedItem.imageUrl ? [selectedItem.imageUrl] : []);
                  const itemInspections = selectedItem.inspectionImages || [];

                  return (
                    <div className="space-y-4">
                      {/* Thẻ tóm tắt món đang xem */}
                      <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-stone-900">
                              {selectedItem.item_name}
                            </span>
                            {selectedItem.product_code && (
                              <span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] text-stone-600">
                                {selectedItem.product_code}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-stone-600 mt-1 font-mono">
                            <span className="bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-amber-950 font-semibold">
                              {selectedItem.dimensions || `${selectedItem.length_cm || '—'} × ${selectedItem.width_cm || '—'} × ${selectedItem.height_cm || '—'} cm`}
                            </span>
                            {selectedItem.materialName && <span>Gỗ: <strong>{selectedItem.materialName}</strong></span>}
                            {selectedItem.colorName && <span>Màu: <strong>{selectedItem.colorName}</strong></span>}
                          </div>
                        </div>

                        <div>
                          <span className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700">
                            Kế hoạch: <strong className="font-mono text-amber-900">{selectedItem.quantity_planned}</strong> cái
                          </span>
                        </div>
                      </div>

                      {/* 2 Cột Đối Chiếu Song Song */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Cột Trái: Bản vẽ */}
                        <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                <ImageIcon className="h-4 w-4 text-amber-800" />
                                <span>Bản vẽ kỹ thuật mẫu ({itemDesigns.length})</span>
                              </h4>
                            </div>
                          </div>

                          {itemDesigns.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2.5">
                              {itemDesigns.map((url, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setLightboxSrc(url)}
                                  className="relative group rounded-lg overflow-hidden border border-amber-300 aspect-square bg-amber-50 shadow-2xs hover:scale-105 transition"
                                  title={`Xem bản vẽ ${idx + 1}`}
                                >
                                  <img src={url} alt={`Bản vẽ ${idx + 1}`} className="h-full w-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <ZoomIn className="h-4 w-4 text-white" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-stone-200 p-6 text-center text-stone-400">
                              Chưa có bản vẽ kỹ thuật riêng cho món này
                            </div>
                          )}

                          {/* Upload thêm bản vẽ cho món này */}
                          <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2.5 pt-2">
                            <span className="font-semibold text-amber-950 flex items-center gap-1">
                              <Upload className="h-3.5 w-3.5 text-amber-900" />
                              <span>Tải thêm bản vẽ kỹ thuật cho món này</span>
                            </span>

                            {pendingDesignPreviews.length > 0 && (
                              <div className="grid grid-cols-4 gap-2">
                                {pendingDesignPreviews.map((src, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="relative group rounded-lg overflow-hidden border border-amber-400 aspect-square"
                                  >
                                    <img src={src} alt={`Preview ${pIdx + 1}`} className="h-full w-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePendingDesign(pIdx)}
                                      className="absolute top-1 right-1 rounded-full bg-rose-600 p-0.5 text-white opacity-0 group-hover:opacity-100 transition"
                                      aria-label="Xóa ảnh chờ"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-dashed border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50 transition shadow-2xs">
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
                                placeholder="Hoặc dán URL ảnh thiết kế..."
                                className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                              />
                              <button
                                type="button"
                                onClick={handleAddDesignUrl}
                                className="rounded-lg bg-stone-100 border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition"
                              >
                                Thêm URL
                              </button>
                            </div>

                            {pendingDesignFiles.length > 0 && (
                              <button
                                type="button"
                                onClick={handleSubmitDesignImages}
                                disabled={uploadingDesign}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-950 disabled:opacity-50 shadow-xs transition"
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

                        {/* Cột Phải: Ảnh thành phẩm thực tế */}
                        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                              <Camera className="h-4 w-4 text-stone-700" />
                              <span>Ảnh thành phẩm thực tế ({itemInspections.length})</span>
                            </h4>
                          </div>

                          {itemInspections.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2.5">
                              {itemInspections.map((url, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setLightboxSrc(url)}
                                  className="relative group rounded-lg overflow-hidden border border-stone-300 aspect-square bg-stone-50 shadow-2xs hover:scale-105 transition"
                                  title={`Xem ảnh thực tế ${idx + 1}`}
                                >
                                  <img src={url} alt={`Thành phẩm ${idx + 1}`} className="h-full w-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <ZoomIn className="h-4 w-4 text-white" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-stone-200 p-8 text-center space-y-2 bg-stone-50/50">
                              <Camera className="h-8 w-8 text-stone-300 mx-auto" />
                              <p className="font-semibold text-stone-600">Thợ đang gia công, chưa nộp ảnh nghiệm thu</p>
                              <p className="text-stone-400 text-[11px]">Sau khi hoàn thành, thợ sẽ tải ảnh lên đây để bạn nghiệm thu</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Trường hợp 2: Xem toàn bộ các món */}
                {activeImageTab === 'ALL' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-amber-900" />
                        <span>Hồ sơ toàn bộ sản phẩm ({itemsList.length})</span>
                      </h3>
                      <span className="text-stone-500">
                        Bấm vào từng tab phía trên để đối chiếu chi tiết 1-1
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
                          className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-3"
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
                              <div className="text-stone-500 flex flex-wrap gap-2 mt-0.5 font-mono text-[11px]">
                                <span>
                                  Quy cách:{' '}
                                  <strong className="text-amber-950">
                                    {it.dimensions || `${it.length_cm || '—'} × ${it.width_cm || '—'} × ${it.height_cm || '—'} cm`}
                                  </strong>
                                </span>
                                <span>SL: <strong className="text-stone-700">{it.quantity_planned}</strong></span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectImageTab(it.order_item_id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition shrink-0"
                            >
                              <span>Đối chiếu lớn món này</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="rounded-lg bg-amber-50/30 border border-amber-200 p-3 space-y-1">
                              <span className="font-bold text-amber-900 block">
                                📐 Bản vẽ kỹ thuật ({itemDesigns.length}):
                              </span>
                              {itemDesigns.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {itemDesigns.map((url, dIdx) => (
                                    <button
                                      key={dIdx}
                                      type="button"
                                      onClick={() => setLightboxSrc(url)}
                                      className="h-12 w-12 rounded border border-amber-300 overflow-hidden shadow-2xs hover:scale-105 transition"
                                    >
                                      <img src={url} alt={`Bản vẽ ${dIdx + 1}`} className="h-full w-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-stone-400 italic">Chưa có bản vẽ riêng</span>
                              )}
                            </div>

                            <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 space-y-1">
                              <span className="font-bold text-stone-800 block">
                                📸 Ảnh thành phẩm thực tế ({itemInspections.length}):
                              </span>
                              {itemInspections.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {itemInspections.map((url, fIdx) => (
                                    <button
                                      key={fIdx}
                                      type="button"
                                      onClick={() => setLightboxSrc(url)}
                                      className="h-12 w-12 rounded border border-stone-300 overflow-hidden shadow-2xs hover:scale-105 transition"
                                    >
                                      <img src={url} alt={`Thành phẩm ${fIdx + 1}`} className="h-full w-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-stone-400 italic">Chưa có ảnh thành phẩm</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer Modal: Duyệt Nghiệm Thu */}
              <div className="border-t border-stone-200 bg-stone-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  {isOrderUnderInspection ? (
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                      <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                      <span>Thợ đã nộp ảnh thành phẩm nghiệm thu. Vui lòng đối chiếu kỹ trước khi duyệt:</span>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 italic">
                      {imageModalOrder.order_status === 'READY_TO_DELIVER' ||
                      imageModalOrder.status === 'COMPLETED'
                        ? '✅ Đã nghiệm thu ĐẠT — Sản phẩm sẵn sàng xuất kho / giao khách'
                        : `Trạng thái lệnh: ${imageModalOrder.status}`}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  {isOrderUnderInspection && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleInspectSubmit(true)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs transition active:scale-95 disabled:opacity-50"
                      >
                        <CheckCheck className="h-4 w-4" />
                        <span>Duyệt — Nghiệm thu ĐẠT</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenInspectModal(imageModalOrder)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition active:scale-95 disabled:opacity-50"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span>Từ chối — Bắt sửa lại</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsImageModalOpen(false)}
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 transition active:scale-95"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL 6: TỪ CHỐI NGHIỆM THU ────────────────────── */}
      {isInspectOpen && inspectOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
                  <ThumbsDown className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">Từ Chối Nghiệm Thu</h2>
                  <p className="text-xs text-stone-500">Mã lệnh: <span className="font-mono text-amber-900">{inspectOrder.production_code}</span></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInspectOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 focus-visible:outline-none"
                aria-label="Đóng modal từ chối"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 mt-4 mb-2">
              Nhập chi tiết yêu cầu chỉnh sửa để thợ xưởng mộc khắc phục trước khi gửi lại ảnh nghiệm thu.
            </p>
            <textarea
              rows={4}
              value={inspectNote}
              onChange={(e) => setInspectNote(e.target.value)}
              placeholder="VD: Mối ghép góc chưa khít, bề mặt sơn PU còn gợn, thiếu phụ kiện tay nắm đồng..."
              className="w-full rounded-lg border border-stone-300 p-3 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
            />

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsInspectOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 transition active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleInspectSubmit(false)}
                disabled={submitting || !inspectNote.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition active:scale-95 disabled:opacity-50"
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

export default ManageProductionOrdersPage;
