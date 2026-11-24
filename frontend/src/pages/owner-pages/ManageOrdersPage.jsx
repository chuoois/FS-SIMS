// =========================================================
// ManageOrdersPage.jsx
// Quản lý Đơn hàng (Manage Orders) dành cho Chủ xưởng (Owner)
// Chức năng:
// 1. Xem danh sách đơn hàng (hàng sẵn & hàng đặt làm, tìm kiếm, lọc, phân trang)
// 2. Xem chi tiết đơn hàng (thông tin khách, sản phẩm, bản vẽ thiết kế, thanh toán)
// 3. Quản lý trạng thái đơn hàng tuần tự (Next Action Button):
//    Quy trình: Mới (NEW) -> Đã xác nhận (CONFIRMED) -> Đang xử lý (IN_PRODUCTION) -> Chờ nghiệm thu (UNDER_INSPECTION) -> Sẵn sàng giao (READY_TO_DELIVER) -> Hoàn thành (COMPLETED)
// 4. Hủy đơn hàng chưa hoàn thành
// Chuẩn hóa 100% theo FSSIMS Design System (Xưởng sản xuất đồ gỗ nội thất Góc Nhà)
// =========================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  RotateCw,
  Eye,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  Calendar,
  Layers,
  User,
  Phone,
  MapPin,
  CreditCard,
  Package,
  FileText,
  Hammer,
  Image as ImageIcon,
  FileUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { DesignGallery, isOwnerDesignImage } from '../../components/common/DesignGallery';
import {
  getOrders,
  getOrderDetail,
  cancelOrder as cancelOrderApi,
  updateOrderStatus as updateOrderStatusApi,
} from '../../services/orderManagementService';
import { TablePagination } from '../../components/common/TablePagination';
import { CustomerOrderStatusBadge } from '../../components/common/StatusBadge';
import {
  formatVND as formatCurrency,
  formatDateVN as formatDate,
  formatDateTimeVN as formatDateTime,
} from '../../utils/formatters';

// ─── Hằng số ──────────────────────────────────────────────
const STATUSES = [
  'ALL',
  'CONFIRMED',
  'IN_PRODUCTION',
  'UNDER_INSPECTION',
  'READY_TO_DELIVER',
  'DELIVERING',
  'COMPLETED',
  'CANCELLED',
];

const ORDER_TYPES = ['ALL', 'READY', 'CUSTOM'];

const STATUS_LABELS = {
  ALL: 'Tất cả đơn',
  NEW: 'Mới tạo',
  CONFIRMED: 'Đã xác nhận',
  IN_PRODUCTION: 'Đang gia công',
  UNDER_INSPECTION: 'Chờ nghiệm thu',
  READY_TO_DELIVER: 'Sẵn sàng giao',
  DELIVERING: 'Đang giao hàng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const ORDER_TYPE_LABELS = {
  READY: 'Hàng sẵn có',
  CUSTOM: 'Đặt làm theo mẫu',
};

// Cấu hình trạng thái kế tiếp trong quy trình tuần tự
const NEXT_STATUS_CONFIG = {
  NEW: {
    nextStatus: 'CONFIRMED',
    actionLabel: 'Tiếp nhận đơn',
    nextLabel: 'Đã xác nhận',
    buttonClass: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
    icon: CheckCircle2,
  },
  READY_TO_DELIVER: {
    nextStatus: 'COMPLETED',
    actionLabel: 'Xác nhận hoàn thành',
    nextLabel: 'Hoàn thành',
    buttonClass: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
    icon: CheckCircle2,
  },
};

// ─── Modal Chi tiết đơn hàng ──────────────────────────────
function OrderDetailModal({
  order,
  onClose,
  onAdvanceStatus,
  advanceLoadingId,
  onGoToProductionOrders,
}) {
  const [previewImg, setPreviewImg] = useState(null);
  if (!order) return null;
  const nextConfig = NEXT_STATUS_CONFIG[order.status];
  const NextIcon = nextConfig?.icon || CheckCircle2;
  const isAdvancing = advanceLoadingId === order.orderId;

  const totalOwnerDesigns =
    (order.items || []).reduce(
      (sum, it) => sum + (it.images || []).filter(isOwnerDesignImage).length,
      0
    ) + (order.images || []).filter(isOwnerDesignImage).length;
  const generalCustomerImgs = (order.images || []).filter((img) => !isOwnerDesignImage(img));
  const generalOwnerImgs = (order.images || []).filter(isOwnerDesignImage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-stone-200 my-8">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 sm:text-lg">
                Chi tiết đơn hàng — <span className="font-mono text-amber-900">{order.orderCode}</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-0.5">
                <span>Phân loại: {ORDER_TYPE_LABELS[order.orderType] || order.orderType}</span>
                {order.contractCode && <span>• Hợp đồng: <strong className="font-mono">{order.contractCode}</strong></span>}
                {order.requestCode && <span>• Yêu cầu: <strong className="font-mono">{order.requestCode}</strong></span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition focus-visible:outline-none"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung chi tiết */}
        <div className="max-h-[72vh] overflow-y-auto px-6 py-5 space-y-5">
          {/* Trạng thái & hành động kế tiếp */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4 border border-stone-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-stone-500">Trạng thái hiện tại:</span>
              <CustomerOrderStatusBadge status={order.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {nextConfig && (
                <button
                  type="button"
                  onClick={() => onAdvanceStatus(order)}
                  disabled={isAdvancing}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${nextConfig.buttonClass}`}
                  title={nextConfig.actionLabel}
                >
                  {isAdvancing ? (
                    <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <NextIcon className="h-3.5 w-3.5" />
                  )}
                  <span>{nextConfig.actionLabel}</span>
                </button>
              )}
              {order.status === 'CONFIRMED' && onGoToProductionOrders && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToProductionOrders(order);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-xs transition hover:bg-amber-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                  title="Chuyển sang trang Quản lý Lệnh Gia Công để giao việc cho thợ"
                >
                  <Hammer className="h-3.5 w-3.5" />
                  <span>Giao việc cho thợ</span>
                </button>
              )}
              {order.status === 'IN_PRODUCTION' && onGoToProductionOrders && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToProductionOrders(order);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-800 shadow-xs transition hover:bg-stone-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                  title="Xem tiến độ và lệnh gia công tại xưởng"
                >
                  <Hammer className="h-3.5 w-3.5" />
                  <span>Lệnh gia công</span>
                </button>
              )}
              {order.status === 'UNDER_INSPECTION' && onGoToProductionOrders && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToProductionOrders(order);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900 shadow-xs transition hover:bg-orange-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                  title="Kiểm tra ảnh thành phẩm và duyệt nghiệm thu chất lượng"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-orange-600" />
                  <span>Duyệt nghiệm thu</span>
                </button>
              )}
              <div className="flex items-center gap-2 text-xs text-stone-500">
                {order.expectedDate && (
                  <span className="font-medium text-stone-700">
                    Giao dự kiến: {formatDate(order.expectedDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Thông tin Khách hàng & Phụ trách */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cột 1: Thông tin khách hàng */}
            <div className="rounded-xl border border-stone-200 p-4 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <User className="h-4 w-4 text-amber-900" />
                Thông tin người nhận
              </h3>
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-stone-800 text-sm">{order.contactName}</p>
                <p className="text-stone-600 flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-stone-400" />
                  <span className="font-mono">{order.contactPhone}</span>
                </p>
                {order.deliveryAddress && (
                  <p className="text-stone-600 flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-stone-400 mt-0.5 shrink-0" />
                    <span>{order.deliveryAddress}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Cột 2: Phụ trách & Tiến độ */}
            <div className="rounded-xl border border-stone-200 p-4 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-amber-900" />
                Tiến độ & Giao nhận
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Nhân viên bán hàng:</span>
                  <span className="font-medium text-stone-800">{order.staffName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Giao dự kiến:</span>
                  <span className="text-stone-800 font-mono">{formatDate(order.expectedDate)}</span>
                </div>
                {order.deliveredDate && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Ngày giao thực tế:</span>
                    <span className="font-medium font-mono text-emerald-800">{formatDate(order.deliveredDate)}</span>
                  </div>
                )}
                {order.note && (
                  <div className="border-t border-stone-100 pt-1 text-stone-500">
                    <span className="font-medium text-stone-700">Ghi chú:</span> {order.note}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tóm tắt tài chính */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-amber-900" />
              Tình trạng thanh toán
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg bg-white p-3 border border-stone-200">
                <span className="text-stone-500 block mb-0.5">Tổng giá trị đơn</span>
                <span className="text-sm font-bold font-mono text-stone-900">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="rounded-lg bg-white p-3 border border-stone-200">
                <span className="text-stone-500 block mb-0.5">Tiền đặt cọc</span>
                <span className="text-sm font-semibold font-mono text-stone-800">{formatCurrency(order.depositAmount)}</span>
              </div>
              <div className="rounded-lg bg-white p-3 border border-stone-200">
                <span className="text-stone-500 block mb-0.5">Đã thanh toán</span>
                <span className="text-sm font-semibold font-mono text-emerald-800">{formatCurrency(order.paidAmount)}</span>
              </div>
              <div className="rounded-lg bg-white p-3 border border-stone-200">
                <span className="text-stone-500 block mb-0.5">Còn lại cần thu</span>
                <span className="text-sm font-bold font-mono text-rose-800">{formatCurrency(order.remainingAmount)}</span>
              </div>
            </div>
          </div>

          {/* Danh sách sản phẩm & Hồ sơ thiết kế trong đơn */}
          <div
            className={`rounded-xl p-4 space-y-4 ${
              order.orderType === 'CUSTOM'
                ? 'border border-amber-300 bg-amber-50/30'
                : 'border border-stone-200 bg-stone-50/30'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-amber-900" />
                Sản phẩm trong đơn ({(order.items || []).length})
              </h3>
              {totalOwnerDesigns > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã lưu {totalOwnerDesigns} bản vẽ xưởng
                </span>
              )}
            </div>

            {(order.items || []).length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400 bg-white rounded-xl border border-dashed border-stone-200">
                Không có sản phẩm nào trong đơn hàng này.
              </div>
            ) : (
              <div className="space-y-3.5">
                {order.items.map((item, idx) => {
                  const dim = [item.lengthCm, item.widthCm, item.heightCm].filter(Boolean).join(' × ');
                  const itemImages = Array.isArray(item.images) ? item.images : [];
                  const directCustomerImgs = itemImages.filter((img) => !isOwnerDesignImage(img));
                  const customerImgs = directCustomerImgs.length > 0 ? directCustomerImgs : generalCustomerImgs;
                  const ownerImgs = itemImages.filter(isOwnerDesignImage);
                  const isCustomItem = order.orderType === 'CUSTOM' || itemImages.length > 0;

                  return (
                    <div key={item.orderItemId || idx} className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2.5 border-b border-stone-100">
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-bold font-mono text-xs text-amber-900">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-stone-900 text-xs sm:text-sm">
                              {item.productName}
                              {item.productCode && (
                                <span className="ml-1.5 text-xs font-mono font-normal text-stone-500">
                                  ({item.productCode})
                                </span>
                              )}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-0.5">
                              <span>
                                Kích thước:{' '}
                                <strong className="text-stone-700 font-mono">
                                  {dim ? `${dim} cm` : 'Theo thiết kế'}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                SL: <strong className="text-stone-700 font-mono">{item.quantity}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Đơn giá: <strong className="text-stone-700 font-mono">{formatCurrency(item.unitPrice)}</strong>
                              </span>
                              {item.materialName && (
                                <>
                                  <span>•</span>
                                  <span>Chất liệu: <strong className="text-stone-700">{item.materialName}</strong></span>
                                </>
                              )}
                              {item.colorName && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1">
                                    Màu sắc:
                                    {item.colorHex && (
                                      <span
                                        className="inline-block h-2.5 w-2.5 rounded-full border border-stone-300"
                                        style={{ backgroundColor: item.colorHex }}
                                      />
                                    )}
                                    <strong className="text-stone-700">{item.colorName}</strong>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] text-stone-400 block">Thành tiền</span>
                          <span className="text-xs sm:text-sm font-bold font-mono text-amber-900">{formatCurrency(item.totalPrice)}</span>
                        </div>
                      </div>

                      {item.description && (
                        <div className="rounded-lg bg-stone-50 border border-stone-200 p-2.5 text-xs text-stone-700">
                          <span className="font-semibold text-stone-800 block mb-0.5">Mô tả quy cách kỹ thuật:</span>
                          <p className="whitespace-pre-line">{item.description}</p>
                        </div>
                      )}

                      {isCustomItem ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 space-y-2">
                            <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-stone-700">
                                  <ImageIcon className="h-3 w-3" />
                                </span>
                                <h5 className="text-xs font-semibold text-stone-900 uppercase tracking-wide">
                                  Ảnh mẫu khách gửi
                                </h5>
                              </div>
                              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-mono text-stone-800">
                                {customerImgs.length} ảnh
                              </span>
                            </div>
                            <DesignGallery
                              images={customerImgs}
                              badgeText={directCustomerImgs.length === 0 && customerImgs.length > 0 ? 'Khách gửi (Chung)' : 'Khách gửi'}
                              badgeClassName="bg-stone-700/90"
                              borderClassName="border-stone-200 hover:border-stone-400"
                              emptyText="Không có ảnh mẫu tham khảo."
                              emptyClassName="rounded-lg border border-dashed border-stone-200 bg-stone-50/60 p-3 text-center text-xs text-stone-500"
                              onPreview={setPreviewImg}
                            />
                          </div>

                          <div className="rounded-xl border border-amber-300 bg-amber-50/30 p-3 space-y-2">
                            <div className="flex items-center justify-between pb-1.5 border-b border-amber-200">
                              <div className="flex items-center gap-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-amber-900">
                                  <FileUp className="h-3 w-3" />
                                </span>
                                <h5 className="text-xs font-semibold text-amber-950 uppercase tracking-wide">
                                  Bản vẽ thiết kế của Chủ xưởng
                                </h5>
                              </div>
                              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-mono font-semibold text-amber-900">
                                {ownerImgs.length} bản vẽ
                              </span>
                            </div>
                            <DesignGallery
                              images={ownerImgs}
                              badgeText="Bản vẽ xưởng"
                              badgeClassName="bg-amber-900/90"
                              borderClassName="border-amber-300 hover:border-amber-500"
                              emptyText="Chưa có bản vẽ thiết kế từ Chủ xưởng."
                              emptyClassName="rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-3 text-center text-xs text-amber-800"
                              onPreview={setPreviewImg}
                            />
                          </div>
                        </div>
                      ) : (
                        item.imageUrl && (
                          <div className="flex items-center gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => setPreviewImg(item.imageUrl)}
                              className="group relative h-14 w-14 overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                              title="Xem ảnh sản phẩm"
                            >
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="h-full w-full object-cover transition group-hover:scale-105"
                              />
                            </button>
                            <span className="text-xs text-stone-500">Hình ảnh sản phẩm mẫu niêm yết</span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {generalOwnerImgs.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-white p-3.5 space-y-2">
                <h4 className="text-xs font-bold uppercase text-amber-950 flex items-center gap-1.5">
                  <FileUp className="h-4 w-4 text-amber-900" />
                  Bản vẽ thiết kế chung từ Chủ xưởng ({generalOwnerImgs.length})
                </h4>
                <DesignGallery
                  images={generalOwnerImgs}
                  badgeText="Bản vẽ xưởng"
                  badgeClassName="bg-amber-900/90"
                  borderClassName="border-amber-300 hover:border-amber-500"
                  emptyText=""
                  emptyClassName=""
                  onPreview={setPreviewImg}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-stone-200 px-6 py-4 bg-stone-50 rounded-b-2xl">
          <div>
            {nextConfig && (
              <button
                type="button"
                onClick={() => onAdvanceStatus(order)}
                disabled={isAdvancing}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 ${nextConfig.buttonClass}`}
                title={nextConfig.actionLabel}
              >
                {isAdvancing ? (
                  <RotateCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>{nextConfig.actionLabel}</span>
              </button>
            )}
            {order.status === 'CONFIRMED' && onGoToProductionOrders && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToProductionOrders(order);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 shadow-xs transition hover:bg-amber-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                title="Chuyển sang trang Quản lý Lệnh Gia Công để giao việc cho thợ"
              >
                <Hammer className="h-4 w-4" />
                <span>Giao việc cho thợ</span>
              </button>
            )}
            {order.status === 'IN_PRODUCTION' && onGoToProductionOrders && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToProductionOrders(order);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-100 px-4 py-2 text-xs font-semibold text-stone-800 shadow-xs transition hover:bg-stone-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                title="Xem tiến độ và lệnh gia công tại xưởng"
              >
                <Hammer className="h-4 w-4" />
                <span>Lệnh gia công</span>
              </button>
            )}
            {order.status === 'UNDER_INSPECTION' && onGoToProductionOrders && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToProductionOrders(order);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-900 shadow-xs transition hover:bg-orange-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
                title="Kiểm tra ảnh thành phẩm và duyệt nghiệm thu chất lượng"
              >
                <CheckCircle2 className="h-4 w-4 text-orange-600" />
                <span>Duyệt nghiệm thu</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Lightbox phóng to ảnh thiết kế */}
      {previewImg && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImg}
              alt="Phóng to bản vẽ thiết kế"
              className="max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImg(null)}
              aria-label="Đóng ảnh phóng to"
              className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-stone-800 shadow-xl hover:bg-stone-100 focus-visible:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dialog xác nhận Hủy đơn ─────────────────────────────
function CancelConfirmDialog({ order, loading, onConfirm, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-rose-100 p-2.5 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Xác nhận hủy đơn hàng</h2>
              <p className="text-xs text-stone-500">Mã đơn: <span className="font-mono">{order.orderCode}</span></p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-rose-50/50 p-3.5 border border-rose-200 text-xs space-y-1.5">
            <p className="text-stone-700">
              Bạn có chắc chắn muốn hủy đơn hàng{' '}
              <span className="font-bold font-mono text-rose-800">{order.orderCode}</span> của khách hàng{' '}
              <span className="font-semibold text-stone-900">{order.contactName}</span>?
            </p>
            <p className="text-stone-500">
              ⚠️ Hành động này sẽ chuyển trạng thái đơn hàng sang Đã hủy và không thể hoàn tác.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-stone-200 px-6 py-4 bg-stone-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs hover:bg-stone-50 transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            Không hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
          >
            {loading ? 'Đang hủy...' : 'Xác nhận hủy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Trang chính ManageOrdersPage ─────────────────────────
export function ManageOrdersPage() {
  // States danh sách
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Phân trang
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [orderTypeFilter, setOrderTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });

  // Modals & Action loading
  const [detailOrder, setDetailOrder] = useState(null);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [advanceLoadingId, setAdvanceLoadingId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Điều hướng sang trang Quản lý Lệnh Gia Công
  let navigate = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    navigate = useNavigate();
  } catch {
    navigate = null;
  }

  const handleGoToProductionOrders = (order) => {
    const targetUrl = `/owner/production-orders?orderId=${order.orderId}&orderCode=${encodeURIComponent(order.orderCode || '')}`;
    if (navigate) {
      navigate(targetUrl, {
        state: { orderId: order.orderId, orderCode: order.orderCode, autoCreate: true },
      });
    } else if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
      window.location.href = targetUrl;
    }
  };

  // ── Fetch danh sách ──────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrders({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        order_type: orderTypeFilter !== 'ALL' ? orderTypeFilter : undefined,
        page: currentPage,
        limit: pageSize,
      });
      setOrders(data.orders || []);
      if (data.pagination) setPagination(data.pagination);
    } catch (err) {
      console.error('Lỗi khi tải danh sách đơn hàng:', err);
      toast.error(err?.response?.data?.message || 'Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, orderTypeFilter, currentPage, pageSize]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Làm mới dữ liệu ──────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
    toast.success('Đã làm mới dữ liệu');
  };

  // ── Xóa bộ lọc ───────────────────────────────────────────
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setOrderTypeFilter('ALL');
    setCurrentPage(1);
  };

  // ── Xem chi tiết ─────────────────────────────────────────
  async function handleViewDetail(order) {
    try {
      const data = await getOrderDetail(order.orderId);
      setDetailOrder(data.order);
    } catch {
      setDetailOrder(order); // fallback với dữ liệu đã có
    }
  }

  // ── Hủy đơn ─────────────────────────────────────────────
  async function handleCancelConfirm() {
    if (!cancelOrder) return;
    setCancelLoading(true);
    try {
      await cancelOrderApi(cancelOrder.orderId);
      toast.success(`Đã hủy đơn hàng ${cancelOrder.orderCode}.`);
      setCancelOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không thể hủy đơn hàng.');
    } finally {
      setCancelLoading(false);
    }
  }

  // ── Chuyển sang trạng thái kế tiếp trong quy trình ───────
  const handleAdvanceStatus = async (order) => {
    const nextConfig = NEXT_STATUS_CONFIG[order.status];
    if (!nextConfig) return;

    setAdvanceLoadingId(order.orderId);
    try {
      await updateOrderStatusApi(order.orderId, { status: nextConfig.nextStatus });
      toast.success(
        `Đã chuyển trạng thái đơn hàng ${order.orderCode} sang "${nextConfig.nextLabel}".`
      );

      // Cập nhật ngay lập tức danh sách
      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o.orderId === order.orderId
            ? {
                ...o,
                status: nextConfig.nextStatus,
                statusLabel: nextConfig.nextLabel,
              }
            : o
        )
      );

      if (detailOrder && detailOrder.orderId === order.orderId) {
        setDetailOrder((prev) =>
          prev
            ? {
                ...prev,
                status: nextConfig.nextStatus,
                statusLabel: nextConfig.nextLabel,
              }
            : prev
        );
      }

      fetchOrders();
    } catch (err) {
      console.error('Lỗi khi chuyển trạng thái đơn hàng:', err);
      toast.error(err?.response?.data?.message || 'Không thể chuyển trạng thái đơn hàng.');
    } finally {
      setAdvanceLoadingId(null);
    }
  };

  // ── Tính thống kê nhanh ─────────────────────────────────
  const stats = useMemo(() => {
    const total = pagination.totalItems || orders.length;
    const confirmed = orders.filter((o) => o.status === 'CONFIRMED').length;
    const inProduction = orders.filter((o) => o.status === 'IN_PRODUCTION').length;
    const readyToDeliver = orders.filter((o) => o.status === 'READY_TO_DELIVER').length;
    const completed = orders.filter((o) => o.status === 'COMPLETED').length;
    const underInspection = orders.filter((o) => o.status === 'UNDER_INSPECTION').length;
    const delivering = orders.filter((o) => o.status === 'DELIVERING').length;
    const cancelled = orders.filter((o) => o.status === 'CANCELLED').length;
    return { total, confirmed, inProduction, readyToDeliver, completed, underInspection, delivering, cancelled };
  }, [pagination.totalItems, orders]);

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER & ACTION BUTTONS ───────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 sm:text-2xl">
            Quản Lý Đơn Hàng
          </h1>
          <p className="mt-1 text-xs text-stone-500 sm:text-sm">
            Theo dõi tiến độ gia công xưởng mộc, nghiệm thu chất lượng thành phẩm và điều phối giao hàng Góc Nhà.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
            title="Tải lại danh sách"
          >
            <RotateCw className={`h-3.5 w-3.5 text-stone-500 ${refreshing ? 'animate-spin text-amber-700' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 2. THỐNG KÊ TỔNG QUAN (4 CARDS) ───────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng số đơn hàng */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:border-stone-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Tổng đơn hàng</span>
            <div className="rounded-lg bg-stone-100 p-1.5 text-stone-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-stone-900 sm:text-2xl">
            {stats.total}
            <span className="ml-1.5 text-xs font-sans font-normal text-stone-400">đơn</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500">Toàn bộ đơn hàng phát sinh</div>
        </div>

        {/* Đã xác nhận */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-xs transition hover:border-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Đã xác nhận</span>
            <div className="rounded-lg bg-amber-100 p-1.5 text-amber-800">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-amber-900 sm:text-2xl">
            {stats.confirmed}
            <span className="ml-1.5 text-xs font-sans font-normal text-amber-700">đơn</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700">Chờ lập lệnh gia công xưởng</div>
        </div>

        {/* Đang xử lý xưởng */}
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:border-stone-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-600">Đang gia công</span>
            <div className="rounded-lg bg-stone-100 p-1.5 text-stone-700">
              <Hammer className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-stone-900 sm:text-2xl">
            {stats.inProduction}
            <span className="ml-1.5 text-xs font-sans font-normal text-stone-400">đơn</span>
          </div>
          <div className="mt-1 text-[11px] text-stone-500">Thợ mộc đang đóng tại xưởng</div>
        </div>

        {/* Hoàn thành */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-xs transition hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Đã hoàn thành</span>
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-emerald-900 sm:text-2xl">
            {stats.completed}
            <span className="ml-1.5 text-xs font-sans font-normal text-emerald-700">đơn</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">Khách đã nhận và quyết toán</div>
        </div>
      </section>

      {/* ── 3. BỘ LỌC & TÌM KIẾM ─────────────────────────────── */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-4">
        {/* Tabs trạng thái đơn hàng */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 pb-3">
          {[
            { key: 'ALL', label: 'Tất cả đơn', count: stats.total },
            { key: 'CONFIRMED', label: 'Đã xác nhận', count: stats.confirmed },
            { key: 'IN_PRODUCTION', label: 'Đang gia công', count: stats.inProduction },
            { key: 'UNDER_INSPECTION', label: 'Chờ nghiệm thu', count: stats.underInspection },
            { key: 'READY_TO_DELIVER', label: 'Sẵn sàng giao', count: stats.readyToDeliver },
            { key: 'DELIVERING', label: 'Đang giao hàng', count: stats.delivering },
            { key: 'COMPLETED', label: 'Hoàn thành', count: stats.completed },
            { key: 'CANCELLED', label: 'Đã hủy', count: stats.cancelled },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setCurrentPage(1);
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

        {/* Thanh tìm kiếm & lọc loại đơn */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, tên khách hàng, số điện thoại..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-9 text-xs text-stone-900 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 focus-visible:outline-none"
                title="Xóa từ khóa"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Lọc loại đơn */}
            <div className="w-full sm:w-52">
              <select
                aria-label="Lọc theo loại đơn hàng"
                value={orderTypeFilter}
                onChange={(e) => {
                  setOrderTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-stone-300 bg-white py-2 px-3 text-xs text-stone-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
              >
                {ORDER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === 'ALL' ? 'Tất cả loại đơn' : ORDER_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            {/* Nút Xóa bộ lọc */}
            {(search || statusFilter !== 'ALL' || orderTypeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── 4. BẢNG DANH SÁCH ĐƠN HÀNG ───────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
            <thead className="bg-stone-50 font-semibold text-stone-700">
              <tr>
                <th className="py-3 pl-4 pr-3 sm:pl-6">Mã đơn</th>
                <th className="px-3 py-3">Loại đơn</th>
                <th className="px-3 py-3">Khách hàng</th>
                <th className="px-3 py-3">Phụ trách</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
                <th className="px-3 py-3 text-right">Tổng tiền</th>
                <th className="py-3 pl-3 pr-4 text-center sm:pr-6">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="h-5 w-5 animate-spin text-amber-700" />
                      <span>Đang tải danh sách đơn hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ClipboardList className="h-9 w-9 text-stone-300" />
                      <p className="font-semibold text-stone-700 text-sm">Không có đơn hàng nào</p>
                      <p className="text-xs text-stone-400">
                        Chưa có đơn hàng nào thỏa mãn điều kiện lọc.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const nextConfig = NEXT_STATUS_CONFIG[order.status];
                  const NextIcon = nextConfig?.icon || CheckCircle2;
                  const isAdvancing = advanceLoadingId === order.orderId;
                  const canCancel = order.status !== 'COMPLETED' && order.status !== 'CANCELLED';

                  return (
                    <tr key={order.orderId} className="transition hover:bg-stone-50/70">
                      {/* Mã đơn */}
                      <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(order)}
                          className="font-mono font-semibold text-amber-900 hover:underline hover:text-amber-950 focus-visible:outline-none"
                        >
                          {order.orderCode}
                        </button>
                      </td>

                      {/* Loại đơn */}
                      <td className="whitespace-nowrap px-3 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold border ${
                            order.orderType === 'CUSTOM'
                              ? 'bg-amber-100 text-amber-900 border-amber-200'
                              : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {ORDER_TYPE_LABELS[order.orderType] || order.orderType}
                        </span>
                      </td>

                      {/* Khách hàng */}
                      <td className="px-3 py-3">
                        <div className="font-medium text-stone-800 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          <span>{order.contactName}</span>
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-stone-400" />
                          <span>{order.contactPhone}</span>
                        </div>
                      </td>

                      {/* Phụ trách */}
                      <td className="whitespace-nowrap px-3 py-3">
                        {order.staffName ? (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-800 border border-stone-200">
                            <Hammer className="h-3 w-3 text-amber-900 shrink-0" />
                            <span>{order.staffName}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-stone-400 italic">
                            Chưa phân công
                          </span>
                        )}
                      </td>

                      {/* Trạng thái hiện tại */}
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <CustomerOrderStatusBadge status={order.status} />
                      </td>

                      {/* Tổng tiền & Còn nợ */}
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <div className="font-bold font-mono text-stone-900">
                          {formatCurrency(order.totalAmount)}
                        </div>
                        {order.remainingAmount > 0 ? (
                          <div className="text-[11px] font-mono text-rose-700 mt-0.5">
                            Còn nợ: {formatCurrency(order.remainingAmount)}
                          </div>
                        ) : (
                          <div className="text-[11px] font-medium text-emerald-700 mt-0.5">
                            Đã thanh toán đủ
                          </div>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="whitespace-nowrap py-3 pl-3 pr-4 text-center sm:pr-6">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* 1. Nếu có cấu hình trạng thái kế tiếp (NEW hoặc READY_TO_DELIVER) */}
                          {nextConfig && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(order)}
                              disabled={isAdvancing}
                              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900 ${nextConfig.buttonClass}`}
                              title={nextConfig.actionLabel}
                            >
                              {isAdvancing ? (
                                <RotateCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <NextIcon className="h-3 w-3" />
                              )}
                              <span>{nextConfig.actionLabel}</span>
                            </button>
                          )}

                          {/* 2. Nếu đơn đã tiếp nhận CONFIRMED: Giao việc cho thợ */}
                          {order.status === 'CONFIRMED' && (
                            <button
                              type="button"
                              onClick={() => handleGoToProductionOrders(order)}
                              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-xs transition hover:bg-amber-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                              title="Chuyển sang trang Quản lý Lệnh Gia Công để giao việc cho thợ"
                            >
                              <Hammer className="h-3 w-3" />
                              <span>Giao việc cho thợ</span>
                            </button>
                          )}

                          {/* 3. Nếu đơn đang gia công IN_PRODUCTION: Lệnh gia công */}
                          {order.status === 'IN_PRODUCTION' && (
                            <button
                              type="button"
                              onClick={() => handleGoToProductionOrders(order)}
                              className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-800 shadow-xs transition hover:bg-stone-200 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                              title="Xem tiến độ và lệnh gia công tại xưởng"
                            >
                              <Hammer className="h-3 w-3" />
                              <span>Lệnh gia công</span>
                            </button>
                          )}

                          {/* 4. Nếu đơn chờ nghiệm thu UNDER_INSPECTION: Duyệt nghiệm thu */}
                          {order.status === 'UNDER_INSPECTION' && (
                            <button
                              type="button"
                              onClick={() => handleGoToProductionOrders(order)}
                              className="inline-flex items-center gap-1 rounded-md border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-900 shadow-xs transition hover:bg-orange-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                              title="Kiểm tra ảnh thành phẩm và duyệt nghiệm thu chất lượng"
                            >
                              <CheckCircle2 className="h-3 w-3 text-orange-600" />
                              <span>Duyệt nghiệm thu</span>
                            </button>
                          )}

                          {/* Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleViewDetail(order)}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-xs transition hover:bg-stone-50 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                            title="Xem chi tiết đơn hàng"
                          >
                            <Eye className="h-3 w-3 text-stone-400" />
                            <span>Chi tiết</span>
                          </button>

                          {/* Hủy đơn hàng */}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => setCancelOrder(order)}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 shadow-xs transition hover:bg-rose-100 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-900"
                              title="Hủy đơn hàng này"
                            >
                              <Ban className="h-3 w-3" />
                              <span>Hủy</span>
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

        {/* Phân trang TablePagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          currentCount={orders.length}
          itemsPerPage={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          itemLabel="đơn hàng"
          loading={loading}
        />
      </div>

      {/* ── Modals ── */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onAdvanceStatus={handleAdvanceStatus}
          advanceLoadingId={advanceLoadingId}
          onGoToProductionOrders={handleGoToProductionOrders}
        />
      )}

      {cancelOrder && (
        <CancelConfirmDialog
          order={cancelOrder}
          loading={cancelLoading}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelOrder(null)}
        />
      )}
    </div>
  );
}

export default ManageOrdersPage;
