// =========================================================
// ContractsPage.jsx
// Quản lý danh sách hợp đồng bán hàng dành cho nhân viên kinh doanh (Role Sale)
// Hỗ trợ In biên bản A4 ký ngoài quầy, tải ảnh chữ ký bút mực và tạo đơn hàng
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
  X,
  Printer,
  Camera,
  Trash2,
  ShieldCheck,
  AlertCircle,
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
import { PrintContractModal } from '../../components/common/PrintContractModal';
import { formatVND, formatDateVN, formatDateTimeVN } from '../../utils/formatters';

export const ContractsPage = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Bộ lọc & phân trang
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState('ALL'); // 'ALL' | 'CONTRACT_CODE' | 'CUSTOMER_NAME' | 'PHONE'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });

  // Modal chi tiết & thao tác hợp đồng
  const [selectedContract, setSelectedContract] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // In hợp đồng & Bằng chứng ảnh ký ngoài
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [contractToPrint, setContractToPrint] = useState(null);
  const [contractProofFile, setContractProofFile] = useState(null);
  const [contractProofPreview, setContractProofPreview] = useState('');
  const [proofPreviewModalOpen, setProofPreviewModalOpen] = useState(false);
  const contractFileInputRef = useRef(null);

  // Thống kê số lượng theo trạng thái cho các tab
  const stats = useMemo(() => {
    const total = pagination.totalItems || contracts.length;
    const draft = contracts.filter((c) => c.status === 'DRAFT').length;
    const signed = contracts.filter((c) => c.status === 'SIGNED').length;
    const cancelled = contracts.filter((c) => c.status === 'CANCELLED').length;
    return { total, draft, signed, cancelled };
  }, [pagination.totalItems, contracts]);

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
      setFetchError(null);
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
      setFetchError('Không thể tải danh sách hợp đồng. Vui lòng thử lại sau.');
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

  // Xử lý chọn file ảnh bằng chứng
  const handleProofFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Dung lượng ảnh tối đa là 10MB');
      return;
    }

    setContractProofFile(file);
    const localUrl = URL.createObjectURL(file);
    setContractProofPreview(localUrl);
    toast.success('Đã chọn ảnh chụp hợp đồng đã ký');
  };

  const handleRemoveProofFile = () => {
    setContractProofFile(null);
    setContractProofPreview('');
    if (contractFileInputRef.current) {
      contractFileInputRef.current.value = '';
    }
  };

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
      toast.error('Không thể tải thông tin chi tiết hợp đồng');
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

  // Xác nhận ký biên bản bản giấy ngoài showroom
  const handleSign = async () => {
    if (!selectedContract) return;

    if (!contractProofFile && !contractProofPreview && !selectedContract.contractFileUrl) {
      toast.error('Bắt buộc phải tải lên ảnh chụp bản hợp đồng đã ký');
      return;
    }

    try {
      setLoadingAction(true);
      let finalFileUrl = selectedContract.contractFileUrl || '';

      if (contractProofFile) {
        toast.loading('Đang tải ảnh bằng chứng lên hệ thống...', { id: 'upload-proof' });
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
        toast.error('Bắt buộc phải có ảnh bằng chứng hợp đồng đã ký');
        return;
      }

      const res = await signContract(selectedContract.contractId, {
        contract_file_url: finalFileUrl,
      });

      if (res.data) {
        setSelectedContract(res.data);
        setContractProofFile(null);
        setContractProofPreview(res.data.contractFileUrl || '');
        toast.success('Đã xác nhận ký hợp đồng thành công');
        fetchContractsList();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi xác nhận ký hợp đồng');
    } finally {
      setLoadingAction(false);
    }
  };

  // Tạo đơn hàng từ hợp đồng đã ký
  const handleCreateOrder = async () => {
    if (!selectedContract) return;
    try {
      setLoadingAction(true);
      const res = await createOrderFromContract(selectedContract.contractId);
      if (res.data) {
        toast.success(`Đã tạo đơn hàng ${res.data.orderCode}`);
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
      {/* ── 1. TIÊU ĐỀ TRANG & HÀNH ĐỘNG CHÍNH ───────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Hợp đồng bán hàng
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Theo dõi biên bản thỏa thuận ký ngoài quầy, lưu trữ ảnh ký bút mực và chuyển tiếp tạo đơn hàng.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchContractsList()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:opacity-50"
            title="Tải lại danh sách hợp đồng"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${loading ? 'animate-spin text-amber-900' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/sale/create-order')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <Plus className="h-4 w-4" />
            <span>Lập hợp đồng tại quầy</span>
          </button>
        </div>
      </div>

      {/* ── 2. BỘ LỌC TRẠNG THÁI & TÌM KIẾM ───────────────────────── */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-4">
        {/* Tab trạng thái tích hợp số lượng */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 pb-3">
          {[
            { key: 'ALL', label: 'Tất cả', count: stats.total },
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

        {/* Thanh tìm kiếm và tiêu chí */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:w-44 shrink-0">
            <select
              aria-label="Tiêu chí tìm kiếm"
              value={searchBy}
              onChange={(e) => {
                setSearchBy(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-700 transition focus-visible:border-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            >
              <option value="ALL">Tất cả tiêu chí</option>
              <option value="CONTRACT_CODE">Mã hợp đồng</option>
              <option value="CUSTOMER_NAME">Tên khách hàng</option>
              <option value="PHONE">Số điện thoại</option>
            </select>
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={
                searchBy === 'CONTRACT_CODE'
                  ? 'Nhập mã hợp đồng (ví dụ: HD-...)'
                  : searchBy === 'CUSTOMER_NAME'
                  ? 'Nhập tên khách hàng...'
                  : searchBy === 'PHONE'
                  ? 'Nhập số điện thoại khách hàng...'
                  : 'Tìm theo mã hợp đồng, tên khách hàng hoặc số điện thoại...'
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-9 text-xs text-stone-900 placeholder:text-stone-400 transition focus-visible:border-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 focus-visible:outline-none"
                title="Xóa nội dung tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            >
              <X className="h-3.5 w-3.5" />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>

        {/* Thông tin số lượng kết quả */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 text-xs text-stone-500">
          <span>
            Hiển thị <strong className="font-semibold text-stone-800">{contracts.length}</strong> trên tổng số{' '}
            <strong className="font-semibold text-stone-800">{pagination.totalItems}</strong> hợp đồng
            {search.trim() && (
              <span> với từ khóa &ldquo;<strong className="text-stone-900">{search.trim()}</strong>&rdquo;</span>
            )}
          </span>
          {pagination.totalPages > 1 && (
            <span>
              Trang {pagination.currentPage} / {pagination.totalPages}
            </span>
          )}
        </div>
      </section>

      {/* ── 3. BẢNG DANH SÁCH HỢP ĐỒNG ───────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 sm:pl-6">Mã hợp đồng</th>
                <th scope="col" className="px-3 py-3.5">Khách hàng</th>
                <th scope="col" className="px-3 py-3.5">Số điện thoại</th>
                <th scope="col" className="px-3 py-3.5 text-right">Tổng giá trị</th>
                <th scope="col" className="px-3 py-3.5 text-right">Đã đặt cọc</th>
                <th scope="col" className="px-3 py-3.5 text-right">Còn lại</th>
                <th scope="col" className="px-3 py-3.5 text-center">Trạng thái</th>
                <th scope="col" className="px-3 py-3.5 text-center pr-4 sm:pr-6">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-stone-500">
                    <RotateCw className="mx-auto h-6 w-6 animate-spin text-stone-400" />
                    <p className="mt-2 text-xs text-stone-600">Đang tải danh sách hợp đồng...</p>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-stone-500">
                    <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
                    <p className="mt-2 text-sm font-semibold text-stone-800">{fetchError}</p>
                    <button
                      type="button"
                      onClick={() => fetchContractsList()}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>Thử lại</span>
                    </button>
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-stone-500">
                    <FileText className="mx-auto h-10 w-10 text-stone-300" />
                    <p className="mt-2 text-sm font-semibold text-stone-800">Không tìm thấy hợp đồng nào</p>
                    <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
                      {activeFilterCount > 0
                        ? 'Không có biên bản nào khớp với bộ lọc hiện tại. Thử đặt lại bộ lọc để xem toàn bộ danh sách.'
                        : 'Chưa có hợp đồng nào trong hệ thống. Nhấn vào "Lập hợp đồng tại quầy" để bắt đầu.'}
                    </p>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Đặt lại bộ lọc</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                contracts.map((c) => {
                  const remaining = Math.max(0, (c.totalAmount || 0) - (c.depositAmount || 0));
                  return (
                    <tr key={c.contractId} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 pl-4 pr-3 sm:pl-6 font-mono font-bold text-stone-900">
                        {c.contractCode}
                      </td>
                      <td className="px-3 py-3.5 font-medium text-stone-900">
                        {c.customerName}
                      </td>
                      <td className="px-3 py-3.5 font-mono text-stone-600">
                        {c.customerPhone}
                      </td>
                      <td className="px-3 py-3.5 text-right font-semibold font-mono text-stone-900">
                        {formatVND(c.totalAmount)}
                      </td>
                      <td className="px-3 py-3.5 text-right font-medium font-mono text-emerald-800">
                        {formatVND(c.depositAmount)}
                      </td>
                      <td className="px-3 py-3.5 text-right font-medium font-mono text-stone-700">
                        {formatVND(remaining)}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <ContractStatusBadge status={c.status} />
                      </td>
                      <td className="px-3 py-3.5 text-center pr-4 sm:pr-6">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewDetail(c)}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            title="Xem chi tiết hợp đồng"
                          >
                            <Eye className="h-3.5 w-3.5 text-stone-500" />
                            <span>Chi tiết</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(c)}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-50 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            title="In bản giấy A4"
                          >
                            <Printer className="h-3.5 w-3.5 text-stone-600" />
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

        <div className="border-t border-stone-200 p-3 bg-stone-50/50">
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

      {/* ── 4. MODAL CHI TIẾT HỢP ĐỒNG ───────────────────────── */}
      {modalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-xl border border-stone-200 my-8 overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Chi tiết hợp đồng {selectedContract.contractCode}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Khách hàng: <span className="font-medium text-stone-800">{selectedContract.customerName}</span> • SĐT: <span className="font-mono text-stone-700">{selectedContract.customerPhone}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                aria-label="Đóng cửa sổ"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung Modal */}
            <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5 text-xs text-stone-800">
              {/* Tóm tắt trạng thái & Giá trị thanh toán */}
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-2.5">
                  <span className="text-xs font-semibold text-stone-700">Trạng thái hợp đồng:</span>
                  <ContractStatusBadge status={selectedContract.status} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="rounded-md bg-white p-3 border border-stone-200">
                    <span className="text-[11px] text-stone-500 block">Tổng giá trị hợp đồng:</span>
                    <span className="text-sm font-bold font-mono text-stone-900">
                      {formatVND(selectedContract.totalAmount)}
                    </span>
                  </div>
                  <div className="rounded-md bg-white p-3 border border-stone-200">
                    <span className="text-[11px] text-stone-500 block">Đã thanh toán / đặt cọc:</span>
                    <span className="text-sm font-bold font-mono text-emerald-800">
                      {formatVND(selectedContract.depositAmount)}
                    </span>
                  </div>
                  <div className="rounded-md bg-white p-3 border border-stone-200">
                    <span className="text-[11px] text-stone-500 block">Còn lại thu khi giao hàng:</span>
                    <span className="text-sm font-bold font-mono text-stone-900">
                      {formatVND(Math.max(0, (selectedContract.totalAmount || 0) - (selectedContract.depositAmount || 0)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Khu vực ảnh bằng chứng ký ngoài bằng bút mực */}
              <div className="rounded-lg border border-stone-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    Bản chụp hợp đồng có chữ ký bút mực
                  </span>
                  {selectedContract.status === 'DRAFT' && (
                    <span className="text-[11px] text-stone-500">
                      Bắt buộc trước khi xác nhận ký
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
                    <div className="flex flex-col sm:flex-row items-center gap-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
                      <div
                        onClick={() => setProofPreviewModalOpen(true)}
                        className="group relative h-20 w-24 shrink-0 cursor-pointer overflow-hidden rounded-md border border-stone-300 bg-white"
                      >
                        <img
                          src={contractProofPreview}
                          alt="Bản chụp hợp đồng đã ký"
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 text-white">
                          <Eye className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="flex-1 space-y-1 text-center sm:text-left">
                        <p className="text-xs font-semibold text-stone-900 line-clamp-1">
                          {contractProofFile?.name || 'Ảnh chụp hợp đồng đã ký'}
                        </p>
                        {contractProofFile && (
                          <p className="text-[11px] text-stone-500">
                            Dung lượng: {(contractProofFile.size / 1024).toFixed(0)} KB
                          </p>
                        )}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setProofPreviewModalOpen(true)}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Xem ảnh lớn</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => contractFileInputRef.current?.click()}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                          >
                            <Camera className="h-3 w-3" />
                            <span>Đổi ảnh</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveProofFile}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => contractFileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-stone-50/70 p-5 text-center cursor-pointer transition hover:border-stone-400 hover:bg-stone-100/60"
                    >
                      <Camera className="h-5 w-5 text-stone-500 mb-1.5" />
                      <p className="text-xs font-medium text-stone-800">
                        Nhấn để chọn ảnh chụp hoặc scan hợp đồng giấy đã ký
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Định dạng JPG, PNG, WEBP tối đa 10MB
                      </p>
                    </div>
                  )
                ) : (
                  selectedContract.contractFileUrl ? (
                    <div className="flex items-center gap-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
                      <div
                        onClick={() => {
                          setContractProofPreview(selectedContract.contractFileUrl);
                          setProofPreviewModalOpen(true);
                        }}
                        className="group relative h-16 w-20 shrink-0 cursor-pointer overflow-hidden rounded-md border border-stone-300 bg-white"
                      >
                        <img
                          src={selectedContract.contractFileUrl}
                          alt="Ảnh chữ ký hợp đồng"
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 text-white">
                          <Eye className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                          <span>Đã lưu trữ ảnh chữ ký tươi</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setContractProofPreview(selectedContract.contractFileUrl);
                            setProofPreviewModalOpen(true);
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                        >
                          <Eye className="h-3.5 w-3.5 text-stone-500" />
                          <span>Xem ảnh lớn</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">Chưa có ảnh bằng chứng đính kèm.</p>
                  )
                )}
              </div>

              {/* Danh sách sản phẩm trong hợp đồng */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-800 block">
                  Danh mục sản phẩm trong hợp đồng
                </span>
                <div className="rounded-lg border border-stone-200 overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-700 border-b border-stone-200 font-semibold">
                      <tr>
                        <th className="px-4 py-2.5">Sản phẩm</th>
                        <th className="px-3 py-2.5 text-center">Số lượng</th>
                        <th className="px-4 py-2.5 text-right">Đơn giá</th>
                        <th className="px-4 py-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(selectedContract.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/50">
                          <td className="px-4 py-2.5 font-medium text-stone-900">{item.productName}</td>
                          <td className="px-3 py-2.5 text-center text-stone-700">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right text-stone-600 font-mono">{formatVND(item.unitPrice)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-stone-900 font-mono">
                            {formatVND(item.totalPrice || item.unitPrice * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-stone-200 bg-stone-50 font-semibold text-stone-800">
                      <tr>
                        <td colSpan="3" className="px-4 py-2 text-right text-stone-600">Tổng cộng:</td>
                        <td className="px-4 py-2 text-right font-bold text-stone-900 font-mono">
                          {formatVND(selectedContract.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-6 py-3.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPrint(selectedContract)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-800 hover:bg-stone-100 transition"
                  title="In biên bản giấy A4"
                >
                  <Printer className="h-4 w-4 text-stone-600" />
                  <span>In bản giấy A4</span>
                </button>
              </div>

              <div>
                {selectedContract.status === 'DRAFT' && (
                  <button
                    disabled={
                      loadingAction ||
                      (!contractProofFile && !contractProofPreview && !selectedContract.contractFileUrl)
                    }
                    onClick={handleSign}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{loadingAction ? 'Đang xác nhận...' : 'Xác nhận đã ký bản giấy'}</span>
                  </button>
                )}

                {selectedContract.status === 'SIGNED' && (
                  <button
                    disabled={loadingAction}
                    onClick={handleCreateOrder}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-950 disabled:opacity-50 transition"
                  >
                    <span>{loadingAction ? 'Đang tạo...' : 'Tạo đơn hàng'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. LIGHTBOX XEM ẢNH LỚN ───────────────────────── */}
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
              <span className="text-xs font-medium">Ảnh chụp hợp đồng đã ký</span>
              <button
                type="button"
                onClick={() => setProofPreviewModalOpen(false)}
                className="rounded-md p-1 text-stone-400 hover:bg-stone-800 hover:text-white transition"
                aria-label="Đóng xem ảnh lớn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex max-h-[80vh] items-center justify-center overflow-auto p-2">
              <img
                src={contractProofPreview || selectedContract?.contractFileUrl}
                alt="Ảnh hợp đồng phóng to"
                className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 6. MODAL IN HỢP ĐỒNG KHỔ A4 (PrintContractModal) ─────────── */}
      <PrintContractModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        contract={contractToPrint}
      />
    </div>
  );
};

export default ContractsPage;
