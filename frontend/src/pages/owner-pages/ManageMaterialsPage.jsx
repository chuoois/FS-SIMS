// =========================================================
// ManageMaterialsPage.jsx
// Giao diện Quản lý Nguyên vật liệu & Tồn kho dành cho Chủ xưởng (Owner)
// Chức năng:
// 1. Xem danh mục nguyên vật liệu gỗ và phụ kiện xưởng
// 2. Thống kê tồn kho an toàn, cảnh báo sắp hết và hết hàng
// 3. Lọc theo trạng thái tồn kho (Tabs), loại gỗ liên kết, trạng thái sử dụng
// 4. Tìm kiếm linh hoạt theo mã vật tư, tên, đơn vị tính
// 5. Thêm mới, chỉnh sửa thông tin và định mức tồn tối thiểu
// 6. Xem chi tiết và lịch sử sử dụng trong phiếu nhập/xuất kho
// Chuẩn hóa 100% theo FSSIMS Design System (Xưởng sản xuất đồ gỗ nội thất Góc Nhà)
// =========================================================

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
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
  Info,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getRawMaterials,
  getRawMaterialStockSummary,
  getNextRawMaterialCode,
  getRawMaterialDetail,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
} from '../../services/rawMaterialService';
import { getProductMetadata } from '../../services/productManagerService';
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('CREATE'); // 'CREATE' | 'EDIT'
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
    setCurrentPage(1);
  };

  // ── Auto generate next code ──────────────────────────────
  const handleGenerateCode = async () => {
    try {
      const res = await getNextRawMaterialCode();
      const code = res?.data?.nextCode || res?.nextCode;
      if (code) {
        setForm((prev) => ({ ...prev, raw_code: code }));
        toast.success(`Đã tạo mã gợi ý: ${code}`);
      }
    } catch {
      toast.error('Không thể tự động sinh mã nguyên vật liệu');
    }
  };

  // ── Open Create Modal ────────────────────────────────────
  const handleOpenCreate = async () => {
    setFormMode('CREATE');
    setSelectedMaterial(null);
    let nextCode = '';
    try {
      const res = await getNextRawMaterialCode();
      nextCode = res?.data?.nextCode || res?.nextCode || '';
    } catch {
      // ignore
    }
    setForm({
      ...initialForm,
      raw_code: nextCode,
    });
    setIsFormOpen(true);
  };

  // ── Open Edit Modal ──────────────────────────────────────
  const handleOpenEdit = (m) => {
    setFormMode('EDIT');
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
    setIsFormOpen(true);
  };

  // ── Submit Create / Edit ─────────────────────────────────
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!form.raw_name.trim()) {
      toast.error('Vui lòng nhập tên nguyên vật liệu');
      return;
    }

    try {
      setSubmitting(true);
      if (formMode === 'EDIT' && selectedMaterial) {
        await updateRawMaterial(selectedMaterial.rawMaterialId, form);
        toast.success('Cập nhật nguyên vật liệu thành công!');
      } else {
        await createRawMaterial(form);
        toast.success('Thêm mới nguyên vật liệu thành công!');
      }
      setIsFormOpen(false);
      fetchMaterialsList(currentPage);
      loadInitialData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu nguyên vật liệu');
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
    <div className="space-y-6" data-testid="manage-materials-page">
      {/* ── 1. HEADER & ACTION BUTTONS ───────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Quản Lý Nguyên Vật Liệu
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Theo dõi khối lượng gỗ, phụ kiện và định mức tồn kho tối thiểu để chủ động kế hoạch sản xuất.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            title="Làm mới dữ liệu"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-950 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm nguyên vật liệu</span>
          </button>
        </div>
      </div>

      {/* ── 2. THỐNG KÊ TỒN KHO TỔNG QUAN (4 CARDS) ───────────── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Tổng loại vật tư */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:border-stone-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Tổng loại vật tư</span>
            <div className="rounded-lg bg-stone-100 p-1.5 text-stone-700">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-stone-900 sm:text-2xl">
            {stockSummary.totalMaterials || 0}
            <span className="ml-1.5 text-xs font-sans font-normal text-stone-400">loại</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500">Danh mục nguyên vật liệu xưởng</div>
        </div>

        {/* Tồn kho an toàn */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-xs transition hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Tồn kho an toàn</span>
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-emerald-900 sm:text-2xl">
            {stockSummary.normalStockMaterials || 0}
            <span className="ml-1.5 text-xs font-sans font-normal text-emerald-700">loại</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">Đạt trên mức tồn tối thiểu</div>
        </div>

        {/* Cảnh báo sắp hết */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-xs transition hover:border-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Cảnh báo sắp hết</span>
            <div className="rounded-lg bg-amber-100 p-1.5 text-amber-800">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-amber-900 sm:text-2xl">
            {stockSummary.lowStockMaterials || 0}
            <span className="ml-1.5 text-xs font-sans font-normal text-amber-700">loại</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700">Tồn kho ≤ Mức tồn tối thiểu</div>
        </div>

        {/* Hết vật tư */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 shadow-xs transition hover:border-rose-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Hết vật tư</span>
            <div className="rounded-lg bg-rose-100 p-1.5 text-rose-800">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-rose-900 sm:text-2xl">
            {stockSummary.outOfStockMaterials || 0}
            <span className="ml-1.5 text-xs font-sans font-normal text-rose-700">loại</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-700">Số lượng tồn kho = 0</div>
        </div>
      </section>

      {/* ── 3. BỘ LỌC & TÌM KIẾM ─────────────────────────────── */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-4">
        {/* Tabs mức tồn kho */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 pb-3">
          {[
            { key: 'ALL', label: 'Tất cả vật tư', count: stockSummary.totalMaterials || 0 },
            { key: 'NORMAL', label: 'Đủ tồn an toàn', count: stockSummary.normalStockMaterials || 0 },
            { key: 'LOW_STOCK', label: 'Cảnh báo sắp hết', count: stockSummary.lowStockMaterials || 0 },
            { key: 'OUT_OF_STOCK', label: 'Hết hàng', count: stockSummary.outOfStockMaterials || 0 },
          ].map((tab) => {
            const isActive = stockStatusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStockStatusFilter(tab.key);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${
                  isActive
                    ? 'bg-stone-900 text-white font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono font-medium ${
                    isActive ? 'bg-stone-700 text-white' : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Ô tìm kiếm & Dropdown tiêu chí phụ */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã vật tư, tên, đơn vị..."
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 focus-visible:outline-none"
                title="Xóa từ khóa"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Lọc loại gỗ liên kết */}
            <div className="w-full sm:w-48">
              <select
                aria-label="Lọc theo loại gỗ liên kết"
                value={materialFilter}
                onChange={(e) => {
                  setMaterialFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              >
                <option value="ALL">Tất cả loại gỗ</option>
                {woodMaterials.map((w) => (
                  <option key={w.material_id} value={w.material_id}>
                    {w.material_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc trạng thái sử dụng */}
            <div className="w-full sm:w-40">
              <select
                aria-label="Lọc theo trạng thái sử dụng"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              >
                <option value="ALL">Mọi trạng thái</option>
                <option value="ACTIVE">Đang dùng (ACTIVE)</option>
                <option value="INACTIVE">Ngừng dùng (INACTIVE)</option>
              </select>
            </div>

            {/* Nút Đặt lại bộ lọc */}
            {(searchTerm || materialFilter !== 'ALL' || stockStatusFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── 4. BẢNG NGUYÊN VẬT LIỆU ─────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th scope="col" className="py-3 pl-4 pr-3 sm:pl-6">Mã vật tư</th>
                <th scope="col" className="px-3 py-3">Tên nguyên vật liệu</th>
                <th scope="col" className="px-3 py-3">Loại gỗ liên kết</th>
                <th scope="col" className="px-3 py-3 text-center">Đơn vị</th>
                <th scope="col" className="px-3 py-3 text-right">Tồn hiện tại</th>
                <th scope="col" className="px-3 py-3 text-right">Mức tối thiểu</th>
                <th scope="col" className="px-3 py-3 text-center">Cảnh báo kho</th>
                <th scope="col" className="px-3 py-3 text-center">Trạng thái</th>
                <th scope="col" className="py-3 pl-3 pr-4 text-center sm:pr-6">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="h-5 w-5 animate-spin text-amber-700" />
                      <span>Đang tải dữ liệu nguyên vật liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="h-9 w-9 text-stone-300" />
                      <p className="font-semibold text-stone-700 text-sm">Không tìm thấy nguyên vật liệu nào</p>
                      <p className="text-xs text-stone-400">
                        Thử điều chỉnh lại bộ lọc hoặc bấm &quot;Thêm nguyên vật liệu&quot; để tạo mới.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                materials.map((m) => {
                  const isOut = m.quantityOnHand === 0;
                  const isLow = m.isLowStock;

                  return (
                    <tr
                      key={m.rawMaterialId}
                      className="hover:bg-stone-50/70 transition"
                      data-testid={`material-row-${m.rawMaterialId}`}
                    >
                      {/* Code */}
                      <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6 font-mono font-semibold text-amber-900">
                        {m.rawCode}
                      </td>

                      {/* Name */}
                      <td className="px-3 py-3">
                        <div className="font-medium text-stone-900">{m.rawName}</div>
                        {m.description && (
                          <div className="text-[11px] text-stone-400 line-clamp-1">{m.description}</div>
                        )}
                      </td>

                      {/* Wood Material */}
                      <td className="px-3 py-3 text-stone-700">
                        {m.materialName || 'Khác (Phụ liệu)'}
                      </td>

                      {/* Unit */}
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-mono font-medium text-stone-700">
                          {m.unit}
                        </span>
                      </td>

                      {/* Quantity on hand */}
                      <td className="whitespace-nowrap px-3 py-3 text-right font-bold font-mono text-stone-900">
                        {m.quantityOnHand}
                      </td>

                      {/* Min Quantity */}
                      <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-stone-500">
                        {m.minQuantity}
                      </td>

                      {/* Stock Warning Badge */}
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800">
                            <XCircle className="h-3 w-3" />
                            Hết hàng
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                            <AlertTriangle className="h-3 w-3" />
                            Sắp hết
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Đủ tồn
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {m.status === 'ACTIVE' ? 'Đang dùng' : 'Ngừng'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap py-3 pl-3 pr-4 text-center sm:pr-6">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title="Xem chi tiết"
                            onClick={() => handleOpenDetail(m)}
                            className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Chỉnh sửa"
                            data-testid={`edit-material-${m.rawMaterialId}`}
                            onClick={() => handleOpenEdit(m)}
                            className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-50 hover:text-amber-900 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Xóa"
                            data-testid={`delete-material-${m.rawMaterialId}`}
                            onClick={() => handleOpenDelete(m)}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-800 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
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

      {/* ── 5. MODAL TẠO MỚI / CHỈNH SỬA VẬT TƯ ──────────────── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-900">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 sm:text-lg">
                    {formMode === 'EDIT' ? (
                      <>
                        Chỉnh sửa: <span className="font-mono text-stone-600">{selectedMaterial?.rawCode}</span>
                      </>
                    ) : (
                      'Thêm Nguyên Vật Liệu Mới'
                    )}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {formMode === 'EDIT'
                      ? 'Cập nhật thông tin chi tiết và định mức tồn kho tối thiểu'
                      : 'Khai báo nguyên vật liệu phục vụ sản xuất đồ gỗ nội thất'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 p-6">
              {/* Mã vật tư & Nút sinh mã */}
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="form-raw-code" className="text-xs font-semibold text-stone-700">
                    Mã vật tư
                  </label>
                  {formMode === 'CREATE' && (
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 focus-visible:outline-none"
                    >
                      <Sparkles className="h-3 w-3" />
                      Tự sinh mã
                    </button>
                  )}
                </div>
                <input
                  id="form-raw-code"
                  type="text"
                  value={form.raw_code}
                  onChange={(e) => setForm({ ...form, raw_code: e.target.value })}
                  placeholder="Ví dụ: RAW-OAK-01..."
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs font-mono uppercase text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              {/* Tên vật tư */}
              <div>
                <label htmlFor="form-raw-name" className="text-xs font-semibold text-stone-700">
                  Tên nguyên vật liệu <span className="text-rose-500">*</span>
                </label>
                <input
                  id="form-raw-name"
                  type="text"
                  required
                  value={form.raw_name}
                  onChange={(e) => setForm({ ...form, raw_name: e.target.value })}
                  placeholder="Ví dụ: Gỗ sồi đỏ Bắc Mỹ xẻ sấy..."
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="form-material-id" className="text-xs font-semibold text-stone-700">Loại gỗ liên kết</label>
                  <select
                    id="form-material-id"
                    value={form.material_id}
                    onChange={(e) => setForm({ ...form, material_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  >
                    <option value="">Khác (Phụ liệu ngũ kim, sơn...)</option>
                    {woodMaterials.map((w) => (
                      <option key={w.material_id} value={w.material_id}>
                        {w.material_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="form-unit" className="text-xs font-semibold text-stone-700">
                    Đơn vị tính <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-unit"
                    type="text"
                    required
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="BOARD, M2, KG, M, TẤM..."
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs font-mono uppercase text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="form-quantity" className="text-xs font-semibold text-stone-700">Số lượng tồn kho</label>
                  <input
                    id="form-quantity"
                    type="number"
                    min="0"
                    value={form.quantity_on_hand}
                    onChange={(e) => setForm({ ...form, quantity_on_hand: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>
                <div>
                  <label htmlFor="form-min-quantity" className="text-xs font-semibold text-stone-700">
                    Định mức tồn tối thiểu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-min-quantity"
                    type="number"
                    min="0"
                    required
                    value={form.min_quantity}
                    onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="form-description" className="text-xs font-semibold text-stone-700">Mô tả / Ghi chú quy cách</label>
                <textarea
                  id="form-description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Quy cách kích thước, độ ẩm sấy, xuất xứ..."
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              <div>
                <label htmlFor="form-status" className="text-xs font-semibold text-stone-700">Trạng thái</label>
                <select
                  id="form-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                >
                  <option value="ACTIVE">Đang sử dụng (ACTIVE)</option>
                  <option value="INACTIVE">Ngừng sử dụng (INACTIVE)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-950 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                >
                  {submitting
                    ? 'Đang lưu...'
                    : formMode === 'EDIT'
                    ? 'Lưu thay đổi'
                    : 'Thêm vật tư'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. MODAL CHI TIẾT VẬT TƯ ─────────────────────────── */}
      {isDetailOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative my-8 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-900">
                  <Package className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-stone-900 sm:text-lg">Chi tiết nguyên vật liệu</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6 text-xs">
              <div>
                <h4 className="text-base font-bold text-stone-900">{selectedMaterial.rawName}</h4>
                <span className="font-mono text-xs font-semibold text-amber-900">{selectedMaterial.rawCode}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
                <div>
                  <span className="text-stone-400">Đơn vị:</span>
                  <p className="font-bold font-mono text-stone-800">{selectedMaterial.unit}</p>
                </div>
                <div>
                  <span className="text-stone-400">Loại gỗ liên kết:</span>
                  <p className="font-medium text-stone-800">{selectedMaterial.materialName || 'Không có'}</p>
                </div>
                <div>
                  <span className="text-stone-400">Tồn kho hiện tại:</span>
                  <p className="font-bold font-mono text-stone-900">{selectedMaterial.quantityOnHand} {selectedMaterial.unit}</p>
                </div>
                <div>
                  <span className="text-stone-400">Định mức tối thiểu:</span>
                  <p className="font-medium font-mono text-stone-800">{selectedMaterial.minQuantity} {selectedMaterial.unit}</p>
                </div>
              </div>

              {selectedMaterial.description && (
                <div>
                  <span className="text-stone-400">Ghi chú quy cách:</span>
                  <p className="mt-1 text-stone-700">{selectedMaterial.description}</p>
                </div>
              )}

              {selectedUsage && (
                <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 text-stone-600">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-800">
                    <Info className="h-3.5 w-3.5 text-stone-500" />
                    Lịch sử kho liên quan:
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 font-mono">
                    <div>• Phiếu nhập kho: <strong>{selectedUsage.receiptCount}</strong></div>
                    <div>• Phiếu xuất kho: <strong>{selectedUsage.issueCount}</strong></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end border-t border-stone-200 px-6 py-3.5 rounded-b-2xl bg-stone-50">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. MODAL XÓA VẬT TƯ ──────────────────────────────── */}
      {isDeleteOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">Xóa nguyên vật liệu</h3>
                <p className="mt-1 text-xs text-stone-600">
                  Bạn có chắc muốn xóa <strong>&quot;{selectedMaterial.rawName}&quot;</strong> ({selectedMaterial.rawCode})?
                </p>
              </div>
            </div>

            {selectedUsage && selectedUsage.totalUsage > 0 && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800">
                <p className="font-semibold">Không thể xóa trực tiếp!</p>
                <p className="mt-1 text-rose-700">
                  Vật tư này đã phát sinh <strong>{selectedUsage.totalUsage}</strong> phiếu nhập/xuất kho.
                  Vui lòng chuyển trạng thái sang <strong>Ngừng sử dụng (INACTIVE)</strong>.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                Hủy bỏ
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
                  className="rounded-lg bg-amber-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900"
                >
                  Chuyển sang INACTIVE
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                  className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
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

export default ManageMaterialsPage;
