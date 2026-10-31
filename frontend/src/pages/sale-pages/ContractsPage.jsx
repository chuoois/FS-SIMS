// =========================================================
// ContractsPage.jsx
// Danh sách hợp đồng bán hàng dành cho nhân viên kinh doanh (Role Sale)
// Sử dụng saleOrderService (Controller riêng biệt)
// =========================================================

import { useState, useEffect, useCallback } from 'react';
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
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getContracts,
  getContractById,
  signContract,
  createOrderFromContract,
} from '../../services/saleOrderService';
import { TablePagination } from '../../components/common/TablePagination';

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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 });

  const [selectedContract, setSelectedContract] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const fetchContractsList = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
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
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchContractsList();
  }, [fetchContractsList]);

  const handleViewDetail = async (contract) => {
    try {
      setModalOpen(true);
      setSelectedContract(contract);
      const res = await getContractById(contract.contractId);
      if (res.data) setSelectedContract(res.data);
    } catch (err) {
      console.error('Lỗi lấy chi tiết hợp đồng:', err);
    }
  };

  const handleSign = async () => {
    if (!selectedContract) return;
    try {
      setLoadingAction(true);
      const res = await signContract(selectedContract.contractId);
      if (res.data) {
        setSelectedContract(res.data);
        toast.success('Ký hợp đồng thành công!');
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
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Danh Sách Hợp Đồng</h1>
            <p className="text-xs text-stone-500">
              Biên bản hợp đồng ký kết tại quầy và trực tuyến
            </p>
          </div>
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

      {/* Bộ lọc */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo mã hợp đồng, tên khách hàng, số điện thoại..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-stone-200 py-2 px-3 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DRAFT">Biên bản chờ ký</option>
            <option value="SIGNED">Đã ký kết</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
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
                      <button
                        onClick={() => handleViewDetail(c)}
                        className="inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100"
                      >
                        <Eye className="h-3 w-3 text-stone-500" />
                        Xem & Ký
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="border-t border-stone-200 p-3">
            <TablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              itemsPerPage={pagination.itemsPerPage}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Modal chi tiết & thao tác hợp đồng */}
      {modalOpen && selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-900 px-5 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold">
                  Biên bản hợp đồng #{selectedContract.contractCode}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 text-xs text-stone-800">
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

            <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-5 py-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {selectedContract.status === 'DRAFT' && (
                  <button
                    disabled={loadingAction}
                    onClick={handleSign}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Chốt & Ký hợp đồng
                  </button>
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
    </div>
  );
};

export default ContractsPage;
