// =========================================================
// ContractsPage.jsx
// Danh sách hợp đồng bán hàng dành cho nhân viên kinh doanh (Role Sale)
// Sử dụng saleOrderService (Controller riêng biệt)
// Hỗ trợ In / Xuất file bản giấy và Xác nhận đã ký ngoài bằng bút mực
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
  Filter,
  Camera,
  UploadCloud,
  Trash2,
  ShieldCheck,
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
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-3 w-3" />
          Đã ký kết
        </span>
      );
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <Clock className="h-3 w-3" />
          Biên bản chờ ký
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
          <XCircle className="h-3 w-3" />
          Đã hủy
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-800">
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
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Danh Sách Hợp Đồng</h1>
          <p className="text-xs text-stone-500">
            Biên bản hợp đồng bán hàng tại quầy (ký ngoài bản giấy) và trực tuyến
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchContractsList()}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Làm mới
          </button>
          <button
            onClick={() => navigate('/sale/create-order')}
            className="flex items-center gap-1.5 rounded-lg bg-amber-800 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-900"
          >
            <Plus className="h-4 w-4" />
            Lập hợp đồng mới (POS)
          </button>
        </div>
      </div>

      {/* ── Khu vực Tìm kiếm & Bộ lọc (Search & Filters) ────────── */}
      <div className="flex flex-col gap-3.5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        {/* Hàng 1: Thanh Tìm kiếm với Dropdown chọn tiêu chí */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-52">
            <select
              aria-label="Tiêu chí tìm kiếm hợp đồng"
              value={searchBy}
              onChange={(e) => {
                setSearchBy(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-3 pr-8 text-xs font-semibold text-stone-800 focus:border-amber-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">🔍 Tất cả tiêu chí</option>
              <option value="CUSTOMER_NAME">👤 Tên khách hàng</option>
              <option value="CONTRACT_CODE">📄 Mã hợp đồng</option>
              <option value="PHONE">📞 Số điện thoại</option>
            </select>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
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
              className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-8 text-xs text-stone-900 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-2.5 rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                title="Xóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2: Bộ lọc trạng thái & Nút đặt lại */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-stone-100 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 mr-1">
              <Filter className="h-3.5 w-3.5 text-amber-700" />
              <span>Trạng thái:</span>
            </div>
            <select
              aria-label="Lọc trạng thái hợp đồng"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-stone-200 py-1.5 px-3 text-xs text-stone-800 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Biên bản chờ ký</option>
              <option value="SIGNED">Đã ký kết</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition"
            >
              <X className="h-3.5 w-3.5 text-stone-500" />
              <span>Đặt lại bộ lọc</span>
              <span className="ml-1 rounded-full bg-amber-800 px-1.5 py-0.2 text-[10px] text-white">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>

        {/* Tóm tắt kết quả */}
        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
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

      {/* Bảng hợp đồng */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-200 bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="px-4 py-3">Mã hợp đồng</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">SĐT</th>
                <th className="px-4 py-3">Nguồn</th>
                <th className="px-4 py-3 text-right">Tổng giá trị</th>
                <th className="px-4 py-3 text-right">Đã đặt cọc</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-500">
                    <RotateCw className="mx-auto h-6 w-6 animate-spin text-amber-800" />
                    <p className="mt-2 text-xs">Đang tải danh sách hợp đồng...</p>
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-stone-500">
                    <FileText className="mx-auto h-8 w-8 text-stone-300" />
                    <p className="mt-2 font-medium">Chưa có hợp đồng nào</p>
                  </td>
                </tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.contractId} className="hover:bg-stone-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-amber-900">{c.contractCode}</td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{c.customerName}</td>
                    <td className="px-4 py-3 text-stone-600">{c.customerPhone}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                        {c.source === 'OFFLINE' ? 'Tại quầy' : 'Trực tuyến'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-900">
                      {formatVND(c.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-800">
                      {formatVND(c.depositAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">{getContractBadge(c.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewDetail(c)}
                          className="inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100"
                          title="Xem chi tiết biên bản hợp đồng"
                        >
                          <Eye className="h-3 w-3 text-stone-500" />
                          Chi tiết
                        </button>
                        <button
                          onClick={() => handleOpenPrint(c)}
                          className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition"
                          title="In / Xuất hợp đồng bản giấy khổ A4"
                        >
                          <Printer className="h-3 w-3 text-amber-700" />
                          In HĐ
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

      {/* Modal chi tiết & thao tác hợp đồng */}
      {modalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-900 px-5 py-3.5 text-white">
              <h3 className="text-base font-bold">
                Biên bản hợp đồng #{selectedContract.contractCode}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPrint(selectedContract)}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-800 transition"
                  title="In bản giấy để ký ngoài bằng bút mực"
                >
                  <Printer className="h-3.5 w-3.5" />
                  In bản giấy (A4)
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Thân Modal */}
            <div className="overflow-y-auto p-5 text-xs text-stone-800">
              {/* Banner hướng dẫn ký ngoài bản giấy */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 mb-4 text-xs text-amber-950">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <Printer className="h-4 w-4 text-amber-700" />
                    <span>Ký hợp đồng ngoài quầy (Bản giấy in bằng bút mực)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenPrint(selectedContract)}
                    className="flex items-center gap-1 rounded bg-amber-800 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-900"
                  >
                    <Printer className="h-3 w-3" />
                    In ngay
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-stone-600">
                  Hợp đồng mua bán được in ra giấy để hai bên ký bút mực trực tiếp, không sử dụng chữ ký số.
                </p>
                {/* Bằng chứng ảnh chụp hợp đồng đã ký */}
                <div className="mt-3 border-t border-amber-200/80 pt-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-amber-950">
                      Ảnh chụp / scan hợp đồng giấy đã ký <span className="text-rose-600 font-extrabold">* (Bắt buộc)</span>
                    </label>
                    {contractProofPreview && (
                      <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Đã có ảnh bằng chứng
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
                      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-lg border border-amber-200 bg-white p-2.5 shadow-sm">
                        <div
                          onClick={() => setProofPreviewModalOpen(true)}
                          className="group relative h-20 w-24 shrink-0 cursor-pointer overflow-hidden rounded-md border border-stone-200 bg-stone-100"
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
                          <p className="text-xs font-bold text-stone-800 line-clamp-1">
                            {contractProofFile?.name || 'Ảnh chụp hợp đồng đã chọn'}
                          </p>
                          {contractProofFile && (
                            <p className="text-[10px] text-stone-500">
                              Dung lượng: {(contractProofFile.size / 1024).toFixed(0)} KB
                            </p>
                          )}
                          <p className="text-[10px] text-emerald-700">
                            Ảnh sẽ được tải lên hệ thống khi xác nhận ký kết.
                          </p>
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setProofPreviewModalOpen(true)}
                              className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700 hover:bg-stone-200"
                            >
                              <Eye className="h-3 w-3" /> Xem ảnh lớn
                            </button>
                            <button
                              type="button"
                              onClick={() => contractFileInputRef.current?.click()}
                              className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
                            >
                              <Camera className="h-3 w-3" /> Đổi ảnh khác
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveProofFile}
                              className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              <Trash2 className="h-3 w-3" /> Xóa ảnh
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => contractFileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 p-3 text-center cursor-pointer transition hover:border-amber-500 hover:bg-amber-100/50"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-800 mb-1.5">
                          <Camera className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-bold text-amber-900">
                          Bấm vào đây để tải lên ảnh chụp / scan hợp đồng giấy đã ký
                        </p>
                        <p className="text-[10px] text-stone-500 mt-0.5">
                          Hỗ trợ file ảnh JPG, PNG, WEBP (Tối đa 10MB) &mdash; <span className="text-rose-600 font-semibold">Bắt buộc để xác nhận ký</span>
                        </p>
                      </div>
                    )
                  ) : (
                    /* Đã ký (SIGNED) */
                    selectedContract.contractFileUrl ? (
                      <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
                        <div
                          onClick={() => {
                            setContractProofPreview(selectedContract.contractFileUrl);
                            setProofPreviewModalOpen(true);
                          }}
                          className="group relative h-16 w-20 shrink-0 cursor-pointer overflow-hidden rounded-md border border-stone-200 bg-stone-100"
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
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-900">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            Hợp đồng đã có ảnh bằng chứng ký kết
                          </div>
                          <p className="text-[10px] text-stone-600 mt-0.5">
                            Lưu trữ bản scan / ảnh chụp chữ ký tươi trên hệ thống
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setContractProofPreview(selectedContract.contractFileUrl);
                              setProofPreviewModalOpen(true);
                            }}
                            className="mt-1.5 inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-800 shadow-sm border border-emerald-200 hover:bg-emerald-50"
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
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3 mb-4">
                <div>
                  <span className="text-stone-500">Trạng thái:</span>
                  <div className="mt-0.5">{getContractBadge(selectedContract.status)}</div>
                </div>
                <div className="text-right">
                  <span className="text-stone-500">Khách hàng:</span>
                  <p className="font-bold text-stone-900">{selectedContract.customerName} - {selectedContract.customerPhone}</p>
                </div>
              </div>

              {/* Danh sách sản phẩm */}
              <h4 className="font-bold text-stone-900 mb-2">Danh sách sản phẩm:</h4>
              <div className="rounded-lg border border-stone-200 overflow-hidden mb-4">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="px-3 py-2">Sản phẩm</th>
                      <th className="px-3 py-2 text-center">SL</th>
                      <th className="px-3 py-2 text-right">Đơn giá</th>
                      <th className="px-3 py-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {(selectedContract.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-semibold text-stone-900">{it.productName}</td>
                        <td className="px-3 py-2 text-center font-bold">{it.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatVND(it.unitPrice)}</td>
                        <td className="px-3 py-2 text-right font-bold text-amber-900">
                          {formatVND(it.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-stone-200 bg-stone-50/70 font-semibold">
                    <tr>
                      <td colSpan="3" className="px-3 py-2 text-right">Tổng giá trị:</td>
                      <td className="px-3 py-2 text-right font-extrabold text-amber-900">
                        {formatVND(selectedContract.totalAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="3" className="px-3 py-2 text-right text-stone-600">Đã cọc:</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-800">
                        {formatVND(selectedContract.depositAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-5 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPrint(selectedContract)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
                >
                  <Printer className="h-4 w-4 text-amber-700" />
                  In / Xuất bản giấy
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
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {loadingAction ? 'Đang xác nhận...' : 'Xác nhận đã ký bản giấy'}
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
                    className="flex items-center gap-1.5 rounded-lg bg-amber-800 px-5 py-2 font-bold text-white hover:bg-amber-900 disabled:opacity-50"
                  >
                    <Package className="h-4 w-4" />
                    Tạo đơn hàng ngay
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
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-xl bg-stone-900 p-2 shadow-2xl"
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
                className="max-h-[75vh] w-auto max-w-full rounded object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractsPage;
