// =========================================================
// financialReportModel.js
// Model & Query Repository for Financial Reports (Owner)
// Tách biệt theo MVC, không viết query trực tiếp ở controller
// =========================================================

const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const { CustomerOrder } = require('./CustomerOrderModel');
const { CustomerOrderItem } = require('./CustomerOrderItemModel');
const { MaterialReceipt } = require('./MaterialReceiptModel');
const { Supplier } = require('./SupplierModel');
const { UserAccount } = require('./userAccount.model');

/**
 * Format an toàn date bất kể Date instance, string hay timestamp
 */
function toDateString(dateVal) {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '';
    return dateVal.toISOString().slice(0, 10);
  }
  return String(dateVal).slice(0, 10);
}

/**
 * Lấy dữ liệu tổng quan tài chính (Doanh thu, Chi phí vật tư, Lợi nhuận, Biểu đồ & Top sản phẩm)
 * @param {{ startDate: string, endDate: string, groupBy?: string }} params
 */
async function getFinancialSummaryData({ startDate, endDate, groupBy = 'month' }) {
  const startDateTime = `${startDate} 00:00:00`;
  const endDateTime = `${endDate} 23:59:59`;

  // 1. Lấy tất cả đơn hàng không bị hủy trong khoảng thời gian
  const orders = await CustomerOrder.findAll({
    where: {
      createdate: { [Op.between]: [startDateTime, endDateTime] },
      status: { [Op.ne]: 'CANCELLED' },
    },
    attributes: ['order_id', 'order_type', 'total_amount', 'paid_amount', 'status', 'createdate'],
    raw: true,
  });

  // 2. Lấy tất cả phiếu nhập nguyên vật liệu CONFIRMED trong khoảng thời gian
  const receipts = await MaterialReceipt.findAll({
    where: {
      receipt_date: { [Op.between]: [startDate, endDate] },
      status: 'CONFIRMED',
    },
    attributes: ['receipt_id', 'total_amount', 'status', 'receipt_date'],
    raw: true,
  });

  // 3. Tính toán tổng hợp từ danh sách orders
  let totalRevenue = 0;
  let paidRevenue = 0;
  let completedOrdersCount = 0;
  const orderTypeMap = {
    CUSTOM: { order_type: 'CUSTOM', orders_count: 0, total_revenue: 0, paid_revenue: 0 },
    READY: { order_type: 'READY', orders_count: 0, total_revenue: 0, paid_revenue: 0 },
  };

  orders.forEach((o) => {
    const total = Number(o.total_amount) || 0;
    const paid = Number(o.paid_amount) || 0;
    totalRevenue += total;
    paidRevenue += paid;

    if (o.status === 'COMPLETED') {
      completedOrdersCount += 1;
    }

    const typeKey = o.order_type === 'CUSTOM' ? 'CUSTOM' : 'READY';
    if (!orderTypeMap[typeKey]) {
      orderTypeMap[typeKey] = { order_type: typeKey, orders_count: 0, total_revenue: 0, paid_revenue: 0 };
    }
    orderTypeMap[typeKey].orders_count += 1;
    orderTypeMap[typeKey].total_revenue += total;
    orderTypeMap[typeKey].paid_revenue += paid;
  });

  // 4. Tính toán tổng hợp từ danh sách receipts
  let totalCost = 0;
  receipts.forEach((r) => {
    totalCost += Number(r.total_amount) || 0;
  });

  // 5. Gom nhóm timeline theo thời gian (tháng hoặc ngày)
  const timelineMap = {};
  const getPeriodKey = (dateVal) => {
    const s = toDateString(dateVal);
    if (!s) return 'N/A';
    return groupBy === 'day' ? s : s.slice(0, 7); // YYYY-MM hoặc YYYY-MM-DD
  };

  orders.forEach((o) => {
    const key = getPeriodKey(o.createdate);
    if (!timelineMap[key]) {
      timelineMap[key] = { period: key, revenue: 0, cost: 0 };
    }
    timelineMap[key].revenue += Number(o.total_amount) || 0;
  });

  receipts.forEach((r) => {
    const key = getPeriodKey(r.receipt_date);
    if (!timelineMap[key]) {
      timelineMap[key] = { period: key, revenue: 0, cost: 0 };
    }
    timelineMap[key].cost += Number(r.total_amount) || 0;
  });

  const timeline = Object.values(timelineMap).sort((a, b) => a.period.localeCompare(b.period));

  // 6. Top sản phẩm bán chạy theo doanh thu
  let topProducts = [];
  try {
    const topProductsRaw = await CustomerOrderItem.findAll({
      include: [
        {
          model: CustomerOrder,
          as: 'order',
          attributes: [],
          where: {
            createdate: { [Op.between]: [startDateTime, endDateTime] },
            status: { [Op.ne]: 'CANCELLED' },
          },
        },
      ],
      attributes: [
        'item_name',
        [fn('SUM', col('CustomerOrderItem.quantity')), 'quantity_sold'],
        [fn('SUM', literal('`CustomerOrderItem`.`quantity` * `CustomerOrderItem`.`unit_price`')), 'total_revenue'],
      ],
      group: ['CustomerOrderItem.item_name'],
      order: [[literal('total_revenue'), 'DESC']],
      limit: 5,
      raw: true,
    });
    topProducts = topProductsRaw || [];
  } catch (err) {
    console.error('[financialReportModel.topProducts]', err.message);
    topProducts = [];
  }

  return {
    startDate,
    endDate,
    totalRevenue,
    paidRevenue,
    totalCost,
    ordersCount: orders.length,
    completedOrdersCount,
    receiptsCount: receipts.length,
    revenueByOrderType: Object.values(orderTypeMap),
    timeline,
    topProducts,
  };
}

/**
 * Lấy danh sách đơn hàng cho bảng kê chi tiết doanh thu
 */
async function getFinancialOrdersList({
  startDate,
  endDate,
  orderType,
  status,
  page = 1,
  limit = 10,
}) {
  const startDateTime = `${startDate} 00:00:00`;
  const endDateTime = `${endDate} 23:59:59`;

  const where = {
    createdate: { [Op.between]: [startDateTime, endDateTime] },
  };

  if (orderType && ['CUSTOM', 'READY'].includes(orderType.toUpperCase())) {
    where.order_type = orderType.toUpperCase();
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  const offset = (page - 1) * limit;

  const { count, rows } = await CustomerOrder.findAndCountAll({
    where,
    order: [['createdate', 'DESC']],
    limit,
    offset,
  });

  return {
    orders: rows,
    pagination: {
      totalItems: count,
      totalPages: Math.ceil(count / limit) || 1,
      currentPage: page,
      itemsPerPage: limit,
    },
  };
}

/**
 * Lấy danh sách phiếu nhập kho cho bảng kê chi tiết chi phí vật tư
 */
async function getFinancialReceiptsList({
  startDate,
  endDate,
  status,
  page = 1,
  limit = 10,
}) {
  const where = {
    receipt_date: { [Op.between]: [startDate, endDate] },
  };

  if (status && status !== 'ALL') {
    where.status = status;
  }

  const offset = (page - 1) * limit;

  const include = [];
  if (typeof Supplier === 'function' && typeof Supplier.belongsTo === 'function') {
    include.push({
      model: Supplier,
      as: 'supplier',
      attributes: ['supplier_id', 'supplier_name', 'phone_number'],
    });
  }
  if (typeof UserAccount === 'function' && typeof UserAccount.belongsTo === 'function') {
    include.push({
      model: UserAccount,
      as: 'receiver',
      attributes: ['user_account_id', 'full_name'],
    });
  }

  const { count, rows } = await MaterialReceipt.findAndCountAll({
    where,
    include,
    order: [['receipt_date', 'DESC'], ['createdate', 'DESC']],
    limit,
    offset,
  });

  return {
    receipts: rows,
    pagination: {
      totalItems: count,
      totalPages: Math.ceil(count / limit) || 1,
      currentPage: page,
      itemsPerPage: limit,
    },
  };
}

/**
 * Lấy toàn bộ dữ liệu báo cáo tài chính để xuất file Excel/PDF (không phân trang)
 */
async function getFinancialExportData({ startDate, endDate }) {
  const startDateTime = `${startDate} 00:00:00`;
  const endDateTime = `${endDate} 23:59:59`;

  const summary = await getFinancialSummaryData({ startDate, endDate });

  const orders = await CustomerOrder.findAll({
    where: {
      createdate: { [Op.between]: [startDateTime, endDateTime] },
      status: { [Op.ne]: 'CANCELLED' },
    },
    order: [['createdate', 'DESC']],
  });

  const include = [];
  if (typeof Supplier === 'function' && typeof Supplier.belongsTo === 'function') {
    include.push({
      model: Supplier,
      as: 'supplier',
      attributes: ['supplier_id', 'supplier_name', 'phone_number'],
    });
  }
  if (typeof UserAccount === 'function' && typeof UserAccount.belongsTo === 'function') {
    include.push({
      model: UserAccount,
      as: 'receiver',
      attributes: ['user_account_id', 'full_name'],
    });
  }

  const receipts = await MaterialReceipt.findAll({
    where: {
      receipt_date: { [Op.between]: [startDate, endDate] },
      status: 'CONFIRMED',
    },
    include,
    order: [['receipt_date', 'DESC']],
  });

  return {
    summary,
    orders,
    receipts,
  };
}

module.exports = {
  toDateString,
  getFinancialSummaryData,
  getFinancialOrdersList,
  getFinancialReceiptsList,
  getFinancialExportData,
};
