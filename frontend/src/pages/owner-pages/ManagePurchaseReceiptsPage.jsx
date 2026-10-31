// =========================================================
// ManagePurchaseReceiptsPage.jsx
// Quản lý Phiếu Nhập Kho (Manage Purchase Receipts) dành cho Chủ xưởng (Owner)
// Bao gồm: Danh sách, Tạo mới, Xem chi tiết, Chỉnh sửa, Xác nhận, Hủy, Xóa & In phiếu nhập
// =========================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  RotateCw,
  Eye,
  Pencil,
  Trash2,
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Building2,
  Calendar,
  FileText,
  Package,
  Layers,
  ChevronDown,
  Info,
  Clock,
  ArrowRight,
  Ban,
  DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  getReceipts,
  getReceiptSummary,
  getNextReceiptCode,
  getReceiptDetail,
  createReceipt,
  updateReceipt,
  confirmReceipt,
  cancelReceipt,
  deleteReceipt,
} from '../../services/purchaseReceiptService';
import { getActiveSuppliers } from '../../services/supplierService';
import {
  getRawMaterials,
  createRawMaterial,
  getNextRawMaterialCode,
} from '../../services/rawMaterialService';
import { TablePagination } from '../../components/common/TablePagination';

// Format tiền tệ Việt Nam (VNĐ)
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

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

// Huy hiệu trạng thái
const StatusBadge = ({ status }) => {
  switch (status) {
    case 'CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Đã nhập kho
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

export const ManagePurchaseReceiptsPage = () => {
  // ── States ────────────────────────────────────────────────
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  // Thống kê
  const [summary, setSummary] = useState({
    totalReceipts: 0,
    draftCount: 0,
    confirmedCount: 0,
    cancelledCount: 0,
    confirmedTotalAmount: 0,
  });

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
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
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // Đối tượng đang chọn
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [cancelNote, setCancelNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const initialForm = {
    receipt_code: '',
    supplier_id: '',
    receipt_date: new Date().toISOString().slice(0, 10),
    status: 'DRAFT',
    note: '',
    items: [{ raw_material_id: '', quantity: 1, unit_price: 0, note: '' }],
  };
  const [form, setForm] = useState(initialForm);
  const [formMode, setFormMode] = useState('CREATE'); // 'CREATE' | 'EDIT'
  const [editingReceiptId, setEditingReceiptId] = useState(null);

  // Modal tạo nhanh nguyên vật liệu
  const [isQuickCreateRawOpen, setIsQuickCreateRawOpen] = useState(false);
  const [quickRawTargetIdx, setQuickRawTargetIdx] = useState(null);
  const [quickRawForm, setQuickRawForm] = useState({
    raw_code: '',
    raw_name: '',
    unit: 'BOARD',
    min_quantity: 0,
    description: '',
  });
  const [quickRawSubmitting, setQuickRawSubmitting] = useState(false);

  // ── Tải danh sách nhà cung cấp & nguyên vật liệu ───────────
  const loadMetadata = async () => {
    try {
      const [supRes, rawRes] = await Promise.all([
        getActiveSuppliers().catch(() => ({ suppliers: [] })),
        getRawMaterials({ limit: 100, status: 'ACTIVE' }).catch(() => ({ data: [] })),
      ]);
      if (supRes?.suppliers) {
        setSuppliers(supRes.suppliers);
      }
      const rawList = rawRes?.data || rawRes?.materials || [];
      setRawMaterials(Array.isArray(rawList) ? rawList : []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu ban đầu:', err);
    }
  };

  // ── Tải thống kê ──────────────────────────────────────────
  const fetchSummary = async () => {
    try {
      const res = await getReceiptSummary();
      if (res?.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Lỗi tải thống kê phiếu nhập:', err);
    }
  };

  // ── Tải danh sách phiếu nhập ──────────────────────────────
  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        status: statusFilter,
        supplier_id: supplierFilter,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      };

      const res = await getReceipts(params);
      if (res?.data) {
        setReceipts(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách phiếu nhập:', err);
      toast.error('Không thể tải danh sách phiếu nhập');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, supplierFilter, fromDate, toDate]);

  useEffect(() => {
    loadMetadata();
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Làm mới dữ liệu
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchReceipts(), fetchSummary()]);
  };

  // Reset bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setSupplierFilter('ALL');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  // ── Mở Form Tạo mới ───────────────────────────────────────
  const handleOpenCreateModal = async () => {
    setFormMode('CREATE');
    setEditingReceiptId(null);
    loadMetadata();
    const today = new Date().toISOString().slice(0, 10);
    try {
      const nextCodeRes = await getNextReceiptCode(today);
      setForm({
        ...initialForm,
        receipt_code: nextCodeRes?.nextCode || '',
        receipt_date: today,
        items: [{ raw_material_id: '', quantity: 1, unit_price: 0, note: '' }],
      });
    } catch {
      setForm({
        ...initialForm,
        receipt_date: today,
        items: [{ raw_material_id: '', quantity: 1, unit_price: 0, note: '' }],
      });
    }
    setIsFormOpen(true);
  };

  // ── Mở Form Chỉnh sửa phiếu nháp ──────────────────────────
  const handleOpenEditModal = async (receipt) => {
    if (receipt.status !== 'DRAFT') {
      toast.error('Chỉ được phép chỉnh sửa phiếu nhập khi ở trạng thái nháp (DRAFT)');
      return;
    }
    loadMetadata();
    setFormMode('EDIT');
    setEditingReceiptId(receipt.receipt_id);

    try {
      const res = await getReceiptDetail(receipt.receipt_id);
      const detail = res?.receipt || receipt;

      setForm({
        receipt_code: detail.receipt_code || '',
        supplier_id: detail.supplier_id || detail.supplier?.supplier_id || '',
        receipt_date: detail.receipt_date ? String(detail.receipt_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
        status: detail.status || 'DRAFT',
        note: detail.note || '',
        items: (detail.items && detail.items.length > 0)
          ? detail.items.map((it) => ({
              raw_material_id: it.raw_material_id,
              quantity: it.quantity,
              unit_price: it.unit_price,
              note: it.note || '',
            }))
          : [{ raw_material_id: '', quantity: 1, unit_price: 0, note: '' }],
      });
      setIsDetailOpen(false);
      setIsFormOpen(true);
    } catch (err) {
      toast.error('Không thể tải thông tin phiếu nhập để chỉnh sửa');
    }
  };

  // ── Mở Modal Tạo nhanh NVL mới ────────────────────────────
  const handleOpenQuickCreateRaw = async (targetIdx = 0) => {
    setQuickRawTargetIdx(targetIdx);
    try {
      const codeRes = await getNextRawMaterialCode();
      setQuickRawForm({
        raw_code: codeRes?.nextCode || '',
        raw_name: '',
        unit: 'BOARD',
        min_quantity: 0,
        description: '',
      });
    } catch {
      setQuickRawForm({
        raw_code: '',
        raw_name: '',
        unit: 'BOARD',
        min_quantity: 0,
        description: '',
      });
    }
    setIsQuickCreateRawOpen(true);
  };

  const handleQuickCreateRawSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!quickRawForm.raw_name?.trim()) {
      toast.error('Vui lòng nhập tên nguyên vật liệu');
      return;
    }
    if (!quickRawForm.unit?.trim()) {
      toast.error('Vui lòng chọn hoặc nhập đơn vị tính');
      return;
    }

    setQuickRawSubmitting(true);
    try {
      const res = await createRawMaterial({
        raw_code: quickRawForm.raw_code.trim() || undefined,
        raw_name: quickRawForm.raw_name.trim(),
        unit: quickRawForm.unit.trim().toUpperCase(),
        min_quantity: Number(quickRawForm.min_quantity) || 0,
        description: quickRawForm.description?.trim() || undefined,
        status: 'ACTIVE',
      });

      const created = res?.data || res?.material || res;
      toast.success(res?.message || 'Tạo mới nguyên vật liệu thành công!');

      // Cập nhật state danh sách NVL
      setRawMaterials((prev) => [created, ...prev]);

      // Tự động gán NVL vừa tạo vào dòng đang chọn trong phiếu nhập
      const newRawId = created.raw_material_id || created.rawMaterialId;
      if (quickRawTargetIdx !== null && quickRawTargetIdx !== undefined && newRawId) {
        handleItemChange(quickRawTargetIdx, 'raw_material_id', newRawId);
      }

      setIsQuickCreateRawOpen(false);
    } catch (err) {
      console.error('Lỗi khi tạo nhanh nguyên vật liệu:', err);
      toast.error(err.response?.data?.message || 'Không thể tạo nguyên vật liệu');
    } finally {
      setQuickRawSubmitting(false);
    }
  };

  // ── Mở Chi tiết phiếu nhập ────────────────────────────────
  const handleOpenDetailModal = async (receiptId) => {
    try {
      const res = await getReceiptDetail(receiptId);
      if (res?.receipt) {
        setSelectedReceipt(res.receipt);
        setIsDetailOpen(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xem chi tiết phiếu nhập');
    }
  };

  // ── Mở Xem và In phiếu ────────────────────────────────────
  const handleOpenPrintModal = async (receiptId, existingReceipt = null) => {
    if (existingReceipt) {
      setSelectedReceipt(existingReceipt);
      setIsPrintOpen(true);
      return;
    }
    if (selectedReceipt && selectedReceipt.receipt_id === receiptId && selectedReceipt.items) {
      setIsPrintOpen(true);
      return;
    }
    try {
      const res = await getReceiptDetail(receiptId);
      if (res?.receipt) {
        setSelectedReceipt(res.receipt);
        setIsPrintOpen(true);
      }
    } catch (err) {
      toast.error('Không thể tải phiếu để in');
    }
  };

  // ── Thêm / Xóa dòng mặt hàng trong form ────────────────────
  const handleAddItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { raw_material_id: '', quantity: 1, unit_price: 0, note: '' }],
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (form.items.length <= 1) {
      toast.error('Phiếu nhập phải có ít nhất 1 mặt hàng');
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

  // Tính tổng tiền realtime trong form
  const formGrandTotal = useMemo(() => {
    return (form.items || []).reduce((sum, item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unit_price) || 0;
      return sum + q * p;
    }, 0);
  }, [form.items]);

  // ── Submit Lưu phiếu nhập ─────────────────────────────────
  const handleSubmitForm = async (targetStatus = null) => {
    // Validate cơ bản phía client
    if (!form.supplier_id) {
      toast.error('Vui lòng chọn nhà cung cấp');
      return;
    }
    if (!form.receipt_date) {
      toast.error('Vui lòng chọn ngày nhập kho');
      return;
    }
    if (!form.items || form.items.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 mặt hàng');
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

      if (!it.quantity || Number(it.quantity) <= 0) {
        toast.error(`Số lượng tại dòng ${i + 1} phải lớn hơn 0`);
        return;
      }
      if (it.unit_price === undefined || Number(it.unit_price) < 0) {
        toast.error(`Đơn giá tại dòng ${i + 1} không hợp lệ`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const submitData = {
        receipt_code: form.receipt_code ? form.receipt_code.trim() : undefined,
        supplier_id: Number(form.supplier_id),
        receipt_date: form.receipt_date,
        status: targetStatus || form.status || 'DRAFT',
        note: form.note || undefined,
        items: form.items.map((it) => ({
          raw_material_id: Number(it.raw_material_id),
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          note: it.note ? it.note.trim() : undefined,
        })),
      };

      let res;
      if (formMode === 'EDIT' && editingReceiptId) {
        res = await updateReceipt(editingReceiptId, submitData);
        toast.success(res.message || 'Cập nhật phiếu nhập thành công');
      } else {
        res = await createReceipt(submitData);
        toast.success(res.message || 'Tạo phiếu nhập thành công');
      }

      setIsFormOpen(false);
      fetchReceipts();
      fetchSummary();
    } catch (err) {
      console.error('Lỗi khi lưu phiếu nhập:', err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu phiếu nhập');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Xác nhận nhập kho trực tiếp ───────────────────────────
  const handleConfirmDirect = async (receipt) => {
    if (!window.confirm(`Xác nhận nhập kho cho phiếu ${receipt.receipt_code}? Số lượng tồn kho nguyên vật liệu sẽ được tự động cộng thêm.`)) {
      return;
    }
    try {
      const res = await confirmReceipt(receipt.receipt_id);
      toast.success(res.message || 'Xác nhận nhập kho thành công!');
      fetchReceipts();
      fetchSummary();
      if (isDetailOpen && selectedReceipt?.receipt_id === receipt.receipt_id) {
        setSelectedReceipt(res.receipt);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xác nhận phiếu nhập');
    }
  };

  // ── Mở Modal Hủy phiếu ────────────────────────────────────
  const handleOpenCancelModal = (receipt) => {
    setSelectedReceipt(receipt);
    setCancelNote('');
    setIsCancelOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedReceipt) return;
    setSubmitting(true);
    try {
      const res = await cancelReceipt(selectedReceipt.receipt_id, {
        note: cancelNote || undefined,
      });
      toast.success(res.message || 'Đã hủy phiếu nhập');
      setIsCancelOpen(false);
      fetchReceipts();
      fetchSummary();
      if (isDetailOpen) setIsDetailOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi hủy phiếu nhập');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Mở Modal Xóa phiếu ────────────────────────────────────
  const handleOpenDeleteModal = (receipt) => {
    setSelectedReceipt(receipt);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedReceipt) return;
    setSubmitting(true);
    try {
      const res = await deleteReceipt(selectedReceipt.receipt_id);
      toast.success(res.message || 'Đã xóa phiếu nhập');
      setIsDeleteOpen(false);
      fetchReceipts();
      fetchSummary();
      if (isDetailOpen) setIsDetailOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xóa phiếu nhập');
    } finally {
      setSubmitting(false);
    }
  };

  // Đổi trang / kích thước trang
  const handlePageChange = (newPage) => setCurrentPage(newPage);
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* ── Tiêu đề & Nút hành động chính ─────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-900">
              <Receipt className="h-6 w-6 text-amber-800" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                Quản Lý Phiếu Nhập Kho
              </h1>
              <p className="text-sm text-stone-500">
                Theo dõi, ghi nhận và quản lý hoạt động nhập nguyên vật liệu từ nhà cung cấp vào xưởng.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Lập phiếu nhập mới</span>
          </button>
        </div>
      </div>

      {/* ── Thẻ thống kê tổng hợp ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số phiếu */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-500">Tổng số phiếu nhập</span>
            <div className="rounded-lg bg-stone-100 p-2 text-stone-700">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-stone-900">{summary.totalReceipts}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-stone-500">
            <span>Toàn bộ phiếu nhập đã tạo</span>
          </div>
        </div>

        {/* Đã nhập kho */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-700">Đã nhập kho (Hoàn tất)</span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-700">{summary.confirmedCount}</p>
          <div className="mt-1 text-xs font-semibold text-emerald-800">
            Tổng tiền: {formatCurrency(summary.confirmedTotalAmount)}
          </div>
        </div>

        {/* Phiếu nháp chờ duyệt */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-700">Phiếu nháp (Chờ duyệt)</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-700">{summary.draftCount}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-amber-800">
            <span>Chưa cộng vào tồn kho</span>
          </div>
        </div>

        {/* Đã hủy */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-rose-700">Phiếu đã hủy</span>
            <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
              <Ban className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-rose-700">{summary.cancelledCount}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-rose-700">
            <span>Không tính vào tồn kho</span>
          </div>
        </div>
      </div>

      {/* ── Bộ lọc & Tìm kiếm ──────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {/* Ô tìm kiếm */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, ghi chú, tên nhà cung cấp..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-sm text-stone-900 placeholder-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            />
          </div>

          {/* Lọc trạng thái */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 py-2 pl-3 pr-8 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Phiếu nháp (DRAFT)</option>
              <option value="CONFIRMED">Đã nhập kho (CONFIRMED)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>
          </div>

          {/* Lọc Nhà cung cấp */}
          <div>
            <select
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 py-2 pl-3 pr-8 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
            >
              <option value="ALL">Tất cả nhà cung cấp</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.supplier_name} ({s.supplier_code})
                </option>
              ))}
            </select>
          </div>

          {/* Nút đặt lại */}
          <div className="flex items-center">
            <button
              onClick={handleResetFilters}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-stone-100"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        </div>

        {/* Lọc theo ngày */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3 text-xs text-stone-600">
          <span className="font-semibold text-stone-700">Lọc theo ngày nhập:</span>
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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

      {/* ── Bảng dữ liệu phiếu nhập ───────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3.5 pl-4 pr-3 sm:pl-6">Mã phiếu</th>
                <th className="px-3 py-3.5">Ngày nhập</th>
                <th className="px-3 py-3.5">Nhà cung cấp</th>
                <th className="px-3 py-3.5">Người nhận kho</th>
                <th className="px-3 py-3.5 text-center">Số mặt hàng</th>
                <th className="px-3 py-3.5 text-right">Tổng tiền</th>
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
                      <span>Đang tải danh sách phiếu nhập kho...</span>
                    </div>
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="h-10 w-10 text-stone-300" />
                      <p className="font-medium text-stone-700">Không tìm thấy phiếu nhập nào</p>
                      <p className="text-xs text-stone-400">
                        Thử điều chỉnh lại bộ lọc hoặc bấm &quot;Lập phiếu nhập mới&quot; để tạo phiếu.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => (
                  <tr
                    key={receipt.receipt_id}
                    className="transition hover:bg-stone-50/80"
                  >
                    {/* Mã phiếu */}
                    <td className="whitespace-nowrap py-3.5 pl-4 pr-3 sm:pl-6">
                      <button
                        onClick={() => handleOpenDetailModal(receipt.receipt_id)}
                        className="font-semibold text-amber-800 hover:underline hover:text-amber-900"
                      >
                        {receipt.receipt_code}
                      </button>
                      {receipt.note && (
                        <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-stone-400">
                          {receipt.note}
                        </p>
                      )}
                    </td>

                    {/* Ngày nhập */}
                    <td className="whitespace-nowrap px-3 py-3.5 text-stone-600">
                      {formatDate(receipt.receipt_date)}
                    </td>

                    {/* Nhà cung cấp */}
                    <td className="px-3 py-3.5">
                      <div className="font-medium text-stone-800">{receipt.supplier_name}</div>
                      <div className="text-xs text-stone-400">{receipt.supplier_code}</div>
                    </td>

                    {/* Người nhận */}
                    <td className="whitespace-nowrap px-3 py-3.5 text-stone-600">
                      {receipt.receiver_name || '—'}
                    </td>

                    {/* Số mặt hàng */}
                    <td className="whitespace-nowrap px-3 py-3.5 text-center text-stone-700">
                      <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold">
                        {receipt.items_count} mặt hàng
                      </span>
                    </td>

                    {/* Tổng tiền */}
                    <td className="whitespace-nowrap px-3 py-3.5 text-right font-semibold text-stone-900">
                      {formatCurrency(receipt.total_amount)}
                    </td>

                    {/* Trạng thái */}
                    <td className="whitespace-nowrap px-3 py-3.5 text-center">
                      <StatusBadge status={receipt.status} />
                    </td>

                    {/* Thao tác */}
                    <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-center sm:pr-6">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Xem chi tiết */}
                        <button
                          onClick={() => handleOpenDetailModal(receipt.receipt_id)}
                          className="rounded p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* In phiếu */}
                        <button
                          onClick={() => handleOpenPrintModal(receipt.receipt_id)}
                          className="rounded p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                          title="In phiếu nhập kho"
                          aria-label="In phiếu nhập kho"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                        {/* Chỉnh sửa (chỉ khi là DRAFT) */}
                        {receipt.status === 'DRAFT' && (
                          <button
                            onClick={() => handleOpenEditModal(receipt)}
                            className="rounded p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-800"
                            title="Chỉnh sửa phiếu nháp"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}

                        {/* Xác nhận nhập kho (chỉ khi là DRAFT) */}
                        {receipt.status === 'DRAFT' && (
                          <button
                            onClick={() => handleConfirmDirect(receipt)}
                            className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                            title="Xác nhận nhập kho (cộng tồn kho)"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}

                        {/* Xóa phiếu nháp (chỉ khi là DRAFT hoặc CANCELLED cũ) */}
                        {receipt.status !== 'CONFIRMED' && (
                          <button
                            onClick={() => handleOpenDeleteModal(receipt)}
                            className="rounded p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            title="Xóa phiếu"
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
          currentCount={receipts.length}
          itemsPerPage={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onPageChange={handlePageChange}
          itemLabel="phiếu nhập"
          loading={loading}
        />
      </div>

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 1: TẠO MỚI / CHỈNH SỬA PHIẾU NHẬP               */}
      {/* ═════════════════════════════════════════════════════ */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative my-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            {/* Header modal */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-800">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    {formMode === 'EDIT'
                      ? `Chỉnh Sửa Phiếu Nhập (${form.receipt_code || 'Nháp'})`
                      : 'Lập Phiếu Nhập Kho Mới'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {formMode === 'EDIT'
                      ? 'Cập nhật thông tin phiếu nhập kho khi còn ở trạng thái nháp'
                      : 'Ghi nhận nguyên vật liệu mua từ nhà cung cấp vào kho xưởng'}
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
                {/* Mã phiếu */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Mã phiếu nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={formMode === 'EDIT'}
                    value={form.receipt_code}
                    onChange={(e) => setForm({ ...form, receipt_code: e.target.value })}
                    placeholder="Tự động sinh hoặc nhập mã..."
                    className={`mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm uppercase text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 ${
                      formMode === 'EDIT' ? 'bg-stone-100 text-stone-500 cursor-not-allowed' : ''
                    }`}
                  />
                  <p className="mt-1 text-[11px] text-stone-400">
                    Ví dụ: RCP-20261027-0001
                  </p>
                </div>

                {/* Ngày nhập */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Ngày nhập kho <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.receipt_date}
                    onChange={(e) => setForm({ ...form, receipt_date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                {/* Nhà cung cấp */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Nhà cung cấp <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.supplier_id}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map((sup) => (
                      <option key={sup.supplier_id} value={sup.supplier_id}>
                        {sup.supplier_name} ({sup.supplier_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-stone-700">Ghi chú phiếu nhập</label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Ghi chú về lô hàng, số xe, hóa đơn NCC..."
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>

              {/* Danh sách mặt hàng nguyên vật liệu */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">
                      Chi tiết danh sách nguyên vật liệu nhập <span className="text-rose-500">*</span>
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Chọn nguyên vật liệu từ kho để nhập hoặc bấm "+ Tạo nhanh NVL mới" nếu chưa có trong danh mục.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenQuickCreateRaw(form.items.length - 1)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
                      title="Tạo nhanh nguyên vật liệu mới vào danh mục kho"
                    >
                      <Plus className="h-3.5 w-3.5 text-amber-700" />
                      + Tạo nhanh NVL mới
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Thêm mặt hàng
                    </button>
                  </div>
                </div>

                {/* Banner cảnh báo nếu chưa có nguyên vật liệu nào trong hệ thống */}
                {rawMaterials.length === 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span>
                        Chưa có nguyên vật liệu khả dụng trong danh mục kho. Bạn có thể bấm <strong>"+ Tạo nhanh NVL mới"</strong> ở trên để thêm ngay vật liệu cần nhập!
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={loadMetadata}
                      className="inline-flex items-center gap-1 font-semibold text-amber-800 hover:text-amber-950 underline flex-shrink-0"
                    >
                      <RotateCw className="h-3 w-3" />
                      Tải lại danh sách
                    </button>
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
                    <thead className="bg-stone-50 font-semibold text-stone-700">
                      <tr>
                        <th className="py-2.5 pl-3 pr-2 w-10 text-center">#</th>
                        <th className="px-2 py-2.5 min-w-[220px]">Nguyên vật liệu</th>
                        <th className="px-2 py-2.5 w-24 text-center">ĐVT</th>
                        <th className="px-2 py-2.5 w-24 text-center">SL nhập</th>
                        <th className="px-2 py-2.5 w-36 text-right">Đơn giá (VNĐ)</th>
                        <th className="px-2 py-2.5 w-36 text-right">Thành tiền</th>
                        <th className="px-2 py-2.5 min-w-[150px]">Ghi chú mặt hàng</th>
                        <th className="py-2.5 pl-2 pr-3 w-10 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {form.items.map((row, idx) => {
                        const selectedRaw = rawMaterials.find(
                          (m) =>
                            String(m.raw_material_id || m.rawMaterialId) ===
                            String(row.raw_material_id)
                        );
                        const lineTotal = (Number(row.quantity) || 0) * (Number(row.unit_price) || 0);

                        return (
                          <tr key={idx} className="hover:bg-stone-50/50">
                            <td className="py-2 pl-3 pr-2 text-center font-medium text-stone-500">
                              {idx + 1}
                            </td>

                            {/* Chọn NVL */}
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={row.raw_material_id}
                                  onChange={(e) => handleItemChange(idx, 'raw_material_id', e.target.value)}
                                  className="w-full rounded-md border border-stone-300 py-1.5 pl-2 pr-6 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                                >
                                  <option value="">-- Chọn nguyên vật liệu ({rawMaterials.length} loại) --</option>
                                  {rawMaterials.map((mat) => {
                                    const id = mat.raw_material_id || mat.rawMaterialId;
                                    const code = mat.raw_code || mat.rawCode;
                                    const name = mat.raw_name || mat.rawName;
                                    const stock = mat.quantity_on_hand ?? mat.quantityOnHand ?? 0;
                                    const unit = mat.unit || '';
                                    return (
                                      <option key={id} value={id}>
                                        {name} ({code}) - Tồn kho: {stock} {unit}
                                      </option>
                                    );
                                  })}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleOpenQuickCreateRaw(idx)}
                                  className="rounded border border-stone-300 p-1.5 text-stone-500 hover:bg-stone-100 hover:text-amber-700"
                                  title="Tạo nhanh NVL mới cho dòng này"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* ĐVT */}
                            <td className="px-2 py-2 text-center text-stone-600 font-semibold">
                              {selectedRaw?.unit || '—'}
                            </td>

                            {/* Số lượng */}
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min="1"
                                value={row.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                className="w-full rounded-md border border-stone-300 py-1.5 px-2 text-center text-xs font-semibold text-stone-900 focus:border-amber-600 focus:outline-none"
                              />
                            </td>

                            {/* Đơn giá */}
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={row.unit_price}
                                onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                                className="w-full rounded-md border border-stone-300 py-1.5 px-2 text-right text-xs font-semibold text-stone-900 focus:border-amber-600 focus:outline-none"
                              />
                            </td>

                            {/* Thành tiền */}
                            <td className="px-2 py-2 text-right font-bold text-amber-900">
                              {formatCurrency(lineTotal)}
                            </td>

                            {/* Ghi chú */}
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                placeholder="Ghi chú quy cách..."
                                value={row.note || ''}
                                onChange={(e) => handleItemChange(idx, 'note', e.target.value)}
                                className="w-full rounded-md border border-stone-300 py-1.5 px-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                              />
                            </td>

                            {/* Xóa */}
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

                {/* Hộp tổng kết tiền */}
                <div className="flex items-center justify-between rounded-xl bg-amber-50 p-4 border border-amber-200">
                  <span className="text-sm font-semibold text-amber-900">
                    Tổng cộng giá trị phiếu nhập ({form.items.length} mặt hàng):
                  </span>
                  <span className="text-xl font-bold text-amber-900">
                    {formatCurrency(formGrandTotal)}
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
                  {submitting ? 'Đang lưu...' : 'Lưu & Nhập kho ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 2: XEM CHI TIẾT PHIẾU NHẬP                      */}
      {/* ═════════════════════════════════════════════════════ */}
      {isDetailOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative my-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-800">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-stone-900">
                      {selectedReceipt.receipt_code}
                    </h3>
                    <StatusBadge status={selectedReceipt.status} />
                  </div>
                  <p className="text-xs text-stone-500">
                    Ngày nhập: {formatDate(selectedReceipt.receipt_date)} • Tạo lúc:{' '}
                    {formatDate(selectedReceipt.createdate)}
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
              {/* Thẻ thông tin Nhà cung cấp & Người nhận */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Nhà cung cấp */}
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                    <Building2 className="h-4 w-4 text-amber-800" />
                    <span>Thông tin Nhà Cung Cấp</span>
                  </div>
                  <div className="mt-2.5">
                    <h4 className="text-base font-bold text-stone-900">
                      {selectedReceipt.supplier?.supplier_name || '—'}
                    </h4>
                    <p className="text-xs text-stone-500">
                      Mã: {selectedReceipt.supplier?.supplier_code || '—'}
                    </p>
                    <p className="mt-1 text-xs text-stone-600">
                      SĐT: {selectedReceipt.supplier?.phone_number || 'Chưa cập nhật'}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-600">
                      Địa chỉ: {selectedReceipt.supplier?.address || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>

                {/* Người nhận kho */}
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                    <Package className="h-4 w-4 text-amber-800" />
                    <span>Thông tin Nhập Kho</span>
                  </div>
                  <div className="mt-2.5 space-y-1 text-xs text-stone-700">
                    <p>
                      <span className="font-semibold text-stone-600">Người nhận kho:</span>{' '}
                      {selectedReceipt.receiver?.full_name || 'Chưa phân công'}
                    </p>
                    <p>
                      <span className="font-semibold text-stone-600">Email:</span>{' '}
                      {selectedReceipt.receiver?.email || '—'}
                    </p>
                    <p>
                      <span className="font-semibold text-stone-600">Người lập phiếu:</span>{' '}
                      {selectedReceipt.createby || '—'}
                    </p>
                    {selectedReceipt.note && (
                      <p className="mt-2 rounded bg-amber-50/70 p-2 text-amber-900 border border-amber-200/50">
                        <span className="font-semibold">Ghi chú:</span> {selectedReceipt.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bảng chi tiết mặt hàng */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-stone-900">
                  Danh sách nguyên vật liệu nhập ({selectedReceipt.items?.length || 0} mặt hàng)
                </h4>

                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                    <thead className="bg-stone-50 font-semibold text-stone-700 text-xs">
                      <tr>
                        <th className="py-2.5 pl-3 pr-2 w-10 text-center">STT</th>
                        <th className="px-3 py-2.5">Mã NVL</th>
                        <th className="px-3 py-2.5">Tên nguyên vật liệu</th>
                        <th className="px-3 py-2.5 text-center">ĐVT</th>
                        <th className="px-3 py-2.5 text-center">SL nhập</th>
                        <th className="px-3 py-2.5 text-right">Đơn giá</th>
                        <th className="px-3 py-2.5 text-right">Thành tiền</th>
                        <th className="py-2.5 pl-3 pr-4">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white text-xs">
                      {(selectedReceipt.items || []).map((item, idx) => (
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
                          <td className="px-3 py-3 text-center font-bold text-stone-800">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-stone-700">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-stone-900">
                            {formatCurrency(item.line_total)}
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
                    Tổng giá trị đơn nhập kho:
                  </div>
                  <div className="text-2xl font-bold text-amber-900">
                    {formatCurrency(selectedReceipt.total_amount)}
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
                    handleOpenPrintModal(selectedReceipt.receipt_id, selectedReceipt);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
                >
                  <Printer className="h-4 w-4" />
                  In phiếu nhập
                </button>

                {selectedReceipt.status === 'DRAFT' && (
                  <button
                    onClick={() => handleOpenEditModal(selectedReceipt)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-800 shadow-sm transition hover:bg-amber-100"
                  >
                    <Pencil className="h-4 w-4" />
                    Chỉnh sửa phiếu nháp
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedReceipt.status === 'DRAFT' && (
                  <button
                    onClick={() => handleConfirmDirect(selectedReceipt)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Xác nhận nhập kho
                  </button>
                )}

                {selectedReceipt.status === 'DRAFT' && (
                  <button
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenDeleteModal(selectedReceipt);
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
      {/* MODAL 3: IN PHIẾU NHẬP KHO (PRINT VOUCHER)            */}
      {/* ═════════════════════════════════════════════════════ */}
      {isPrintOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm print:p-0 print:bg-white">
          <div className="relative my-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl print:my-0 print:max-w-none print:shadow-none print:rounded-none">
            {/* Header thanh công cụ (ẩn khi in) */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-amber-800" />
                <h3 className="font-bold text-stone-900">Xem & In Phiếu Nhập Kho</h3>
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
            <div id="printable-receipt" className="p-8 print:p-6 text-stone-900 bg-white">
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
                  <div className="text-xs font-semibold uppercase text-stone-500">Mẫu số: 01-VT</div>
                  <div className="text-xs text-stone-500">Ban hành theo TT 200/2014/TT-BTC</div>
                  <div className="mt-1 font-bold text-sm text-amber-900">
                    Số: {selectedReceipt.receipt_code}
                  </div>
                </div>
              </div>

              {/* Tiêu đề Phiếu */}
              <div className="my-6 text-center">
                <h1 className="text-2xl font-black uppercase tracking-wide text-stone-900">
                  PHIẾU NHẬP KHO NGUYÊN VẬT LIỆU
                </h1>
                <p className="mt-1 text-xs italic text-stone-600">
                  Ngày {new Date(selectedReceipt.receipt_date).getDate()} tháng{' '}
                  {new Date(selectedReceipt.receipt_date).getMonth() + 1} năm{' '}
                  {new Date(selectedReceipt.receipt_date).getFullYear()}
                </p>
              </div>

              {/* Thông tin phiếu */}
              <div className="grid grid-cols-2 gap-y-2 text-xs text-stone-800 mb-6">
                <div>
                  <span className="font-semibold text-stone-700">Đơn vị cung cấp:</span>{' '}
                  <span className="font-bold">{selectedReceipt.supplier?.supplier_name}</span>
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Mã nhà cung cấp:</span>{' '}
                  {selectedReceipt.supplier?.supplier_code}
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Địa chỉ NCC:</span>{' '}
                  {selectedReceipt.supplier?.address || '—'}
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Số điện thoại:</span>{' '}
                  {selectedReceipt.supplier?.phone_number || '—'}
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Người nhận hàng / Thủ kho:</span>{' '}
                  <span className="font-semibold">{selectedReceipt.receiver?.full_name || '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Nhập tại kho:</span> Kho Nguyên Vật Liệu
                  Xưởng FSSIMS
                </div>
                {selectedReceipt.note && (
                  <div className="col-span-2">
                    <span className="font-semibold text-stone-700">Ghi chú:</span> {selectedReceipt.note}
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
                      <th className="border border-stone-800 px-2 py-2 w-24">Mã NVL</th>
                      <th className="border border-stone-800 px-2 py-2 w-16">ĐVT</th>
                      <th className="border border-stone-800 px-2 py-2 w-20">Số lượng</th>
                      <th className="border border-stone-800 px-3 py-2 text-right w-28">Đơn giá</th>
                      <th className="border border-stone-800 px-3 py-2 text-right w-32">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReceipt.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-stone-400">
                        <td className="border border-stone-800 px-2 py-2 text-center">{idx + 1}</td>
                        <td className="border border-stone-800 px-3 py-2 font-medium">
                          {item.raw_name}
                          {item.note && (
                            <span className="block text-[11px] italic text-stone-500">
                              ({item.note})
                            </span>
                          )}
                        </td>
                        <td className="border border-stone-800 px-2 py-2 text-center font-mono">
                          {item.raw_code}
                        </td>
                        <td className="border border-stone-800 px-2 py-2 text-center font-semibold">
                          {item.unit}
                        </td>
                        <td className="border border-stone-800 px-2 py-2 text-center font-bold">
                          {item.quantity}
                        </td>
                        <td className="border border-stone-800 px-3 py-2 text-right">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="border border-stone-800 px-3 py-2 text-right font-bold">
                          {formatCurrency(item.line_total)}
                        </td>
                      </tr>
                    ))}
                    {/* Dòng Tổng cộng */}
                    <tr className="border-t-2 border-stone-800 font-bold bg-stone-50">
                      <td colSpan={4} className="border border-stone-800 px-3 py-2.5 text-right uppercase">
                        Tổng cộng tiền hàng:
                      </td>
                      <td className="border border-stone-800 px-2 py-2.5 text-center font-bold">
                        {(selectedReceipt.items || []).reduce((s, it) => s + it.quantity, 0)}
                      </td>
                      <td className="border border-stone-800"></td>
                      <td className="border border-stone-800 px-3 py-2.5 text-right text-sm font-bold text-amber-900">
                        {formatCurrency(selectedReceipt.total_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Chữ ký 4 bên */}
              <div className="mt-10 grid grid-cols-4 gap-4 text-center text-xs text-stone-800">
                <div>
                  <p className="font-bold uppercase">Người lập phiếu</p>
                  <p className="text-[11px] text-stone-500">(Ký, họ tên)</p>
                  <div className="mt-16 font-semibold">{selectedReceipt.createby || '—'}</div>
                </div>

                <div>
                  <p className="font-bold uppercase">Người giao hàng</p>
                  <p className="text-[11px] text-stone-500">(Ký, họ tên)</p>
                  <div className="mt-16 font-semibold">Đại diện NCC</div>
                </div>

                <div>
                  <p className="font-bold uppercase">Thủ kho nhận</p>
                  <p className="text-[11px] text-stone-500">(Ký, họ tên)</p>
                  <div className="mt-16 font-semibold">
                    {selectedReceipt.receiver?.full_name || '—'}
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
      {/* MODAL 4: HỦY PHIẾU NHẬP KHO                           */}
      {/* ═════════════════════════════════════════════════════ */}
      {isCancelOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-rose-100 p-3 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">Xác nhận hủy phiếu nhập?</h3>
                <p className="text-xs text-stone-500">Mã phiếu: {selectedReceipt.receipt_code}</p>
              </div>
            </div>

            {selectedReceipt.status === 'CONFIRMED' && (
              <div className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
                <span className="font-bold">Lưu ý quan trọng:</span> Phiếu nhập này đã được xác nhận
                (CONFIRMED). Khi hủy, hệ thống sẽ tự động trừ lùi số lượng nguyên vật liệu đã cộng
                vào kho.
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-semibold text-stone-700">Lý do hủy phiếu</label>
              <textarea
                rows={3}
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="Nhập lý do hủy phiếu (sai số lượng, NCC đổi ý...)"
                className="mt-1 w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsCancelOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Không, quay lại
              </button>
              <button
                disabled={submitting}
                onClick={handleConfirmCancel}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 5: XÓA PHIẾU NHẬP KHO                           */}
      {/* ═════════════════════════════════════════════════════ */}
      {isDeleteOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-rose-100 p-3 text-rose-600">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">Xác nhận xóa phiếu nhập?</h3>
                <p className="text-xs text-stone-500">Mã phiếu: {selectedReceipt.receipt_code}</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-stone-600">
              Bạn có chắc chắn muốn xóa vĩnh viễn phiếu nhập này khỏi hệ thống? Thao tác này không
              thể hoàn tác.
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
      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 6: TẠO NHANH NGUYÊN VẬT LIỆU MỚI                */}
      {/* ═════════════════════════════════════════════════════ */}
      {isQuickCreateRawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-100 p-1.5 text-amber-800">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Tạo nhanh nguyên vật liệu mới
                  </h3>
                  <p className="text-xs text-stone-500">
                    Vật liệu tạo mới sẽ tự động được chọn vào phiếu nhập kho
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCreateRawOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateRawSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Mã nguyên vật liệu
                  </label>
                  <input
                    type="text"
                    value={quickRawForm.raw_code}
                    onChange={(e) =>
                      setQuickRawForm({ ...quickRawForm, raw_code: e.target.value })
                    }
                    placeholder="Tự động sinh nếu để trống..."
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs uppercase text-stone-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Đơn vị tính <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={quickRawForm.unit}
                    onChange={(e) =>
                      setQuickRawForm({ ...quickRawForm, unit: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                  >
                    <option value="BOARD">BOARD (Tấm/Thanh)</option>
                    <option value="THANH">THANH</option>
                    <option value="TAM">TẤM</option>
                    <option value="M2">M2 (Mét vuông)</option>
                    <option value="M3">M3 (Mét khối)</option>
                    <option value="KG">KG (Kilogram)</option>
                    <option value="L">L (Lít)</option>
                    <option value="PCS">PCS (Cái/Chiếc)</option>
                    <option value="BOX">BOX (Hộp/Thùng)</option>
                    <option value="CUON">CUỘN</option>
                    <option value="BO">BỘ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Tên nguyên vật liệu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickRawForm.raw_name}
                  onChange={(e) =>
                    setQuickRawForm({ ...quickRawForm, raw_name: e.target.value })
                  }
                  placeholder="Ví dụ: Gỗ óc chó Bắc Mỹ 25mm, Bản lề Hafele..."
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Định mức tồn tối thiểu
                </label>
                <input
                  type="number"
                  min="0"
                  value={quickRawForm.min_quantity}
                  onChange={(e) =>
                    setQuickRawForm({ ...quickRawForm, min_quantity: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Mô tả / Quy cách
                </label>
                <textarea
                  rows={2}
                  value={quickRawForm.description}
                  onChange={(e) =>
                    setQuickRawForm({ ...quickRawForm, description: e.target.value })
                  }
                  placeholder="Quy cách kích thước, xuất xứ, nhà sản xuất..."
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsQuickCreateRawOpen(false)}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={quickRawSubmitting}
                  className="rounded-lg bg-amber-700 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-amber-800 disabled:opacity-50"
                >
                  {quickRawSubmitting ? 'Đang tạo...' : 'Tạo & Chọn ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
