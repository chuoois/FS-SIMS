// =========================================================
// ManageMaterialExportPage.jsx
// Quản lý Phiếu Xuất Kho Nguyên Vật Liệu (Manage Material Export Slips) dành cho Chủ xưởng (Owner)
// Bao gồm: Danh sách, Tạo mới, Xem chi tiết, Chỉnh sửa, Xác nhận xuất kho, Xóa & In phiếu xuất
// =========================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  RotateCw,
  Eye,
  Pencil,
  Trash2,
  Printer,
  CheckCircle2,
  XCircle,
  X,
  Layers,
  Clock,
  Hammer,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  getMaterialExports,
  getMaterialExportSummary,
  getNextMaterialExportCode,
  getProductionOrdersForExport,
  getMaterialExportDetail,
  createMaterialExport,
  updateMaterialExport,
  confirmMaterialExport,
  deleteMaterialExport,
} from '../../services/materialExportService';
import { getRawMaterials } from '../../services/rawMaterialService';
import { TablePagination } from '../../components/common/TablePagination';

// Format ngày tháng Việt Nam
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

// Huy hiệu trạng thái phiếu xuất
const StatusBadge = ({ status }) => {
  switch (status) {
    case 'CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Đã xuất kho
        </span>
      );
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
          <Clock className="h-3.5 w-3.5" />
          Phiếu nháp
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

export const ManageMaterialExportPage = () => {
  // ── States ────────────────────────────────────────────────
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [productionOrders, setProductionOrders] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  // Thống kê
  const [summary, setSummary] = useState({
    totalIssues: 0,
    draftCount: 0,
    confirmedCount: 0,
    cancelledCount: 0,
    totalQuantityIssued: 0,
  });

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [productionFilter, setProductionFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form Mode & Đối tượng đang chọn
  const [formMode, setFormMode] = useState('CREATE'); // 'CREATE' | 'EDIT'
  const [editingIssueId, setEditingIssueId] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const initialForm = {
    issue_code: '',
    production_id: '',
    issue_date: new Date().toISOString().slice(0, 10),
    status: 'DRAFT',
    note: '',
    items: [{ raw_material_id: '', quantity: 1, note: '' }],
  };
  const [form, setForm] = useState(initialForm);

  // ── Tải danh sách lệnh gia công & nguyên vật liệu ─────────
  const loadMetadata = async () => {
    try {
      const [prodRes, rawRes] = await Promise.all([
        getProductionOrdersForExport(),
        getRawMaterials({ page: 1, limit: 100 }),
      ]);
      setProductionOrders(prodRes?.data || []);
      setRawMaterials(rawRes?.data || []);
    } catch (err) {
      console.error('Lỗi khi tải metadata phiếu xuất:', err);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  // ── Tải thống kê tổng quan ────────────────────────────────
  const fetchSummary = async () => {
    try {
      const res = await getMaterialExportSummary();
      if (res?.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Lỗi khi tải thống kê phiếu xuất:', err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // ── Tải danh sách phiếu xuất kho ──────────────────────────
  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        production_id: productionFilter !== 'ALL' ? productionFilter : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      };

      const res = await getMaterialExport(params);
      setIssues(res?.data || []);
      if (res?.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách phiếu xuất:', err);
      toast.error('Không thể tải danh sách phiếu xuất kho');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, productionFilter, fromDate, toDate]);

  // Alias helper for getMaterialExports
  const getMaterialExport = getMaterialExports;

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Phân trang
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Làm mới dữ liệu
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchIssues(), fetchSummary(), loadMetadata()]);
    setRefreshing(false);
    toast.success('Đã làm mới dữ liệu');
  };

  // Reset bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setProductionFilter('ALL');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  // ── Mở Form Tạo mới ───────────────────────────────────────
  const handleOpenCreateModal = async () => {
    setFormMode('CREATE');
    setEditingIssueId(null);
    loadMetadata();
    const today = new Date().toISOString().slice(0, 10);
    try {
      const nextCodeRes = await getNextMaterialExportCode(today);
      setForm({
        ...initialForm,
        issue_code: nextCodeRes?.nextCode || '',
        issue_date: today,
        items: [{ raw_material_id: '', quantity: 1, note: '' }],
      });
    } catch {
      setForm({
        ...initialForm,
        issue_date: today,
        items: [{ raw_material_id: '', quantity: 1, note: '' }],
      });
    }
    setIsFormOpen(true);
  };

  // ── Mở Form Chỉnh sửa phiếu nháp ──────────────────────────
  const handleOpenEditModal = async (issue) => {
    if (issue.status !== 'DRAFT') {
      toast.error('Chỉ được phép chỉnh sửa phiếu xuất kho khi ở trạng thái nháp (DRAFT)');
      return;
    }
    loadMetadata();
    setFormMode('EDIT');
    setEditingIssueId(issue.issue_id);

    try {
      const res = await getMaterialExportDetail(issue.issue_id);
      const detail = res?.issue || issue;

      setForm({
        issue_code: detail.issue_code || '',
        production_id: detail.production_id || detail.production_order?.production_id || '',
        issue_date: detail.issue_date ? String(detail.issue_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
        status: detail.status || 'DRAFT',
        note: detail.note || '',
        items: (detail.items && detail.items.length > 0)
          ? detail.items.map((it) => ({
              raw_material_id: it.raw_material_id,
              quantity: it.quantity,
              note: it.note || '',
            }))
          : [{ raw_material_id: '', quantity: 1, note: '' }],
      });
      setIsDetailOpen(false);
      setIsFormOpen(true);
    } catch {
      toast.error('Không thể tải thông tin phiếu xuất kho để chỉnh sửa');
    }
  };

  // ── Mở Chi tiết phiếu xuất ────────────────────────────────
  const handleOpenDetailModal = async (issueId) => {
    try {
      const res = await getMaterialExportDetail(issueId);
      if (res?.issue) {
        setSelectedIssue(res.issue);
        setIsDetailOpen(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xem chi tiết phiếu xuất kho');
    }
  };

  // ── Mở Xem và In phiếu ────────────────────────────────────
  const handleOpenPrintModal = async (issueId, existingIssue = null) => {
    if (existingIssue && existingIssue.items) {
      setSelectedIssue(existingIssue);
      setIsPrintOpen(true);
      return;
    }
    try {
      const res = await getMaterialExportDetail(issueId);
      if (res?.issue) {
        setSelectedIssue(res.issue);
        setIsPrintOpen(true);
      }
    } catch {
      toast.error('Không thể tải phiếu xuất để in');
    }
  };

  // ── Thêm / Xóa dòng mặt hàng trong form ────────────────────
  const handleAddItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { raw_material_id: '', quantity: 1, note: '' }],
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (form.items.length <= 1) {
      toast.error('Phiếu xuất phải có ít nhất 1 mặt hàng');
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  // Tính tổng số lượng xuất realtime trong form
  const formTotalQuantity = useMemo(() => {
    return (form.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [form.items]);

  // ── Submit Lưu phiếu xuất kho ─────────────────────────────
  const handleSubmitForm = async (targetStatus = null) => {
    if (!form.production_id) {
      toast.error('Vui lòng chọn lệnh gia công');
      return;
    }
    if (!form.issue_date) {
      toast.error('Vui lòng chọn ngày xuất kho');
      return;
    }
    if (!form.items || form.items.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 mặt hàng xuất');
      return;
    }

    const seenIds = new Set();
    for (let i = 0; i < form.items.length; i++) {
      const it = form.items[i];
      if (!it.raw_material_id) {
        toast.error(`Vui lòng chọn nguyên vật liệu tại dòng ${i + 1}`);
        return;
      }
      if (seenIds.has(it.raw_material_id)) {
        toast.error(`Nguyên vật liệu tại dòng ${i + 1} bị trùng lặp`);
        return;
      }
      seenIds.add(it.raw_material_id);

      if (!it.quantity || Number(it.quantity) <= 0 || !Number.isInteger(Number(it.quantity))) {
        toast.error(`Số lượng tại dòng ${i + 1} phải là số nguyên dương lớn hơn 0`);
        return;
      }

      // Kiểm tra tồn kho nếu chọn xác nhận ngay
      if ((targetStatus || form.status) === 'CONFIRMED') {
        const foundRaw = rawMaterials.find(
          (r) => (r.raw_material_id || r.rawMaterialId) === Number(it.raw_material_id)
        );
        const currentStock = foundRaw?.quantity_on_hand ?? foundRaw?.quantityOnHand ?? 0;
        if (Number(it.quantity) > currentStock) {
          toast.error(
            `Dòng ${i + 1} (${foundRaw?.raw_name || 'NVL'}): Số lượng xuất (${it.quantity}) vượt quá tồn kho hiện có (${currentStock})!`
          );
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const submitData = {
        issue_code: form.issue_code ? form.issue_code.trim() : undefined,
        production_id: Number(form.production_id),
        issue_date: form.issue_date,
        status: targetStatus || form.status || 'DRAFT',
        note: form.note || undefined,
        items: form.items.map((it) => ({
          raw_material_id: Number(it.raw_material_id),
          quantity: Number(it.quantity),
          note: it.note ? it.note.trim() : undefined,
        })),
      };

      let res;
      if (formMode === 'EDIT' && editingIssueId) {
        res = await updateMaterialExport(editingIssueId, submitData);
        toast.success(res.message || 'Cập nhật phiếu xuất kho thành công');
      } else {
        res = await createMaterialExport(submitData);
        toast.success(res.message || 'Tạo phiếu xuất kho thành công');
      }

      setIsFormOpen(false);
      fetchIssues();
      fetchSummary();
    } catch (err) {
      console.error('Lỗi khi lưu phiếu xuất kho:', err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu phiếu xuất kho');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Xác nhận xuất kho trực tiếp ───────────────────────────
  const handleConfirmDirect = async (issue) => {
    if (
      !window.confirm(
        `Xác nhận xuất kho cho phiếu ${issue.issue_code}? Số lượng tồn kho nguyên vật liệu tương ứng sẽ được trừ ngay lập tức và phiếu sẽ không thể chỉnh sửa nữa.`
      )
    ) {
      return;
    }
    try {
      const res = await confirmMaterialExport(issue.issue_id);
      toast.success(res.message || 'Xác nhận xuất kho thành công!');
      fetchIssues();
      fetchSummary();
      if (isDetailOpen && selectedIssue?.issue_id === issue.issue_id) {
        setSelectedIssue(res.issue);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xác nhận phiếu xuất kho');
    }
  };

  // ── Mở Modal Xóa phiếu nháp ───────────────────────────────
  const handleOpenDeleteModal = (issue) => {
    setSelectedIssue(issue);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedIssue) return;
    setSubmitting(true);
    try {
      const res = await deleteMaterialExport(selectedIssue.issue_id);
      toast.success(res.message || 'Đã xóa phiếu xuất kho');
      setIsDeleteOpen(false);
      fetchIssues();
      fetchSummary();
      if (isDetailOpen) setIsDetailOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa phiếu xuất kho');
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
              <FileText className="h-6 w-6 text-amber-800" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                Quản Lý Phiếu Xuất Kho
              </h1>
              <p className="text-sm text-stone-500">
                Xuất nguyên vật liệu gỗ từ kho xưởng phục vụ cho các lệnh gia công sản xuất.
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
            <span>Lập phiếu xuất mới</span>
          </button>
        </div>
      </div>

      {/* ── Thống kê tổng quan (Cards) ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng phiếu xuất */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-500">Tổng số phiếu xuất</span>
            <div className="rounded-lg bg-stone-100 p-2 text-stone-700">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{summary.totalIssues}</span>
            <span className="text-xs text-stone-400">phiếu</span>
          </div>
        </div>

        {/* Phiếu nháp */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">Phiếu nháp chờ xuất</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900">{summary.draftCount}</span>
            <span className="text-xs text-amber-600">chưa trừ kho</span>
          </div>
        </div>

        {/* Đã xuất kho */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">Đã xuất kho</span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900">{summary.confirmedCount}</span>
            <span className="text-xs text-emerald-600">đã trừ kho</span>
          </div>
        </div>

        {/* Tổng số lượng đã xuất */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">Tổng SL gỗ đã xuất</span>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-900">{summary.totalQuantityIssued}</span>
            <span className="text-xs text-blue-600">tấm/thanh</span>
          </div>
        </div>
      </div>

      {/* ── Bộ lọc & Tìm kiếm ─────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu xuất, ghi chú..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          {/* Lọc Trạng thái & Lệnh gia công */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Lọc Trạng thái */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Phiếu nháp</option>
              <option value="CONFIRMED">Đã xuất kho</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>

            {/* Lọc Lệnh gia công */}
            <select
              value={productionFilter}
              onChange={(e) => {
                setProductionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 max-w-xs"
            >
              <option value="ALL">Tất cả lệnh gia công</option>
              {productionOrders.map((ord) => (
                <option key={ord.production_id} value={ord.production_id}>
                  {ord.production_code} ({ord.production_type})
                </option>
              ))}
            </select>

            {/* Nút Đặt lại bộ lọc */}
            {(searchTerm || statusFilter !== 'ALL' || productionFilter !== 'ALL' || fromDate || toDate) && (
              <button
                onClick={handleResetFilters}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Lọc theo ngày */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-100 text-xs text-stone-600">
          <span className="font-semibold text-stone-700">Ngày xuất kho:</span>
          <div className="flex items-center gap-1.5">
            <span>Từ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-md border border-stone-300 px-2.5 py-1 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span>Đến:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-md border border-stone-300 px-2.5 py-1 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Bảng dữ liệu phiếu xuất kho ───────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3.5 pl-4 pr-3 sm:pl-6">Mã phiếu</th>
                <th className="px-3 py-3.5">Ngày xuất</th>
                <th className="px-3 py-3.5">Lệnh gia công</th>
                <th className="px-3 py-3.5">Người xuất kho</th>
                <th className="px-3 py-3.5 text-center">Số mặt hàng</th>
                <th className="px-3 py-3.5 text-center">Tổng SL xuất</th>
                <th className="px-3 py-3.5 text-center">Trạng thái</th>
                <th className="py-3.5 pl-3 pr-4 text-center sm:pr-6">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="h-6 w-6 animate-spin text-amber-700" />
                      <span>Đang tải danh sách phiếu xuất kho...</span>
                    </div>
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-10 w-10 text-stone-300" />
                      <p className="font-medium text-stone-700">Không tìm thấy phiếu xuất kho nào</p>
                      <p className="text-xs text-stone-400">
                        Thử điều chỉnh lại bộ lọc hoặc bấm &quot;Lập phiếu xuất mới&quot; để tạo phiếu.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                issues.map((issue) => (
                  <tr key={issue.issue_id} className="transition hover:bg-stone-50/80">
                    {/* Mã phiếu */}
                    <td className="whitespace-nowrap py-3.5 pl-4 pr-3 sm:pl-6">
                      <button
                        onClick={() => handleOpenDetailModal(issue.issue_id)}
                        className="font-semibold text-amber-800 hover:underline hover:text-amber-900"
                      >
                        {issue.issue_code}
                      </button>
                      {issue.note && (
                        <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-stone-400">
                          {issue.note}
                        </p>
                      )}
                    </td>

                    {/* Ngày xuất */}
                    <td className="whitespace-nowrap px-3 py-3.5 text-stone-600">
                      {formatDate(issue.issue_date)}
                    </td>

                    {/* Lệnh gia công */}
                    <td className="px-3 py-3.5">
                      <div className="font-medium text-stone-800">{issue.production_code}</div>
                      <div className="text-xs text-stone-400">Loại: {issue.production_type}</div>
                    </td>

                    {/* Người xuất */}
                    <td className="whitespace-nowrap px-3 py-3.5 text-stone-600">
                      {issue.issuer_name || '—'}
                    </td>

                    {/* Số mặt hàng */}
                    <td className="whitespace-nowrap px-3 py-3.5 text-center text-stone-700">
                      <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold">
                        {issue.items_count} loại
                      </span>
                    </td>

                    {/* Tổng số lượng xuất */}
                    <td className="whitespace-nowrap px-3 py-3.5 text-center font-bold text-stone-900">
                      {issue.total_quantity}
                    </td>

                    {/* Trạng thái */}
                    <td className="whitespace-nowrap px-3 py-3.5 text-center">
                      <StatusBadge status={issue.status} />
                    </td>

                    {/* Thao tác */}
                    <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-center sm:pr-6">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Xem chi tiết */}
                        <button
                          onClick={() => handleOpenDetailModal(issue.issue_id)}
                          className="rounded p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* In phiếu */}
                        <button
                          onClick={() => handleOpenPrintModal(issue.issue_id, issue)}
                          className="rounded p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                          title="In phiếu xuất kho"
                          aria-label="In phiếu xuất kho"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                        {/* Chỉnh sửa (chỉ khi là DRAFT) */}
                        {issue.status === 'DRAFT' && (
                          <button
                            onClick={() => handleOpenEditModal(issue)}
                            className="rounded p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-800"
                            title="Chỉnh sửa phiếu nháp"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}

                        {/* Xác nhận xuất kho (chỉ khi là DRAFT) */}
                        {issue.status === 'DRAFT' && (
                          <button
                            onClick={() => handleConfirmDirect(issue)}
                            className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            title="Xác nhận xuất kho (trừ tồn kho)"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}

                        {/* Xóa phiếu nháp (chỉ khi DRAFT hoặc CANCELLED) */}
                        {issue.status !== 'CONFIRMED' && (
                          <button
                            onClick={() => handleOpenDeleteModal(issue)}
                            className="rounded p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            title="Xóa phiếu nháp"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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
          currentCount={issues.length}
          itemsPerPage={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={handlePageChange}
          itemLabel="phiếu xuất"
          loading={loading}
        />
      </div>

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 1: TẠO MỚI / CHỈNH SỬA PHIẾU XUẤT KHO           */}
      {/* ═════════════════════════════════════════════════════ */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative my-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            {/* Header modal */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-800">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    {formMode === 'EDIT'
                      ? `Chỉnh Sửa Phiếu Xuất Kho (${form.issue_code || 'Nháp'})`
                      : 'Lập Phiếu Xuất Kho Nguyên Vật Liệu Mới'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {formMode === 'EDIT'
                      ? 'Cập nhật danh sách nguyên vật liệu xuất cho lệnh gia công khi còn ở trạng thái nháp'
                      : 'Chọn lệnh gia công và chỉ định số lượng nguyên vật liệu xuất khỏi kho xưởng'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung Form */}
            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
              {/* Thông tin chung */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Mã phiếu xuất */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Mã phiếu xuất kho <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={formMode === 'EDIT'}
                    value={form.issue_code}
                    onChange={(e) => setForm({ ...form, issue_code: e.target.value })}
                    placeholder="Tự động sinh hoặc nhập mã..."
                    className={`mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm uppercase text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 ${
                      formMode === 'EDIT' ? 'bg-stone-100 text-stone-500 cursor-not-allowed' : ''
                    }`}
                  />
                  <p className="mt-1 text-[11px] text-stone-400">Ví dụ: EXP-20261027-0001</p>
                </div>

                {/* Ngày xuất kho */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Ngày xuất kho <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                {/* Lệnh gia công */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Lệnh gia công sản xuất <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.production_id}
                    onChange={(e) => setForm({ ...form, production_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  >
                    <option value="">-- Chọn lệnh gia công --</option>
                    {productionOrders.map((ord) => (
                      <option key={ord.production_id} value={ord.production_id}>
                        {ord.production_code} ({ord.production_type === 'CUSTOM' ? 'Đơn đặt riêng' : 'Làm hàng sẵn'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-stone-700">Ghi chú phiếu xuất</label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Ghi chú về thợ nhận, khu vực thi công, lô gỗ xuất..."
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>

              {/* Danh sách mặt hàng nguyên vật liệu xuất */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">
                      Chi tiết nguyên vật liệu xuất kho <span className="text-rose-500">*</span>
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Chọn nguyên vật liệu từ kho để xuất cho thợ xưởng gia công.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm mặt hàng
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
                    <thead className="bg-stone-50 font-semibold text-stone-700">
                      <tr>
                        <th className="py-2.5 pl-3 pr-2 w-10 text-center">STT</th>
                        <th className="px-3 py-2.5 min-w-[240px]">Nguyên vật liệu xuất</th>
                        <th className="px-3 py-2.5 text-center w-28">Tồn kho hiện tại</th>
                        <th className="px-3 py-2.5 text-center w-28">Số lượng xuất</th>
                        <th className="px-3 py-2.5 min-w-[160px]">Ghi chú quy cách</th>
                        <th className="py-2.5 pl-2 pr-3 text-center w-12">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {form.items.map((row, idx) => {
                        const selectedRaw = rawMaterials.find(
                          (r) => (r.raw_material_id || r.rawMaterialId) === Number(row.raw_material_id)
                        );
                        const stock = selectedRaw?.quantity_on_hand ?? selectedRaw?.quantityOnHand ?? 0;
                        const isOverStock = Number(row.quantity) > stock;

                        return (
                          <tr key={idx} className="hover:bg-stone-50/50">
                            {/* STT */}
                            <td className="py-2 pl-3 pr-2 text-center text-stone-500 font-medium">
                              {idx + 1}
                            </td>

                            {/* Nguyên vật liệu */}
                            <td className="px-2 py-2">
                              <select
                                value={row.raw_material_id}
                                onChange={(e) =>
                                  handleItemChange(idx, 'raw_material_id', e.target.value)
                                }
                                className="w-full rounded-md border border-stone-300 py-1.5 px-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                              >
                                <option value="">-- Chọn nguyên vật liệu --</option>
                                {rawMaterials.map((raw) => {
                                  const rId = raw.raw_material_id || raw.rawMaterialId;
                                  const rCode = raw.raw_code || raw.rawCode;
                                  const rName = raw.raw_name || raw.rawName;
                                  const rUnit = raw.unit;
                                  const rStock = raw.quantity_on_hand ?? raw.quantityOnHand ?? 0;
                                  return (
                                    <option key={rId} value={rId}>
                                      {rName} ({rCode}) — Tồn: {rStock} {rUnit}
                                    </option>
                                  );
                                })}
                              </select>
                            </td>

                            {/* Tồn kho hiện có */}
                            <td className="px-2 py-2 text-center font-semibold">
                              <span
                                className={`rounded px-2 py-0.5 text-xs ${
                                  stock <= 0
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                {selectedRaw ? `${stock} ${selectedRaw.unit || ''}` : '—'}
                              </span>
                            </td>

                            {/* Số lượng xuất */}
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min="1"
                                value={row.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                className={`w-full rounded-md border py-1.5 px-2 text-center text-xs font-semibold focus:outline-none ${
                                  isOverStock && selectedRaw
                                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                                    : 'border-stone-300 text-stone-900 focus:border-amber-600'
                                }`}
                              />
                              {isOverStock && selectedRaw && (
                                <p className="mt-0.5 text-[10px] text-rose-600">Vượt tồn kho!</p>
                              )}
                            </td>

                            {/* Ghi chú */}
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                placeholder="Ghi chú cắt xẻ, độ dày..."
                                value={row.note || ''}
                                onChange={(e) => handleItemChange(idx, 'note', e.target.value)}
                                className="w-full rounded-md border border-stone-300 py-1.5 px-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                              />
                            </td>

                            {/* Xóa dòng */}
                            <td className="py-2 pl-2 pr-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                title="Xóa dòng này"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Hộp tổng kết */}
                <div className="flex items-center justify-between rounded-xl bg-amber-50 p-4 border border-amber-200">
                  <span className="text-sm font-semibold text-amber-900">
                    Tổng số lượng vật tư xuất ({form.items.length} loại vật liệu):
                  </span>
                  <span className="text-xl font-bold text-amber-900">
                    {formTotalQuantity} đơn vị
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex flex-wrap items-center justify-between border-t border-stone-200 bg-stone-50 px-6 py-4 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              >
                Hủy bỏ
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmitForm('DRAFT')}
                  className="rounded-lg border border-amber-700 bg-white px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-50 disabled:opacity-50"
                >
                  {submitting
                    ? 'Đang lưu...'
                    : formMode === 'EDIT'
                    ? 'Lưu thay đổi (Nháp)'
                    : 'Lưu nháp (DRAFT)'}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmitForm('CONFIRMED')}
                  className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu & Xuất kho ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 2: XEM CHI TIẾT PHIẾU XUẤT KHO                  */}
      {/* ═════════════════════════════════════════════════════ */}
      {isDetailOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative my-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-800">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-stone-900">
                      {selectedIssue.issue_code}
                    </h3>
                    <StatusBadge status={selectedIssue.status} />
                  </div>
                  <p className="text-xs text-stone-500">
                    Ngày xuất: {formatDate(selectedIssue.issue_date)} • Tạo lúc:{' '}
                    {formatDate(selectedIssue.createdate)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
              {/* Thẻ thông tin Lệnh gia công & Người xuất */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Lệnh gia công */}
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                    <Hammer className="h-4 w-4 text-amber-800" />
                    <span>Lệnh Gia Công Sản Xuất</span>
                  </div>
                  <div className="mt-2.5 space-y-1 text-xs text-stone-700">
                    <h4 className="text-base font-bold text-stone-900">
                      {selectedIssue.production_order?.production_code || '—'}
                    </h4>
                    <p>
                      <span className="font-semibold text-stone-600">Loại gia công:</span>{' '}
                      {selectedIssue.production_order?.production_type === 'CUSTOM'
                        ? 'Gia công theo đơn hàng riêng (CUSTOM)'
                        : 'Sản xuất hàng lưu kho (STOCK)'}
                    </p>
                    <p>
                      <span className="font-semibold text-stone-600">Trạng thái lệnh:</span>{' '}
                      {selectedIssue.production_order?.status || '—'}
                    </p>
                    {selectedIssue.production_order?.planned_start && (
                      <p>
                        <span className="font-semibold text-stone-600">Kế hoạch:</span>{' '}
                        {formatDate(selectedIssue.production_order.planned_start)} đến{' '}
                        {formatDate(selectedIssue.production_order.planned_end)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Thông tin xuất kho */}
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                    <Package className="h-4 w-4 text-amber-800" />
                    <span>Thông Tin Xuất Kho</span>
                  </div>
                  <div className="mt-2.5 space-y-1 text-xs text-stone-700">
                    <p>
                      <span className="font-semibold text-stone-600">Người xuất kho:</span>{' '}
                      {selectedIssue.issuer?.full_name || 'Chưa phân công'}
                    </p>
                    <p>
                      <span className="font-semibold text-stone-600">Email:</span>{' '}
                      {selectedIssue.issuer?.email || '—'}
                    </p>
                    <p>
                      <span className="font-semibold text-stone-600">Người lập phiếu:</span>{' '}
                      {selectedIssue.createby || '—'}
                    </p>
                    {selectedIssue.note && (
                      <p className="mt-2 rounded bg-amber-50/70 p-2 text-amber-900 border border-amber-200/50">
                        <span className="font-semibold">Ghi chú:</span> {selectedIssue.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bảng chi tiết mặt hàng */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-stone-900">
                  Danh sách nguyên vật liệu xuất ({selectedIssue.items?.length || 0} loại vật liệu)
                </h4>

                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                    <thead className="bg-stone-50 font-semibold text-stone-700 text-xs">
                      <tr>
                        <th className="py-2.5 pl-3 pr-2 w-10 text-center">STT</th>
                        <th className="px-3 py-2.5">Mã NVL</th>
                        <th className="px-3 py-2.5">Tên nguyên vật liệu</th>
                        <th className="px-3 py-2.5 text-center">ĐVT</th>
                        <th className="px-3 py-2.5 text-center font-bold">Số lượng xuất</th>
                        <th className="py-2.5 pl-3 pr-4">Ghi chú quy cách</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white text-xs">
                      {(selectedIssue.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/60">
                          <td className="py-3 pl-3 pr-2 text-center text-stone-500 font-medium">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-3 font-semibold text-amber-900">
                            {item.raw_code}
                          </td>
                          <td className="px-3 py-3 font-medium text-stone-900">
                            {item.raw_name}
                          </td>
                          <td className="px-3 py-3 text-center text-stone-600 font-semibold">
                            {item.unit}
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-amber-900 text-sm">
                            {item.quantity}
                          </td>
                          <td className="py-3 pl-3 pr-4 text-stone-500">
                            {item.note || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Banner Tổng kết */}
                <div className="flex items-center justify-between rounded-xl bg-amber-50/80 p-4 border border-amber-200">
                  <div className="text-sm font-semibold text-amber-900">
                    Tổng số lượng vật tư xuất xưởng:
                  </div>
                  <div className="text-2xl font-bold text-amber-900">
                    {selectedIssue.total_quantity} đơn vị
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal Chi tiết */}
            <div className="flex flex-wrap items-center justify-between border-t border-stone-200 bg-stone-50 px-6 py-4 rounded-b-2xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleOpenPrintModal(selectedIssue.issue_id, selectedIssue);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
                >
                  <Printer className="h-4 w-4" />
                  In phiếu xuất
                </button>

                {selectedIssue.status === 'DRAFT' && (
                  <button
                    onClick={() => handleOpenEditModal(selectedIssue)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-800 shadow-sm transition hover:bg-amber-100"
                  >
                    <Pencil className="h-4 w-4" />
                    Chỉnh sửa phiếu nháp
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedIssue.status === 'DRAFT' && (
                  <button
                    onClick={() => handleConfirmDirect(selectedIssue)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Xác nhận xuất kho
                  </button>
                )}

                {selectedIssue.status === 'DRAFT' && (
                  <button
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenDeleteModal(selectedIssue);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-sm font-medium text-rose-600 shadow-sm transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa phiếu nháp
                  </button>
                )}

                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 3: IN PHIẾU XUẤT KHO (PRINT VOUCHER)            */}
      {/* ═════════════════════════════════════════════════════ */}
      {isPrintOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm print:p-0 print:bg-white">
          <div className="relative my-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl print:my-0 print:max-w-none print:shadow-none print:rounded-none">
            {/* Header thanh công cụ (ẩn khi in) */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-amber-800" />
                <h3 className="font-bold text-stone-900">Xem & In Phiếu Xuất Kho</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-amber-800"
                >
                  <Printer className="h-4 w-4" />
                  In phiếu ngay
                </button>
                <button
                  onClick={() => setIsPrintOpen(false)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Nội dung Mẫu Phiếu In Chính Thức */}
            <div id="printable-issue" className="p-8 print:p-6 text-stone-900 bg-white">
              {/* Header Cửa hàng */}
              <div className="flex items-start justify-between border-b-2 border-stone-800 pb-4">
                <div>
                  <h2 className="text-base font-bold uppercase tracking-wider text-stone-900">
                    Xưởng Nội Thất & Gia Công Gỗ Góc Nhà
                  </h2>
                  <p className="text-xs text-stone-600">Hệ thống Quản lý Bán hàng & Tồn kho FSSIMS</p>
                  <p className="text-xs text-stone-600">Địa chỉ: 12 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM</p>
                  <p className="text-xs text-stone-600">Hotline: 0900 000 001 - Email: contact@gocnha.vn</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase text-stone-500">Mẫu số: 02-VT</div>
                  <div className="text-xs text-stone-500">Ban hành theo TT 200/2014/TT-BTC</div>
                  <div className="mt-1 font-bold text-sm text-amber-900">
                    Số: {selectedIssue.issue_code}
                  </div>
                </div>
              </div>

              {/* Tiêu đề Phiếu */}
              <div className="my-6 text-center">
                <h1 className="text-2xl font-black uppercase tracking-wide text-stone-900">
                  PHIẾU XUẤT KHO NGUYÊN VẬT LIỆU
                </h1>
                <p className="mt-1 text-xs italic text-stone-600">
                  Ngày {new Date(selectedIssue.issue_date).getDate()} tháng{' '}
                  {new Date(selectedIssue.issue_date).getMonth() + 1} năm{' '}
                  {new Date(selectedIssue.issue_date).getFullYear()}
                </p>
              </div>

              {/* Thông tin phiếu */}
              <div className="grid grid-cols-2 gap-y-2 text-xs text-stone-800 mb-6">
                <div>
                  <span className="font-semibold text-stone-700">Lệnh gia công:</span>{' '}
                  <span className="font-bold">{selectedIssue.production_order?.production_code}</span>
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Loại sản xuất:</span>{' '}
                  {selectedIssue.production_order?.production_type === 'CUSTOM'
                    ? 'Gia công theo đơn riêng'
                    : 'Sản xuất hàng kho'}
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Thủ kho xuất:</span>{' '}
                  <span className="font-semibold">{selectedIssue.issuer?.full_name || '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Xuất tại kho:</span> Kho Nguyên Vật Liệu Xưởng FSSIMS
                </div>
                {selectedIssue.note && (
                  <div className="col-span-2">
                    <span className="font-semibold text-stone-700">Lý do xuất kho / Ghi chú:</span>{' '}
                    {selectedIssue.note}
                  </div>
                )}
              </div>

              {/* Bảng Mặt hàng */}
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-stone-800 text-xs">
                  <thead>
                    <tr className="bg-stone-100 font-bold text-center border-b border-stone-800">
                      <th className="border border-stone-800 px-2 py-2 w-10">STT</th>
                      <th className="border border-stone-800 px-3 py-2 text-left">Tên nguyên vật liệu</th>
                      <th className="border border-stone-800 px-2 py-2 w-28">Mã NVL</th>
                      <th className="border border-stone-800 px-2 py-2 w-20">ĐVT</th>
                      <th className="border border-stone-800 px-2 py-2 w-28">Số lượng xuất</th>
                      <th className="border border-stone-800 px-3 py-2 text-left">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedIssue.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-stone-400">
                        <td className="border border-stone-800 px-2 py-2 text-center">{idx + 1}</td>
                        <td className="border border-stone-800 px-3 py-2 font-medium">
                          {item.raw_name}
                        </td>
                        <td className="border border-stone-800 px-2 py-2 text-center font-mono">
                          {item.raw_code}
                        </td>
                        <td className="border border-stone-800 px-2 py-2 text-center font-semibold">
                          {item.unit}
                        </td>
                        <td className="border border-stone-800 px-2 py-2 text-center font-bold text-sm">
                          {item.quantity}
                        </td>
                        <td className="border border-stone-800 px-3 py-2 text-stone-600">
                          {item.note || '—'}
                        </td>
                      </tr>
                    ))}
                    {/* Dòng Tổng cộng */}
                    <tr className="border-t-2 border-stone-800 font-bold bg-stone-50">
                      <td colSpan={4} className="border border-stone-800 px-3 py-2.5 text-right uppercase">
                        Tổng cộng số lượng vật tư xuất kho:
                      </td>
                      <td className="border border-stone-800 px-2 py-2.5 text-center font-bold text-sm text-amber-900">
                        {selectedIssue.total_quantity}
                      </td>
                      <td className="border border-stone-800"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Chữ ký 4 bên */}
              <div className="mt-10 grid grid-cols-4 gap-4 text-center text-xs text-stone-800">
                <div>
                  <p className="font-bold uppercase">Người lập phiếu</p>
                  <p className="text-[11px] text-stone-500">(Ký, họ tên)</p>
                  <div className="mt-16 font-semibold">{selectedIssue.createby || '—'}</div>
                </div>

                <div>
                  <p className="font-bold uppercase">Người nhận hàng</p>
                  <p className="text-[11px] text-stone-500">(Ký, họ tên)</p>
                  <div className="mt-16 font-semibold">Thợ phụ trách</div>
                </div>

                <div>
                  <p className="font-bold uppercase">Thủ kho xuất</p>
                  <p className="text-[11px] text-stone-500">(Ký, họ tên)</p>
                  <div className="mt-16 font-semibold">
                    {selectedIssue.issuer?.full_name || '—'}
                  </div>
                </div>

                <div>
                  <p className="font-bold uppercase">Chủ xưởng duyệt</p>
                  <p className="text-[11px] text-stone-500">(Ký, đóng dấu)</p>
                  <div className="mt-16 font-semibold">Nguyễn Văn Chủ</div>
                </div>
              </div>
            </div>

            {/* Footer modal print */}
            <div className="flex items-center justify-end border-t border-stone-200 bg-stone-50 px-6 py-4 rounded-b-2xl print:hidden">
              <button
                onClick={() => setIsPrintOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 4: XÓA PHIẾU XUẤT KHO                           */}
      {/* ═════════════════════════════════════════════════════ */}
      {isDeleteOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-rose-100 p-3 text-rose-600">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">Xác nhận xóa phiếu xuất?</h3>
                <p className="text-xs text-stone-500">Mã phiếu: {selectedIssue.issue_code}</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-stone-600">
              Bạn có chắc chắn muốn xóa vĩnh viễn phiếu xuất kho nháp này khỏi hệ thống? Thao tác này
              không thể hoàn tác.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Hủy bỏ
              </button>
              <button
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
