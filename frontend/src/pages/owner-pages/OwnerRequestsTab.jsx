import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  RotateCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  Layers,
  Image as ImageIcon,
  X,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getOwnerRequests,
  getOwnerRequestById,
  reviewOwnerRequest,
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

export const OwnerRequestsTab = () => {
  const [requests, setRequests] = useState([]);
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

  // Modal chi tiết duyệt
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal nhập lý do (yêu cầu sửa / từ chối)
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState(null); // 'REQUEST_CHANGE' | 'REJECT'
  const [reasonInput, setReasonInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchRequestsList = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await getOwnerRequests(params);
      setRequests(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Lỗi khi tải danh sách yêu cầu thiết kế:', err);
      toast.error('Không thể tải danh sách yêu cầu thiết kế');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchRequestsList();
  }, [fetchRequestsList]);

  // Xem chi tiết
  const handleOpenDetail = async (req) => {
    try {
      setModalOpen(true);
      setSelectedRequest(req);
      setLoadingDetail(true);
      const res = await getOwnerRequestById(req.requestId);
      if (res.data) setSelectedRequest(res.data);
    } catch (err) {
      console.error('Lỗi tải chi tiết yêu cầu:', err);
      toast.error('Không thể tải chi tiết yêu cầu');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Mở modal nhập lý do
  const handleOpenReasonModal = (action) => {
    setReviewAction(action);
    setReasonInput('');
    setReasonModalOpen(true);
  };

  // Thực hiện duyệt
  const handleExecuteReview = async (action, reason = '') => {
    if (!selectedRequest) return;
    try {
      setIsSubmittingReview(true);
      await reviewOwnerRequest(selectedRequest.requestId, action, {
        reason: reason.trim() || undefined,
        note: reason.trim() || undefined,
      });

      let successMsg = '';
      switch (action) {
        case 'REQUEST_CHANGE':
          successMsg = 'Đã gửi yêu cầu chỉnh sửa lại cho Nhân viên Sales!';
          break;
        case 'REJECT':
          successMsg = 'Đã từ chối yêu cầu thiết kế này.';
          break;
        case 'APPROVE':
          successMsg = 'Đã duyệt thiết kế sơ bộ thành công!';
          break;
        case 'FINALIZE_DESIGN':
          successMsg = 'ĐÃ CHỐT THIẾT KẾ CUỐI CÙNG & KHÓA BẢN VẼ THÀNH CÔNG!';
          break;
        default:
          successMsg = 'Cập nhật thành công!';
      }

      toast.success(successMsg);
      setReasonModalOpen(false);
      setModalOpen(false);
      fetchRequestsList();
    } catch (err) {
      console.error('Lỗi khi xử lý duyệt yêu cầu:', err);
      toast.error(err.response?.data?.message || 'Không thể xử lý yêu cầu');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <Clock className="h-3 w-3" />
            Chờ Owner duyệt
          </span>
        );
      case 'REQUEST_CHANGE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
            <AlertCircle className="h-3 w-3" />
            Cần chỉnh sửa
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            <CheckCircle2 className="h-3 w-3" />
            Đã duyệt sơ bộ
          </span>
        );
      case 'DESIGN_FINALIZED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            ĐÃ CHỐT THIẾT KẾ
          </span>
        );
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
            <CheckCircle2 className="h-3 w-3 text-stone-500" />
            Đã chuyển hợp đồng
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
            <XCircle className="h-3 w-3" />
            Đã từ chối
          </span>
        );
      default:
        return <span className="text-xs text-stone-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Thanh lọc & tìm kiếm */}
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã yêu cầu, tên khách, số điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-xs focus:border-amber-700 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white py-2 px-3 text-xs font-medium text-stone-700 focus:border-amber-700 focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ Owner duyệt</option>
            <option value="REQUEST_CHANGE">Cần chỉnh sửa</option>
            <option value="APPROVED">Đã duyệt sơ bộ</option>
            <option value="DESIGN_FINALIZED">Đã chốt thiết kế</option>
            <option value="CONVERTED">Đã chuyển hợp đồng</option>
            <option value="REJECTED">Đã từ chối</option>
          </select>
        </div>

        <button
          onClick={() => fetchRequestsList()}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Làm mới
        </button>
      </div>

      {/* Bảng danh sách yêu cầu */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-stone-200 bg-stone-50 font-semibold text-stone-700">
            <tr>
              <th className="px-4 py-3">Mã yêu cầu</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Số ĐT</th>
              <th className="px-4 py-3">Tiêu đề dự án</th>
              <th className="px-4 py-3 text-center">Số hạng mục</th>
              <th className="px-4 py-3 text-center">Ảnh thiết kế</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-stone-500">
                  <RotateCw className="mx-auto h-6 w-6 animate-spin text-amber-800" />
                  <p className="mt-2 text-xs">Đang tải danh sách yêu cầu thiết kế...</p>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-stone-500">
                  <ClipboardList className="mx-auto h-10 w-10 text-stone-300" />
                  <p className="mt-2 text-sm font-semibold text-stone-800">Không có yêu cầu thiết kế nào</p>
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.requestId} className="hover:bg-stone-50/70 transition">
                  <td className="px-4 py-3 font-mono font-bold text-amber-900">{r.requestCode}</td>
                  <td className="px-4 py-3 font-semibold text-stone-900">{r.customerName}</td>
                  <td className="px-4 py-3 text-stone-600">{r.customerPhone}</td>
                  <td className="px-4 py-3 text-stone-700">{r.title || 'Đơn hàng thiết kế'}</td>
                  <td className="px-4 py-3 text-center font-bold text-stone-800">
                    {r.itemCount || (r.items ? r.items.length : '1')} món
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.images && r.images.length > 0 ? (
                      <span className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        {r.images.length} ảnh
                      </span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(r.status)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleOpenDetail(r)}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-800 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-amber-900 transition"
                    >
                      <Eye className="h-3 w-3" />
                      Duyệt thiết kế
                    </button>
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
          itemLabel="yêu cầu"
          loading={loading}
        />
      </div>

      {/* ═════════════════════════════════════════════════════════
          MODAL DUYỆT CHI TIẾT THIẾT KẾ CỦA OWNER
          ═════════════════════════════════════════════════════════ */}
      {modalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-6 w-6 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold">
                    Thẩm duyệt Thiết kế Đơn hàng: #{selectedRequest.requestCode}
                  </h3>
                  <p className="text-xs text-stone-400">
                    Chủ xưởng (Owner) kiểm tra thông số kỹ thuật, hình ảnh bản vẽ và chốt thiết kế sản xuất
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6 space-y-5 text-xs text-stone-800">
              {/* Trạng thái hiện tại */}
              <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-stone-500 font-semibold">Trạng thái:</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                {selectedRequest.designFinalizedAt && (
                  <p className="text-[11px] text-emerald-800 font-semibold">
                    Đã chốt thiết kế lúc: {formatDate(selectedRequest.designFinalizedAt)}
                  </p>
                )}
              </div>

              {/* Thông tin khách hàng & dự án */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div>
                  <span className="text-stone-500">Khách hàng:</span>
                  <p className="font-bold text-stone-900 text-sm">{selectedRequest.customerName}</p>
                </div>
                <div>
                  <span className="text-stone-500">Số điện thoại:</span>
                  <p className="font-semibold text-stone-900">{selectedRequest.customerPhone}</p>
                </div>
                <div>
                  <span className="text-stone-500">Email:</span>
                  <p className="font-semibold text-stone-900">{selectedRequest.customerEmail || '—'}</p>
                </div>
                <div>
                  <span className="text-stone-500">Hạn hoàn thành:</span>
                  <p className="font-semibold text-stone-900">{formatDate(selectedRequest.expectedCompletionDate)}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-stone-500">Địa chỉ giao hàng:</span>
                  <p className="font-semibold text-stone-900">{selectedRequest.deliveryAddress || '—'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-stone-500">Ghi chú chung:</span>
                  <p className="font-medium text-stone-800">{selectedRequest.generalNote || selectedRequest.description || 'Không có ghi chú'}</p>
                </div>
              </div>

              {/* Danh sách hạng mục sản phẩm kỹ thuật */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5 text-xs">
                  <Package className="h-4 w-4 text-amber-800" />
                  Danh sách hạng mục may đo & Thông số kỹ thuật ({selectedRequest.items?.length || 0} món)
                </h4>
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left">
                    <thead className="border-b border-stone-200 bg-stone-100 text-[11px] font-bold text-stone-700">
                      <tr>
                        <th className="p-2.5">STT</th>
                        <th className="p-2.5">Sản phẩm / Danh mục</th>
                        <th className="p-2.5">Chất liệu & Màu sắc</th>
                        <th className="p-2.5">Kích thước (D x R x C cm)</th>
                        <th className="p-2.5 text-center">SL</th>
                        <th className="p-2.5">Yêu cầu & Ghi chú kỹ thuật</th>
                        <th className="p-2.5 text-right">Đơn giá ước tính</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {(selectedRequest.items || []).map((it, idx) => {
                        const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' x ');
                        return (
                          <tr key={it.requestItemId || idx} className="hover:bg-stone-50">
                            <td className="p-2.5 font-bold text-stone-500">#{idx + 1}</td>
                            <td className="p-2.5">
                              <p className="font-bold text-stone-900">{it.itemName || it.categoryName || 'Sản phẩm may đo'}</p>
                              {it.roomName && <p className="text-[10px] text-stone-500">{it.roomName}</p>}
                            </td>
                            <td className="p-2.5">
                              <p className="font-semibold text-stone-800">{it.materialName || 'Gỗ tự nhiên'}</p>
                              <p className="text-[10px] text-stone-500">{it.colorName || 'Màu tiêu chuẩn'}</p>
                            </td>
                            <td className="p-2.5 font-mono font-bold text-amber-900">
                              {dim ? `${dim} cm` : 'Tùy chỉnh'}
                            </td>
                            <td className="p-2.5 text-center font-bold text-stone-900">{it.quantity}</td>
                            <td className="p-2.5 text-stone-600 max-w-xs">
                              {it.customRequirements && (
                                <p><strong className="text-stone-700">Yêu cầu:</strong> {it.customRequirements}</p>
                              )}
                              {it.technicalNotes && (
                                <p className="text-amber-800"><strong className="text-stone-700">KT:</strong> {it.technicalNotes}</p>
                              )}
                              {!it.customRequirements && !it.technicalNotes && '—'}
                            </td>
                            <td className="p-2.5 text-right font-bold text-stone-900">{formatVND(it.unitPrice)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hình ảnh bản vẽ thiết kế */}
              {selectedRequest.images && selectedRequest.images.length > 0 && (
                <div>
                  <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5 text-xs">
                    <ImageIcon className="h-4 w-4 text-amber-800" />
                    Hình ảnh Bản vẽ & Phối cảnh 3D ({selectedRequest.images.length} ảnh)
                  </h4>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {selectedRequest.images.map((img, idx) => (
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
                          {img.itemIndex != null && ` • Món #${Number(img.itemIndex) + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer nút hành động của Owner */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100"
              >
                Đóng
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {/* Nút Yêu cầu sửa */}
                <button
                  type="button"
                  onClick={() => handleOpenReasonModal('REQUEST_CHANGE')}
                  className="rounded-lg border border-orange-300 bg-orange-50 px-3.5 py-2 font-bold text-orange-800 hover:bg-orange-100 transition"
                >
                  Yêu cầu Sales chỉnh sửa
                </button>

                {/* Nút Từ chối */}
                <button
                  type="button"
                  onClick={() => handleOpenReasonModal('REJECT')}
                  className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2 font-bold text-red-800 hover:bg-red-100 transition"
                >
                  Từ chối đơn
                </button>

                {/* Nút Duyệt sơ bộ */}
                {selectedRequest.status !== 'APPROVED' && selectedRequest.status !== 'DESIGN_FINALIZED' && (
                  <button
                    type="button"
                    onClick={() => handleExecuteReview('APPROVE')}
                    className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800 transition"
                  >
                    Duyệt thiết kế sơ bộ
                  </button>
                )}

                {/* NÚT CHỐT THIẾT KẾ CUỐI CÙNG (KHÓA THIẾT KẾ) */}
                {selectedRequest.status !== 'DESIGN_FINALIZED' && selectedRequest.status !== 'CONVERTED' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('XÁC NHẬN CHỐT THIẾT KẾ CUỐI CÙNG?\nSau khi chốt, thiết kế sẽ được khóa lại làm căn cứ pháp lý để lập Hợp đồng và Sản xuất. Sales và Leader không thể tự ý sửa đổi.')) {
                        handleExecuteReview('FINALIZE_DESIGN');
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2 font-bold text-white shadow-md hover:bg-emerald-800 transition"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    CHỐT THIẾT KẾ CUỐI CÙNG
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal nhập lý do chỉnh sửa / từ chối ──────────────── */}
      {reasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-900 px-5 py-3.5 text-white">
              <h3 className="font-bold text-sm">
                {reviewAction === 'REQUEST_CHANGE' ? 'Nhập lý do yêu cầu chỉnh sửa' : 'Nhập lý do từ chối đơn'}
              </h3>
              <button onClick={() => setReasonModalOpen(false)} className="rounded-lg p-1 text-stone-400 hover:bg-stone-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-stone-600">
                {reviewAction === 'REQUEST_CHANGE'
                  ? 'Vui lòng nêu rõ các điểm cần sửa về số đo, vật liệu gỗ, màu sơn hoặc bản vẽ thiết kế để nhân viên Sales cập nhật lại:'
                  : 'Vui lòng nêu rõ lý do từ chối nhận gia công đơn hàng này:'}
              </p>
              <textarea
                rows="4"
                required
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Nhập phản hồi chi tiết của Chủ xưởng..."
                className="w-full rounded-lg border border-stone-300 p-2.5 text-xs text-stone-900 focus:border-amber-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setReasonModalOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmittingReview || !reasonInput.trim()}
                onClick={() => handleExecuteReview(reviewAction, reasonInput)}
                className={`rounded-lg px-4 py-2 font-bold text-white disabled:opacity-50 ${
                  reviewAction === 'REQUEST_CHANGE' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSubmittingReview ? 'Đang gửi...' : 'Xác nhận gửi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
