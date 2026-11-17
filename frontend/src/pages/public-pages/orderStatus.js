/* Tiện ích & hằng số dùng chung cho trang danh sách / chi tiết đơn hàng */

export const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN').format(date);
};

export const statusNames = {
  NEW: 'Mới tạo',
  PENDING: 'Chờ sale xử lý',
  REVIEWING: 'Sale đang xem',
  REQUEST_CHANGE: 'Cần chỉnh sửa',
  QUOTED: 'Đã báo giá',
  APPROVED: 'Đã duyệt',
  CONTRACT_SIGNED: 'Đã ký hợp đồng',
  DESIGN_FINALIZED: 'Đã chốt thiết kế',
  CONFIRMED: 'Đã xác nhận',
  IN_PRODUCTION: 'Đang sản xuất',
  READY_TO_DELIVER: 'Sẵn sàng giao',
  DELIVERING: 'Đang giao hàng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  REJECTED: 'Đã từ chối',
};

export const statusClasses = {
  NEW: 'bg-amber-100 text-amber-800',
  PENDING: 'bg-amber-100 text-amber-800',
  REVIEWING: 'bg-blue-100 text-blue-800',
  REQUEST_CHANGE: 'bg-orange-100 text-orange-800',
  QUOTED: 'bg-violet-100 text-violet-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  CONTRACT_SIGNED: 'bg-emerald-100 text-emerald-800',
  DESIGN_FINALIZED: 'bg-emerald-100 text-emerald-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  IN_PRODUCTION: 'bg-blue-100 text-blue-800',
  READY_TO_DELIVER: 'bg-violet-100 text-violet-800',
  DELIVERING: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
};

/* Nhóm trạng thái cho thanh lọc (giống các tab của Shopee) */
export const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả', statuses: null },
  {
    key: 'WAITING',
    label: 'Chờ xử lý',
    statuses: ['NEW', 'PENDING', 'REVIEWING', 'REQUEST_CHANGE', 'QUOTED'],
  },
  {
    key: 'PROCESSING',
    label: 'Đang thực hiện',
    statuses: ['APPROVED', 'CONTRACT_SIGNED', 'DESIGN_FINALIZED', 'CONFIRMED', 'IN_PRODUCTION'],
  },
  { key: 'DELIVERING', label: 'Đang giao', statuses: ['READY_TO_DELIVER', 'DELIVERING'] },
  { key: 'COMPLETED', label: 'Hoàn thành', statuses: ['COMPLETED'] },
  { key: 'CANCELLED', label: 'Đã hủy / từ chối', statuses: ['CANCELLED', 'REJECTED'] },
];

/* Thanh tiến trình ở trang chi tiết */
export const ORDER_STEPS = ['Đặt hàng', 'Xác nhận', 'Sản xuất', 'Giao hàng', 'Hoàn thành'];
export const REQUEST_STEPS = ['Gửi yêu cầu', 'Sale xem xét', 'Báo giá', 'Đã duyệt'];

const ORDER_STEP_INDEX = {
  NEW: 0,
  PENDING: 0,
  REVIEWING: 0,
  REQUEST_CHANGE: 0,
  QUOTED: 0,
  APPROVED: 1,
  CONTRACT_SIGNED: 1,
  DESIGN_FINALIZED: 1,
  CONFIRMED: 1,
  IN_PRODUCTION: 2,
  READY_TO_DELIVER: 3,
  DELIVERING: 3,
  COMPLETED: 4,
};

const REQUEST_STEP_INDEX = {
  NEW: 0,
  PENDING: 0,
  REVIEWING: 1,
  REQUEST_CHANGE: 1,
  QUOTED: 2,
  APPROVED: 3,
};

/* Trả về { steps, current, allDone } hoặc null nếu đã hủy / từ chối */
export const getProgress = (status, isRequest) => {
  if (status === 'CANCELLED' || status === 'REJECTED') return null;
  const steps = isRequest ? REQUEST_STEPS : ORDER_STEPS;
  const map = isRequest ? REQUEST_STEP_INDEX : ORDER_STEP_INDEX;
  const fallback = steps.length - 1;
  const current = map[status] ?? (isRequest ? fallback : 0);
  const allDone = isRequest ? status === 'APPROVED' : status === 'COMPLETED';
  return { steps, current, allDone };
};

/* Lời nhắn dễ hiểu cho khách theo từng trạng thái */
export const statusHints = {
  NEW: 'Đơn đã được tạo. Sale sẽ sớm tiếp nhận.',
  PENDING: 'Đang chờ sale tiếp nhận. Bạn không cần làm gì thêm.',
  REVIEWING: 'Sale đang xem xét thông tin của bạn.',
  REQUEST_CHANGE: 'Sale đề nghị chỉnh sửa thông tin. Vui lòng liên hệ sale để cập nhật.',
  QUOTED: 'Sale đã gửi báo giá. Hãy kiểm tra giá bên dưới và phản hồi cho sale.',
  APPROVED: 'Đã được duyệt. Sale sẽ liên hệ các bước tiếp theo.',
  CONTRACT_SIGNED: 'Hợp đồng đã được ký.',
  DESIGN_FINALIZED: 'Thiết kế đã được chốt.',
  CONFIRMED: 'Đơn đã được xác nhận và chuẩn bị thực hiện.',
  IN_PRODUCTION: 'Sản phẩm đang được sản xuất.',
  READY_TO_DELIVER: 'Sản phẩm đã sẵn sàng, chờ giao đến bạn.',
  DELIVERING: 'Đơn đang trên đường giao đến bạn.',
  COMPLETED: 'Đơn hàng đã hoàn thành. Cảm ơn bạn đã tin tưởng Góc Nhà!',
  CANCELLED: 'Đơn hàng này đã bị hủy.',
  REJECTED: 'Yêu cầu này đã bị từ chối.',
};
