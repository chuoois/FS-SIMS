// =========================================================
// ManageProductionOrdersPage.jsx
// Quản lý Lệnh Gia Công (Manage Production Orders) dành cho Chủ xưởng (Owner)
// Chức năng:
// 1. Xem danh sách lệnh gia công (mã, loại, đơn hàng liên kết, trưởng nhóm, ngày dự kiến, trạng thái)
// 2. Tạo lệnh gia công cho đơn hàng CONFIRMED + CUSTOM
// 3. Phân công trưởng nhóm sản xuất (Staff Leader)
// 4. Hủy lệnh gia công (đơn hàng liên kết trở về trạng thái CONFIRMED)
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
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  getProductionOrders,
  getEligibleOrders,
  getStaffLeaders,
  createProductionOrder,
  assignLeader,
  cancelProductionOrder,
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

  return (
    <div className="space-y-6">
      {/* ── Tiêu đề & Nút thao tác ───────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-900">
              <Hammer className="h-6 w-6 text-amber-800" />
            </div>
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
                        {canAct ? (
                          <div className="inline-flex items-center gap-1.5">
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
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400 italic">Không khả dụng</span>
                        )}
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
                    Chọn đơn hàng CUSTOM đã chốt để giao cho xưởng sản xuất
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
                      Hiện không có đơn hàng đặt làm (CUSTOM) nào ở trạng thái CONFIRMED chưa được tạo lệnh gia công.
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
    </div>
  );
};
