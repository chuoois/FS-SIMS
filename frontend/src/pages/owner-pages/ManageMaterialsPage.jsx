// =========================================================
// ManageMaterialsPage.jsx
// Giao diện Quản lý Nguyên vật liệu & Tồn kho dành cho Chủ xưởng (Owner)
// =========================================================

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
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
  X,
  Layers,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getRawMaterials,
  getRawMaterialStockSummary,
  getNextRawMaterialCode,
  getRawMaterialDetail,
  updateRawMaterial,
  deleteRawMaterial,
} from '../../services/rawMaterialService';
import { getProductMetadata } from '../../services/productService';
import { TablePagination } from '../../components/common/TablePagination';

export const ManageMaterialsPage = () => {
  // ── States ───────────────────────────────────────────────
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [woodMaterials, setWoodMaterials] = useState([]);
  const [stockSummary, setStockSummary] = useState({
    totalMaterials: 0,
    lowStockMaterials: 0,
    outOfStockMaterials: 0,
    normalStockMaterials: 0,
    totalQuantity: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [materialFilter, setMaterialFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Selected item
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedUsage, setSelectedUsage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const initialForm = {
    raw_code: '',
    raw_name: '',
    material_id: '',
    unit: 'BOARD',
    quantity_on_hand: '0',
    min_quantity: '10',
    description: '',
    status: 'ACTIVE',
  };

  const [form, setForm] = useState(initialForm);

  // Units list
  const commonUnits = ['BOARD', 'M2', 'KG', 'L', 'PCS', 'BOX', 'M'];

  // ── Fetch metadata & summary ─────────────────────────────
  const loadInitialData = async () => {
    try {
      const [metaRes, summaryRes] = await Promise.all([
        getProductMetadata().catch(() => ({ data: { materials: [] } })),
        getRawMaterialStockSummary().catch(() => ({ data: {} })),
      ]);
      if (metaRes?.data?.materials) setWoodMaterials(metaRes.data.materials);
      if (summaryRes?.data) setStockSummary(summaryRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ── Fetch materials ──────────────────────────────────────
  const fetchMaterialsList = useCallback(
    async (page = 1, limit = pageSize) => {
      try {
        setLoading(true);
        const params = {
          page,
          limit,
        };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (materialFilter !== 'ALL') params.material_id = materialFilter;
        if (stockStatusFilter !== 'ALL') params.stock_status = stockStatusFilter;
        if (statusFilter !== 'ALL') params.status = statusFilter;

        const res = await getRawMaterials(params);
        setMaterials(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
          setCurrentPage(res.pagination.currentPage);
          if (res.pagination.itemsPerPage) {
            setPageSize(res.pagination.itemsPerPage);
          }
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Không thể tải danh sách nguyên vật liệu');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchTerm, materialFilter, stockStatusFilter, statusFilter, pageSize]
  );

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMaterialsList(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchMaterialsList]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMaterialsList(currentPage), loadInitialData()]);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setMaterialFilter('ALL');
    setStockStatusFilter('ALL');
    setStatusFilter('ALL');
  };

  // ── Auto generate next code ──────────────────────────────
  const handleGenerateCode = async () => {
    try {
      const res = await getNextRawMaterialCode();
      if (res?.data?.nextCode) {
        setForm((prev) => ({ ...prev, raw_code: res.data.nextCode }));
        toast.success(`Đã tạo mã gợi ý: ${res.data.nextCode}`);
      }
    } catch {
      toast.error('Không thể tự động sinh mã nguyên vật liệu');
    }
  };

  // ── Open Edit Modal ──────────────────────────────────────
  const handleOpenEdit = (m) => {
    setSelectedMaterial(m);
    setForm({
      raw_code: m.rawCode || '',
      raw_name: m.rawName || '',
      material_id: m.materialId || '',
      unit: m.unit || 'BOARD',
      quantity_on_hand: m.quantityOnHand ?? '0',
      min_quantity: m.minQuantity ?? '10',
      description: m.description || '',
      status: m.status || 'ACTIVE',
    });
    setIsEditOpen(true);
  };

  // ── Submit Edit ──────────────────────────────────────────
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!form.raw_name.trim()) {
      toast.error('Vui lòng nhập tên nguyên vật liệu');
      return;
    }

    try {
      setSubmitting(true);
      await updateRawMaterial(selectedMaterial.rawMaterialId, form);
      toast.success('Cập nhật nguyên vật liệu thành công!');
      setIsEditOpen(false);
      fetchMaterialsList(currentPage);
      loadInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật nguyên vật liệu');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Open Detail Modal ────────────────────────────────────
  const handleOpenDetail = async (m) => {
    setSelectedMaterial(m);
    setIsDetailOpen(true);
    try {
      const res = await getRawMaterialDetail(m.rawMaterialId);
      if (res?.data) setSelectedMaterial(res.data);
      if (res?.usage) setSelectedUsage(res.usage);
    } catch {
      // ignore
    }
  };

  // ── Open Delete Modal ────────────────────────────────────
  const handleOpenDelete = async (m) => {
    setSelectedMaterial(m);
    setSelectedUsage(null);
    setIsDeleteOpen(true);
    try {
      const res = await getRawMaterialDetail(m.rawMaterialId);
      if (res?.usage) setSelectedUsage(res.usage);
    } catch {
      // ignore
    }
  };

  // ── Confirm Delete ───────────────────────────────────────
  const handleConfirmDelete = async () => {
    try {
      setSubmitting(true);
      await deleteRawMaterial(selectedMaterial.rawMaterialId);
      toast.success('Xóa nguyên vật liệu thành công!');
      setIsDeleteOpen(false);
      fetchMaterialsList(currentPage);
      loadInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể xóa nguyên vật liệu này');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12" data-testid="manage-materials-page">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Quản lý Nguyên vật liệu
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Theo dõi khối lượng gỗ cảnh báo tồn kho tối thiểu để kịp thời nhập hàng.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Overview Stats ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Tổng loại vật tư</span>
            <Package className="h-4 w-4 text-stone-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-stone-900">{stockSummary.totalMaterials || 0}</p>
          <span className="text-xs text-stone-500">Danh mục nguyên vật liệu</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Tồn kho an toàn</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{stockSummary.normalStockMaterials || 0}</p>
          <span className="text-xs text-emerald-700">Đạt trên mức tồn tối thiểu</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Cảnh báo sắp hết</span>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900">{stockSummary.lowStockMaterials || 0}</p>
          <span className="text-xs text-amber-700">Tồn kho ≤ Tồn tối thiểu</span>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Hết vật tư</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-900">{stockSummary.outOfStockMaterials || 0}</p>
          <span className="text-xs text-rose-700">Tồn kho = 0</span>
        </div>
      </div>

      {/* ── Filters & Search ──────────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã vật tư, tên, đơn vị..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-stone-200 pl-10 pr-4 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Wood Material Filter */}
            <select
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">Tất cả loại gỗ</option>
              {woodMaterials.map((w) => (
                <option key={w.material_id} value={w.material_id}>
                  {w.material_name}
                </option>
              ))}
            </select>

            {/* Stock Level Filter */}
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">Mọi mức tồn kho</option>
              <option value="LOW_STOCK">Cảnh báo sắp hết (≤ Mức tối thiểu)</option>
              <option value="OUT_OF_STOCK">Hết hàng (= 0)</option>
              <option value="NORMAL">Tồn kho an toàn</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 focus:border-stone-900 focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang dùng (ACTIVE)</option>
              <option value="INACTIVE">Ngừng dùng (INACTIVE)</option>
            </select>

            {(searchTerm || materialFilter !== 'ALL' || stockStatusFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-200"
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Materials Table ───────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-600">
            <thead className="border-b border-stone-200 bg-stone-50/75 text-xs font-semibold uppercase tracking-wider text-stone-500">
              <tr>
                <th scope="col" className="px-4 py-3.5">Mã vật tư</th>
                <th scope="col" className="px-4 py-3.5">Tên nguyên vật liệu</th>
                <th scope="col" className="px-4 py-3.5">Loại gỗ liên kết</th>
                <th scope="col" className="px-4 py-3.5 text-center">Đơn vị</th>
                <th scope="col" className="px-4 py-3.5 text-right">Tồn hiện tại</th>
                <th scope="col" className="px-4 py-3.5 text-right">Định mức tối thiểu</th>
                <th scope="col" className="px-4 py-3.5 text-center">Cảnh báo kho</th>
                <th scope="col" className="px-4 py-3.5 text-center">Trạng thái</th>
                <th scope="col" className="px-4 py-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-stone-500">
                    <RotateCw className="mx-auto mb-2 h-6 w-6 animate-spin text-stone-400" />
                    Đang tải dữ liệu nguyên vật liệu...
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-stone-500">
                    <Package className="mx-auto mb-2 h-8 w-8 text-stone-300" />
                    Không tìm thấy nguyên vật liệu nào phù hợp.
                  </td>
                </tr>
              ) : (
                materials.map((m) => {
                  const isOut = m.quantityOnHand === 0;
                  const isLow = m.isLowStock;

                  return (
                    <tr key={m.rawMaterialId} className="hover:bg-stone-50/60 transition" data-testid={`material-row-${m.rawMaterialId}`}>
                      {/* Code */}
                      <td className="px-4 py-3 font-mono font-semibold text-stone-900">
                        {m.rawCode}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-stone-900">{m.rawName}</div>
                        {m.description && <div className="text-xs text-stone-400 line-clamp-1">{m.description}</div>}
                      </td>

                      {/* Wood Material */}
                      <td className="px-4 py-3 text-xs font-medium text-stone-700">
                        {m.materialName || 'Khác (Phụ liệu)'}
                      </td>

                      {/* Unit */}
                      <td className="px-4 py-3 text-center">
                        <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-mono font-semibold text-stone-800">
                          {m.unit}
                        </span>
                      </td>

                      {/* Quantity on hand */}
                      <td className="px-4 py-3 text-right font-bold text-stone-900">
                        {m.quantityOnHand}
                      </td>

                      {/* Min Quantity */}
                      <td className="px-4 py-3 text-right text-xs text-stone-500">
                        {m.minQuantity}
                      </td>

                      {/* Stock Warning Badge */}
                      <td className="px-4 py-3 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                            <XCircle className="h-3.5 w-3.5" />
                            Hết hàng
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Sắp hết
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Đủ tồn
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {m.status === 'ACTIVE' ? 'Đang dùng' : 'Ngừng'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title="Xem chi tiết"
                            onClick={() => handleOpenDetail(m)}
                            className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Chỉnh sửa"
                            data-testid={`edit-material-${m.rawMaterialId}`}
                            onClick={() => handleOpenEdit(m)}
                            className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Xóa"
                            data-testid={`delete-material-${m.rawMaterialId}`}
                            onClick={() => handleOpenDelete(m)}
                            className="rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          currentCount={materials.length}
          itemsPerPage={pageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
            fetchMaterialsList(1, newSize);
          }}
          itemLabel="nguyên vật liệu"
          onPageChange={(p) => fetchMaterialsList(p, pageSize)}
          loading={loading}
        />
      </div>


      {/* ── Modal Sửa vật tư ──────────────────────────────────── */}
      {isEditOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <h3 className="text-lg font-bold text-stone-900">
                Chỉnh sửa: <span className="font-mono text-stone-600">{selectedMaterial.rawCode}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4 p-6">
              <div>
                <label className="text-xs font-semibold uppercase text-stone-600">Tên nguyên vật liệu *</label>
                <input
                  type="text"
                  required
                  value={form.raw_name}
                  onChange={(e) => setForm({ ...form, raw_name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Loại gỗ liên kết</label>
                  <select
                    value={form.material_id}
                    onChange={(e) => setForm({ ...form, material_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-stone-900 focus:outline-none"
                  >
                    <option value="">Không</option>
                    {woodMaterials.map((w) => (
                      <option key={w.material_id} value={w.material_id}>
                        {w.material_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Đơn vị tính *</label>
                  <input
                    type="text"
                    required
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm uppercase font-mono focus:border-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Số lượng tồn kho</label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity_on_hand}
                    onChange={(e) => setForm({ ...form, quantity_on_hand: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-stone-600">Định mức tồn tối thiểu *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.min_quantity}
                    onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-stone-600">Mô tả / Ghi chú</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-stone-600">Trạng thái</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-xs focus:border-stone-900 focus:outline-none"
                >
                  <option value="ACTIVE">Đang sử dụng (ACTIVE)</option>
                  <option value="INACTIVE">Ngừng sử dụng (INACTIVE)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Chi tiết vật tư ─────────────────────────────── */}
      {isDetailOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <h3 className="text-lg font-bold text-stone-900">Chi tiết nguyên vật liệu</h3>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6 text-xs">
              <div>
                <h4 className="text-base font-bold text-stone-900">{selectedMaterial.rawName}</h4>
                <span className="font-mono text-stone-500">{selectedMaterial.rawCode}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3">
                <div>
                  <span className="text-stone-400">Đơn vị:</span>
                  <p className="font-bold text-stone-800">{selectedMaterial.unit}</p>
                </div>
                <div>
                  <span className="text-stone-400">Loại gỗ liên kết:</span>
                  <p className="font-medium text-stone-800">{selectedMaterial.materialName || 'Không có'}</p>
                </div>
                <div>
                  <span className="text-stone-400">Tồn kho hiện tại:</span>
                  <p className="font-bold text-stone-900">{selectedMaterial.quantityOnHand} {selectedMaterial.unit}</p>
                </div>
                <div>
                  <span className="text-stone-400">Định mức tối thiểu:</span>
                  <p className="font-medium text-stone-800">{selectedMaterial.minQuantity} {selectedMaterial.unit}</p>
                </div>
              </div>

              {selectedMaterial.description && (
                <div>
                  <span className="text-stone-400">Ghi chú:</span>
                  <p className="mt-1 text-stone-700">{selectedMaterial.description}</p>
                </div>
              )}

              {selectedUsage && (
                <div className="rounded-lg border border-stone-200 bg-stone-50/70 p-3 text-stone-600">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                    <Info className="h-3.5 w-3.5 text-stone-500" />
                    Lịch sử kho liên quan:
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>• Phiếu nhập kho: <strong>{selectedUsage.receiptCount}</strong></div>
                    <div>• Phiếu xuất kho: <strong>{selectedUsage.issueCount}</strong></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-stone-200 px-6 py-3">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Xóa vật tư ──────────────────────────────────── */}
      {isDeleteOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Xóa nguyên vật liệu</h3>
                <p className="mt-1 text-xs text-stone-600">
                  Bạn có chắc muốn xóa <strong>"{selectedMaterial.rawName}"</strong> ({selectedMaterial.rawCode})?
                </p>
              </div>
            </div>

            {selectedUsage && selectedUsage.totalUsage > 0 && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <p className="font-semibold">Không thể xóa trực tiếp!</p>
                <p className="mt-1 text-rose-700">
                  Vật tư này đã phát sinh <strong>{selectedUsage.totalUsage}</strong> phiếu nhập/xuất kho.
                  Vui lòng chuyển trạng thái sang <strong>Ngừng sử dụng (INACTIVE)</strong>.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Hủy
              </button>
              {selectedUsage && selectedUsage.totalUsage > 0 ? (
                <button
                  type="button"
                  onClick={async () => {
                    await updateRawMaterial(selectedMaterial.rawMaterialId, { status: 'INACTIVE' });
                    toast.success('Đã chuyển trạng thái sang Ngừng sử dụng!');
                    setIsDeleteOpen(false);
                    fetchMaterialsList(currentPage);
                  }}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  Chuyển sang INACTIVE
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
