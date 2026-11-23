// =========================================================
// ContractsPage.jsx
// Danh sách hợp đồng bán hàng dành cho nhân viên kinh doanh (Role Sale)
// Sử dụng saleOrderService (Controller riêng biệt)
// Hỗ trợ In / Xuất file bản giấy và Xác nhận đã ký ngoài bằng bút mực
// Thiết kế đồng bộ 100% với hệ thống Dashboard Owner
// =========================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  RotateCw,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  X,
  ArrowRight,
  Printer,
  Camera,
  Trash2,
  ShieldCheck,
  CreditCard,
  Sparkles,
  UploadCloud,
  ZoomIn,
  Info,
  User,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getContracts,
  getContractById,
  signContract,
  createOrderFromContract,
  uploadContractProof,
} from '../../services/saleOrderService';
import { TablePagination } from '../../components/common/TablePagination';
import { ContractStatusBadge } from '../../components/common/StatusBadge';
import { formatVND, formatDateVN, formatDateTimeVN } from '../../utils/formatters';

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800';
import { PrintContractModal } from '../../components/common/PrintContractModal';

export const ContractsPage = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState('ALL'); // 'ALL' | 'CONTRACT_CODE' | 'CUSTOMER_NAME' | 'PHONE'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 });

  const [selectedContract, setSelectedContract] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // States hỗ trợ in hợp đồng bản giấy & upload ảnh bằng chứng
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [contractToPrint, setContractToPrint] = useState(null);
  const [contractProofFile, setContractProofFile] = useState(null);
  const [contractProofPreview, setContractProofPreview] = useState('');
  const [proofPreviewModalOpen, setProofPreviewModalOpen] = useState(false);
  const contractFileInputRef = useRef(null);

  const handleProofFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP...)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Dung lượng ảnh tối đa là 10MB.');
      return;
    }

    setContractProofFile(file);
    const localUrl = URL.createObjectURL(file);
    setContractProofPreview(localUrl);
    toast.success('Đã chọn ảnh chụp hợp đồng đã ký.');
  };

  const handleRemoveProofFile = () => {
    setContractProofFile(null);
    setContractProofPreview('');
    if (contractFileInputRef.current) {
      contractFileInputRef.current.value = '';
    }
  };

  // ── Thống kê tổng quan nhanh ────────────────────────────────
  const stats = useMemo(() => {
    const total = pagination.totalItems || contracts.length;
    const draft = contracts.filter((c) => c.status === 'DRAFT').length;
    const signed = contracts.filter((c) => c.status === 'SIGNED').length;
    const cancelled = contracts.filter((c) => c.status === 'CANCELLED').length;
    return { total, draft, signed, cancelled };
  }, [pagination.totalItems, contracts]);

  // Đếm số lượng bộ lọc đang kích hoạt
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (statusFilter !== 'ALL') count += 1;
    return count;
  }, [search, statusFilter]);

  const handleResetFilters = () => {
    setSearch('');
    setSearchBy('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  const fetchContractsList = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit };

      if (search.trim()) {
        const keyword = search.trim();
        if (searchBy === 'CONTRACT_CODE') {
          params.contract_code = keyword;
        } else if (searchBy === 'CUSTOMER_NAME') {
          params.customer_name = keyword;
        } else if (searchBy === 'PHONE') {
          params.search = keyword;
          params.search_by = 'PHONE';
        } else {
          params.search = keyword;
          params.search_by = 'ALL';
        }
      }

      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await getContracts(params);
      setContracts(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Lỗi tải danh sách hợp đồng:', err);
      toast.error('Không thể tải danh sách hợp đồng');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, searchBy, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContractsList();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchContractsList]);

  const handleViewDetail = async (contract) => {
    try {
      setModalOpen(true);
      setSelectedContract(contract);
      setContractProofFile(null);
      setContractProofPreview(contract.contractFileUrl || '');
      if (contractFileInputRef.current) contractFileInputRef.current.value = '';

      const res = await getContractById(contract.contractId);
      if (res.data) {
        setSelectedContract(res.data);
        setContractProofPreview(res.data.contractFileUrl || '');
      }
    } catch (err) {
      console.error('Lỗi lấy chi tiết hợp đồng:', err);
    }
  };

  const handleOpenPrint = async (contract) => {
    try {
      let full = contract;
      if (!contract.items || contract.items.length === 0) {
        const res = await getContractById(contract.contractId);
        if (res.data) full = res.data;
      }
      setContractToPrint(full);
      setPrintModalOpen(true);
    } catch (err) {
      console.error('Lỗi khi mở bản in hợp đồng:', err);
      toast.error('Không thể tải chi tiết hợp đồng để in');
    }
  };

  const handleSign = async () => {
    if (!selectedContract) return;

    if (!contractProofFile && !contractProofPreview && !selectedContract.contractFileUrl) {
      toast.error('Bắt buộc phải tải lên ảnh chụp/scan hợp đồng đã ký để làm bằng chứng!');
      return;
    }

    try {
      setLoadingAction(true);
      let finalFileUrl = selectedContract.contractFileUrl || '';

      if (contractProofFile) {
        toast.loading('Đang tải ảnh bằng chứng lên máy chủ...', { id: 'upload-proof' });
        const uploadRes = await uploadContractProof(contractProofFile);
        const uploadedUrls = uploadRes.urls || uploadRes.images || [];
        if (!uploadedUrls[0]) {
          toast.dismiss('upload-proof');
          toast.error('Không thể tải ảnh hợp đồng lên máy chủ. Vui lòng thử lại.');
          return;
        }
        finalFileUrl = uploadedUrls[0];
        toast.dismiss('upload-proof');
      }

      if (!finalFileUrl) {
        toast.error('Bắt buộc phải có ảnh bằng chứng hợp đồng đã ký!');
        return;
      }

      const res = await signContract(selectedContract.contractId, {
        contract_file_url: finalFileUrl,
      });
      if (res.data) {
        setSelectedContract(res.data);
        setContractProofFile(null);
        setContractProofPreview(res.data.contractFileUrl || '');
        toast.success('Xác nhận khách đã ký bản giấy thành công!');
        fetchContractsList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi ký hợp đồng');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedContract) return;
    try {
      setLoadingAction(true);
      const res = await createOrderFromContract(selectedContract.contractId);
      if (res.data) {
        toast.success(`Đã tạo đơn hàng ${res.data.orderCode}!`);
        setModalOpen(false);
        navigate('/sale/orders');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi tạo đơn hàng');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6 text-stone-900">
      {/* ── 1. HEADER TRANG: QUẢN LÝ HỢP ĐỒNG (SALES CONTRACTS) ─────────── */}
      <header className="flex flex-col gap-4 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm transition sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-amber-400 shadow-sm ring-1 ring-stone-900/10">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
                Quản Lý Hợp Đồng
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                <Sparkles className="h-3 w-3 text-amber-700" />
                Hồ sơ thương mại
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500 sm:text-sm">
              Biên bản hợp đồng bán lẻ tại quầy (ký ngoài giấy bằng bút mực) và hợp đồng đơn may đo theo yêu cầu.
            </p>
          </div>
        </div>

        {/* Cụm nút thao tác */}
        <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
          <button
            type="button"
            onClick={() => fetchContractsList()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50 hover:text-stone-900 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            title="Tải lại danh sách hợp đồng mới nhất"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${loading ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/sale/create-order')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-amber-950 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          >
            <Plus className="h-4 w-4" />
            <span>Lập hợp đồng tại quầy</span>
          </button>
        </div>
      </header>

      {/* Dải thông tin quy trình ký kết */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-stone-200/80 bg-stone-50/70 px-4 py-2.5 text-xs text-stone-600">
        <div className="flex items-center gap-1.5 font-medium">
          <Printer className="h-4 w-4 text-stone-600" />
          <span>Biên bản in giấy A4 ký tay trực tiếp ngoài quầy</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <Camera className="h-4 w-4 text-amber-700" />
          <span>Chụp ảnh / scan chữ ký bút mực tải lên hệ thống</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>Xác nhận ký kết để khởi tạo đơn hàng chính thức</span>
        </div>
      </div>

      {/* ── 2. DẢI THỐNG KÊ TỔNG QUAN (METRIC CARDS) ───────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số hợp đồng */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Tổng số hợp đồng</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <FileText className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-stone-900 font-mono">{stats.total}</span>
            <span className="text-xs text-stone-400">biên bản đã lập</span>
          </div>
        </div>

        {/* Chờ ký kết */}
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-5 shadow-2xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Biên bản chờ ký</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-900 font-mono">{stats.draft}</span>
            <span className="text-xs text-amber-700">chờ ký bút mực</span>
          </div>
        </div>

        {/* Đã ký kết */}
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-5 shadow-2xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Đã ký kết hợp đồng</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-900 font-mono">{stats.signed}</span>
            <span className="text-xs text-emerald-700">sẵn sàng tạo đơn</span>
          </div>
        </div>

        {/* Đã hủy */}
        <div className="rounded-2xl border border-rose-200/90 bg-rose-50/50 p-5 shadow-2xs transition hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900">Hợp đồng đã hủy</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
              <XCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-900 font-mono">{stats.cancelled}</span>
            <span className="text-xs text-rose-700">đã hủy bỏ</span>
          </div>
        </div>
      </div>

      {/* ── 3. BỘ LỌC & TÌM KIẾM ─────────────────────────────── */}
      <section className="rounded-2xl border border-stone-200/90 bg-white p-4.5 shadow-sm space-y-3.5">
        {/* Hàng 1: Tabs chọn trạng thái nhanh */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-100 pb-3">
          {[
            { key: 'ALL', label: 'Tất cả trạng thái', count: stats.total },
            { key: 'DRAFT', label: 'Chờ ký', count: stats.draft },
            { key: 'SIGNED', label: 'Đã ký kết', count: stats.signed },
            { key: 'CANCELLED', label: 'Đã hủy', count: stats.cancelled },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hàng 2: Bộ tìm kiếm & Dropdown tiêu chí */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Tiêu chí tìm kiếm */}
            <div className="w-full sm:w-48">
              <select
                aria-label="Tiêu chí tìm kiếm hợp đồng"
                value={searchBy}
                onChange={(e) => {
                  setSearchBy(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-stone-200 bg-white py-2 px-3 text-xs font-medium text-stone-700 shadow-2xs transition focus:border-amber-600 focus:outline-none"
              >
                <option value="ALL">Tất cả tiêu chí</option>
                <option value="CUSTOMER_NAME">Tên khách hàng</option>
                <option value="CONTRACT_CODE">Mã hợp đồng</option>
                <option value="PHONE">Số điện thoại liên hệ</option>
              </select>
            </div>

            {/* Input tìm kiếm */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder={
                  searchBy === 'CUSTOMER_NAME'
                    ? 'Nhập họ tên khách hàng cần tìm...'
                    : searchBy === 'CONTRACT_CODE'
                    ? 'Nhập mã hợp đồng (ví dụ: HD-...)...'
                    : searchBy === 'PHONE'
                    ? 'Nhập số điện thoại khách hàng...'
                    : 'Tìm theo mã hợp đồng, tên khách hàng hoặc số điện thoại...'
                }
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-stone-200 py-2 pl-9 pr-9 text-xs text-stone-900 placeholder:text-stone-400 shadow-2xs transition focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  title="Xóa từ khóa tìm kiếm"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Nút đặt lại bộ lọc */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 shadow-2xs transition hover:bg-stone-100 hover:text-stone-900 active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
              <span>Xóa bộ lọc ({activeFilterCount})</span>
            </button>
          )}
        </div>

        {/* Tóm tắt kết quả */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
          <span>
            Tìm thấy <strong className="font-bold text-stone-900">{pagination.totalItems}</strong> hợp đồng
            {search.trim() && (
              <span> cho từ khóa &ldquo;<strong className="text-amber-900">{search.trim()}</strong>&rdquo;</span>
            )}
          </span>
          {pagination.totalPages > 1 && (
            <span>
              Trang {pagination.currentPage} / {pagination.totalPages}
            </span>
          )}
        </div>
      </section>

      {/* ── 4. BẢNG DANH SÁCH HỢP ĐỒNG ───────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
            <thead className="bg-stone-50 font-bold text-stone-700 border-b border-stone-200">
              <tr>
                <th className="py-3.5 pl-4 pr-3 sm:pl-6">Mã hợp đồng</th>
                <th className="px-3 py-3.5">Khách hàng</th>
                <th className="px-3 py-3.5">Số điện thoại</th>
                <th className="px-3 py-3.5 text-right">Tổng giá trị</th>
                <th className="px-3 py-3.5 text-right">Đã đặt cọc</th>
                <th className="px-3 py-3.5 text-right">Còn lại cần thu</th>
                <th className="px-3 py-3.5 text-center">Trạng thái</th>
                <th className="px-3 py-3.5 text-center pr-4 sm:pr-6">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-stone-500">
                    <RotateCw className="mx-auto h-7 w-7 animate-spin text-amber-800" />
                    <p className="mt-2 text-xs font-medium text-stone-600">Đang tải danh sách hợp đồng...</p>
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-stone-500">
                    <FileText className="mx-auto h-12 w-12 text-stone-300" />
                    <p className="mt-3 text-sm font-bold text-stone-800">Chưa có hợp đồng nào</p>
                    <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
                      {activeFilterCount > 0
                        ? 'Thử thay đổi từ khóa tìm kiếm hoặc bấm "Xóa bộ lọc" để xem toàn bộ danh sách.'
                        : 'Hiện chưa có biên bản hợp đồng nào trong hệ thống.'}
                    </p>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 shadow-2xs transition"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Xóa bộ lọc</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                contracts.map((c) => {
                  const remaining = Math.max(0, (c.totalAmount || 0) - (c.depositAmount || 0));
                  return (
                    <tr key={c.contractId} className="hover:bg-amber-50/40 transition">
                      <td className="py-3.5 pl-4 pr-3 sm:pl-6 font-mono font-bold text-amber-900">
                        {c.contractCode}
                      </td>
                      <td className="px-3 py-3.5 font-bold text-stone-900">
                        {c.customerName}
                      </td>
                      <td className="px-3 py-3.5 font-mono text-stone-600">
                        {c.customerPhone}
                      </td>
                      <td className="px-3 py-3.5 text-right font-extrabold text-stone-900">
                        {formatVND(c.totalAmount)}
                      </td>
                      <td className="px-3 py-3.5 text-right font-bold text-emerald-800">
                        {formatVND(c.depositAmount)}
                      </td>
                      <td className="px-3 py-3.5 text-right font-bold text-stone-900">
                        {formatVND(remaining)}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        {<ContractStatusBadge status={c.status} />}
                      </td>
                      <td className="px-3 py-3.5 text-center pr-4 sm:pr-6">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewDetail(c)}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-50 hover:text-stone-900 transition"
                          >
                            <Eye className="h-3.5 w-3.5 text-stone-500" />
                            <span>Chi tiết</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(c)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-900 shadow-2xs hover:bg-amber-100 transition"
                            title="In / Xuất hợp đồng bản giấy khổ A4"
                          >
                            <Printer className="h-3.5 w-3.5 text-amber-800" />
                            <span>In A4</span>
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

        <div className="p-3 border-t border-stone-200">
          <TablePagination
            currentPage={pagination.currentPage || page}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.totalItems}
            currentCount={contracts.length}
            itemsPerPage={limit}
            pageSizeOptions={[5, 10, 20, 50]}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            itemLabel="hợp đồng"
            loading={loading}
          />
        </div>
      </div>

      {/* ── MODAL IN HỢP ĐỒNG BẢN GIẤY A4 (PrintContractModal) ─────────── */}
      <PrintContractModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        contract={contractToPrint}
      />

      {/* ── MODAL CHI TIẾT & THAO TÁC HỢP ĐỒNG ───────────────────────── */}
      {modalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-stone-200 my-8 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-white">
                    Biên bản hợp đồng — {selectedContract.contractCode}
                  </h2>
                  <p className="text-xs text-stone-300 mt-0.5">
                    Khách hàng: <strong>{selectedContract.customerName}</strong> • SĐT: <span className="font-mono">{selectedContract.customerPhone}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPrint(selectedContract)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-2xs hover:bg-amber-100 transition active:scale-95"
                  title="In bản giấy để ký ngoài bằng bút mực"
                >
                  <Printer className="h-4 w-4 text-amber-800" />
                  <span>In bản giấy A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white transition"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Thân Modal */}
            <div className="max-h-[72vh] overflow-y-auto px-6 py-5 space-y-5 text-xs text-stone-800">
              {/* Banner hướng dẫn ký ngoài bản giấy */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                    <Printer className="h-4 w-4 text-amber-800" />
                    <span>QUY TRÌNH KÝ HỢP ĐỒNG BẢN GIẤY TẠI SHOWROOM:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenPrint(selectedContract)}
                    className="inline-flex items-center gap-1 rounded-xl bg-amber-900 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-950 transition active:scale-95"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>In ngay bản A4</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-amber-950">
                  <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="font-bold block mb-0.5">1. In hợp đồng</span>
                    In 02 bản A4 cho Khách hàng &amp; Showroom lưu trữ.
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="font-bold block mb-0.5">2. Ký bút mực</span>
                    Hai bên ký tên trực tiếp bằng bút mực trên bản in giấy.
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="font-bold block mb-0.5">3. Tải ảnh &amp; Ký</span>
                    Chụp ảnh bản ký tải lên bên dưới để xác nhận ký kết.
                  </div>
                </div>

                {/* Bằng chứng ảnh chụp hợp đồng đã ký */}
                <div className="border-t border-amber-200/80 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-amber-950">
                      Ảnh chụp / scan hợp đồng giấy đã ký <span className="text-rose-600 font-extrabold">* (Bắt buộc)</span>
                    </label>
                    {contractProofPreview && (
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Đã có ảnh bằng chứng
                      </span>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={contractFileInputRef}
                    accept="image/*"
                    onChange={handleProofFileSelect}
                    className="hidden"
                  />

                  {selectedContract.status === 'DRAFT' ? (
                    contractProofPreview ? (
                      <div className="flex flex-col sm:flex-row items-center gap-3.5 rounded-xl border border-amber-200 bg-white p-3.5 shadow-2xs">
                        <div
                          onClick={() => setProofPreviewModalOpen(true)}
                          className="group relative h-20 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                        >
                          <img
                            src={contractProofPreview}
                            alt="Ảnh hợp đồng đã ký"
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 text-white">
                            <Eye className="h-4 w-4" />
                          </div>
                        </div>

                        <div className="flex-1 space-y-1 text-center sm:text-left">
                          <p className="text-xs font-bold text-stone-900 line-clamp-1">
                            {contractProofFile?.name || 'Ảnh chụp hợp đồng đã chọn'}
                          </p>
                          {contractProofFile && (
                            <p className="text-[11px] text-stone-500">
                              Dung lượng: {(contractProofFile.size / 1024).toFixed(0)} KB
                            </p>
                          )}
                          <p className="text-[11px] text-emerald-700 font-medium">
                            Ảnh sẽ được tải lên hệ thống khi xác nhận ký kết.
                          </p>
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setProofPreviewModalOpen(true)}
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Xem ảnh lớn</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => contractFileInputRef.current?.click()}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition"
                            >
                              <Camera className="h-3 w-3" />
                              <span>Đổi ảnh khác</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveProofFile}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Xóa ảnh</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => contractFileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-5 text-center cursor-pointer transition hover:border-amber-500 hover:bg-amber-100/50"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-900 mb-2">
                          <Camera className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-amber-900">
                          Bấm vào đây để tải lên ảnh chụp / scan hợp đồng giấy đã ký
                        </p>
                        <p className="text-[10px] text-stone-500 mt-0.5">
                          Hỗ trợ JPG, PNG, WEBP (Tối đa 10MB) &bull; <span className="text-rose-600 font-bold">Bắt buộc để xác nhận ký kết</span>
                        </p>
                      </div>
                    )
                  ) : (
                    /* Đã ký (SIGNED) */
                    selectedContract.contractFileUrl ? (
                      <div className="flex items-center gap-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                        <div
                          onClick={() => {
                            setContractProofPreview(selectedContract.contractFileUrl);
                            setProofPreviewModalOpen(true);
                          }}
                          className="group relative h-16 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                        >
                          <img
                            src={selectedContract.contractFileUrl}
                            alt="Ảnh bằng chứng hợp đồng đã ký"
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 text-white">
                            <Eye className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            <span>Hợp đồng đã có ảnh bằng chứng ký kết</span>
                          </div>
                          <p className="text-[11px] text-stone-600 mt-0.5">
                            Lưu trữ bản scan / ảnh chụp chữ ký tươi trên hệ thống
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setContractProofPreview(selectedContract.contractFileUrl);
                              setProofPreviewModalOpen(true);
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs border border-emerald-200 hover:bg-emerald-50 transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Xem ảnh gốc kích thước đầy đủ</span>
                          </button>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </div>

              {/* Trạng thái & Khách hàng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <div>
                  <span className="text-[11px] text-stone-500 block mb-1">Trạng thái hợp đồng:</span>
                  <div>{<ContractStatusBadge status={selectedContract.status} />}</div>
                </div>
                <div className="sm:text-right">
                  <span className="text-[11px] text-stone-500 block mb-0.5">Khách hàng đại diện:</span>
                  <p className="font-bold text-stone-900 text-xs">{selectedContract.customerName}</p>
                  <p className="font-mono text-stone-600 text-xs">{selectedContract.customerPhone}</p>
                </div>
              </div>

              {/* Tình trạng thanh toán */}
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/40 p-4">
                <h3 className="text-xs font-bold text-amber-900 mb-3 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-amber-800" />
                  <span>GIÁ TRỊ HỢP ĐỒNG &amp; ĐẶT CỌC:</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white p-3 border border-stone-200 shadow-2xs">
                    <span className="text-[11px] text-stone-500 block">Tổng giá trị:</span>
                    <span className="text-sm font-extrabold text-stone-900 font-mono">
                      {formatVND(selectedContract.totalAmount)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-stone-200 shadow-2xs">
                    <span className="text-[11px] text-stone-500 block">Tiền đặt cọc:</span>
                    <span className="text-sm font-bold text-emerald-800 font-mono">
                      {formatVND(selectedContract.depositAmount)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-stone-200 col-span-2 sm:col-span-1 shadow-2xs">
                    <span className="text-[11px] text-stone-500 block">Còn lại cần thu:</span>
                    <span className="text-sm font-extrabold text-stone-900 font-mono">
                      {formatVND(Math.max(0, (selectedContract.totalAmount || 0) - (selectedContract.depositAmount || 0)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Danh sách sản phẩm */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5 text-xs">
                  <Package className="h-4 w-4 text-amber-800" />
                  <span>DANH MỤC HÀNG HÓA VÀ DỊCH VỤ TRONG HỢP ĐỒNG:</span>
                </h4>
                <div className="rounded-xl border border-stone-200 overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-700 border-b border-stone-200 font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Sản phẩm</th>
                        <th className="px-3 py-2.5 text-center">Số lượng</th>
                        <th className="px-4 py-2.5 text-right">Đơn giá</th>
                        <th className="px-4 py-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(selectedContract.items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/20">
                          <td className="px-4 py-2.5 font-bold text-stone-900">{it.productName}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-stone-700">{it.quantity}</td>
                          <td className="px-4 py-2.5 text-right text-stone-600 font-mono">{formatVND(it.unitPrice)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-stone-900 font-mono">
                            {formatVND(it.totalPrice || it.unitPrice * it.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-stone-200 bg-stone-50/70 font-bold">
                      <tr>
                        <td colSpan="3" className="px-4 py-2.5 text-right text-stone-600">Tổng giá trị hàng hóa:</td>
                        <td className="px-4 py-2.5 text-right font-extrabold text-stone-900 font-mono text-sm">
                          {formatVND(selectedContract.totalAmount)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="3" className="px-4 py-2.5 text-right text-emerald-800">Tiền đặt cọc tại quầy:</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-800 font-mono">
                          {formatVND(selectedContract.depositAmount)}
                        </td>
                      </tr>
                      <tr className="border-t border-stone-300">
                        <td colSpan="3" className="px-4 py-2.5 text-right text-stone-900">Còn lại thu khi nhận hàng:</td>
                        <td className="px-4 py-2.5 text-right font-extrabold text-stone-900 font-mono text-sm">
                          {formatVND(Math.max(0, (selectedContract.totalAmount || 0) - (selectedContract.depositAmount || 0)))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4 rounded-b-2xl">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 shadow-2xs hover:bg-stone-100 transition"
                >
                  Đóng lại
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPrint(selectedContract)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-2xs hover:bg-amber-100 transition active:scale-95"
                >
                  <Printer className="h-4 w-4 text-amber-800" />
                  <span>In bản giấy A4</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedContract.status === 'DRAFT' && (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      disabled={loadingAction || (!contractProofFile && !contractProofPreview && !selectedContract.contractFileUrl)}
                      onClick={handleSign}
                      title={
                        !contractProofFile && !contractProofPreview && !selectedContract.contractFileUrl
                          ? 'Vui lòng tải lên ảnh chụp bản hợp đồng đã ký trước khi xác nhận'
                          : 'Xác nhận khách hàng đã ký tên bằng bút mực trên bản giấy'
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 transition active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{loadingAction ? 'Đang xác nhận...' : 'Xác nhận đã ký bản giấy'}</span>
                    </button>
                    {!contractProofFile && !contractProofPreview && !selectedContract.contractFileUrl && (
                      <span className="text-[10px] font-medium text-rose-600">
                        * Bắt buộc có ảnh bằng chứng hợp đồng đã ký
                      </span>
                    )}
                  </div>
                )}
                {selectedContract.status === 'SIGNED' && (
                  <button
                    disabled={loadingAction}
                    onClick={handleCreateOrder}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-950 disabled:opacity-50 transition active:scale-95"
                  >
                    <Package className="h-4 w-4" />
                    <span>Tạo đơn hàng ngay</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX XEM ẢNH BẰNG CHỨNG KÍCH THƯỚC LỚN ─────────────── */}
      {proofPreviewModalOpen && (contractProofPreview || selectedContract?.contractFileUrl) && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
          onClick={() => setProofPreviewModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-stone-900 p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 px-4 py-2.5 text-white">
              <span className="text-xs font-bold flex items-center gap-2">
                <Camera className="h-4 w-4 text-amber-400" />
                <span>Ảnh chụp bằng chứng hợp đồng đã ký bản giấy</span>
              </span>
              <button
                type="button"
                onClick={() => setProofPreviewModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[80vh] items-center justify-center overflow-auto p-2">
              <img
                src={contractProofPreview || selectedContract?.contractFileUrl}
                alt="Ảnh hợp đồng lớn"
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractsPage;
