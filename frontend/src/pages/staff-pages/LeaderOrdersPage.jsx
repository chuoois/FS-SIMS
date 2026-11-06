import { useState, useEffect, useCallback } from 'react';
import {
  Hammer,
  ClipboardList,
  Search,
  RotateCw,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Package,
  Calendar,
  Layers,
  FileText,
  User,
  Phone,
  X,
  Send,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getLeaderOrders,
  leaderAcceptOrder,
  leaderUpdateProgress,
  leaderSubmitInspection,
} from '../../services/orderManagementService';
import { TablePagination } from '../../components/common/TablePagination';

const formatVND = (val) =>
  val != null
    ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(val)
    : '—';

const formatDate = (d) =>
  d ? new Intl.DateTimeFormat('vi-VN').format(new Date(d)) : '—';

export const LeaderOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });

  // Modal Chi tiết & Bản vẽ đã chốt
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Modal Cập nhật tiến độ / Gửi nghiệm thu
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressOrder, setProgressOrder] = useState(null);
  const [progressNote, setProgressNote] = useState('');
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);

  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [inspectionOrder, setInspectionOrder] = useState(null);
  const [inspectionNote, setInspectionNote] = useState('');
  const [isSubmittingInspection, setIsSubmittingInspection] = useState(false);

  // Tải danh sách đơn hàng được giao cho Leader
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await getLeaderOrders(params);
      setOrders(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng sản xuất:', err);
      toast.error('Không thể tải danh sách đơn hàng sản xuất');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Hành động: Tiếp nhận sản xuất
  const handleAcceptOrder = async (order) => {
    if (
      !window.confirm(
        `Xác nhận TIẾP NHẬN SẢN XUẤT đơn hàng ${order.orderCode}?\nĐơn sẽ chuyển sang trạng thái Đang gia công (IN_PRODUCTION).`
      )
    )
      return;
    try {
      await leaderAcceptOrder(order.orderId);
      toast.success(`Đã tiếp nhận sản xuất đơn hàng ${order.orderCode}!`);
      fetchOrders();
    } catch (err) {
      console.error('Lỗi khi tiếp nhận đơn hàng:', err);
      toast.error(err.response?.data?.message || 'Không thể tiếp nhận đơn hàng');
    }
  };

  // Hành động: Cập nhật tiến độ
  const handleOpenProgressModal = (order) => {
    setProgressOrder(order);
    setProgressNote(order.productionNote || '');
    setProgressModalOpen(true);
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!progressOrder || !progressNote.trim()) {
      toast.error('Vui lòng nhập ghi chú tiến độ sản xuất!');
      return;
    }
    try {
      setIsSubmittingProgress(true);
      await leaderUpdateProgress(progressOrder.orderId, progressNote.trim());
      toast.success(`Đã cập nhật tiến độ sản xuất đơn hàng ${progressOrder.orderCode}!`);
      setProgressModalOpen(false);
      fetchOrders();
    } catch (err) {
      console.error('Lỗi cập nhật tiến độ:', err);
      toast.error(err.response?.data?.message || 'Không thể cập nhật tiến độ');
    } finally {
      setIsSubmittingProgress(false);
    }
  };

  // Hành động: Gửi nghiệm thu lên Owner
  const handleOpenInspectionModal = (order) => {
    setInspectionOrder(order);
    setInspectionNote('');
    setInspectionModalOpen(true);
  };

  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    if (!inspectionOrder) return;
    try {
      setIsSubmittingInspection(true);
      await leaderSubmitInspection(
        inspectionOrder.orderId,
        inspectionNote.trim() || 'Hoàn thành gia công sản xuất, xin gửi Chủ xưởng nghiệm thu chất lượng.'
      );
      toast.success(`Đã gửi yêu cầu nghiệm thu đơn hàng ${inspectionOrder.orderCode} lên Chủ xưởng!`);
      setInspectionModalOpen(false);
      fetchOrders();
    } catch (err) {
      console.error('Lỗi gửi nghiệm thu:', err);
      toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu nghiệm thu');
    } finally {
      setIsSubmittingInspection(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <Clock className="h-3 w-3" />
            Chờ tiếp nhận
          </span>
        );
      case 'IN_PRODUCTION':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            <Hammer className="h-3 w-3" />
            Đang gia công
          </span>
        );
      case 'UNDER_INSPECTION':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
            <Clock className="h-3 w-3" />
            Chờ Owner nghiệm thu
          </span>
        );
      case 'READY_TO_DELIVER':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
            <CheckCircle2 className="h-3 w-3" />
            Nghiệm thu ĐẠT
          </span>
        );
      case 'DELIVERING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
            Đang giao khách
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            Hoàn tất
          </span>
        );
      default:
        return <span className="text-xs text-stone-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Tiêu đề trang ────────────────────────────────────── */}
      <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-800 text-white shadow-sm">
            <Hammer className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Quản Lý Đơn Hàng & Tiến Độ Sản Xuất</h1>
            <p className="text-xs text-stone-500">
              Khu vực dành cho Tổ trưởng xưởng: Tiếp nhận đơn, theo dõi bản vẽ đã chốt, cập nhật tiến độ và gửi nghiệm thu
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchOrders()}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Làm mới
        </button>
      </div>

      {/* ── Thanh tìm kiếm & lọc ─────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn hàng, tên khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-xs text-stone-900 focus:border-amber-700 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs font-semibold text-stone-700 focus:border-amber-700 focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CONFIRMED">Chờ tiếp nhận</option>
            <option value="IN_PRODUCTION">Đang gia công</option>
            <option value="UNDER_INSPECTION">Chờ Owner nghiệm thu</option>
            <option value="READY_TO_DELIVER">Nghiệm thu ĐẠT</option>
            <option value="COMPLETED">Hoàn tất</option>
          </select>
        </div>
      </div>

      {/* ── Bảng danh sách đơn hàng ──────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-stone-200 bg-stone-50 font-semibold text-stone-700">
            <tr>
              <th className="px-4 py-3">Mã đơn hàng</th>
              <th className="px-4 py-3">Hợp đồng</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Ngày giao hẹn</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3">Tiến độ / Ghi chú xưởng</th>
              <th className="px-4 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-stone-500">
                  <RotateCw className="mx-auto h-6 w-6 animate-spin text-amber-800" />
                  <p className="mt-2 text-xs">Đang tải danh sách đơn sản xuất...</p>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-stone-500">
                  <Package className="mx-auto h-10 w-10 text-stone-300" />
                  <p className="mt-2 text-sm font-semibold text-stone-800">
                    Chưa có đơn hàng nào được phân công
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Khi Chủ xưởng phân công đơn hàng cho bạn, thông tin đơn sẽ xuất hiện tại đây.
                  </p>
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.orderId} className="hover:bg-stone-50/70 transition">
                  <td className="px-4 py-3 font-mono font-bold text-amber-900">{o.orderCode}</td>
                  <td className="px-4 py-3 font-mono text-stone-600">{o.contractCode || '---'}</td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{o.contactName}</td>
                  <td className="px-4 py-3 text-stone-600">{formatDate(o.deliveryDate)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(o.status)}</td>
                  <td className="px-4 py-3 text-stone-700 max-w-xs">
                    {o.inspectionFailedReason && o.status === 'IN_PRODUCTION' ? (
                      <span className="font-bold text-rose-700 block">
                        ⚠️ Nghiệm thu chưa đạt: {o.inspectionFailedReason}
                      </span>
                    ) : null}
                    <span className="italic text-stone-500">{o.productionNote || 'Chưa có ghi chú tiến độ'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => {
                          setDetailOrder(o);
                          setDetailModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-700 shadow-sm hover:bg-stone-100 transition"
                      >
                        <Eye className="h-3 w-3 text-stone-500" />
                        Bản vẽ đã chốt
                      </button>

                      {o.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleAcceptOrder(o)}
                          className="inline-flex items-center gap-1 rounded bg-amber-800 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-amber-900 transition"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Tiếp nhận sản xuất
                        </button>
                      )}

                      {o.status === 'IN_PRODUCTION' && (
                        <>
                          <button
                            onClick={() => handleOpenProgressModal(o)}
                            className="inline-flex items-center gap-1 rounded bg-stone-700 px-2 py-1 text-[11px] font-medium text-white shadow-sm hover:bg-stone-800 transition"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Tiến độ
                          </button>

                          <button
                            onClick={() => handleOpenInspectionModal(o)}
                            className="inline-flex items-center gap-1 rounded bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-800 transition"
                          >
                            <Send className="h-3 w-3" />
                            {o.inspectionFailedReason ? 'Gửi nghiệm thu lại' : 'Gửi nghiệm thu'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          itemLabel="đơn sản xuất"
          loading={loading}
        />
      </div>

      {/* ═════════════════════════════════════════════════════════
          MODAL XEM BẢN VẼ & THIẾT KẾ ĐÃ KHÓA (LOCKED DESIGN SPECS)
          ═════════════════════════════════════════════════════════ */}
      {detailModalOpen && detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold">
                    Bản Vẽ & Thông Số Kỹ Thuật Đã Chốt: #{detailOrder.orderCode}
                  </h3>
                  <p className="text-xs text-stone-400">
                    Căn cứ sản xuất may đo chính thức — Đã được Chủ xưởng (Owner) phê duyệt và khóa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6 space-y-5 text-xs text-stone-800">
              {/* Cảnh báo khóa thiết kế */}
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">Bản vẽ thiết kế đã được Owner chốt và khóa chống sửa đổi</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Tổ trưởng và thợ xưởng thực hiện gia công chính xác theo các thông số kỹ thuật bên dưới. Nếu có sự cố cần điều chỉnh kích thước hay chất liệu, bắt buộc phải báo cáo Chủ xưởng để duyệt lại.
                  </p>
                </div>
              </div>

              {/* Thông tin khách hàng & giao hẹn */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <div>
                  <span className="text-stone-500">Khách hàng:</span>
                  <p className="font-bold text-stone-900 text-sm">{detailOrder.contactName}</p>
                </div>
                <div>
                  <span className="text-stone-500">Số điện thoại:</span>
                  <p className="font-semibold text-stone-900">{detailOrder.contactPhone}</p>
                </div>
                <div>
                  <span className="text-stone-500">Hợp đồng:</span>
                  <p className="font-mono font-semibold text-amber-800">{detailOrder.contractCode || '---'}</p>
                </div>
                <div>
                  <span className="text-stone-500">Hạn giao hàng:</span>
                  <p className="font-semibold text-stone-900">{formatDate(detailOrder.deliveryDate)}</p>
                </div>
              </div>

              {/* Danh sách sản phẩm kỹ thuật */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5 text-xs">
                  <Package className="h-4 w-4 text-amber-800" />
                  Sản phẩm gia công ({detailOrder.items?.length || 0} hạng mục)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left">
                    <thead className="border-b border-stone-200 bg-stone-100 text-[11px] font-bold text-stone-700">
                      <tr>
                        <th className="p-2.5">STT</th>
                        <th className="p-2.5">Sản phẩm</th>
                        <th className="p-2.5">Chất liệu / Loại gỗ</th>
                        <th className="p-2.5">Màu sơn</th>
                        <th className="p-2.5">Kích thước (D x R x C cm)</th>
                        <th className="p-2.5 text-center">SL</th>
                        <th className="p-2.5">Yêu cầu gia công</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {(detailOrder.items || []).map((it, idx) => {
                        const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' x ');
                        return (
                          <tr key={it.orderItemId || idx} className="hover:bg-stone-50">
                            <td className="p-2.5 font-bold text-stone-500">#{idx + 1}</td>
                            <td className="p-2.5 font-bold text-stone-900">{it.productName}</td>
                            <td className="p-2.5 font-semibold text-stone-800">{it.materialName || 'Gỗ tự nhiên'}</td>
                            <td className="p-2.5 text-stone-700">{it.colorName || 'Màu tiêu chuẩn'}</td>
                            <td className="p-2.5 font-mono font-bold text-amber-900">
                              {dim ? `${dim} cm` : 'Theo tỷ lệ xưởng'}
                            </td>
                            <td className="p-2.5 text-center font-bold text-stone-900">{it.quantity}</td>
                            <td className="p-2.5 text-stone-600 max-w-xs">
                              {it.customRequirements || it.note || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hình ảnh thiết kế đính kèm */}
              {detailOrder.images && detailOrder.images.length > 0 && (
                <div>
                  <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5 text-xs">
                    <Sparkles className="h-4 w-4 text-amber-800" />
                    Hình ảnh Bản vẽ & Phối cảnh 3D ({detailOrder.images.length} ảnh)
                  </h4>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {detailOrder.images.map((img, idx) => (
                      <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-sm">
                        <img
                          src={img.imageUrl}
                          alt={`Thiết kế #${idx + 1}`}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://placehold.co/400x400/e2e8f0/64748b?text=B%E1%BA%A3n+V%E1%BA%BD';
                          }}
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1.5 text-[10px] text-white">
                          <span className="font-bold">{img.imageType === 'OVERALL' ? 'Toàn bộ đơn' : 'Chi tiết'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-stone-200 bg-stone-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-5 py-2 font-semibold text-stone-700 hover:bg-stone-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Cập nhật tiến độ ───────────────────────────── */}
      {progressModalOpen && progressOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveProgress} className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-900 px-5 py-3.5 text-white">
              <h3 className="font-bold text-sm">Cập nhật tiến độ sản xuất: #{progressOrder.orderCode}</h3>
              <button type="button" onClick={() => setProgressModalOpen(false)} className="rounded-lg p-1 text-stone-400 hover:bg-stone-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <label className="block font-semibold text-stone-700">Ghi chú tiến độ gia công hiện tại:</label>
              <textarea
                rows="4"
                required
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                placeholder="VD: Đã xẻ gỗ và gia công mộng khung bàn, đang tiến hành chà nhám và phun lót..."
                className="w-full rounded-lg border border-stone-300 p-2.5 text-xs focus:border-amber-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3">
              <button type="button" onClick={() => setProgressModalOpen(false)} className="rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100">
                Hủy
              </button>
              <button type="submit" disabled={isSubmittingProgress} className="rounded-lg bg-amber-800 px-5 py-2 font-bold text-white hover:bg-amber-900 disabled:opacity-50">
                {isSubmittingProgress ? 'Đang lưu...' : 'Lưu tiến độ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal Gửi nghiệm thu lên Owner ───────────────────── */}
      {inspectionModalOpen && inspectionOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmitInspection} className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-900 px-5 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Gửi nghiệm thu chất lượng: #{inspectionOrder.orderCode}</h3>
              </div>
              <button type="button" onClick={() => setInspectionModalOpen(false)} className="rounded-lg p-1 text-stone-400 hover:bg-stone-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
                <p className="font-bold">Xác nhận hoàn thành gia công sản xuất!</p>
                <p className="text-[11px] mt-0.5">
                  Đơn hàng sẽ chuyển sang trạng thái <strong>CHỜ NGHIỆM THU (UNDER_INSPECTION)</strong> để Chủ xưởng (Owner) trực tiếp kiểm tra chất lượng thành phẩm.
                </p>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-stone-700">Ghi chú gửi Chủ xưởng (nếu có):</label>
                <textarea
                  rows="3"
                  value={inspectionNote}
                  onChange={(e) => setInspectionNote(e.target.value)}
                  placeholder="Thành phẩm đã ráp mộng chắc chắn, sơn bóng PU đạt tiêu chuẩn, kính mời Chủ xưởng kiểm tra..."
                  className="w-full rounded-lg border border-stone-300 p-2.5 text-xs focus:border-emerald-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3">
              <button type="button" onClick={() => setInspectionModalOpen(false)} className="rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100">
                Hủy
              </button>
              <button type="submit" disabled={isSubmittingInspection} className="rounded-lg bg-emerald-700 px-5 py-2 font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                {isSubmittingInspection ? 'Đang gửi...' : 'Xác nhận Gửi Nghiệm Thu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
