// =========================================================
// StatusBadge.jsx
// Thành phần hiển thị huy hiệu trạng thái (Status Badge) dùng chung
// Chuẩn hóa 100% theo bảng quy ước trạng thái trong AGENTS.md (FSSIMS)
// Hỗ trợ:
// - order_request: PENDING, DRAFTING, DESIGNING, DESIGNED, CONFIRMED, CONTRACT_CREATED, CONVERTED, REJECTED, CANCELLED
// - contract: DRAFT, SIGNED, CANCELLED
// - customer_order: NEW, ASSIGNED, IN_PROGRESS, PENDING_APPROVAL, READY_TO_DELIVER, COMPLETED, CANCELLED
// - production_order: ASSIGNED, IN_PROGRESS, SUBMITTED, COMPLETED, CANCELLED
// - material_receipt / material_issue / account
// =========================================================

import {
  Clock,
  CheckCircle2,
  XCircle,
  RotateCw,
  Truck,
  FileText,
  Hammer,
  AlertTriangle,
  Package,
} from 'lucide-react';

// ─── 1. Bảng cấu hình nhãn tiếng Việt & giao diện theo AGENTS.md ────

export const ORDER_REQUEST_STATUS_MAP = {
  PENDING: {
    label: 'Chờ xử lý',
    icon: Clock,
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  DRAFTING: {
    label: 'Đang phác thảo',
    icon: FileText,
    className: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  DESIGNING: {
    label: 'Chờ thiết kế',
    icon: RotateCw,
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  DESIGNED: {
    label: 'Đã có bản vẽ',
    icon: CheckCircle2,
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  CONTRACT_CREATED: {
    label: 'Đã tạo hợp đồng',
    icon: FileText,
    className: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  DRAFT: {
    label: 'Chờ ký hợp đồng',
    icon: Clock,
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  CONVERTED: {
    label: 'Đã chuyển đơn',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold',
  },
  REJECTED: {
    label: 'Từ chối',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: XCircle,
    className: 'bg-stone-100 text-stone-600 border-stone-200',
  },
};

export const CONTRACT_STATUS_MAP = {
  DRAFT: {
    label: 'Chờ ký hợp đồng',
    icon: Clock,
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  SIGNED: {
    label: 'Đã ký kết',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    icon: CheckCircle2,
    className: 'bg-blue-50 text-blue-800 border-blue-200 font-semibold',
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export const CUSTOMER_ORDER_STATUS_MAP = {
  NEW: {
    label: 'Đơn mới',
    icon: Clock,
    className: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  ASSIGNED: {
    label: 'Đã phân công',
    icon: Clock,
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  IN_PROGRESS: {
    label: 'Đang sản xuất',
    icon: RotateCw,
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  IN_PRODUCTION: {
    label: 'Đang sản xuất',
    icon: RotateCw,
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    icon: CheckCircle2,
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  PENDING_APPROVAL: {
    label: 'Chờ duyệt',
    icon: Clock,
    className: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  UNDER_INSPECTION: {
    label: 'Chờ nghiệm thu',
    icon: Clock,
    className: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  READY_TO_DELIVER: {
    label: 'Sẵn sàng giao',
    icon: Truck,
    className: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  DELIVERING: {
    label: 'Đang giao hàng',
    icon: Truck,
    className: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export const PRODUCTION_ORDER_STATUS_MAP = {
  ASSIGNED: {
    label: 'Đã giao việc',
    icon: Clock,
    className: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  IN_PROGRESS: {
    label: 'Đang gia công',
    icon: Hammer,
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  SUBMITTED: {
    label: 'Báo hoàn thành',
    icon: Clock,
    className: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  COMPLETED: {
    label: 'Đã nghiệm thu',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export const ACCOUNT_STATUS_MAP = {
  ACTIVE: {
    label: 'Đang hoạt động',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  INACTIVE: {
    label: 'Ngừng hoạt động',
    icon: XCircle,
    className: 'bg-stone-100 text-stone-600 border-stone-200',
  },
};

export const RECEIPT_STATUS_MAP = {
  DRAFT: {
    label: 'Phiếu nháp',
    icon: Clock,
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  CONFIRMED: {
    label: 'Đã nhập kho',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export const MATERIAL_ISSUE_STATUS_MAP = {
  DRAFT: {
    label: 'Phiếu nháp',
    icon: Clock,
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  CONFIRMED: {
    label: 'Đã xuất kho',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
  },
  CANCELLED: {
    label: 'Đã hủy',
    icon: XCircle,
    className: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

// ─── Base StatusBadge Component ───────────────────────────
function BaseStatusBadge({ cfg, fallbackValue, size = 'md', className = '' }) {
  const Icon = cfg?.icon;
  const label = cfg?.label || fallbackValue || '—';
  const badgeClass = cfg?.className || 'bg-stone-100 text-stone-700 border-stone-200';

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : size === 'lg'
        ? 'px-3 py-1 text-sm gap-1.5'
        : 'px-2.5 py-0.5 text-xs gap-1.5';

  const iconSizes =
    size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <span
      role="status"
      className={`inline-flex items-center rounded-full border font-semibold shadow-2xs ${badgeClass} ${sizeClasses} ${className}`}
    >
      {Icon && <Icon className={`${iconSizes} shrink-0`} aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
}

// ─── Các component chuyên biệt cho từng thực thể ───────────

export function OrderRequestStatusBadge({ status, size = 'md', className = '' }) {
  const cfg = ORDER_REQUEST_STATUS_MAP[status];
  return <BaseStatusBadge cfg={cfg} fallbackValue={status} size={size} className={className} />;
}

export function ContractStatusBadge({ status, size = 'md', className = '' }) {
  const cfg = CONTRACT_STATUS_MAP[status];
  return <BaseStatusBadge cfg={cfg} fallbackValue={status} size={size} className={className} />;
}

export function CustomerOrderStatusBadge({ status, size = 'md', className = '' }) {
  const cfg = CUSTOMER_ORDER_STATUS_MAP[status];
  return <BaseStatusBadge cfg={cfg} fallbackValue={status} size={size} className={className} />;
}

export function ProductionOrderStatusBadge({ status, size = 'md', className = '' }) {
  const cfg = PRODUCTION_ORDER_STATUS_MAP[status];
  return <BaseStatusBadge cfg={cfg} fallbackValue={status} size={size} className={className} />;
}

export function AccountStatusBadge({ status, size = 'md', className = '' }) {
  const cfg = ACCOUNT_STATUS_MAP[status];
  return <BaseStatusBadge cfg={cfg} fallbackValue={status} size={size} className={className} />;
}

export function ReceiptStatusBadge({ status, size = 'md', className = '' }) {
  const cfg = RECEIPT_STATUS_MAP[status];
  return <BaseStatusBadge cfg={cfg} fallbackValue={status} size={size} className={className} />;
}

export function MaterialIssueStatusBadge({ status, size = 'md', className = '' }) {
  const cfg = MATERIAL_ISSUE_STATUS_MAP[status];
  return <BaseStatusBadge cfg={cfg} fallbackValue={status} size={size} className={className} />;
}

// Thẻ đa năng nhận dạng type
export function StatusBadge({ type, status, size = 'md', className = '' }) {
  if (type === 'order_request') {
    return <OrderRequestStatusBadge status={status} size={size} className={className} />;
  }
  if (type === 'contract') {
    return <ContractStatusBadge status={status} size={size} className={className} />;
  }
  if (type === 'production_order') {
    return <ProductionOrderStatusBadge status={status} size={size} className={className} />;
  }
  if (type === 'account') {
    return <AccountStatusBadge status={status} size={size} className={className} />;
  }
  if (type === 'receipt' || type === 'material_receipt') {
    return <ReceiptStatusBadge status={status} size={size} className={className} />;
  }
  if (type === 'material_issue') {
    return <MaterialIssueStatusBadge status={status} size={size} className={className} />;
  }
  return <CustomerOrderStatusBadge status={status} size={size} className={className} />;
}

export default StatusBadge;
