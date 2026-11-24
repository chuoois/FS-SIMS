/* Tiện ích & hằng số dùng chung cho trang danh sách / chi tiết đơn hàng
 *
 * Trạng thái đồng bộ với database (db_2026_fssims):
 *   order_request  : PENDING, DRAFTING, DESIGNING, DESIGNED, CONFIRMED,
 *                    CONTRACT_CREATED, CONVERTED, REJECTED, CANCELLED
 *   customer_order : NEW, ASSIGNED, IN_PROGRESS, PENDING_APPROVAL,
 *                    READY_TO_DELIVER, COMPLETED, CANCELLED
 */

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
  /* order_request */
  PENDING: 'Chờ sale xử lý',
  DRAFTING: 'Chờ chủ thiết kế',
  DESIGNING: 'Chờ thiết kế',
  DESIGNED: 'Đã có bản vẽ',
  CONFIRMED: 'Đã xác nhận',
  CONTRACT_CREATED: 'Đã lập hợp đồng',
  CONVERTED: 'Đã tạo đơn hàng',
  REJECTED: 'Đã từ chối',
  /* customer_order */
  NEW: 'Mới tạo',
  CONFIRMED: 'Đã xác nhận',
  ASSIGNED: 'Đã giao thợ',
  IN_PRODUCTION: 'Đang gia công',
  IN_PROGRESS: 'Đang gia công',
  UNDER_INSPECTION: 'Chờ nghiệm thu',
  PENDING_APPROVAL: 'Chờ duyệt thành phẩm',
  READY_TO_DELIVER: 'Sẵn sàng giao',
  DELIVERING: 'Đang giao hàng',
  COMPLETED: 'Hoàn thành',
  /* dùng chung */
  CANCELLED: 'Đã hủy',
};

export const statusClasses = {
  PENDING: 'bg-amber-100 text-amber-800',
  DRAFTING: 'bg-amber-100 text-amber-800',
  DESIGNING: 'bg-blue-100 text-blue-800',
  DESIGNED: 'bg-violet-100 text-violet-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  CONTRACT_CREATED: 'bg-emerald-100 text-emerald-800',
  CONVERTED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  NEW: 'bg-amber-100 text-amber-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  IN_PRODUCTION: 'bg-blue-100 text-blue-800',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-800',
  UNDER_INSPECTION: 'bg-orange-100 text-orange-800',
  READY_TO_DELIVER: 'bg-violet-100 text-violet-800',
  DELIVERING: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

/* Nhóm trạng thái cho thanh lọc (giống các tab của Shopee) */
export const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả', statuses: null },
  {
    key: 'WAITING',
    label: 'Chờ xử lý',
    statuses: ['PENDING', 'DRAFTING', 'DESIGNING', 'DESIGNED', 'NEW'],
  },
  {
    key: 'PROCESSING',
    label: 'Đang thực hiện',
    statuses: [
      'CONFIRMED',
      'CONTRACT_CREATED',
      'CONVERTED',
      'ASSIGNED',
      'IN_PROGRESS',
      'IN_PRODUCTION',
      'PENDING_APPROVAL',
      'UNDER_INSPECTION',
    ],
  },
  { key: 'DELIVERING', label: 'Giao hàng', statuses: ['READY_TO_DELIVER', 'DELIVERING'] },
  { key: 'COMPLETED', label: 'Hoàn thành', statuses: ['COMPLETED'] },
  { key: 'CANCELLED', label: 'Đã hủy / từ chối', statuses: ['CANCELLED', 'REJECTED'] },
];

/* Thanh tiến trình ở trang chi tiết */
export const ORDER_STEPS = ['Tạo đơn', 'Chuẩn bị', 'Gia công', 'Sẵn sàng giao', 'Hoàn thành'];
export const REQUEST_STEPS = ['Gửi yêu cầu', 'Sale xác nhận', 'Lập hợp đồng', 'Tạo đơn hàng'];

const ORDER_STEP_INDEX = {
  NEW: 0,
  CONFIRMED: 1,
  ASSIGNED: 1,
  IN_PROGRESS: 2,
  IN_PRODUCTION: 2,
  PROCESSING: 2,
  PENDING_APPROVAL: 2,
  UNDER_INSPECTION: 2,
  READY_TO_DELIVER: 3,
  DELIVERING: 3,
  COMPLETED: 4,
};

const REQUEST_STEP_INDEX = {
  PENDING: 0,
  DRAFTING: 0,
  DESIGNING: 0,
  DESIGNED: 0,
  CONFIRMED: 1,
  CONTRACT_CREATED: 2,
  CONVERTED: 3,
};

/* Trả về { steps, current, allDone } hoặc null nếu đã hủy / từ chối */
export const getProgress = (status, isRequest) => {
  if (status === 'CANCELLED' || status === 'REJECTED') return null;
  const steps = isRequest ? REQUEST_STEPS : ORDER_STEPS;
  const map = isRequest ? REQUEST_STEP_INDEX : ORDER_STEP_INDEX;
  const fallback = steps.length - 1;
  const current = map[status] ?? (isRequest ? fallback : 0);
  const allDone = isRequest ? status === 'CONVERTED' : status === 'COMPLETED';
  return { steps, current, allDone };
};

/* Lời nhắn dễ hiểu cho khách theo từng trạng thái */
export const statusHints = {
  PENDING: 'Đang chờ sale tiếp nhận. Bạn không cần làm gì thêm.',
  DRAFTING: 'Yêu cầu đã được chuyển đến chủ cửa hàng để làm bản vẽ.',
  DESIGNING: 'Chủ cửa hàng đang thực hiện bản vẽ cho bạn.',
  DESIGNED: 'Bản vẽ đã hoàn thành. Sale sẽ liên hệ để xác nhận với bạn.',
  CONFIRMED: 'Đơn hàng hoặc yêu cầu đã được xác nhận và chuyển tiếp để thực hiện.',
  CONTRACT_CREATED: 'Hợp đồng đã được lập. Vui lòng liên hệ sale để ký.',
  CONVERTED: 'Yêu cầu đã được chuyển thành đơn hàng.',
  REJECTED: 'Yêu cầu này đã bị từ chối.',
  NEW: 'Đơn đã được tạo và chuyển đến cửa hàng để thực hiện.',
  ASSIGNED: 'Đơn đã được giao cho thợ, đang chờ bắt đầu gia công.',
  IN_PRODUCTION: 'Sản phẩm đang được gia công tại xưởng.',
  IN_PROGRESS: 'Sản phẩm đang được gia công.',
  UNDER_INSPECTION: 'Sản phẩm đã gia công xong, đang chờ nghiệm thu chất lượng.',
  PENDING_APPROVAL: 'Sản phẩm đã gia công xong, đang chờ cửa hàng kiểm tra.',
  READY_TO_DELIVER: 'Sản phẩm đã sẵn sàng, sale sẽ liên hệ để giao đến bạn.',
  DELIVERING: 'Đơn hàng đang trên đường giao đến bạn.',
  COMPLETED: 'Đơn hàng đã hoàn thành. Cảm ơn bạn đã tin tưởng Góc Nhà!',
  CANCELLED: 'Đơn hàng hoặc yêu cầu này đã bị hủy.',
};