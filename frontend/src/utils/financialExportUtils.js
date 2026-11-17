// =========================================================
// financialExportUtils.js
// Tiện ích xuất Báo cáo Tài chính ra file Excel (CSV UTF-8 BOM) và PDF (Print)
// =========================================================

/**
 * Format số tiền VND hiển thị
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0 đ';
  return `${Number(amount || 0).toLocaleString('vi-VN')} đ`;
};

function formatDateSafe(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toISOString().slice(0, 10);
  }
  return String(val).slice(0, 10);
}

/**
 * Xuất dữ liệu báo cáo tài chính ra file Excel (.csv với UTF-8 BOM chuẩn tiếng Việt)
 * @param {{ summary: object, orders: Array, receipts: Array }} exportData
 * @param {string} startDate
 * @param {string} endDate
 */
export function exportFinancialToExcel(exportData = {}, startDate = '', endDate = '') {
  const { summary = {}, orders = [], receipts = [] } = exportData;
  const metrics = summary.metrics || {};
  const revenueByOrderType = summary.revenueByOrderType || [];

  let csv = '\uFEFF'; // UTF-8 BOM để Excel không lỗi font tiếng Việt

  // Header công ty
  csv += `BÁO CÁO TÀI CHÍNH TỔNG HỢP — XƯỞNG NỘI THẤT GÓC NHÀ\n`;
  csv += `Kỳ báo cáo: Từ ${startDate || 'N/A'} đến ${endDate || 'N/A'}\n`;
  csv += `Ngày lập báo cáo: ${new Date().toLocaleDateString('vi-VN')}\n\n`;

  // 1. Chỉ số tổng quan
  csv += `1. CHỈ SỐ TÀI CHÍNH TỔNG HỢP\n`;
  csv += `Chỉ số,Giá trị (VNĐ),Ghi chú\n`;
  csv += `Tổng doanh thu bán hàng,${metrics.totalRevenue || 0},Tổng giá trị các đơn hàng hợp lệ\n`;
  csv += `Thực thu (Đã thanh toán),${metrics.paidRevenue || 0},Tiền khách hàng đã thanh toán\n`;
  csv += `Khoản phải thu (Công nợ),${metrics.receivableAmount || 0},Tiền khách còn nợ xưởng\n`;
  csv += `Tổng chi phí nhập vật tư,${metrics.totalCost || 0},Chi phí mua nguyên vật liệu từ NCC\n`;
  csv += `Lợi nhuận gộp ước tính,${metrics.grossProfit || 0},Doanh thu trừ Chi phí nhập vật tư\n`;
  csv += `Tỷ suất lợi nhuận gộp,${metrics.profitMargin || 0}%,Lợi nhuận gộp / Tổng doanh thu\n`;
  csv += `Tổng số đơn hàng,${metrics.ordersCount || 0},Đơn hàng trong kỳ\n`;
  csv += `Đơn hàng hoàn thành,${metrics.completedOrdersCount || 0},Đã giao xong\n`;
  csv += `Tổng số phiếu nhập vật tư,${metrics.receiptsCount || 0},Phiếu nhập đã xác nhận\n\n`;

  // 2. Doanh thu theo loại đơn hàng
  csv += `2. CƠ CẤU DOANH THU THEO LOẠI ĐƠN\n`;
  csv += `Phân loại đơn,Số lượng đơn,Tổng doanh thu (VNĐ),Đã thu (VNĐ)\n`;
  revenueByOrderType.forEach((item) => {
    csv += `"${item.type_name}",${item.orders_count || 0},${item.total_revenue || 0},${item.paid_revenue || 0}\n`;
  });
  csv += `\n`;

  // 3. Chi tiết đơn hàng
  csv += `3. DANH SÁCH CHI TIẾT ĐƠN HÀNG DOANH THU\n`;
  csv += `Mã đơn,Khách hàng,Số điện thoại,Phân loại,Tổng tiền (VNĐ),Đã thu (VNĐ),Còn nợ (VNĐ),Trạng thái,Ngày tạo\n`;
  orders.forEach((o) => {
    const createdStr = formatDateSafe(o.createdate);
    csv += `"${o.order_code}","${o.contact_name}","${o.contact_phone}","${o.order_type_label || o.order_type}",${o.total_amount || 0},${o.paid_amount || 0},${o.remaining_amount || 0},"${o.status}","${createdStr}"\n`;
  });
  csv += `\n`;

  // 4. Chi tiết phiếu nhập vật tư
  csv += `4. DANH SÁCH CHI TIẾT PHIẾU NHẬP NGUYÊN VẬT LIỆU (CHI PHÍ)\n`;
  csv += `Mã phiếu nhập,Nhà cung cấp,Ngày nhập,Tổng tiền (VNĐ),Trạng thái,Người tiếp nhận\n`;
  receipts.forEach((r) => {
    const receiptDateStr = formatDateSafe(r.receipt_date);
    csv += `"${r.receipt_code}","${r.supplier_name || ''}","${receiptDateStr}",${r.total_amount || 0},"${r.status}","${r.received_by_name || ''}"\n`;
  });

  // Tạo blob và kích hoạt download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `BaoCaoTaiChinh_GocNha_${startDate || 'start'}_${endDate || 'end'}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Kích hoạt in / xuất file PDF cho báo cáo tài chính
 */
export function printFinancialReport() {
  window.print();
}
