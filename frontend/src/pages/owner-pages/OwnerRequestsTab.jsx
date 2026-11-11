// =========================================================
// OwnerRequestsTab.jsx
// Tab Thẩm định Yêu cầu Thiết kế & May đo cho Chủ xưởng (Owner)
// Đồng bộ giao diện theo chuẩn ManageOrdersPage / ManageProductsPage
// =========================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  RotateCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  Clock,
  Calendar,
  Layers,
  User,
  Phone,
  MapPin,
  Package,
  Image as ImageIcon,
  X,
  Maximize2,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getOwnerRequests,
  getOwnerRequestById,
  reviewOwnerRequest,
} from '../../services/orderManagementService';
import { TablePagination } from '../../components/common/TablePagination';

const formatVND = (val) =>
  val != null
    ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(val)
    : '—';

const formatDate = (d) =>
  d ? new Intl.DateTimeFormat('vi-VN').format(new Date(d)) : '—';

const formatTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const getOrderTypeLabel = (orderType) =>
  orderType === 'READY' ? 'Hàng có sẵn' : 'Đơn hàng theo yêu cầu';

const getImageUrl = (img) =>
  typeof img === 'string' ? img : img?.imageUrl || img?.image_url || '';

const getItemImages = (item, allRequestImages = []) => {
  const direct = Array.isArray(item?.images) ? item.images : [];
  if (direct.length > 0) return direct;
  if (!item?.requestItemId) return [];
  return (allRequestImages || []).filter(
    (img) =>
      typeof img === 'object' &&
      img !== null &&
      img.requestItemId != null &&
      Number(img.requestItemId) === Number(item.requestItemId)
  );
};

function RequestStatusBadge({ status }) {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          <Clock className="h-3 w-3 text-amber-600" />
          Chờ thẩm định
        </span>
      );
    case 'REQUEST_CHANGE':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
          <AlertTriangle className="h-3 w-3 text-orange-600" />
          Yêu cầu sửa
        </span>
      );
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          <CheckCircle2 className="h-3 w-3 text-blue-600" />
          Duyệt sơ bộ
        </span>
      );
    case 'DESIGN_FINALIZED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
          <Lock className="h-3 w-3 text-purple-600" />
          Đã chốt thiết kế
        </span>
      );
    case 'CONVERTED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          Đã lập hợp đồng
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
          <XCircle className="h-3 w-3 text-rose-600" />
          Đã từ chối
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
          {status}
        </span>
      );
  }
}

export const OwnerRequestsTab = ({ onReviewed } = {}) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });

  // Modal Chi tiết & Thẩm định
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reviewAction, setReviewAction] = useState(null); // 'REQUEST_CHANGE' | 'REJECT' | 'FINALIZE_DESIGN'
  const [reviewReason, setReviewReason] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);

  const fetchRequests = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const params = {
          page,
          limit,
          status: statusFilter,
          search: search.trim() || undefined,
          ...(orderTypeFilter !== 'ALL' ? { order_type: orderTypeFilter } : {}),
        };

        const res = await getOwnerRequests(params);
        const list = res.data || res.requests || [];
        setRequests(Array.isArray(list) ? list : []);
        if (res.pagination) setPagination(res.pagination);
      } catch (err) {
        console.error('Lỗi khi tải danh sách yêu cầu cho Owner:', err);
        toast.error('Không thể tải danh sách yêu cầu thiết kế.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, statusFilter, orderTypeFilter, search]
  );

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setOrderTypeFilter('ALL');
    setPage(1);
  };

  const handleOpenDetail = async (req) => {
    try {
      setSelectedRequest(req);
      setReviewAction(null);
      setReviewReason('');
      setReviewNote('');
      setDetailModalOpen(true);
      setLoadingDetail(true);
      const res = await getOwnerRequestById(req.requestId);
      if (res.data) setSelectedRequest(res.data);
    } catch (err) {
      console.error('Lỗi tải chi tiết yêu cầu:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setReviewAction(null);
    setReviewReason('');
    setReviewNote('');
  };

  const handleExecuteReview = async (action) => {
    if (!selectedRequest) return;

    if ((action === 'REQUEST_CHANGE' || action === 'REJECT') && !reviewReason.trim()) {
      toast.error('Vui lòng cung cấp lý do để gửi cho Sales.');
      return;
    }

    try {
      setSubmittingReview(true);
      await reviewOwnerRequest(selectedRequest.requestId, {
        action,
        reason: reviewReason.trim() || undefined,
        note: reviewNote.trim() || undefined,
      });

      const actionText =
        action === 'FINALIZE_DESIGN'
          ? 'Đã chốt thiết kế cuối cùng (khóa bản vẽ). Sales có thể tiến hành lập hợp đồng.'
          : action === 'REQUEST_CHANGE'
          ? 'Đã gửi yêu cầu chỉnh sửa thiết kế cho Sales.'
          : action === 'APPROVE'
          ? 'Đã duyệt sơ bộ yêu cầu.'
          : 'Đã từ chối yêu cầu.';

      toast.success(actionText);
      closeDetailModal();
      await fetchRequests();
      onReviewed?.();
    } catch (err) {
      console.error('Lỗi thẩm định yêu cầu:', err);
      toast.error(err.response?.data?.message || 'Không thể cập nhật thẩm định.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Thống kê nhanh đồng bộ chuẩn ManageOrdersPage / ManageProductsPage
  const stats = useMemo(() => {
    const total = pagination.totalItems || requests.length;
    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const requestChange = requests.filter((r) => r.status === 'REQUEST_CHANGE').length;
    const finalized = requests.filter(
      (r) => r.status === 'DESIGN_FINALIZED' || r.status === 'CONVERTED'
    ).length;
    return { total, pending, requestChange, finalized };
  }, [pagination.totalItems, requests]);

  // Ảnh dùng chung chưa gắn item riêng
  const generalImages = useMemo(() => {
    if (!selectedRequest) return [];
    const itemIds = new Set(
      (selectedRequest.items || []).map((it) => Number(it.requestItemId)).filter(Boolean)
    );
    return (selectedRequest.images || []).filter((img) => {
      if (typeof img === 'string') return true;
      const itemId = img?.requestItemId;
      return !itemId || !itemIds.has(Number(itemId));
    });
  }, [selectedRequest]);

  const hasActiveFilters =
    Boolean(search.trim()) || statusFilter !== 'ALL' || orderTypeFilter !== 'ALL';

  return (
    <div className="space-y-6">
      {/* ── Tiêu đề & Làm mới (chuẩn ManageOrdersPage / ManageProductsPage) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Thẩm Định Yêu Cầu Thiết Kế
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Kiểm tra thông số kỹ thuật, bản vẽ may đo từ Sales và chốt thiết kế trước khi lập hợp đồng.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchRequests(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 disabled:opacity-50"
            title="Tải lại danh sách yêu cầu"
          >
            <RotateCw
              className={`h-4 w-4 ${refreshing || loading ? 'animate-spin text-amber-700' : ''}`}
            />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── Thống kê tổng quan (4 KPI Cards) ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Tổng yêu cầu
            </span>
            <div className="rounded-lg bg-stone-100 p-1.5 text-stone-600">
              <ClipboardList className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900">{stats.total}</p>
          <span className="text-xs text-stone-500">Yêu cầu trong hệ thống</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Cần thẩm định
            </span>
            <div className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900">{stats.pending}</p>
          <span className="text-xs text-amber-700">Đang chờ Owner duyệt</span>
        </div>

        <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-800">
              Chờ Sales sửa
            </span>
            <div className="rounded-lg bg-orange-100 p-1.5 text-orange-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-orange-900">{stats.requestChange}</p>
          <span className="text-xs text-orange-700">Đã phản hồi chỉnh sửa</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Đã chốt / Lập HĐ
            </span>
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{stats.finalized}</p>
          <span className="text-xs text-emerald-700">Đã khóa bản vẽ hoặc tạo HĐ</span>
        </div>
      </div>

      {/* ── Bộ lọc & Tìm kiếm ── */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã yêu cầu, tên khách hàng, số điện thoại..."
              className="w-full rounded-lg border border-stone-300 py-2 pl-10 pr-9 text-sm text-stone-900 placeholder:text-stone-400 shadow-xs focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ thẩm định</option>
              <option value="REQUEST_CHANGE">Cần chỉnh sửa</option>
              <option value="APPROVED">Đã duyệt sơ bộ</option>
              <option value="DESIGN_FINALIZED">Đã chốt thiết kế</option>
              <option value="CONVERTED">Đã lập hợp đồng</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>

            <select
              value={orderTypeFilter}
              onChange={(e) => {
                setOrderTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              <option value="ALL">Tất cả loại đơn</option>
              <option value="CUSTOM">Đơn hàng theo yêu cầu</option>
              <option value="READY">Hàng có sẵn</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bảng danh sách yêu cầu ── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm text-stone-600">
            <thead className="border-b border-stone-200 bg-stone-50/75 text-xs font-semibold uppercase tracking-wider text-stone-500">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 sm:pl-6">
                  Mã yêu cầu
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Khách hàng
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Loại yêu cầu
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Số sản phẩm
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Thời gian gửi
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Trạng thái
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-4 text-center sm:pr-6">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="h-6 w-6 animate-spin text-amber-700" />
                      <span>Đang tải danh sách yêu cầu thiết kế...</span>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ClipboardList className="h-10 w-10 text-stone-300" />
                      <p className="font-medium text-stone-700">Chưa có yêu cầu thiết kế nào</p>
                      <p className="text-xs text-stone-400">
                        Không tìm thấy yêu cầu phù hợp với bộ lọc hiện tại.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const isPending = r.status === 'PENDING';
                  const isClosed = r.status === 'CONVERTED' || r.status === 'REJECTED';
                  return (
                    <tr key={r.requestId} className="transition hover:bg-stone-50/80">
                      <td className="py-3.5 pl-4 pr-3 sm:pl-6">
                        <span className="inline-block rounded border border-amber-200/80 bg-amber-50/70 px-2 py-0.5 font-mono text-xs font-bold text-amber-900">
                          {r.requestCode}
                        </span>
                        {r.title && (
                          <p
                            className="mt-1 max-w-[210px] truncate text-xs font-medium text-stone-600"
                            title={r.title}
                          >
                            {r.title}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                          <User className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                          <span>{r.customerName || r.contactName || 'Khách hàng'}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 font-mono text-xs text-stone-500">
                          <Phone className="h-3 w-3 shrink-0 text-stone-400" />
                          <span>{r.customerPhone || r.contactPhone || '—'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-medium ${
                            r.orderType === 'READY'
                              ? 'bg-stone-100 text-stone-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {getOrderTypeLabel(r.orderType)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded border border-stone-200 bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-800">
                          <Package className="h-3 w-3 text-stone-500" />
                          {(r.items || []).length} sản phẩm
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center text-xs">
                        <div className="font-medium text-stone-800">{formatDate(r.createdAt)}</div>
                        {formatTime(r.createdAt) && (
                          <div className="mt-0.5 font-mono text-[11px] text-stone-400">
                            {formatTime(r.createdAt)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <RequestStatusBadge status={r.status} />
                        {r.status === 'REQUEST_CHANGE' && r.rejectReason && (
                          <p
                            className="mx-auto mt-1 line-clamp-1 max-w-[180px] text-[11px] font-medium text-orange-700"
                            title={r.rejectReason}
                          >
                            Sửa: {r.rejectReason}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-center sm:pr-6">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(r)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition active:scale-95 ${
                            isPending
                              ? 'bg-amber-800 text-white hover:bg-amber-900'
                              : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <Eye
                            className={`h-3.5 w-3.5 ${
                              isPending ? 'text-amber-100' : 'text-stone-400'
                            }`}
                          />
                          <span>{isClosed ? 'Xem chi tiết' : 'Thẩm định & Chốt'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={pagination.currentPage || page}
          totalPages={pagination.totalPages || 1}
          totalItems={pagination.totalItems}
          currentCount={requests.length}
          itemsPerPage={limit}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          itemLabel="yêu cầu"
          loading={loading}
        />
      </div>

      {/* ── Modal Chi tiết & Thẩm định thiết kế ── */}
      {detailModalOpen && selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && closeDetailModal()}
        >
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-white px-6 py-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <FileCheck className="h-5 w-5 text-amber-800" />
                <h3 className="text-lg font-bold text-stone-900">Thẩm định yêu cầu thiết kế</h3>
                <span className="rounded border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-900">
                  #{selectedRequest.requestCode}
                </span>
                {loadingDetail && (
                  <RotateCw className="h-4 w-4 animate-spin text-amber-700" title="Đang đồng bộ..." />
                )}
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
                aria-label="Đóng"
                className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 overflow-y-auto p-6 text-sm text-stone-700">
              {/* Thanh trạng thái */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-600">Trạng thái:</span>
                  <RequestStatusBadge status={selectedRequest.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-500">
                  {selectedRequest.status === 'DESIGN_FINALIZED' && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 font-semibold text-purple-800">
                      <Lock className="h-3 w-3" />
                      Bản vẽ đã chốt & khóa
                    </span>
                  )}
                  <span className="font-mono">
                    Ngày gửi:{' '}
                    <strong className="font-semibold text-stone-800">
                      {formatDate(selectedRequest.createdAt)}
                      {formatTime(selectedRequest.createdAt)
                        ? ` ${formatTime(selectedRequest.createdAt)}`
                        : ''}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Phản hồi trước đó (nếu có) */}
              {(selectedRequest.status === 'REQUEST_CHANGE' ||
                selectedRequest.status === 'REJECTED') &&
                selectedRequest.rejectReason && (
                  <div
                    className={`rounded-xl border p-4 text-xs ${
                      selectedRequest.status === 'REJECTED'
                        ? 'border-rose-200 bg-rose-50/70 text-rose-900'
                        : 'border-orange-200 bg-orange-50/70 text-orange-900'
                    }`}
                  >
                    <p className="flex items-center gap-1.5 font-bold">
                      {selectedRequest.status === 'REJECTED' ? (
                        <XCircle className="h-4 w-4 text-rose-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                      )}
                      {selectedRequest.status === 'REJECTED'
                        ? 'Lý do từ chối:'
                        : 'Nội dung đã yêu cầu Sales chỉnh sửa:'}
                    </p>
                    <p className="mt-1 pl-5 italic">{selectedRequest.rejectReason}</p>
                  </div>
                )}

              {/* Thông tin khách hàng & Giao nhận */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-stone-200 bg-stone-50/50 p-4 md:grid-cols-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Khách hàng
                  </span>
                  <p className="mt-1 font-semibold text-stone-900">
                    {selectedRequest.contactName || selectedRequest.customerName || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Số điện thoại
                  </span>
                  <p className="mt-1 font-mono font-semibold text-stone-900">
                    {selectedRequest.contactPhone || selectedRequest.customerPhone || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Ngày mong muốn
                  </span>
                  <p className="mt-1 flex items-center gap-1 font-semibold text-stone-900">
                    <Calendar className="h-3.5 w-3.5 text-stone-400" />
                    {selectedRequest.expectedDate
                      ? formatDate(selectedRequest.expectedDate)
                      : 'Thỏa thuận'}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Loại đơn
                  </span>
                  <p className="mt-1 font-semibold text-stone-900">
                    {getOrderTypeLabel(selectedRequest.orderType)}
                  </p>
                </div>

                <div className="col-span-2 border-t border-stone-200/70 pt-3 md:col-span-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Địa chỉ giao hàng & thi công
                  </span>
                  <p className="mt-1 flex items-start gap-1.5 font-medium text-stone-900">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                    <span>{selectedRequest.deliveryAddress || 'Chưa cung cấp'}</span>
                  </p>
                </div>

                {selectedRequest.title && (
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Tiêu đề yêu cầu
                    </span>
                    <p className="mt-1 font-semibold text-stone-900">{selectedRequest.title}</p>
                  </div>
                )}

                {selectedRequest.description && (
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Mô tả tổng quan
                    </span>
                    <p className="mt-1 text-xs italic text-stone-700">
                      {selectedRequest.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Danh sách sản phẩm & Kích thước kỹ thuật */}
              <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-600">
                  <Layers className="h-4 w-4 text-amber-800" />
                  Danh sách sản phẩm & Thông số kỹ thuật ({(selectedRequest.items || []).length} món)
                </h4>
                <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-stone-200 bg-stone-50/75 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                        <tr>
                          <th className="px-3.5 py-2.5">Sản phẩm & Bản vẽ</th>
                          <th className="px-3.5 py-2.5">Kích thước (D × R × C cm)</th>
                          <th className="px-3.5 py-2.5 text-center">SL</th>
                          <th className="px-3.5 py-2.5 text-right">Đơn giá ước tính</th>
                          <th className="px-3.5 py-2.5">Ghi chú kỹ thuật</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {(selectedRequest.items || []).map((it, idx) => {
                          const dim = [it.lengthCm, it.widthCm, it.heightCm]
                            .filter(Boolean)
                            .join(' × ');
                          const itemImages = getItemImages(it, selectedRequest.images);
                          return (
                            <tr key={it.requestItemId || idx} className="hover:bg-stone-50/50">
                              <td className="px-3.5 py-2.5">
                                <p className="font-semibold text-stone-900">{it.itemName}</p>
                                {itemImages.length > 0 && (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {itemImages.map((img, imgIdx) => {
                                      const url = getImageUrl(img);
                                      if (!url) return null;
                                      return (
                                        <button
                                          key={img.imageId || img.requestImageId || imgIdx}
                                          type="button"
                                          onClick={() => setPreviewImg(url)}
                                          className="group relative h-11 w-14 overflow-hidden rounded border border-stone-200 bg-stone-100"
                                          title="Phóng to ảnh bản vẽ sản phẩm"
                                        >
                                          <img
                                            src={url}
                                            alt={`${it.itemName} - ảnh ${imgIdx + 1}`}
                                            className="h-full w-full object-cover transition group-hover:scale-105"
                                          />
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono font-bold text-amber-900">
                                {dim ? `${dim} cm` : '—'}
                              </td>
                              <td className="px-3.5 py-2.5 text-center font-bold text-stone-900">
                                {it.quantity}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-medium text-stone-800">
                                {it.unitPrice ? formatVND(it.unitPrice) : '—'}
                              </td>
                              <td className="px-3.5 py-2.5 italic text-stone-600">
                                {it.description || it.technicalNotes || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Ảnh đính kèm chung (nếu có ảnh chưa gắn theo món) */}
              {generalImages.length > 0 && (
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-600">
                    <ImageIcon className="h-4 w-4 text-amber-800" />
                    Bản vẽ & Hình ảnh đính kèm ({generalImages.length} ảnh)
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {generalImages.map((img, idx) => {
                      const url = getImageUrl(img);
                      if (!url) return null;
                      return (
                        <div
                          key={img.imageId || img.requestImageId || idx}
                          className="group relative overflow-hidden rounded-lg border border-stone-200"
                        >
                          <img
                            src={url}
                            alt={`Bản vẽ ${idx + 1}`}
                            className="h-20 w-28 cursor-pointer object-cover transition group-hover:scale-105"
                            onClick={() => setPreviewImg(url)}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewImg(url)}
                            aria-label="Phóng to ảnh"
                            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Panel nhập lý do / xác nhận chốt thiết kế */}
              {reviewAction && (
                <div
                  className={`space-y-3 rounded-xl border p-4 text-xs ${
                    reviewAction === 'REJECT'
                      ? 'border-rose-200 bg-rose-50/80'
                      : reviewAction === 'FINALIZE_DESIGN'
                      ? 'border-purple-200 bg-purple-50/80'
                      : 'border-amber-200 bg-amber-50/80'
                  }`}
                >
                  <h4
                    className={`text-sm font-bold ${
                      reviewAction === 'REJECT'
                        ? 'text-rose-900'
                        : reviewAction === 'FINALIZE_DESIGN'
                        ? 'text-purple-900'
                        : 'text-amber-900'
                    }`}
                  >
                    {reviewAction === 'REQUEST_CHANGE'
                      ? 'Nhập lý do yêu cầu Sales chỉnh sửa bản vẽ / thông số:'
                      : reviewAction === 'REJECT'
                      ? 'Nhập lý do từ chối yêu cầu thiết kế:'
                      : 'Xác nhận chốt thiết kế & khóa bản vẽ sản xuất'}
                  </h4>

                  {reviewAction === 'FINALIZE_DESIGN' ? (
                    <>
                      <p className="text-xs text-purple-800">
                        Sau khi chốt, bản vẽ và thông số kỹ thuật sẽ được khóa để Sales chuyển thành Hợp đồng với khách hàng.
                      </p>
                      <textarea
                        rows={2}
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Ghi chú nội bộ khi chốt bản vẽ (không bắt buộc)..."
                        className="w-full rounded-lg border border-purple-200 bg-white p-2.5 text-xs text-stone-900 focus:border-purple-700 focus:outline-none"
                      />
                    </>
                  ) : (
                    <textarea
                      rows={3}
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      placeholder={
                        reviewAction === 'REQUEST_CHANGE'
                          ? 'VD: Cần hạ chiều cao tủ từ 260cm xuống 250cm vì vướng dầm trần thạch cao.'
                          : 'Nhập lý do từ chối yêu cầu...'
                      }
                      className="w-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs text-stone-900 focus:border-amber-700 focus:outline-none"
                    />
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewAction(null)}
                      disabled={submittingReview}
                      className="rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteReview(reviewAction)}
                      disabled={submittingReview}
                      className={`rounded-lg px-4 py-1.5 font-bold text-white shadow-sm disabled:opacity-50 ${
                        reviewAction === 'REJECT'
                          ? 'bg-rose-700 hover:bg-rose-800'
                          : reviewAction === 'FINALIZE_DESIGN'
                          ? 'bg-purple-800 hover:bg-purple-900'
                          : 'bg-amber-800 hover:bg-amber-900'
                      }`}
                    >
                      {submittingReview
                        ? 'Đang xử lý...'
                        : reviewAction === 'FINALIZE_DESIGN'
                        ? 'Xác nhận chốt thiết kế'
                        : 'Xác nhận gửi'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-stone-50 px-6 py-4 text-xs">
              <button
                type="button"
                onClick={closeDetailModal}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 transition hover:bg-stone-100"
              >
                Đóng
              </button>

              {selectedRequest.status !== 'CONVERTED' && selectedRequest.status !== 'REJECTED' && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewAction('REJECT');
                      setReviewReason('');
                    }}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Từ chối
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReviewAction('REQUEST_CHANGE');
                      setReviewReason('');
                    }}
                    className="rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2 font-semibold text-orange-800 transition hover:bg-orange-100"
                  >
                    Yêu cầu chỉnh sửa
                  </button>

                  {selectedRequest.status !== 'DESIGN_FINALIZED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setReviewAction('FINALIZE_DESIGN');
                        setReviewNote('');
                      }}
                      disabled={submittingReview}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-purple-800 px-4 py-2 font-bold text-white shadow-sm transition hover:bg-purple-900 disabled:opacity-50"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Chốt thiết kế (Khóa bản vẽ)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal phóng to ảnh */}
      {previewImg && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImg}
              alt="Phóng to bản vẽ"
              className="max-h-[85vh] rounded-lg object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImg(null)}
              aria-label="Đóng ảnh phóng to"
              className="absolute -right-3 -top-3 rounded-full bg-white p-1.5 text-stone-800 shadow-lg hover:bg-stone-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerRequestsTab;
