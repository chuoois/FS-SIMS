// =========================================================
// financialReportController.js
// Controller cho Quản lý Báo cáo Tài chính (Manage Financial Reports — Owner)
// Tuân thủ MVC: gọi model & utils, không viết query SQL trực tiếp tại đây
// =========================================================

const financialReportModel = require('../models/financialReportModel');
const {
  validateFinancialReportQuery,
  toFinancialSummaryDTO,
  toFinancialOrderDTO,
  toFinancialReceiptDTO,
} = require('../utils/financialReportValidator');

function formatDateStr(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toISOString().slice(0, 10);
  }
  return String(val).slice(0, 10);
}

/**
 * 1. GET /api/financial-reports/summary
 * Lấy dữ liệu tổng hợp tài chính (KPIs, Biểu đồ, Cơ cấu loại đơn, Top sản phẩm)
 */
async function getFinancialSummary(req, res) {
  try {
    const validation = validateFinancialReportQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const { startDate, endDate, groupBy } = validation.value;
    const rawData = await financialReportModel.getFinancialSummaryData({
      startDate,
      endDate,
      groupBy,
    });

    const summary = toFinancialSummaryDTO(rawData);

    return res.status(200).json({
      message: 'Lấy dữ liệu tổng quan tài chính thành công',
      summary,
    });
  } catch (error) {
    console.error('[financialReportController.getFinancialSummary]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy báo cáo tài chính',
      error: error.message,
    });
  }
}

/**
 * 2. GET /api/financial-reports/orders
 * Lấy danh sách chi tiết đơn hàng phát sinh doanh thu (phân trang, lọc theo loại, trạng thái)
 */
async function getFinancialOrders(req, res) {
  try {
    const validation = validateFinancialReportQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const { startDate, endDate, page, limit } = validation.value;
    const { orderType, status } = req.query;

    const { orders, pagination } = await financialReportModel.getFinancialOrdersList({
      startDate,
      endDate,
      orderType,
      status,
      page,
      limit,
    });

    const dtoList = (orders || []).map(toFinancialOrderDTO).filter(Boolean);

    return res.status(200).json({
      message: 'Lấy danh sách chi tiết đơn hàng thành công',
      orders: dtoList,
      pagination,
    });
  } catch (error) {
    console.error('[financialReportController.getFinancialOrders]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách đơn hàng tài chính',
      error: error.message,
    });
  }
}

/**
 * 3. GET /api/financial-reports/receipts
 * Lấy danh sách chi tiết phiếu nhập nguyên vật liệu (phân trang, lọc theo trạng thái)
 */
async function getFinancialReceipts(req, res) {
  try {
    const validation = validateFinancialReportQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const { startDate, endDate, page, limit } = validation.value;
    const { status } = req.query;

    const { receipts, pagination } = await financialReportModel.getFinancialReceiptsList({
      startDate,
      endDate,
      status,
      page,
      limit,
    });

    const dtoList = (receipts || []).map(toFinancialReceiptDTO).filter(Boolean);

    return res.status(200).json({
      message: 'Lấy danh sách chi tiết phiếu nhập kho thành công',
      receipts: dtoList,
      pagination,
    });
  } catch (error) {
    console.error('[financialReportController.getFinancialReceipts]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách phiếu nhập kho',
      error: error.message,
    });
  }
}

/**
 * 4. GET /api/financial-reports/export
 * Lấy toàn bộ dữ liệu hoặc xuất trực tiếp file CSV có UTF-8 BOM
 */
async function exportFinancialReport(req, res) {
  try {
    const validation = validateFinancialReportQuery(req.query);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const { startDate, endDate } = validation.value;
    const { format } = req.query;

    const rawExport = await financialReportModel.getFinancialExportData({
      startDate,
      endDate,
    });

    const summaryDTO = toFinancialSummaryDTO(rawExport.summary);
    const ordersDTO = (rawExport.orders || []).map(toFinancialOrderDTO).filter(Boolean);
    const receiptsDTO = (rawExport.receipts || []).map(toFinancialReceiptDTO).filter(Boolean);

    if (format === 'csv') {
      // Xuất file CSV định dạng chuẩn Excel với UTF-8 BOM
      let csv = '\uFEFF'; // BOM cho tiếng Việt trên Excel
      csv += `BÁO CÁO TÀI CHÍNH XƯỞNG NỘI THẤT GÓC NHÀ\n`;
      csv += `Thời gian: Từ ${startDate} đến ${endDate}\n`;
      csv += `Ngày xuất báo cáo: ${new Date().toISOString().slice(0, 10)}\n\n`;

      csv += `1. TỔNG QUAN TÀI CHÍNH\n`;
      csv += `Chỉ số,Giá trị (VNĐ)\n`;
      csv += `Tổng doanh thu,${summaryDTO.metrics.totalRevenue}\n`;
      csv += `Thực thu (Đã thanh toán),${summaryDTO.metrics.paidRevenue}\n`;
      csv += `Công nợ phải thu,${summaryDTO.metrics.receivableAmount}\n`;
      csv += `Tổng chi phí nhập vật tư,${summaryDTO.metrics.totalCost}\n`;
      csv += `Lợi nhuận gộp ước tính,${summaryDTO.metrics.grossProfit}\n`;
      csv += `Tỷ suất lợi nhuận gộp,${summaryDTO.metrics.profitMargin}%\n\n`;

      csv += `2. CHI TIẾT DOANH THU ĐƠN HÀNG\n`;
      csv += `Mã đơn,Khách hàng,Số điện thoại,Loại đơn,Tổng tiền,Đã thu,Còn lại,Trạng thái,Ngày tạo\n`;
      ordersDTO.forEach((o) => {
        csv += `"${o.order_code}","${o.contact_name}","${o.contact_phone}","${o.order_type_label}",${o.total_amount},${o.paid_amount},${o.remaining_amount},"${o.status}","${formatDateStr(o.createdate)}"\n`;
      });
      csv += `\n`;

      csv += `3. CHI TIẾT CHI PHÍ NHẬP VẬT TƯ\n`;
      csv += `Mã phiếu,Nhà cung cấp,Ngày nhập,Tổng tiền,Trạng thái,Người nhận\n`;
      receiptsDTO.forEach((r) => {
        csv += `"${r.receipt_code}","${r.supplier_name}","${formatDateStr(r.receipt_date)}",${r.total_amount},"${r.status}","${r.received_by_name || ''}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="BaoCaoTaiChinh_${startDate}_${endDate}.csv"`
      );
      return res.status(200).send(csv);
    }

    // Mặc định trả JSON đầy đủ để frontend xuất Excel/PDF
    return res.status(200).json({
      message: 'Lấy dữ liệu xuất báo cáo tài chính thành công',
      exportData: {
        summary: summaryDTO,
        orders: ordersDTO,
        receipts: receiptsDTO,
      },
    });
  } catch (error) {
    console.error('[financialReportController.exportFinancialReport]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi xuất dữ liệu báo cáo tài chính',
      error: error.message,
    });
  }
}

module.exports = {
  getFinancialSummary,
  getFinancialOrders,
  getFinancialReceipts,
  exportFinancialReport,
};
