// =========================================================
// financialReportValidator.js
// Validation & DTO chuyên biệt cho Báo cáo Tài chính (Owner Financial Reports)
// Thuộc utils/ -> Dễ unit test, hàm thuần không phụ thuộc DB/network
// =========================================================

/**
 * Kiểm tra định dạng ngày chuỗi YYYY-MM-DD
 */
function isValidDateString(dateStr) {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/**
 * Validate query params cho bộ lọc Báo cáo Tài chính
 * @param {object} query
 * @returns {{ isValid: boolean, error?: string, value?: object }}
 */
function validateFinancialReportQuery(query = {}) {
  let { startDate, endDate, groupBy, page, limit } = query;

  const now = new Date();
  const currentYear = now.getFullYear();

  // Mặc định từ đầu năm đến hôm nay nếu không truyền
  if (!startDate) {
    startDate = `${currentYear}-01-01`;
  } else if (!isValidDateString(startDate)) {
    return {
      isValid: false,
      error: 'startDate không hợp lệ. Định dạng yêu cầu: YYYY-MM-DD',
    };
  }

  if (!endDate) {
    endDate = now.toISOString().slice(0, 10);
  } else if (!isValidDateString(endDate)) {
    return {
      isValid: false,
      error: 'endDate không hợp lệ. Định dạng yêu cầu: YYYY-MM-DD',
    };
  }

  if (startDate > endDate) {
    return {
      isValid: false,
      error: 'startDate không thể lớn hơn endDate',
    };
  }

  const validGroupBys = ['day', 'month', 'year'];
  const normalizedGroupBy = groupBy && validGroupBys.includes(groupBy.toLowerCase())
    ? groupBy.toLowerCase()
    : 'month';

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  return {
    isValid: true,
    value: {
      startDate,
      endDate,
      groupBy: normalizedGroupBy,
      page: parsedPage,
      limit: parsedLimit,
    },
  };
}

/**
 * Tính toán các chỉ số tài chính tổng hợp từ raw revenue và cost
 */
function calculateFinancialMetrics(totalRevenue = 0, paidRevenue = 0, totalCost = 0) {
  const rev = Number(totalRevenue) || 0;
  const paid = Number(paidRevenue) || 0;
  const cost = Number(totalCost) || 0;

  const receivable = Math.max(0, rev - paid);
  const grossProfit = rev - cost;
  const profitMargin = rev > 0 ? Number(((grossProfit / rev) * 100).toFixed(2)) : 0;

  return {
    totalRevenue: rev,
    paidRevenue: paid,
    receivableAmount: receivable,
    totalCost: cost,
    grossProfit,
    profitMargin,
  };
}

/**
 * Chuyển đổi dữ liệu thống kê tổng hợp sang DTO
 */
function toFinancialSummaryDTO(data = {}) {
  const {
    totalRevenue = 0,
    paidRevenue = 0,
    totalCost = 0,
    ordersCount = 0,
    completedOrdersCount = 0,
    receiptsCount = 0,
    revenueByOrderType = [],
    timeline = [],
    topProducts = [],
    startDate,
    endDate,
  } = data;

  const metrics = calculateFinancialMetrics(totalRevenue, paidRevenue, totalCost);

  return {
    period: {
      startDate,
      endDate,
    },
    metrics: {
      ...metrics,
      ordersCount: Number(ordersCount) || 0,
      completedOrdersCount: Number(completedOrdersCount) || 0,
      receiptsCount: Number(receiptsCount) || 0,
    },
    revenueByOrderType: Array.isArray(revenueByOrderType)
      ? revenueByOrderType.map((item) => ({
          order_type: item.order_type || 'UNKNOWN',
          type_name: item.order_type === 'CUSTOM' ? 'Hàng đặt làm' : 'Hàng sẵn có',
          orders_count: Number(item.orders_count) || 0,
          total_revenue: Number(item.total_revenue) || 0,
          paid_revenue: Number(item.paid_revenue) || 0,
        }))
      : [],
    timeline: Array.isArray(timeline)
      ? timeline.map((t) => ({
          period: t.period,
          revenue: Number(t.revenue) || 0,
          cost: Number(t.cost) || 0,
          profit: (Number(t.revenue) || 0) - (Number(t.cost) || 0),
        }))
      : [],
    topProducts: Array.isArray(topProducts)
      ? topProducts.map((p) => ({
          item_name: p.item_name || 'Sản phẩm khác',
          quantity_sold: Number(p.quantity_sold) || 0,
          total_revenue: Number(p.total_revenue) || 0,
        }))
      : [],
  };
}

/**
 * Chuyển đổi dòng đơn hàng trong báo cáo tài chính
 */
function toFinancialOrderDTO(raw) {
  if (!raw) return null;
  const order = raw.toJSON ? raw.toJSON() : raw;

  const total = Number(order.total_amount) || 0;
  const paid = Number(order.paid_amount) || 0;
  const remaining = Math.max(0, total - paid);

  return {
    order_id: order.order_id,
    order_code: order.order_code,
    order_type: order.order_type,
    order_type_label: order.order_type === 'CUSTOM' ? 'Hàng đặt làm' : 'Hàng sẵn có',
    contact_name: order.contact_name,
    contact_phone: order.contact_phone,
    total_amount: total,
    deposit_amount: Number(order.deposit_amount) || 0,
    paid_amount: paid,
    remaining_amount: remaining,
    status: order.status,
    createdate: order.createdate,
    delivered_date: order.delivered_date,
  };
}

/**
 * Chuyển đổi dòng phiếu nhập trong báo cáo tài chính
 */
function toFinancialReceiptDTO(raw) {
  if (!raw) return null;
  const receipt = raw.toJSON ? raw.toJSON() : raw;

  return {
    receipt_id: receipt.receipt_id,
    receipt_code: receipt.receipt_code,
    supplier_id: receipt.supplier_id,
    supplier_name: receipt.supplier?.supplier_name || 'Nhà cung cấp khác',
    receipt_date: receipt.receipt_date,
    total_amount: Number(receipt.total_amount) || 0,
    status: receipt.status,
    received_by_name: receipt.receiver?.full_name || null,
    createdate: receipt.createdate,
  };
}

module.exports = {
  isValidDateString,
  validateFinancialReportQuery,
  calculateFinancialMetrics,
  toFinancialSummaryDTO,
  toFinancialOrderDTO,
  toFinancialReceiptDTO,
};

