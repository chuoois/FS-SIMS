// =========================================================
// ManageSuppliersPage.jsx
// Giao diện Quản lý Nhà Cung Cấp dành riêng cho Chủ xưởng (Owner)
// Chức năng:
//  - Xem danh sách nhà cung cấp (tìm kiếm theo mã, tên, SĐT; lọc trạng thái; phân trang)
//  - Thống kê nhanh: Tổng NCC, Đang hoạt động, Ngừng hoạt động
//  - Tạo mới nhà cung cấp (mã, tên bắt buộc, status mặc định ACTIVE, kiểm tra trùng 409)
//  - Chỉnh sửa nhà cung cấp (không được sửa mã; sửa tên, SĐT, địa chỉ, ghi chú, trạng thái)
//  - Xem chi tiết nhà cung cấp & Lịch sử các phiếu nhập kho (material receipts)
//  - Xóa nhà cung cấp: Chỉ cho phép xóa khi chưa có phiếu nhập; nếu có thì chặn và gợi ý chuyển INACTIVE
// =========================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  RotateCw,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
  Phone,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
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
  const fetchSuppliers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = {
        search: searchTerm,
        status: selectedStatusFilter,
        page: currentPage,
        limit: pageSize,
      };

      const res = await getSuppliers(params);
      setSuppliers(res.data || []);
      setPagination(res.pagination || { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: pageSize });
    } catch (error) {
      console.error('[fetchSuppliers]', error);
      toast.error(error.response?.data?.message || 'Không thể tải danh sách nhà cung cấp');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, selectedStatusFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ── Quick Statistics ─────────────────────────────────────
  const stats = useMemo(() => {
    const total = pagination.totalItems || suppliers.length;
    const activeCount = suppliers.filter((s) => s.status === 'ACTIVE').length;
    const inactiveCount = suppliers.filter((s) => s.status === 'INACTIVE').length;
    return { total, activeCount, inactiveCount };
  }, [suppliers, pagination.totalItems]);

  // ── Xử lý Xem chi tiết kèm lịch sử phiếu nhập ─────────────
  const handleOpenDetail = async (supplier) => {
    setSelectedSupplier(supplier);
    setIsDetailOpen(true);
    setLoadingDetail(true);
    try {
      const res = await getSupplierDetail(supplier.supplier_id);
      setDetailData(res.supplier);
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
        supplier_code: res.nextCode || '',
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
        // Xung đột do đã có phiếu nhập kho liên quan
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
      toast.success(`Đã chuyển nhà cung cấp '${selectedSupplier.supplier_name}' sang trạng thái Ngừng hoạt động (INACTIVE)`);
      setIsDeleteOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error('[handleQuickDeactivate]', error);
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setSubmitting(false);
    }
  };

  // Format tiền tệ
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* ── Tiêu đề trang & Nút hành động chính ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Quản lý Nhà cung cấp
            </h1>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Quản lý danh sách nhà cung ứng nguyên vật liệu gỗ, phụ kiện và theo dõi lịch sử nhập kho.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchSuppliers(true)}
            disabled={refreshing || loading}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm nhà cung cấp</span>
          </button>
        </div>
      </div>

      {/* ── Thống kê tổng quan (Cards) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Tổng số nhà cung cấp */}
        <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Tổng số nhà cung cấp
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
              <Building2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900">{stats.total}</p>
          <p className="mt-1 text-xs text-stone-500">Đối tác cung ứng vật tư xưởng</p>
        </div>

        {/* Đang hoạt động */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Đang hoạt động
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-950">{stats.activeCount}</p>
          <p className="mt-1 text-xs text-emerald-700">Sẵn sàng nhập nguyên vật liệu</p>
        </div>

        {/* Ngừng hoạt động */}
        <div className="relative overflow-hidden rounded-xl border border-red-200/80 bg-red-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-800">
              Ngừng hoạt động
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-700">
              <XCircle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-950">{stats.inactiveCount}</p>
          <p className="mt-1 text-xs text-red-700">Tạm dừng giao dịch nhập hàng</p>
        </div>
      </div>

      {/* ── Bộ lọc & Tìm kiếm ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo mã nhà cung cấp, tên hoặc số điện thoại..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full rounded-lg border border-stone-300 bg-stone-50/50 pl-10 pr-3.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
          />
        </div>

        {/* Bộ lọc trạng thái */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-10 appearance-none rounded-lg border border-stone-300 bg-white pl-3.5 pr-8 text-sm font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </select>
            <Filter className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          </div>

          {/* Nút reset bộ lọc nếu có thay đổi */}
          {(searchTerm || selectedStatusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-100"
            >
              <X className="h-3.5 w-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Bảng danh sách nhà cung cấp ── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <RotateCw className="h-8 w-8 animate-spin text-stone-400" />
            <p className="text-sm font-medium text-stone-500">Đang tải danh sách nhà cung cấp...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-stone-400">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-stone-800">Không tìm thấy nhà cung cấp nào</h3>
            <p className="mt-1 text-sm text-stone-500">
              {searchTerm || selectedStatusFilter !== 'ALL'
                ? 'Không có kết quả phù hợp với tiêu chí lọc của bạn.'
                : 'Chưa có nhà cung cấp nào trong hệ thống.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-stone-700">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-600">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3">Nhà cung cấp</th>
                  <th scope="col" className="px-3 py-3.5">Mã NCC</th>
                  <th scope="col" className="px-3 py-3.5">Số điện thoại</th>
                  <th scope="col" className="px-3 py-3.5">Địa chỉ</th>
                  <th scope="col" className="px-3 py-3.5">Trạng thái</th>
                  <th scope="col" className="px-3 py-3.5">Ngày tạo</th>
                  <th scope="col" className="py-3.5 pl-3 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {suppliers.map((item) => (
                  <tr
                    key={item.supplier_id}
                    className="group transition-colors hover:bg-stone-50/80"
                  >
                    {/* Cột Tên & Avatar */}
                    <td className="py-4 pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-stone-800 text-sm font-bold text-white shadow-sm">
                          {item.supplier_name?.charAt(0)?.toUpperCase() || 'N'}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900">{item.supplier_name}</div>
                          {item.note && (
                            <span className="line-clamp-1 text-xs text-stone-500 max-w-xs">{item.note}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Cột Mã NCC */}
                    <td className="px-3 py-4">
                      <span className="rounded-md border border-stone-200 bg-stone-100 px-2 py-1 font-mono text-xs font-bold text-stone-800">
                        {item.supplier_code}
                      </span>
                    </td>

                    {/* Cột Số điện thoại */}
                    <td className="px-3 py-4 text-xs font-medium text-stone-700">
                      {item.phone_number ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-stone-400" />
                          <span>{item.phone_number}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    {/* Cột Địa chỉ */}
                    <td className="px-3 py-4 text-xs text-stone-600 max-w-xs truncate">
                      {item.address || <span className="text-stone-400">—</span>}
                    </td>

                    {/* Cột Trạng thái */}
                    <td className="px-3 py-4">
                      {item.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Ngừng hoạt động
                        </span>
                      )}
                    </td>

                    {/* Cột Ngày tạo */}
                    <td className="px-3 py-4 text-xs text-stone-500">
                      {item.createdate ? new Date(item.createdate).toLocaleDateString('vi-VN') : '—'}
                    </td>

                    {/* Cột Thao tác */}
                    <td className="py-4 pl-3 pr-6 text-right">
                      <div className="inline-flex items-center gap-1">
                        {/* Xem chi tiết */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                          title="Xem chi tiết & Lịch sử phiếu nhập"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Chỉnh sửa */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                          title="Chỉnh sửa thông tin"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* Xóa */}
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(item)}
                          className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                          title="Xóa nhà cung cấp"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Phân trang ── */}
        <TablePagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          currentCount={suppliers.length}
          itemsPerPage={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="nhà cung cấp"
          onPageChange={(p) => setCurrentPage(p)}
          loading={loading}
        />
      </div>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: THÊM MỚI NHÀ CUNG CẤP ──────────────────────── */}
      {/* ═════════════════════════════════════════════════════════ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
                  <Plus className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">Thêm mới Nhà cung cấp</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Mã nhà cung cấp (Tự động sinh)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={createForm.supplier_code || 'Đang tải mã...'}
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-200 bg-stone-100 px-3 font-mono text-sm text-stone-600 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-stone-500">Hệ thống tự động sinh mã theo thứ tự.</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Trạng thái ban đầu
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Ngừng hoạt động</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Tên nhà cung cấp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Công ty Cổ phần Gỗ An Cường"
                  value={createForm.supplier_name}
                  onChange={(e) => setCreateForm({ ...createForm, supplier_name: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 02838629999"
                    value={createForm.phone_number}
                    onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    placeholder="VD: TX. Tân Uyên, Bình Dương"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Ghi chú thêm
                </label>
                <textarea
                  rows={2}
                  placeholder="Loại nguyên vật liệu chính cung cấp, chính sách công nợ..."
                  value={createForm.note}
                  onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 p-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50"
                >
                  {submitting && <RotateCw className="h-4 w-4 animate-spin" />}
                  <span>Lưu nhà cung cấp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: CHỈNH SỬA THÔNG TIN NHÀ CUNG CẤP ───────────── */}
      {/* ═════════════════════════════════════════════════════════ */}
      {isEditOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white">
                  <Pencil className="h-4 w-4" />
                </div>
                <h3 className="text-lg font-bold text-stone-900">Chỉnh sửa Nhà cung cấp</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleEditSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
              {/* Thẻ hiển thị mã nhà cung cấp - cố định */}
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Mã nhà cung cấp
                  </span>
                  <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                    Khóa cố định
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm font-bold text-stone-900">
                  {selectedSupplier.supplier_code}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Tên nhà cung cấp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.supplier_name}
                  onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={editForm.phone_number}
                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Trạng thái
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Ngừng hoạt động</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Ghi chú
                </label>
                <textarea
                  rows={2}
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 p-3 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50"
                >
                  {submitting && <RotateCw className="h-4 w-4 animate-spin" />}
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: XEM CHI TIẾT & LỊCH SỬ PHIẾU NHẬP ───────────── */}
      {/* ═════════════════════════════════════════════════════════ */}
      {isDetailOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="border-b border-stone-200 bg-stone-50 px-6 py-5 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-900 text-lg font-bold text-white shadow-md">
                    {selectedSupplier.supplier_name?.charAt(0)?.toUpperCase() || 'N'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">
                      {selectedSupplier.supplier_name}
                    </h3>
                    <p className="font-mono text-xs text-stone-500">
                      Mã NCC: {selectedSupplier.supplier_code}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Thông tin doanh nghiệp */}
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
                  Thông tin doanh nghiệp
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-stone-400 block font-medium">Tên nhà cung cấp</span>
                    <span className="font-semibold text-stone-900">{selectedSupplier.supplier_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-400 block font-medium">Trạng thái hoạt động</span>
                    {selectedSupplier.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Đang hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Ngừng hoạt động
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-stone-400 block font-medium">Số điện thoại</span>
                    <span className="text-stone-800">{selectedSupplier.phone_number || '—'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-stone-400 block font-medium">Địa chỉ</span>
                    <span className="text-stone-800">{selectedSupplier.address || '—'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-xs text-stone-400 block font-medium">Ghi chú</span>
                    <span className="text-stone-800">{selectedSupplier.note || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Lịch sử phiếu nhập kho */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 text-white">
                      <Receipt className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-900">Lịch sử phiếu nhập nguyên vật liệu</h4>
                  </div>
                  <span className="text-xs text-stone-500">
                    Tổng số: <strong className="text-stone-900">{detailData?.totalReceipts || 0}</strong> phiếu nhập
                  </span>
                </div>

                {loadingDetail ? (
                  <div className="py-8 text-center text-stone-400">
                    <RotateCw className="mx-auto h-6 w-6 animate-spin text-stone-400 mb-2" />
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
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="px-3.5 py-2.5">Mã phiếu</th>
                          <th className="px-3.5 py-2.5">Ngày nhập</th>
                          <th className="px-3.5 py-2.5">Tổng giá trị</th>
                          <th className="px-3.5 py-2.5">Trạng thái</th>
                          <th className="px-3.5 py-2.5">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {detailData.materialReceipts.map((r) => (
                          <tr key={r.receipt_id} className="hover:bg-stone-50 transition-colors">
                            <td className="px-3.5 py-2.5 font-mono font-bold text-stone-900">
                              {r.receipt_code}
                            </td>
                            <td className="px-3.5 py-2.5 text-stone-600">
                              {r.receipt_date}
                            </td>
                            <td className="px-3.5 py-2.5 font-semibold text-stone-900">
                              {formatCurrency(r.total_amount)}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span
                                className={`rounded px-2 py-0.5 font-semibold ${r.status === 'CONFIRMED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : r.status === 'DRAFT'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-red-100 text-red-800'
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
            <div className="flex justify-end border-t border-stone-200 bg-stone-50 px-6 py-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* ── MODAL 4: XÁC NHẬN XÓA NHÀ CUNG CẤP ─────────────────── */}
      {/* ═════════════════════════════════════════════════════════ */}
      {isDeleteOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {deleteConflict ? 'Không thể xóa nhà cung cấp' : 'Xóa vĩnh viễn nhà cung cấp?'}
                </h3>
                <p className="font-mono text-xs text-stone-500">Mã: {selectedSupplier.supplier_code}</p>
              </div>
            </div>

            {deleteConflict ? (
              // Trường hợp 409: Có phiếu nhập kho liên quan
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 leading-relaxed">
                  <p className="font-bold text-red-900 mb-1">
                    Cảnh báo ràng buộc toàn vẹn dữ liệu
                  </p>
                  <p>{deleteConflict.message}</p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-600">
                  <p className="font-bold text-stone-800 mb-1">💡 Gợi ý giải pháp:</p>
                  <p>
                    Để đảm bảo toàn vẹn dữ liệu kế toán và lịch sử kho hàng, hệ thống khuyến nghị chuyển trạng thái sang{' '}
                    <strong>INACTIVE (Ngừng hoạt động)</strong>. Khi đó, NCC này sẽ không thể chọn khi tạo phiếu nhập mới.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteOpen(false)}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleQuickDeactivate}
                    className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-800 disabled:opacity-50"
                  >
                    {submitting && <RotateCw className="h-4 w-4 animate-spin" />}
                    <span>Chuyển sang INACTIVE</span>
                  </button>
                </div>
              </div>
            ) : (
              // Trường hợp xác nhận xóa thông thường
              <div className="mt-3">
                <p className="text-sm text-stone-600">
                  Bạn có chắc chắn muốn xóa nhà cung cấp{' '}
                  <strong>"{selectedSupplier.supplier_name}"</strong> (
                  <span className="font-mono text-stone-800">{selectedSupplier.supplier_code}</span>)?
                  Hành động này <strong className="text-red-600">không thể hoàn tác</strong>.
                </p>

                <p className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-500">
                  ⚠️ Lưu ý: Hệ thống chỉ cho phép xóa khi nhà cung cấp này chưa từng phát sinh bất kỳ phiếu nhập nguyên vật liệu nào.
                </p>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDeleteOpen(false)}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleDeleteConfirm}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    {submitting && <RotateCw className="h-4 w-4 animate-spin" />}
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
