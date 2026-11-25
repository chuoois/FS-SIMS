// =========================================================
// ManageSuppliersPage.jsx
// Giao diện Quản lý Nhà Cung Cấp dành riêng cho Chủ xưởng (Owner)
// Chức năng:
//  - Xem danh sách nhà cung cấp (tìm kiếm theo mã, tên, SĐT; lọc trạng thái; phân trang)
//  - Thống kê nhanh: Tổng NCC, Đang hoạt động, Ngừng hoạt động, Giao dịch
//  - Tạo mới nhà cung cấp (mã tự sinh, tên bắt buộc, status mặc định ACTIVE, kiểm tra trùng 409)
//  - Chỉnh sửa nhà cung cấp (không được sửa mã; sửa tên, SĐT, địa chỉ, ghi chú, trạng thái)
//  - Xem chi tiết nhà cung cấp & Lịch sử các phiếu nhập kho (material receipts)
//  - Xóa nhà cung cấp: Chỉ cho phép xóa khi chưa có phiếu nhập; nếu có thì chặn 409 và gợi ý chuyển INACTIVE
// Chuẩn hóa 100% theo FSSIMS Design System (Xưởng sản xuất đồ gỗ nội thất Góc Nhà)
// =========================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  RotateCw,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  X,
  Receipt,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getSuppliers,
  getSupplierDetail,
  getNextSupplierCode,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../../services/supplierService';
import { TablePagination } from '../../components/common/TablePagination';
import { AccountStatusBadge } from '../../components/common/StatusBadge';
import {
  formatVND as formatCurrency,
  formatDateVN as formatDate,
} from '../../utils/formatters';

// Tabs lọc trạng thái nhà cung cấp
const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả NCC' },
  { key: 'ACTIVE', label: 'Đang hoạt động' },
  { key: 'INACTIVE', label: 'Ngừng hoạt động' },
];

export const ManageSuppliersPage = () => {
  // ── States ───────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Selected item state
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    supplier_code: '',
    supplier_name: '',
    phone_number: '',
    address: '',
    note: '',
    status: 'ACTIVE',
  });
  const [editForm, setEditForm] = useState({
    supplier_name: '',
    phone_number: '',
    address: '',
    note: '',
    status: 'ACTIVE',
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete modal conflict state (409)
  const [deleteConflict, setDeleteConflict] = useState(null);

  // ── Fetch danh sách NCC ──────────────────────────────────
  const fetchSuppliers = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const params = {
          search: searchTerm.trim() || undefined,
          status: selectedStatusFilter !== 'ALL' ? selectedStatusFilter : undefined,
          page: currentPage,
          limit: pageSize,
        };

        const res = await getSuppliers(params);
        setSuppliers(res?.data || []);
        if (res?.pagination) {
          setPagination(res.pagination);
        }
      } catch (error) {
        console.error('[fetchSuppliers]', error);
        toast.error(error.response?.data?.message || 'Không thể tải danh sách nhà cung cấp');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchTerm, selectedStatusFilter, currentPage, pageSize]
  );

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ── Thống kê nhanh ───────────────────────────────────────
  const stats = useMemo(() => {
    const total = pagination.totalItems || suppliers.length;
    const activeCount = suppliers.filter((s) => s.status === 'ACTIVE').length;
    const inactiveCount = suppliers.filter((s) => s.status === 'INACTIVE').length;
    return { total, activeCount, inactiveCount };
  }, [suppliers, pagination.totalItems]);

  // Làm mới dữ liệu
  const handleRefresh = async () => {
    await fetchSuppliers(true);
    toast.success('Đã làm mới dữ liệu');
  };

  // Reset bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStatusFilter('ALL');
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // ── Xử lý Xem chi tiết kèm lịch sử phiếu nhập ─────────────
  const handleOpenDetail = async (supplier) => {
    setSelectedSupplier(supplier);
    setIsDetailOpen(true);
    setLoadingDetail(true);
    try {
      const res = await getSupplierDetail(supplier.supplier_id);
      setDetailData(res?.supplier || null);
    } catch (error) {
      console.error('[handleOpenDetail]', error);
      toast.error(error.response?.data?.message || 'Lỗi khi tải chi tiết nhà cung cấp');
    } finally {
      setLoadingDetail(false);
    }
  };

  // ── Xử lý Tạo mới ────────────────────────────────────────
  const handleOpenCreate = async () => {
    setIsCreateOpen(true);
    setCreateForm({
      supplier_code: 'Đang tải mã...',
      supplier_name: '',
      phone_number: '',
      address: '',
      note: '',
      status: 'ACTIVE',
    });
    try {
      const res = await getNextSupplierCode();
      setCreateForm((prev) => ({
        ...prev,
        supplier_code: res?.nextCode || '',
      }));
    } catch {
      setCreateForm((prev) => ({
        ...prev,
        supplier_code: '',
      }));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.supplier_name.trim()) {
      return toast.error('Vui lòng nhập tên nhà cung cấp');
    }

    const cleanPhone = createForm.phone_number?.trim();
    if (cleanPhone) {
      const dup = suppliers.find(
        (s) => s.phone_number && s.phone_number.trim() === cleanPhone
      );
      if (dup) {
        return toast.error(
          `Số điện thoại '${cleanPhone}' đã được sử dụng bởi nhà cung cấp '${dup.supplier_name}' (${dup.supplier_code})`
        );
      }
    }

    try {
      setSubmitting(true);
      await createSupplier(createForm);
      toast.success('Thêm nhà cung cấp mới thành công');
      setIsCreateOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error('[handleCreateSubmit]', error);
      const msg = error.response?.data?.message || 'Lỗi khi thêm nhà cung cấp';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Xử lý Sửa ────────────────────────────────────────────
  const handleOpenEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setEditForm({
      supplier_name: supplier.supplier_name || '',
      phone_number: supplier.phone_number || '',
      address: supplier.address || '',
      note: supplier.note || '',
      status: supplier.status || 'ACTIVE',
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.supplier_name.trim()) {
      return toast.error('Tên nhà cung cấp không được để trống');
    }

    const cleanPhone = editForm.phone_number?.trim();
    if (cleanPhone) {
      const dup = suppliers.find(
        (s) =>
          s.supplier_id !== selectedSupplier.supplier_id &&
          s.phone_number &&
          s.phone_number.trim() === cleanPhone
      );
      if (dup) {
        return toast.error(
          `Số điện thoại '${cleanPhone}' đã được sử dụng bởi nhà cung cấp '${dup.supplier_name}' (${dup.supplier_code})`
        );
      }
    }

    try {
      setSubmitting(true);
      await updateSupplier(selectedSupplier.supplier_id, editForm);
      toast.success('Cập nhật thông tin nhà cung cấp thành công');
      setIsEditOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error('[handleEditSubmit]', error);
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật nhà cung cấp');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Xử lý Xóa ────────────────────────────────────────────
  const handleOpenDelete = (supplier) => {
    setSelectedSupplier(supplier);
    setDeleteConflict(null);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setSubmitting(true);
      await deleteSupplier(selectedSupplier.supplier_id);
      toast.success('Xóa nhà cung cấp thành công');
      setIsDeleteOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error('[handleDeleteConfirm]', error);
      if (error.response?.status === 409) {
        setDeleteConflict(error.response.data);
      } else {
        toast.error(error.response?.data?.message || 'Không thể xóa nhà cung cấp');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Nút hành động nhanh: Chuyển sang INACTIVE khi không thể xóa
  const handleQuickDeactivate = async () => {
    try {
      setSubmitting(true);
      await updateSupplier(selectedSupplier.supplier_id, { status: 'INACTIVE' });
      toast.success(
        `Đã chuyển nhà cung cấp '${selectedSupplier.supplier_name}' sang trạng thái Ngừng hoạt động`
      );
      setIsDeleteOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error('[handleQuickDeactivate]', error);
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. TIÊU ĐỀ TRANG & NÚT HÀNH ĐỘNG CHÍNH ─────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Quản Lý Nhà Cung Cấp
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Quản lý đối tác cung ứng vật tư gỗ, phụ kiện ngũ kim và theo dõi lịch sử nhập kho xưởng Góc Nhà.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${refreshing ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-950 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm nhà cung cấp</span>
          </button>
        </div>
      </div>

      {/* ── 2. THỐNG KÊ TỔNG QUAN (3 CARDS) ───────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Tổng số nhà cung cấp */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:border-stone-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Tổng nhà cung cấp</span>
            <div className="rounded-lg bg-stone-100 p-1.5 text-stone-700">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-stone-900 sm:text-2xl">
            {stats.total}
            <span className="ml-1.5 text-xs font-sans font-normal text-stone-400">đối tác</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            Đối tác cung ứng vật tư xưởng mộc Góc Nhà
          </div>
        </div>

        {/* Đang hoạt động */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-xs transition hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Đang hoạt động</span>
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-emerald-900 sm:text-2xl">
            {stats.activeCount}
            <span className="ml-1.5 text-xs font-sans font-normal text-emerald-700/70">đối tác sẵn sàng</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">
            Được phép chọn khi lập phiếu nhập kho
          </div>
        </div>

        {/* Ngừng hoạt động */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 shadow-xs transition hover:border-rose-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Ngừng hoạt động</span>
            <div className="rounded-lg bg-rose-100 p-1.5 text-rose-800">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-rose-900 sm:text-2xl">
            {stats.inactiveCount}
            <span className="ml-1.5 text-xs font-sans font-normal text-rose-700/70">tạm ngừng</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-700">
            Tạm dừng giao dịch cung ứng vật tư
          </div>
        </div>
      </section>

      {/* ── 3. TABS LỌC TRẠNG THÁI NHÀ CUNG CẤP ────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-200 pb-2">
        {STATUS_TABS.map((tab) => {
          const isActive = selectedStatusFilter === tab.key;
          let count = stats.total;
          if (tab.key === 'ACTIVE') count = stats.activeCount;
          if (tab.key === 'INACTIVE') count = stats.inactiveCount;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setSelectedStatusFilter(tab.key);
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

      {/* ── 4. BỘ LỌC & TÌM KIẾM ──────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {/* Ô tìm kiếm */}
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã nhà cung cấp, tên hoặc số điện thoại..."
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
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-600"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lọc Trạng thái */}
          <div className="flex items-center gap-2">
            <select
              aria-label="Lọc theo trạng thái"
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </select>

            {/* Nút reset bộ lọc nếu có thay đổi */}
            {(searchTerm || selectedStatusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-100 active:scale-95"
                title="Xóa bộ lọc"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Xóa lọc</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. BẢNG DANH SÁCH NHÀ CUNG CẤP ─────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3 pl-4 pr-3 sm:pl-6">Nhà cung cấp</th>
                <th className="px-3 py-3">Mã NCC</th>
                <th className="px-3 py-3">Số điện thoại</th>
                <th className="px-3 py-3">Địa chỉ</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
                <th className="px-3 py-3">Ngày tạo</th>
                <th className="py-3 pl-3 pr-4 text-center sm:pr-6">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="h-5 w-5 animate-spin text-amber-800" />
                      <span className="text-xs">Đang tải danh sách nhà cung cấp...</span>
                    </div>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="h-8 w-8 text-stone-300" />
                      <p className="font-semibold text-stone-700 text-sm">Không tìm thấy nhà cung cấp nào</p>
                      <p className="text-xs text-stone-400">
                        {searchTerm || selectedStatusFilter !== 'ALL'
                          ? 'Thử điều chỉnh lại bộ lọc tìm kiếm.'
                          : 'Bấm "Thêm nhà cung cấp" để khai báo đối tác cung ứng mới.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                suppliers.map((item) => (
                  <tr
                    key={item.supplier_id}
                    className="transition hover:bg-stone-50/70"
                  >
                    {/* Tên & Avatar */}
                    <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-900/10 text-amber-950 font-bold font-mono text-xs border border-amber-900/20 shadow-2xs">
                          {item.supplier_name?.charAt(0)?.toUpperCase() || 'N'}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            className="font-semibold text-stone-900 hover:text-amber-900 hover:underline text-left focus-visible:outline-none"
                          >
                            {item.supplier_name}
                          </button>
                          {item.note && (
                            <p className="line-clamp-1 text-[11px] text-stone-400 max-w-xs">{item.note}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Mã NCC */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="rounded-md border border-amber-200/80 bg-amber-50/60 px-2 py-0.5 font-mono text-xs font-semibold text-amber-900">
                        {item.supplier_code}
                      </span>
                    </td>

                    {/* Số điện thoại */}
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-stone-600">
                      {item.phone_number ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-stone-400" />
                          <span>{item.phone_number}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    {/* Địa chỉ */}
                    <td className="px-3 py-3 text-xs text-stone-600 max-w-xs truncate">
                      {item.address || <span className="text-stone-400">—</span>}
                    </td>

                    {/* Trạng thái */}
                    <td className="whitespace-nowrap px-3 py-3 text-center">
                      <AccountStatusBadge status={item.status} />
                    </td>

                    {/* Ngày tạo */}
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-stone-600">
                      {item.createdate ? formatDate(item.createdate) : '—'}
                    </td>

                    {/* Thao tác */}
                    <td className="whitespace-nowrap py-3 pl-3 pr-4 text-center sm:pr-6">
                      <div className="inline-flex items-center justify-center gap-1">
                        {/* Xem chi tiết */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                          title="Xem chi tiết & Lịch sử phiếu nhập"
                        >
                          <Eye className="h-3 w-3 text-stone-400" />
                          <span>Chi tiết</span>
                        </button>

                        {/* Chỉnh sửa */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 shadow-xs transition hover:bg-amber-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                          title="Chỉnh sửa thông tin nhà cung cấp"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Sửa</span>
                        </button>

                        {/* Xóa */}
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 shadow-xs transition hover:bg-rose-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                          title="Xóa nhà cung cấp này"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          currentCount={suppliers.length}
          itemsPerPage={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={handlePageChange}
          itemLabel="nhà cung cấp"
          loading={loading}
        />
      </div>

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 1: THÊM MỚI NHÀ CUNG CẤP                        */}
      {/* ═════════════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900 sm:text-lg">
                    Thêm Mới Nhà Cung Cấp
                  </h2>
                  <p className="text-xs text-stone-500">
                    Khai báo thông tin đơn vị cung cấp gỗ, vật tư ngũ kim cho xưởng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none"
                aria-label="Đóng form tạo nhà cung cấp"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Mã nhà cung cấp (Tự động sinh)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={createForm.supplier_code || 'Đang tải mã...'}
                    className="w-full rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 font-mono text-xs text-stone-600 cursor-not-allowed uppercase"
                  />
                  <p className="mt-1 text-[11px] text-stone-400">Hệ thống tự động sinh mã theo thứ tự.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Trạng thái ban đầu
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Ngừng hoạt động</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tên nhà cung cấp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Công ty Cổ phần Gỗ Hoàng Gia"
                  value={createForm.supplier_name}
                  onChange={(e) => setCreateForm({ ...createForm, supplier_name: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 02838629999"
                    value={createForm.phone_number}
                    onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Địa chỉ kho / trụ sở
                  </label>
                  <input
                    type="text"
                    placeholder="VD: TX. Tân Uyên, Bình Dương"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Ghi chú thêm
                </label>
                <textarea
                  rows={2}
                  placeholder="Chuyên cung cấp gỗ sồi Nga, phụ kiện Hafele, chính sách thanh toán công nợ..."
                  value={createForm.note}
                  onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2.5 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 active:scale-95"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 active:scale-95 disabled:opacity-50"
                >
                  {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Lưu nhà cung cấp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 2: CHỈNH SỬA THÔNG TIN NHÀ CUNG CẤP              */}
      {/* ═════════════════════════════════════════════════════ */}
      {isEditOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900 sm:text-lg">
                    Chỉnh Sửa Nhà Cung Cấp
                  </h2>
                  <p className="text-xs font-mono text-stone-500">Mã: {selectedSupplier.supplier_code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none"
                aria-label="Đóng form chỉnh sửa"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-4 text-xs">
              {/* Thẻ hiển thị mã NCC - cố định */}
              <div className="rounded-xl border border-stone-200 bg-stone-100/70 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-stone-500">Mã nhà cung cấp</span>
                  <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                    Khóa cố định
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm font-bold text-amber-900">
                  {selectedSupplier.supplier_code}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tên nhà cung cấp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.supplier_name}
                  onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={editForm.phone_number}
                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Trạng thái hoạt động
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Ngừng hoạt động</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2.5 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 active:scale-95"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 active:scale-95 disabled:opacity-50"
                >
                  {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 3: XEM CHI TIẾT & LỊCH SỬ PHIẾU NHẬP            */}
      {/* ═════════════════════════════════════════════════════ */}
      {isDetailOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative my-8 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-stone-200">
            {/* Header */}
            <div className="border-b border-stone-200 bg-stone-50/50 px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-900 text-base font-bold text-white shadow-xs">
                    {selectedSupplier.supplier_name?.charAt(0)?.toUpperCase() || 'N'}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-stone-900">
                      {selectedSupplier.supplier_name}
                    </h2>
                    <p className="font-mono text-xs text-stone-500">
                      Mã NCC: <span className="text-amber-900 font-semibold">{selectedSupplier.supplier_code}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none"
                  aria-label="Đóng chi tiết nhà cung cấp"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6 text-xs">
              {/* Thông tin doanh nghiệp */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-3">
                  Thông tin doanh nghiệp
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-stone-500 block">Tên nhà cung cấp</span>
                    <span className="font-semibold text-stone-900">{selectedSupplier.supplier_name}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block mb-0.5">Trạng thái hoạt động</span>
                    <AccountStatusBadge status={selectedSupplier.status} />
                  </div>
                  <div>
                    <span className="text-stone-500 block">Số điện thoại</span>
                    <span className="font-mono font-medium text-stone-800">{selectedSupplier.phone_number || '—'}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Địa chỉ</span>
                    <span className="text-stone-800">{selectedSupplier.address || '—'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-stone-500 block">Ghi chú</span>
                    <span className="text-stone-800">{selectedSupplier.note || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Lịch sử phiếu nhập kho */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-900/10 text-amber-900">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                      Lịch sử phiếu nhập nguyên vật liệu
                    </h3>
                  </div>
                  <span className="text-xs text-stone-500">
                    Tổng số: <strong className="font-mono text-stone-900">{detailData?.totalReceipts || 0}</strong> phiếu nhập
                  </span>
                </div>

                {loadingDetail ? (
                  <div className="py-8 text-center text-stone-400">
                    <RotateCw className="mx-auto h-6 w-6 animate-spin text-amber-800 mb-2" />
                    <span className="text-xs font-medium text-stone-500">Đang tải lịch sử phiếu nhập...</span>
                  </div>
                ) : !detailData?.materialReceipts || detailData.materialReceipts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
                    <Package className="mx-auto mb-2 h-7 w-7 text-stone-300" />
                    <p className="font-semibold text-xs text-stone-700">Chưa có phiếu nhập nào từ nhà cung cấp này</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">Nhà cung cấp này có thể xóa an toàn khi chưa phát sinh giao dịch nhập kho.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-stone-200">
                    <table className="min-w-full text-left text-xs divide-y divide-stone-200">
                      <thead className="bg-stone-50 text-stone-700 font-semibold">
                        <tr>
                          <th className="px-3.5 py-2.5">Mã phiếu</th>
                          <th className="px-3.5 py-2.5">Ngày nhập</th>
                          <th className="px-3.5 py-2.5 text-right">Tổng giá trị</th>
                          <th className="px-3.5 py-2.5 text-center">Trạng thái</th>
                          <th className="px-3.5 py-2.5">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 bg-white">
                        {detailData.materialReceipts.map((r) => (
                          <tr key={r.receipt_id} className="hover:bg-stone-50/70 transition-colors">
                            <td className="px-3.5 py-2.5 font-mono font-bold text-amber-900">
                              {r.receipt_code}
                            </td>
                            <td className="px-3.5 py-2.5 font-mono text-stone-600">
                              {r.receipt_date ? formatDate(r.receipt_date) : '—'}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-bold text-stone-900">
                              {formatCurrency(r.total_amount)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <span
                                className={`rounded px-2 py-0.5 font-semibold text-[11px] ${
                                  r.status === 'CONFIRMED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : r.status === 'DRAFT'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-stone-500 max-w-xs truncate">
                              {r.note || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-stone-200 bg-stone-50 px-6 py-3.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 4: XÁC NHẬN XÓA NHÀ CUNG CẤP                    */}
      {/* ═════════════════════════════════════════════════════ */}
      {isDeleteOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  {deleteConflict ? 'Không thể xóa nhà cung cấp' : 'Xóa vĩnh viễn nhà cung cấp?'}
                </h2>
                <p className="font-mono text-xs text-stone-500">Mã: <span className="text-amber-900 font-semibold">{selectedSupplier.supplier_code}</span></p>
              </div>
            </div>

            {deleteConflict ? (
              // Trường hợp 409: Có phiếu nhập kho liên quan
              <div className="mt-4 space-y-4 text-xs">
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 leading-relaxed">
                  <p className="font-bold text-rose-900 mb-1">
                    Cảnh báo ràng buộc toàn vẹn dữ liệu
                  </p>
                  <p>{deleteConflict.message}</p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-stone-600">
                  <p className="font-bold text-stone-800 mb-1">💡 Gợi ý giải pháp:</p>
                  <p>
                    Để đảm bảo toàn vẹn dữ liệu kế toán và lịch sử kho hàng, hệ thống khuyến nghị chuyển trạng thái sang{' '}
                    <strong>Ngừng hoạt động (INACTIVE)</strong>. Khi đó, NCC này sẽ không thể chọn khi tạo phiếu nhập mới.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteOpen(false)}
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleQuickDeactivate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 disabled:opacity-50"
                  >
                    {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>Chuyển sang INACTIVE</span>
                  </button>
                </div>
              </div>
            ) : (
              // Trường hợp xác nhận xóa thông thường
              <div className="mt-3 text-xs">
                <p className="text-stone-600 leading-relaxed">
                  Bạn có chắc chắn muốn xóa nhà cung cấp{' '}
                  <strong>"{selectedSupplier.supplier_name}"</strong> (
                  <span className="font-mono text-stone-800">{selectedSupplier.supplier_code}</span>)?
                  Hành động này <strong className="text-rose-600">không thể hoàn tác</strong>.
                </p>

                <p className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-[11px] text-stone-500">
                  ⚠️ Lưu ý: Hệ thống chỉ cho phép xóa khi nhà cung cấp này chưa từng phát sinh bất kỳ phiếu nhập nguyên vật liệu nào.
                </p>

                <div className="mt-6 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsDeleteOpen(false)}
                    className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleDeleteConfirm}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-95 disabled:opacity-50"
                  >
                    {submitting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>Xác nhận Xóa</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSuppliersPage;
