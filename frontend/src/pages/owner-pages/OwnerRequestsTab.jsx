// =========================================================
// OwnerRequestsTab.jsx
// Tab Thẩm định Yêu cầu Thiết kế & May đo (Design Requests) cho Chủ xưởng (Owner)
//
// Quyền hạn độc quyền của Owner:
// 1. Xem toàn bộ yêu cầu may đo từ Sales (thông số kỹ thuật, bản vẽ ảnh)
// 2. Yêu cầu Sales chỉnh sửa bản vẽ/thông số (REQUEST_CHANGE + lý do)
// 3. Từ chối yêu cầu không khả thi (REJECT + lý do)
// 4. DUYỆT VÀ CHỐT THIẾT KẾ CUỐI CÙNG (FINALIZE_DESIGN - Khóa bản vẽ)
//    Chỉ khi Owner chốt, Sales mới đủ điều kiện chuyển thành Hợp đồng
// =========================================================

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  RotateCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  Calendar,
  Layers,
  User,
  Phone,
  Image as ImageIcon,
  Send,
  X,
  Maximize2,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getOwnerRequests,
  getOwnerRequestById,
  reviewOwnerRequest,
} from '../../services/orderManagementService';
import { TablePagination } from '../../components/common/TablePagination';

const formatVND = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

const getStatusBadge = (status) => {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          Chờ thẩm định
        </span>
      );
    case 'REQUEST_CHANGE':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-800">
          <AlertTriangle className="h-3 w-3" />
          Yêu cầu sửa
        </span>
      );
    case 'APPROVED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          Duyệt sơ bộ
        </span>
      );
    case 'DESIGN_FINALIZED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
          <Lock className="h-3 w-3" />
          Đã chốt thiết kế
        </span>
      );
    case 'CONVERTED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-3 w-3" />
          Đã lập hợp đồng
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
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
          {status}
        </span>
      );
  }
};

export const OwnerRequestsTab = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Modal Chi tiết & Thẩm định
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reviewAction, setReviewAction] = useState(null); // 'REQUEST_CHANGE' | 'REJECT' | 'FINALIZE_DESIGN' | 'APPROVE'
  const [reviewReason, setReviewReason] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        status: statusFilter,
        search: search.trim() || undefined,
      };
      const res = await getOwnerRequests(params);
      setRequests(res.requests || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Lỗi khi tải danh sách yêu cầu cho Owner:', err);
      toast.error('Không thể tải danh sách yêu cầu thiết kế.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenDetail = async (req) => {
    try {
      setSelectedRequest(req);
      setDetailModalOpen(true);
      setLoadingDetail(true);
      const res = await getOwnerRequestById(req.requestId);
      if (res.data) setSelectedRequest(res.data);
    } catch (err) {
      console.error('Lỗi tải chi tiết yêu cầu:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleExecuteReview = async (action) => {
    if (!selectedRequest) return;

    if ((action === 'REQUEST_CHANGE' || action === 'REJECT') && !reviewReason.trim()) {
      toast.error('Vui lòng cung cấp lý do để gửi cho Sales.');
      return;
    }

    try {
      setSubmittingReview(true);
      await reviewOwnerRequest(selectedRequest.requestId, {
        action,
        reason: reviewReason.trim() || undefined,
        note: reviewNote.trim() || undefined,
      });

      const actionText =
        action === 'FINALIZE_DESIGN'
          ? 'Đã CHỐT THIẾT KẾ CUỐI CÙNG (Khóa bản vẽ)! Sales có thể tiến hành lập hợp đồng.'
          : action === 'REQUEST_CHANGE'
          ? 'Đã gửi yêu cầu chỉnh sửa thiết kế cho Sales.'
          : action === 'APPROVE'
          ? 'Đã duyệt sơ bộ yêu cầu.'
          : 'Đã từ chối yêu cầu.';

      toast.success(actionText);
      setReviewAction(null);
      setReviewReason('');
      setReviewNote('');
      setDetailModalOpen(false);
      fetchRequests();
    } catch (err) {
      console.error('Lỗi thẩm định yêu cầu:', err);
      toast.error(err.response?.data?.message || 'Không thể cập nhật thẩm định.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Bộ lọc & Tìm kiếm ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm text-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã yêu cầu, tên khách, số điện thoại..."
            className="w-full rounded-lg border border-stone-200 pl-9 pr-4 py-2 text-xs focus:border-amber-800 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48 rounded-lg border border-stone-200 px-3 py-2 text-xs focus:border-amber-800 focus:outline-none bg-white font-medium"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ thẩm định</option>
            <option value="REQUEST_CHANGE">Cần chỉnh sửa</option>
            <option value="APPROVED">Đã duyệt sơ bộ</option>
            <option value="DESIGN_FINALIZED">Đã chốt thiết kế</option>
            <option value="CONVERTED">Đã lập HĐ</option>
            <option value="REJECTED">Đã từ chối</option>
          </select>
        </div>
      </div>

      {/* ── Bảng danh sách yêu cầu ── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-stone-200 bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="px-4 py-3">Mã yêu cầu</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3 text-center">Số món</th>
                <th className="px-4 py-3">Ngày gửi</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Thao tác thẩm định</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-stone-500">
                    <RotateCw className="mx-auto h-6 w-6 animate-spin text-amber-800" />
                    <p className="mt-2 text-xs">Đang tải danh sách yêu cầu...</p>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-stone-500">
                    <ClipboardList className="mx-auto h-10 w-10 text-stone-300" />
                    <p className="mt-2 text-sm font-semibold text-stone-800">
                      Chưa có yêu cầu thiết kế nào
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.requestId} className="hover:bg-stone-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-amber-900">
                      {r.requestCode}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-900">{r.customerName || r.contactName}</p>
                      <p className="text-[11px] text-stone-500">{r.customerPhone || r.contactPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                        {r.orderType === 'READY' ? 'Mẫu sẵn' : 'May đo (CUSTOM)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-stone-800">
                      {(r.items || []).length}
                    </td>
                    <td className="px-4 py-3 text-stone-600 font-mono">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleOpenDetail(r)}
                        className="inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-3 py-1 text-[11px] font-semibold text-amber-900 shadow-sm hover:bg-amber-50 transition"
                      >
                        <Eye className="h-3 w-3 text-amber-700" />
                        Thẩm định & Chốt
                      </button>
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
          currentCount={requests.length}
          itemsPerPage={limit}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          itemLabel="yêu cầu"
          loading={loading}
        />
      </div>

      {/* ── MODAL CHI TIẾT & THẨM ĐỊNH THIẾT KẾ CHO CHỦ XƯỞNG ── */}
      {detailModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-amber-800" />
                <h3 className="text-base font-bold text-stone-900">
                  Thẩm định bản vẽ & Yêu cầu thiết kế #{selectedRequest.requestCode}
                </h3>
              </div>
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  setReviewAction(null);
                }}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nội dung */}
            <div className="overflow-y-auto p-6 text-xs text-stone-800 space-y-4">
              {/* Trạng thái & Quyền hạn */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-stone-50">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-600">Trạng thái hiện tại:</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                {selectedRequest.status === 'DESIGN_FINALIZED' && (
                  <span className="text-[11px] font-bold text-purple-900 bg-purple-100 px-3 py-1 rounded-full">
                    ✓ Bản vẽ đã được bạn chốt và khóa thành công
                  </span>
                )}
              </div>

              {/* Thông tin khách */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                <div>
                  <span className="text-stone-500">Khách hàng:</span>
                  <p className="font-semibold text-stone-900">{selectedRequest.contactName || selectedRequest.customerName}</p>
                </div>
                <div>
                  <span className="text-stone-500">Số điện thoại:</span>
                  <p className="font-semibold text-stone-900">{selectedRequest.contactPhone || selectedRequest.customerPhone}</p>
                </div>
                <div>
                  <span className="text-stone-500">Ngày mong muốn:</span>
                  <p className="font-semibold text-stone-900">
                    {selectedRequest.expectedDate ? selectedRequest.expectedDate.split('T')[0] : 'Thỏa thuận'}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500">Loại đơn:</span>
                  <p className="font-semibold text-stone-900">
                    {selectedRequest.orderType === 'READY' ? 'Theo mẫu sẵn' : 'May đo (CUSTOM)'}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-4">
                  <span className="text-stone-500">Địa chỉ giao:</span>
                  <p className="font-semibold text-stone-900">{selectedRequest.deliveryAddress || '---'}</p>
                </div>
                {selectedRequest.description && (
                  <div className="col-span-2 md:col-span-4">
                    <span className="text-stone-500">Mô tả tổng quan:</span>
                    <p className="font-medium text-stone-900 italic mt-0.5">{selectedRequest.description}</p>
                  </div>
                )}
              </div>

              {/* Bảng sản phẩm & Kích thước kỹ thuật */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-amber-800" />
                  Danh sách sản phẩm & Thông số kích thước kỹ thuật
                </h4>
                <div className="rounded-xl border border-stone-200 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="px-3 py-2">Sản phẩm</th>
                        <th className="px-3 py-2">Kích thước (Dài × Rộng × Cao cm)</th>
                        <th className="px-3 py-2 text-center">SL</th>
                        <th className="px-3 py-2 text-right">Đơn giá ước tính</th>
                        <th className="px-3 py-2">Ghi chú kỹ thuật</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(selectedRequest.items || []).map((it, idx) => {
                        const dim = [it.lengthCm, it.widthCm, it.heightCm].filter(Boolean).join(' × ');
                        return (
                          <tr key={it.requestItemId || idx}>
                            <td className="px-3 py-2 font-semibold text-stone-900">
                              {it.itemName}
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-amber-900">
                              {dim ? `${dim} cm` : '---'}
                            </td>
                            <td className="px-3 py-2 text-center font-bold">{it.quantity}</td>
                            <td className="px-3 py-2 text-right font-medium">
                              {it.unitPrice ? formatVND(it.unitPrice) : '---'}
                            </td>
                            <td className="px-3 py-2 text-stone-600 italic">
                              {it.description || it.technicalNotes || '---'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hình ảnh thiết kế đính kèm */}
              {selectedRequest.images && selectedRequest.images.length > 0 && (
                <div>
                  <h4 className="font-bold text-stone-900 mb-2 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-amber-800" />
                    Bản vẽ & Hình ảnh thiết kế ({selectedRequest.images.length} ảnh)
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedRequest.images.map((img, idx) => {
                      const url = typeof img === 'string' ? img : img.imageUrl;
                      return (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-stone-200">
                          <img
                            src={url}
                            alt="Bản vẽ"
                            className="h-20 w-28 object-cover cursor-pointer hover:scale-105 transition"
                            onClick={() => setPreviewImg(url)}
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewImg(url)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form nhập lý do khi Owner bấm Yêu cầu sửa / Từ chối */}
              {reviewAction && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
                  <h4 className="font-bold text-amber-900">
                    {reviewAction === 'REQUEST_CHANGE'
                      ? 'Nhập lý do yêu cầu Sales chỉnh sửa bản vẽ / thông số:'
                      : reviewAction === 'REJECT'
                      ? 'Nhập lý do từ chối yêu cầu:'
                      : reviewAction === 'FINALIZE_DESIGN'
                      ? 'Ghi chú phê duyệt & chốt bản vẽ sản xuất:'
                      : 'Ghi chú duyệt sơ bộ:'}
                  </h4>
                  <textarea
                    rows="3"
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    placeholder={
                      reviewAction === 'REQUEST_CHANGE'
                        ? 'VD: Cần hạ chiều cao tủ từ 260cm xuống 250cm vì vướng dầm trần thạch cao.'
                        : 'Nhập nội dung phản hồi...'
                    }
                    className="w-full rounded-lg border border-amber-300 p-2.5 text-xs focus:border-amber-800 focus:outline-none bg-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewAction(null)}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 font-semibold text-stone-700"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteReview(reviewAction)}
                      disabled={submittingReview}
                      className="rounded-lg bg-amber-800 px-4 py-1.5 font-bold text-white shadow-sm hover:bg-amber-900 disabled:opacity-50"
                    >
                      {submittingReview ? 'Đang gửi...' : 'Xác nhận gửi'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal với các nút Thẩm định của Chủ xưởng */}
            <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setDetailModalOpen(false);
                  setReviewAction(null);
                }}
                className="rounded-lg border border-stone-200 bg-white px-4 py-2 font-semibold text-stone-700 hover:bg-stone-100 transition"
              >
                Đóng
              </button>

              {/* Các nút hành động thẩm định */}
              {selectedRequest.status !== 'CONVERTED' && selectedRequest.status !== 'REJECTED' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewAction('REJECT');
                      setReviewReason('');
                    }}
                    className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2 font-semibold text-red-700 hover:bg-red-100 transition"
                  >
                    Từ chối
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReviewAction('REQUEST_CHANGE');
                      setReviewReason('');
                    }}
                    className="rounded-lg border border-orange-300 bg-orange-50 px-3.5 py-2 font-semibold text-orange-800 hover:bg-orange-100 transition"
                  >
                    Yêu cầu chỉnh sửa
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Xác nhận CHỐT BẢN VẼ THIẾT KẾ CUỐI CÙNG? Sau khi chốt, bản vẽ sẽ bị KHÓA và chuyển Sales tiến hành lập Hợp đồng.')) {
                        handleExecuteReview('FINALIZE_DESIGN');
                      }
                    }}
                    disabled={submittingReview}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-800 px-5 py-2 font-bold text-white shadow-md hover:bg-purple-900 transition"
                  >
                    <Lock className="h-4 w-4" />
                    Chốt thiết kế (Khóa bản vẽ)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal phóng to ảnh */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewImg(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img src={previewImg} alt="Phóng to" className="max-h-[85vh] rounded-lg shadow-2xl object-contain" />
            <button
              onClick={() => setPreviewImg(null)}
              className="absolute -top-3 -right-3 rounded-full bg-white p-1 text-stone-800 shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerRequestsTab;
