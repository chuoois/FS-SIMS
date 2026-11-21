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
import { PrintContractModal } from '../../components/common/PrintContractModal';

const formatVND = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val || 0);

const getContractBadge = (status) => {
  switch (status) {
    case 'SIGNED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Đã ký kết
        </span>
      );
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
          <Clock className="h-3.5 w-3.5" />
          Biên bản chờ ký
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 border border-rose-200">
          <XCircle className="h-3.5 w-3.5" />
          Đã hủy
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 border border-stone-200">
          {status}
        </span>
      );
  }
};

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
    <div className="space-y-6">
      {/* ── Tiêu đề & Nút thao tác ───────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Quản Lý Hợp Đồng
          </h1>
          <p className="text-sm text-stone-500">
            Biên bản hợp đồng bán hàng tại quầy (ký ngoài bản giấy) và trực tuyến
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchContractsList()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95 disabled:opacity-50"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => navigate('/sale/create-order')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-900 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Lập hợp đồng tại quầy</span>
          </button>
        </div>
      </div>

      {/* ── Thống kê tổng quan (Cards) ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số hợp đồng */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-stone-500">Tổng hợp đồng</span>
            <div className="rounded-lg bg-stone-100 p-2 text-stone-700">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-stone-900">{stats.total}</span>
            <span className="text-xs text-stone-400">hợp đồng</span>
          </div>
        </div>

        {/* Chờ ký kết */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">Biên bản chờ ký</span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900">{stats.draft}</span>
            <span className="text-xs text-amber-600">chờ ký bút mực</span>
          </div>
        </div>

        {/* Đã ký kết */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">Đã ký kết</span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-900">{stats.signed}</span>
            <span className="text-xs text-emerald-600">sẵn sàng tạo đơn</span>
          </div>
        </div>

        {/* Đã hủy */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-rose-800">Đã hủy</span>
            <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-900">{stats.cancelled}</span>
            <span className="text-xs text-rose-600">hợp đồng đã hủy</span>
          </div>
        </div>
      </div>

      {/* ── Bộ lọc & Tìm kiếm ─────────────────────────────── */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Dropdown tiêu chí + Ô tìm kiếm */}
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-48">
              <select
                aria-label="Tiêu chí tìm kiếm hợp đồng"
                value={searchBy}
                onChange={(e) => {
                  setSearchBy(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
              >
                <option value="ALL">🔍 Tất cả tiêu chí</option>
                <option value="CUSTOMER_NAME">👤 Tên khách hàng</option>
                <option value="CONTRACT_CODE">📄 Mã hợp đồng</option>
                <option value="PHONE">📞 Số điện thoại</option>
              </select>
            </div>

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
                className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-9 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  title="Xóa tìm kiếm"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Bộ lọc trạng thái & Nút đặt lại */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Lọc trạng thái hợp đồng"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-sm"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Biên bản chờ ký</option>
              <option value="SIGNED">Đã ký kết</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 transition shadow-sm"
              >
                Xóa bộ lọc ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {/* Tóm tắt kết quả */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100 mt-3">
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
      </div>

      {/* ── Bảng danh sách hợp đồng ───────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3.5 pl-4 pr-3 sm:pl-6">Mã hợp đồng</th>
                <th className="px-3 py-3.5">Khách hàng</th>
                <th className="px-3 py-3.5">Số điện thoại</th>
                <th className="px-3 py-3.5">Nguồn</th>
                <th className="px-3 py-3.5 text-right">Tổng giá trị</th>
                <th className="px-3 py-3.5 text-right">Đã đặt cọc</th>
                <th className="px-3 py-3.5 text-center">Trạng thái</th>
                <th className="px-3 py-3.5 text-center pr-4 sm:pr-6">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-stone-500">
                    <RotateCw className="mx-auto h-6 w-6 animate-spin text-amber-800" />
                    <p className="mt-2 text-xs">Đang tải danh sách hợp đồng...</p>
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-stone-500">
                    <FileText className="mx-auto h-10 w-10 text-stone-300" />
                    <p className="mt-2 text-sm font-semibold text-stone-800">Chưa có hợp đồng nào</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {activeFilterCount > 0
                        ? 'Thử thay đổi từ khóa tìm kiếm hoặc bấm "Xóa bộ lọc" để xem toàn bộ danh sách.'
                        : 'Hiện chưa có hợp đồng nào trong hệ thống.'}
                    </p>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        <X className="h-3.5 w-3.5" />
                        Xóa bộ lọc
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.contractId} className="hover:bg-amber-50/30 transition">
                    <td className="py-3.5 pl-4 pr-3 sm:pl-6 font-mono font-bold text-amber-900">
                      {c.contractCode}
                    </td>
                    <td className="px-3 py-3.5 font-semibold text-stone-900">
                      {c.customerName}
                    </td>
                    <td className="px-3 py-3.5 text-stone-600">
                      {c.customerPhone}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700 border border-stone-200">
                        {c.source === 'OFFLINE' ? 'Tại quầy' : 'Trực tuyến'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-bold text-stone-900">
                      {formatVND(c.totalAmount)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold text-emerald-700">
                      {formatVND(c.depositAmount)}
                    </td>
                    <td className="px-3 py-3.5 text-center">{getContractBadge(c.status)}</td>
                    <td className="px-3 py-3.5 text-center pr-4 sm:pr-6">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewDetail(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow-2xs hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 transition"
                          title="Xem chi tiết biên bản hợp đồng"
                        >
                          <Eye className="h-3.5 w-3.5 text-stone-500" />
                          <span>Chi tiết</span>
                        </button>
                        <button
                          onClick={() => handleOpenPrint(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-100 transition"
                          title="In / Xuất hợp đồng bản giấy khổ A4"
                        >
                          <Printer className="h-3.5 w-3.5 text-amber-700" />
                          <span>In HĐ</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

      {/* Modal In hợp đồng bản giấy A4 */}
      <PrintContractModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        contract={contractToPrint}
      />

      {/* ── Modal chi tiết & thao tác hợp đồng ──────────────── */}
      {modalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-stone-200 my-8 overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    Biên bản hợp đồng — {selectedContract.contractCode}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Khách hàng: {selectedContract.customerName} • SĐT: {selectedContract.customerPhone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPrint(selectedContract)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100 transition active:scale-95"
                  title="In bản giấy để ký ngoài bằng bút mực"
                >
                  <Printer className="h-3.5 w-3.5 text-amber-700" />
                  <span>In bản giấy (A4)</span>
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Thân Modal */}
            <div className="max-h-[72vh] overflow-y-auto px-6 py-5 space-y-5 text-sm text-stone-800">
              {/* Banner hướng dẫn ký ngoài bản giấy */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                    <Printer className="h-4 w-4 text-amber-700" />
                    <span>Ký hợp đồng ngoài quầy (Bản giấy in bằng bút mực)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenPrint(selectedContract)}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-900 transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>In ngay</span>
                  </button>
                </div>
                <p className="text-xs text-stone-600">
                  Hợp đồng mua bán được in ra giấy để hai bên ký bút mực trực tiếp, không sử dụng chữ ký số.
                </p>

                {/* Bằng chứng ảnh chụp hợp đồng đã ký */}
                <div className="border-t border-amber-200/80 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-amber-950">
                      Ảnh chụp / scan hợp đồng giấy đã ký <span className="text-rose-600 font-extrabold">* (Bắt buộc)</span>
                    </label>
                    {contractProofPreview && (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Đã có ảnh bằng chứng
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
                      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-amber-200 bg-white p-3 shadow-xs">
                        <div
                          onClick={() => setProofPreviewModalOpen(true)}
                          className="group relative h-20 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                        >
                          <img
                            src={contractProofPreview}
                            alt="Ảnh hợp đồng đã ký"
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                            <Eye className="h-4 w-4 text-white" />
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
                          <p className="text-[11px] text-emerald-700">
                            Ảnh sẽ được tải lên hệ thống khi xác nhận ký kết.
                          </p>
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setProofPreviewModalOpen(true)}
                              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                            >
                              <Eye className="h-3 w-3" /> Xem ảnh lớn
                            </button>
                            <button
                              type="button"
                              onClick={() => contractFileInputRef.current?.click()}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                            >
                              <Camera className="h-3 w-3" /> Đổi ảnh khác
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveProofFile}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                            >
                              <Trash2 className="h-3 w-3" /> Xóa ảnh
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => contractFileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-4 text-center cursor-pointer transition hover:border-amber-500 hover:bg-amber-100/50"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800 mb-2">
                          <Camera className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-amber-900">
                          Bấm vào đây để tải lên ảnh chụp / scan hợp đồng giấy đã ký
                        </p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Hỗ trợ file ảnh JPG, PNG, WEBP (Tối đa 10MB) &mdash; <span className="text-rose-600 font-semibold">Bắt buộc để xác nhận ký</span>
                        </p>
                      </div>
                    )
                  ) : (
                    /* Đã ký (SIGNED) */
                    selectedContract.contractFileUrl ? (
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
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
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                            <Eye className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            Hợp đồng đã có ảnh bằng chứng ký kết
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
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs border border-emerald-200 hover:bg-emerald-50"
                          >
                            <Eye className="h-3 w-3" /> Xem ảnh gốc kích thước đầy đủ
                          </button>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </div>

              {/* Trạng thái & Khách hàng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
                <div>
                  <span className="text-xs text-stone-500 block">Trạng thái hợp đồng:</span>
                  <div className="mt-1">{getContractBadge(selectedContract.status)}</div>
                </div>
                <div className="sm:text-right">
                  <span className="text-xs text-stone-500 block">Khách hàng đại diện:</span>
                  <p className="font-bold text-stone-900 mt-1">{selectedContract.customerName}</p>
                  <p className="text-xs text-stone-600">{selectedContract.customerPhone}</p>
                </div>
              </div>

              {/* Tình trạng thanh toán */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-amber-800" />
                  Giá trị hợp đồng & Đặt cọc
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-white p-3 border border-stone-200">
                    <span className="text-xs text-stone-500 block">Tổng giá trị</span>
                    <span className="text-base font-bold text-stone-900">{formatVND(selectedContract.totalAmount)}</span>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-stone-200">
                    <span className="text-xs text-stone-500 block">Tiền đặt cọc</span>
                    <span className="text-base font-semibold text-emerald-700">{formatVND(selectedContract.depositAmount)}</span>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-stone-200 col-span-2 sm:col-span-1">
                    <span className="text-xs text-stone-500 block">Còn lại cần thu</span>
                    <span className="text-base font-bold text-rose-600">
                      {formatVND((selectedContract.totalAmount || 0) - (selectedContract.depositAmount || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Danh sách sản phẩm */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2.5 flex items-center gap-1.5 text-xs uppercase tracking-wider text-stone-600">
                  <Package className="h-4 w-4 text-amber-700" />
                  Danh sách sản phẩm trong hợp đồng
                </h4>
                <div className="rounded-xl border border-stone-200 overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-600 border-b border-stone-200 font-semibold">
                      <tr>
                        <th className="px-4 py-3">Sản phẩm</th>
                        <th className="px-3 py-3 text-center">Số lượng</th>
                        <th className="px-4 py-3 text-right">Đơn giá</th>
                        <th className="px-4 py-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(selectedContract.items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/20">
                          <td className="px-4 py-3 font-semibold text-stone-900">{it.productName}</td>
                          <td className="px-3 py-3 text-center font-bold text-stone-700">{it.quantity}</td>
                          <td className="px-4 py-3 text-right text-stone-600">{formatVND(it.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-bold text-amber-900">
                            {formatVND(it.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-stone-200 bg-stone-50/70 font-semibold">
                      <tr>
                        <td colSpan="3" className="px-4 py-2.5 text-right text-stone-600">Tổng giá trị:</td>
                        <td className="px-4 py-2.5 text-right font-extrabold text-amber-900">
                          {formatVND(selectedContract.totalAmount)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="3" className="px-4 py-2.5 text-right text-stone-600">Đã đặt cọc:</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-800">
                          {formatVND(selectedContract.depositAmount)}
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
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 active:scale-95"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPrint(selectedContract)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition active:scale-95"
                >
                  <Printer className="h-4 w-4 text-amber-700" />
                  <span>In / Xuất bản giấy</span>
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
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 transition active:scale-95"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{loadingAction ? 'Đang xác nhận...' : 'Xác nhận đã ký bản giấy'}</span>
                    </button>
                    {!contractProofFile && !contractProofPreview && !selectedContract.contractFileUrl && (
                      <span className="text-[11px] font-medium text-rose-600">
                        * Bắt buộc có ảnh bằng chứng hợp đồng đã ký
                      </span>
                    )}
                  </div>
                )}
                {selectedContract.status === 'SIGNED' && (
                  <button
                    disabled={loadingAction}
                    onClick={handleCreateOrder}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-900 disabled:opacity-50 transition active:scale-95"
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

      {/* Lightbox xem ảnh bằng chứng kích thước lớn */}
      {proofPreviewModalOpen && (contractProofPreview || selectedContract?.contractFileUrl) && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setProofPreviewModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-stone-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 px-4 py-2 text-white">
              <span className="text-xs font-bold flex items-center gap-2">
                <Camera className="h-4 w-4 text-amber-400" />
                Ảnh chụp / bản scan bằng chứng hợp đồng đã ký
              </span>
              <button
                type="button"
                onClick={() => setProofPreviewModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-white"
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
