// =========================================================
// ManagePurchaseReceiptsPage.jsx
// Quản lý Phiếu Nhập Kho (Manage Purchase Receipts) dành cho Chủ xưởng (Owner)
// Bao gồm: Danh sách, Tạo mới, Xem chi tiết, Chỉnh sửa, Xác nhận nhập kho, Hủy, Xóa & In phiếu nhập
// Chuẩn hóa 100% theo FSSIMS Design System (Xưởng sản xuất đồ gỗ nội thất Góc Nhà)
// =========================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
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
  Clock,
  Ban,
  Check,
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
import { ReceiptStatusBadge } from '../../components/common/StatusBadge';
import {
  formatVND as formatCurrency,
  formatDateVN as formatDate,
} from '../../utils/formatters';

// ─── Hằng số Tab lọc trạng thái ─────────────────────────────
const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả phiếu' },
  { key: 'CONFIRMED', label: 'Đã nhập kho' },
  { key: 'DRAFT', label: 'Phiếu nháp' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

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
        search: searchTerm.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        supplier_id: supplierFilter !== 'ALL' ? supplierFilter : undefined,
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
    await Promise.all([fetchReceipts(), fetchSummary(), loadMetadata()]);
    toast.success('Đã làm mới dữ liệu');
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

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
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
    const receiptId = receipt.purchase_receipt_id || receipt.receipt_id;
    setEditingReceiptId(receiptId);
    try {
      const res = await getReceiptDetail(receiptId);
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
    const currentSelectedId = selectedReceipt ? (selectedReceipt.purchase_receipt_id || selectedReceipt.receipt_id) : null;
    if (selectedReceipt && currentSelectedId === receiptId && selectedReceipt.items) {
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
    const receiptId = receipt.purchase_receipt_id || receipt.receipt_id;
    try {
      const res = await confirmReceipt(receiptId);
      toast.success(res.message || 'Xác nhận nhập kho thành công!');
      fetchReceipts();
      fetchSummary();
      const currentSelectedId = selectedReceipt ? (selectedReceipt.purchase_receipt_id || selectedReceipt.receipt_id) : null;
      if (isDetailOpen && currentSelectedId === receiptId) {
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
    const receiptId = selectedReceipt.purchase_receipt_id || selectedReceipt.receipt_id;
    try {
      const res = await cancelReceipt(receiptId, {
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
    const receiptId = selectedReceipt.purchase_receipt_id || selectedReceipt.receipt_id;
    try {
      const res = await deleteReceipt(receiptId);
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

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER & ACTION BUTTONS ───────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Quản Lý Phiếu Nhập Kho
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Theo dõi, ghi nhận và quản lý hoạt động nhập nguyên vật liệu gỗ & phụ kiện vào xưởng Góc Nhà.
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
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-950 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <Plus className="h-4 w-4" />
            <span>Lập phiếu nhập mới</span>
          </button>
        </div>
      </div>

      {/* ── 2. THỐNG KÊ TỔNG QUAN (4 CARDS) ───────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số phiếu */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:border-stone-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Tổng phiếu nhập</span>
            <div className="rounded-lg bg-stone-100 p-1.5 text-stone-700">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-stone-900 sm:text-2xl">
            {summary.totalReceipts}
            <span className="ml-1.5 text-xs font-sans font-normal text-stone-400">phiếu</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500">
            Toàn bộ phiếu nhập xưởng
          </div>
        </div>

        {/* Đã nhập kho */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-xs transition hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Đã nhập kho</span>
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-emerald-900 sm:text-2xl">
            {summary.confirmedCount}
            <span className="ml-1.5 text-xs font-sans font-normal text-emerald-700/70">phiếu hoàn tất</span>
          </div>
          <div className="mt-1 text-[11px] font-mono font-medium text-emerald-800">
            Giá trị: {formatCurrency(summary.confirmedTotalAmount)}
          </div>
        </div>

        {/* Phiếu nháp */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-xs transition hover:border-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Phiếu nháp</span>
            <div className="rounded-lg bg-amber-100 p-1.5 text-amber-800">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-amber-900 sm:text-2xl">
            {summary.draftCount}
            <span className="ml-1.5 text-xs font-sans font-normal text-amber-700/70">chờ duyệt</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700/80">
            Chưa cộng vào tồn kho
          </div>
        </div>

        {/* Đã hủy */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-4 shadow-xs transition hover:border-rose-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Phiếu đã hủy</span>
            <div className="rounded-lg bg-rose-100 p-1.5 text-rose-800">
              <Ban className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-rose-900 sm:text-2xl">
            {summary.cancelledCount}
            <span className="ml-1.5 text-xs font-sans font-normal text-rose-700/70">hủy bỏ</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-700/80">
            Không tính vào tồn kho
          </div>
        </div>
      </section>

      {/* ── 3. TABS TRẠNG THÁI (PILL TABS CÓ COUNT) ───────────── */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-200 pb-3">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          let count = summary.totalReceipts;
          if (tab.key === 'CONFIRMED') count = summary.confirmedCount;
          if (tab.key === 'DRAFT') count = summary.draftCount;
          if (tab.key === 'CANCELLED') count = summary.cancelledCount;

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

      {/* ── 4. BỘ LỌC & TÌM KIẾM ──────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {/* Ô tìm kiếm */}
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, ghi chú, tên nhà cung cấp..."
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

          {/* Lọc Nhà cung cấp */}
          <div>
            <select
              aria-label="Lọc theo nhà cung cấp"
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
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
            {(searchTerm || statusFilter !== 'ALL' || supplierFilter !== 'ALL' || fromDate || toDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-600 shadow-xs transition hover:bg-stone-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {/* Lọc theo ngày */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3 text-xs text-stone-600">
          <span className="font-semibold text-stone-700 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-stone-400" />
            Lọc theo ngày nhập:
          </span>
          <div className="flex items-center gap-1.5">
            <span>Từ:</span>
            <input
              type="date"
              aria-label="Từ ngày nhập"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs text-stone-900 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span>Đến:</span>
            <input
              type="date"
              aria-label="Đến ngày nhập"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs text-stone-900 font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
          </div>
        </div>
      </div>

      {/* ── 5. BẢNG DỮ LIỆU PHIẾU NHẬP ───────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3 pl-4 pr-3 sm:pl-6">Mã phiếu</th>
                <th className="px-3 py-3">Ngày nhập</th>
                <th className="px-3 py-3">Nhà cung cấp</th>
                <th className="px-3 py-3">Người nhận kho</th>
                <th className="px-3 py-3 text-center">Số mặt hàng</th>
                <th className="px-3 py-3 text-right">Tổng tiền</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
                <th className="py-3 pl-3 pr-4 text-center sm:pr-6">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="h-5 w-5 animate-spin text-amber-800" />
                      <span className="text-xs">Đang tải danh sách phiếu nhập kho...</span>
                    </div>
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="h-8 w-8 text-stone-300" />
                      <p className="font-semibold text-stone-700 text-sm">Không tìm thấy phiếu nhập nào</p>
                      <p className="text-xs text-stone-400">
                        Thử điều chỉnh lại bộ lọc hoặc bấm &quot;Lập phiếu nhập mới&quot; để tạo phiếu.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                receipts.map((receipt) => {
                  const receiptId = receipt.purchase_receipt_id || receipt.receipt_id;
                  return (
                    <tr
                      key={receiptId || receipt.receipt_code}
                      className="transition hover:bg-stone-50/70"
                    >
                      {/* Mã phiếu */}
                      <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(receiptId)}
                          className="font-mono font-semibold text-amber-900 hover:underline hover:text-amber-950 focus-visible:outline-none"
                        >
                          {receipt.receipt_code}
                        </button>
                        {receipt.note && (
                          <p className="mt-0.5 line-clamp-1 max-w-xs text-[11px] text-stone-400">
                            {receipt.note}
                          </p>
                        )}
                      </td>

                      {/* Ngày nhập */}
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-stone-600">
                        {formatDate(receipt.receipt_date)}
                      </td>

                      {/* Nhà cung cấp */}
                      <td className="px-3 py-3">
                        <div className="font-medium text-stone-800">{receipt.supplier_name}</div>
                        <div className="text-[11px] font-mono text-stone-400">{receipt.supplier_code}</div>
                      </td>

                      {/* Người nhận */}
                      <td className="whitespace-nowrap px-3 py-3 text-stone-600">
                        {receipt.receiver_name || '—'}
                      </td>

                      {/* Số mặt hàng */}
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold font-mono text-stone-700">
                          {receipt.items_count || (receipt.items ? receipt.items.length : 0)} mặt hàng
                        </span>
                      </td>

                      {/* Tổng tiền */}
                      <td className="whitespace-nowrap px-3 py-3 text-right font-mono font-bold text-stone-900">
                        {formatCurrency(receipt.total_amount)}
                      </td>

                      {/* Trạng thái */}
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <ReceiptStatusBadge status={receipt.status} />
                      </td>

                      {/* Thao tác */}
                      <td className="whitespace-nowrap py-3 pl-3 pr-4 text-center sm:pr-6">
                        <div className="inline-flex items-center justify-center gap-1">
                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(receiptId)}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            title="Xem chi tiết phiếu nhập"
                          >
                            <Eye className="h-3 w-3 text-stone-400" />
                            <span>Chi tiết</span>
                          </button>

                          {/* In phiếu */}
                          <button
                            type="button"
                            onClick={() => handleOpenPrintModal(receiptId)}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            title="In phiếu nhập kho"
                          >
                            <Printer className="h-3 w-3 text-stone-400" />
                            <span>In</span>
                          </button>

                          {/* Chỉnh sửa (chỉ khi là DRAFT) */}
                          {receipt.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(receipt)}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 shadow-xs transition hover:bg-amber-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                              title="Chỉnh sửa phiếu nháp"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>Sửa</span>
                            </button>
                          )}

                          {/* Xác nhận nhập kho (chỉ khi là DRAFT) */}
                          {receipt.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handleConfirmDirect(receipt)}
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 shadow-xs transition hover:bg-emerald-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                              title="Xác nhận nhập kho (cộng tồn kho)"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Nhập kho</span>
                            </button>
                          )}

                          {/* Xóa phiếu nháp */}
                          {receipt.status !== 'CONFIRMED' && (
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(receipt)}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 shadow-xs transition hover:bg-rose-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                              title="Xóa phiếu nhập này"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Xóa</span>
                            </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative my-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            {/* Header modal */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    {formMode === 'EDIT'
                      ? `Chỉnh sửa phiếu nhập — ${form.receipt_code || 'Nháp'}`
                      : 'Lập phiếu nhập kho mới'}
                  </h2>
                  <p className="text-xs text-stone-500">
                    {formMode === 'EDIT'
                      ? 'Cập nhật thông tin phiếu nhập kho khi còn ở trạng thái nháp'
                      : 'Ghi nhận nguyên vật liệu gỗ và phụ kiện mua từ nhà cung cấp vào xưởng'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none"
                aria-label="Đóng form phiếu nhập"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung Form */}
            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5 text-xs">
              {/* Thông tin chung */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Mã phiếu nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={formMode === 'EDIT'}
                    value={form.receipt_code}
                    onChange={(e) => setForm({ ...form, receipt_code: e.target.value })}
                    placeholder="Tự động sinh..."
                    className={`w-full rounded-lg border border-stone-300 px-3 py-2 text-xs uppercase font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${
                      formMode === 'EDIT' ? 'bg-stone-100 text-stone-500 cursor-not-allowed' : ''
                    }`}
                  />
                  <p className="mt-1 text-[11px] text-stone-400">
                    Ví dụ: RCP-20261124-0001
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ngày nhập kho <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.receipt_date}
                    onChange={(e) => setForm({ ...form, receipt_date: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nhà cung cấp <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.supplier_id}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
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
                <label className="block text-xs font-semibold text-stone-700 mb-1">Ghi chú phiếu nhập</label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Ghi chú về số xe giao, kiện gỗ xẻ sấy, số hóa đơn chứng từ..."
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              {/* Chi tiết danh sách nguyên vật liệu */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                      Chi tiết nguyên vật liệu nhập <span className="text-rose-500">*</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenQuickCreateRaw(form.items.length - 1)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-xs transition hover:bg-amber-50 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                      title="Tạo nhanh nguyên vật liệu mới vào danh mục kho"
                    >
                      <Plus className="h-3.5 w-3.5 text-amber-800" />
                      <span>+ Tạo nhanh NVL mới</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-xs transition hover:bg-amber-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Thêm mặt hàng</span>
                    </button>
                  </div>
                </div>

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
                        <th className="px-2 py-2.5 min-w-[150px]">Ghi chú quy cách</th>
                        <th className="py-2.5 pl-2 pr-3 w-10 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {form.items.map((row, idx) => {
                        const selectedRaw = rawMaterials.find(
                          (m) =>
                            String(m.raw_material_id || m.rawMaterialId) ===
                            String(row.raw_material_id)
                        );
                        const lineTotal = (Number(row.quantity) || 0) * (Number(row.unit_price) || 0);

                        return (
                          <tr key={idx} className="hover:bg-stone-50/50">
                            <td className="py-2 pl-3 pr-2 text-center font-medium text-stone-400">
                              {idx + 1}
                            </td>

                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1.5">
                                <select
                                  aria-label={`Chọn nguyên vật liệu dòng ${idx + 1}`}
                                  value={row.raw_material_id}
                                  onChange={(e) => handleItemChange(idx, 'raw_material_id', e.target.value)}
                                  className="w-full rounded-md border border-stone-300 py-1.5 pl-2 pr-6 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                                >
                                  <option value="">-- Chọn NVL ({rawMaterials.length} loại) --</option>
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
                                  className="rounded border border-stone-300 p-1.5 text-stone-500 hover:bg-stone-100 hover:text-amber-800"
                                  title="Tạo nhanh NVL mới"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>

                            <td className="px-2 py-2 text-center text-stone-600 font-semibold">
                              {selectedRaw?.unit || '—'}
                            </td>

                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min="1"
                                aria-label={`Số lượng dòng ${idx + 1}`}
                                value={row.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                className="w-full rounded-md border border-stone-300 py-1.5 px-2 text-center text-xs font-semibold font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                              />
                            </td>

                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                aria-label={`Đơn giá dòng ${idx + 1}`}
                                value={row.unit_price}
                                onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                                className="w-full rounded-md border border-stone-300 py-1.5 px-2 text-right text-xs font-semibold font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                              />
                            </td>

                            <td className="px-2 py-2 text-right font-mono font-bold text-amber-900">
                              {formatCurrency(lineTotal)}
                            </td>

                            <td className="px-2 py-2">
                              <input
                                type="text"
                                placeholder="Quy cách thanh/tấm..."
                                value={row.note || ''}
                                onChange={(e) => handleItemChange(idx, 'note', e.target.value)}
                                className="w-full rounded-md border border-stone-300 py-1.5 px-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                              />
                            </td>

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
                <div className="flex items-center justify-between rounded-xl bg-amber-50/60 p-4 border border-amber-200">
                  <span className="text-xs font-semibold text-amber-900">
                    Tổng cộng giá trị phiếu nhập ({form.items.length} mặt hàng):
                  </span>
                  <span className="text-lg font-bold font-mono text-amber-900">
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
                className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                Hủy bỏ
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmitForm('DRAFT')}
                  className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs hover:bg-stone-50 transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
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
                  className="rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative my-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-stone-900 sm:text-lg">
                      Chi tiết phiếu nhập — <span className="font-mono text-amber-900">{selectedReceipt.receipt_code}</span>
                    </h2>
                    <ReceiptStatusBadge status={selectedReceipt.status} />
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Ngày nhập: {formatDate(selectedReceipt.receipt_date)} • Tạo lúc:{' '}
                    {formatDate(selectedReceipt.createdate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none"
                aria-label="Đóng chi tiết phiếu nhập"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-amber-900" />
                    <span>Thông tin Nhà Cung Cấp</span>
                  </h3>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-stone-900">
                      {selectedReceipt.supplier?.supplier_name || '—'}
                    </h4>
                    <p className="text-stone-500">
                      Mã NCC: <span className="font-mono">{selectedReceipt.supplier?.supplier_code || '—'}</span>
                    </p>
                    <p className="text-stone-600">
                      SĐT: <span className="font-mono">{selectedReceipt.supplier?.phone_number || 'Chưa cập nhật'}</span>
                    </p>
                    <p className="text-stone-600">
                      Địa chỉ: {selectedReceipt.supplier?.address || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-amber-900" />
                    <span>Thông tin Nhập Kho</span>
                  </h3>
                  <div className="space-y-1 text-stone-700">
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
                      <p className="mt-2 rounded bg-amber-50 p-2 text-amber-900 border border-amber-200">
                        <span className="font-semibold">Ghi chú:</span> {selectedReceipt.note}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bảng chi tiết mặt hàng */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Danh sách nguyên vật liệu nhập ({selectedReceipt.items?.length || 0} mặt hàng)
                </h3>

                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
                    <thead className="bg-stone-50 font-semibold text-stone-700">
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
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {(selectedReceipt.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/60">
                          <td className="py-2.5 pl-3 pr-2 text-center text-stone-400 font-medium">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-semibold text-amber-900">
                            {item.raw_code}
                          </td>
                          <td className="px-3 py-2.5 font-medium text-stone-900">
                            {item.raw_name}
                          </td>
                          <td className="px-3 py-2.5 text-center text-stone-600 font-semibold">
                            {item.unit}
                          </td>
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-stone-800">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-stone-700">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-stone-900">
                            {formatCurrency(item.line_total)}
                          </td>
                          <td className="py-2.5 pl-3 pr-4 text-stone-500">
                            {item.note || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-amber-50/60 p-4 border border-amber-200">
                  <div className="text-xs font-semibold text-amber-900">
                    Tổng giá trị đơn nhập kho:
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-900">
                    {formatCurrency(selectedReceipt.total_amount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal Chi tiết */}
            <div className="flex flex-wrap items-center justify-between border-t border-stone-200 bg-stone-50 px-6 py-4 rounded-b-2xl">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleOpenPrintModal(selectedReceipt.receipt_id, selectedReceipt);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 transition active:scale-95"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>In phiếu nhập</span>
                </button>

                {selectedReceipt.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(selectedReceipt)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 shadow-xs hover:bg-amber-100 transition active:scale-95"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Chỉnh sửa phiếu nháp</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedReceipt.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => handleConfirmDirect(selectedReceipt)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition active:scale-95"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Xác nhận nhập kho</span>
                  </button>
                )}

                {selectedReceipt.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailOpen(false);
                      handleOpenDeleteModal(selectedReceipt);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-xs font-medium text-rose-700 shadow-xs hover:bg-rose-50 transition active:scale-95"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Xóa phiếu</span>
                  </button>
                )}

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
        </div>
      )}

      {/* ═════════════════════════════════════════════════════ */}
      {/* MODAL 3: IN PHIẾU NHẬP KHO (PRINT VOUCHER)            */}
      {/* ═════════════════════════════════════════════════════ */}
      {isPrintOpen && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs print:p-0 print:bg-white">
          <div className="relative my-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl print:my-0 print:max-w-none print:shadow-none print:rounded-none">
            {/* Header thanh công cụ (ẩn khi in) */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-amber-900" />
                <h2 className="text-base font-bold text-stone-900">Xem & In Phiếu Nhập Kho</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-950 active:scale-95"
                >
                  <Printer className="h-4 w-4" />
                  <span>In phiếu ngay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintOpen(false)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  aria-label="Đóng cửa sổ in"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Nội dung Mẫu Phiếu In Chính Thức */}
            <div id="printable-receipt" className="p-8 print:p-6 text-stone-900 bg-white">
              <div className="flex items-start justify-between border-b-2 border-stone-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                    Xưởng Nội Thất & Gia Công Gỗ Góc Nhà
                  </h3>
                  <p className="text-xs text-stone-600">Hệ thống Quản lý Xưởng mộc FSSIMS</p>
                  <p className="text-xs text-stone-600">Hotline: 0900 000 001 - Email: contact@gocnha.vn</p>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold uppercase text-stone-500">Mẫu số: 01-VT</div>
                  <div className="text-[11px] text-stone-500">Ban hành theo TT 200/2014/TT-BTC</div>
                  <div className="mt-1 font-bold font-mono text-sm text-amber-900">
                    Số: {selectedReceipt.receipt_code}
                  </div>
                </div>
              </div>

              <div className="my-6 text-center">
                <h1 className="text-xl font-black uppercase tracking-wide text-stone-900">
                  PHIẾU NHẬP KHO NGUYÊN VẬT LIỆU
                </h1>
                <p className="mt-1 text-xs italic text-stone-600 font-mono">
                  Ngày {new Date(selectedReceipt.receipt_date).getDate()} tháng{' '}
                  {new Date(selectedReceipt.receipt_date).getMonth() + 1} năm{' '}
                  {new Date(selectedReceipt.receipt_date).getFullYear()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-y-2 text-xs text-stone-800 mb-6">
                <div>
                  <span className="font-semibold text-stone-700">Đơn vị cung cấp:</span>{' '}
                  <span className="font-bold">{selectedReceipt.supplier?.supplier_name}</span>
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Mã nhà cung cấp:</span>{' '}
                  <span className="font-mono">{selectedReceipt.supplier?.supplier_code}</span>
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Địa chỉ NCC:</span>{' '}
                  {selectedReceipt.supplier?.address || '—'}
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Số điện thoại:</span>{' '}
                  <span className="font-mono">{selectedReceipt.supplier?.phone_number || '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Người nhận hàng / Thủ kho:</span>{' '}
                  <span className="font-semibold">{selectedReceipt.receiver?.full_name || '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-stone-700">Nhập tại kho:</span> Kho Nguyên Vật Liệu Xưởng Góc Nhà
                </div>
                {selectedReceipt.note && (
                  <div className="col-span-2">
                    <span className="font-semibold text-stone-700">Ghi chú:</span> {selectedReceipt.note}
                  </div>
                )}
              </div>

              {/* Bảng Mặt hàng in */}
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
                        <td className="border border-stone-800 px-2 py-2 text-center font-mono font-bold">
                          {item.quantity}
                        </td>
                        <td className="border border-stone-800 px-3 py-2 text-right font-mono">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="border border-stone-800 px-3 py-2 text-right font-mono font-bold">
                          {formatCurrency(item.line_total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-stone-800 font-bold bg-stone-50">
                      <td colSpan={4} className="border border-stone-800 px-3 py-2 text-right uppercase">
                        Tổng cộng tiền hàng:
                      </td>
                      <td className="border border-stone-800 px-2 py-2 text-center font-mono font-bold">
                        {(selectedReceipt.items || []).reduce((s, it) => s + it.quantity, 0)}
                      </td>
                      <td className="border border-stone-800"></td>
                      <td className="border border-stone-800 px-3 py-2 text-right text-xs font-mono font-bold text-amber-900">
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
                  <div className="mt-14 font-semibold">{selectedReceipt.createby || '—'}</div>
                </div>

                <div>
                  <p className="font-bold uppercase">Người giao hàng</p>
                  <p className="text-[11px] text-stone-500">(Ký, họ tên)</p>
                  <div className="mt-14 font-semibold">Đại diện NCC</div>
                </div>

                <div>
                  <p className="font-bold uppercase">Thủ kho nhận</p>
                  <p className="text-[11px] text-stone-500">(Ký, họ tên)</p>
                  <div className="mt-14 font-semibold">
                    {selectedReceipt.receiver?.full_name || '—'}
                  </div>
                </div>

                <div>
                  <p className="font-bold uppercase">Chủ xưởng duyệt</p>
                  <p className="text-[11px] text-stone-500">(Ký, đóng dấu)</p>
                  <div className="mt-14 font-semibold">Góc Nhà Woodcraft</div>
                </div>
              </div>
            </div>

            {/* Footer modal print */}
            <div className="flex items-center justify-end border-t border-stone-200 bg-stone-50 px-6 py-4 rounded-b-2xl print:hidden">
              <button
                type="button"
                onClick={() => setIsPrintOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">Xác nhận hủy phiếu nhập?</h2>
                <p className="text-xs text-stone-500">Mã phiếu: <span className="font-mono text-amber-900">{selectedReceipt.receipt_code}</span></p>
              </div>
            </div>

            {selectedReceipt.status === 'CONFIRMED' && (
              <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200">
                <span className="font-bold">Lưu ý quan trọng:</span> Phiếu nhập này đã được xác nhận nhập kho. Khi hủy, hệ thống sẽ tự động trừ lùi số lượng nguyên vật liệu đã cộng vào kho.
              </div>
            )}

            <div className="mt-4 text-xs">
              <label className="block font-semibold text-stone-700 mb-1">Lý do hủy phiếu</label>
              <textarea
                rows={3}
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="Nhập lý do hủy phiếu (sai số lượng, NCC đổi ý...)"
                className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCancelOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Không, quay lại
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmCancel}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">Xác nhận xóa phiếu nhập?</h2>
                <p className="text-xs text-stone-500">Mã phiếu: <span className="font-mono text-amber-900">{selectedReceipt.receipt_code}</span></p>
              </div>
            </div>

            <p className="mt-4 text-xs text-stone-600">
              Bạn có chắc chắn muốn xóa vĩnh viễn phiếu nhập này khỏi hệ thống? Thao tác này không thể hoàn tác.
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
                onClick={handleConfirmDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    Tạo nhanh nguyên vật liệu mới
                  </h2>
                  <p className="text-xs text-stone-500">
                    Vật liệu tạo mới sẽ tự động được chọn vào phiếu nhập kho
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCreateRawOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                aria-label="Đóng form tạo nhanh NVL"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateRawSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Mã nguyên vật liệu
                  </label>
                  <input
                    type="text"
                    value={quickRawForm.raw_code}
                    onChange={(e) =>
                      setQuickRawForm({ ...quickRawForm, raw_code: e.target.value })
                    }
                    placeholder="Tự động sinh nếu để trống..."
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs uppercase font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Đơn vị tính <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={quickRawForm.unit}
                    onChange={(e) =>
                      setQuickRawForm({ ...quickRawForm, unit: e.target.value })
                    }
                    className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
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
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tên nguyên vật liệu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickRawForm.raw_name}
                  onChange={(e) =>
                    setQuickRawForm({ ...quickRawForm, raw_name: e.target.value })
                  }
                  placeholder="Ví dụ: Gỗ óc chó Bắc Mỹ 25mm, Bản lề Hafele giảm chấn..."
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Định mức tồn tối thiểu
                </label>
                <input
                  type="number"
                  min="0"
                  value={quickRawForm.min_quantity}
                  onChange={(e) =>
                    setQuickRawForm({ ...quickRawForm, min_quantity: e.target.value })
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-mono text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mô tả / Quy cách
                </label>
                <textarea
                  rows={2}
                  value={quickRawForm.description}
                  onChange={(e) =>
                    setQuickRawForm({ ...quickRawForm, description: e.target.value })
                  }
                  placeholder="Quy cách kích thước, xuất xứ, tiêu chuẩn xẻ sấy..."
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsQuickCreateRawOpen(false)}
                  className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={quickRawSubmitting}
                  className="rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 disabled:opacity-50"
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

export default ManagePurchaseReceiptsPage;
