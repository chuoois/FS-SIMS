// =========================================================
// financialReportValidator.test.js
// Unit tests cho financialReportValidator
// =========================================================

const {
  isValidDateString,
  validateFinancialReportQuery,
  calculateFinancialMetrics,
  toFinancialSummaryDTO,
  toFinancialOrderDTO,
  toFinancialReceiptDTO,
} = require('../src/utils/financialReportValidator');

describe('financialReportValidator - isValidDateString', () => {
  test('trả về true với chuỗi định dạng YYYY-MM-DD hợp lệ', () => {
    expect(isValidDateString('2026-10-31')).toBe(true);
    expect(isValidDateString('2026-01-01')).toBe(true);
  });

  test('trả về false với ngày không hợp lệ hoặc sai định dạng', () => {
    expect(isValidDateString('31-10-2026')).toBe(false);
    expect(isValidDateString('2026/10/31')).toBe(false);
    expect(isValidDateString('abc')).toBe(false);
    expect(isValidDateString(null)).toBe(false);
    expect(isValidDateString(undefined)).toBe(false);
  });
});

describe('financialReportValidator - validateFinancialReportQuery', () => {
  test('gán giá trị mặc định khi không truyền tham số', () => {
    const res = validateFinancialReportQuery({});
    expect(res.isValid).toBe(true);
    expect(res.value.startDate).toMatch(/^\d{4}-01-01$/);
    expect(res.value.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.value.groupBy).toBe('month');
    expect(res.value.page).toBe(1);
    expect(res.value.limit).toBe(10);
  });

  test('trả về lỗi khi startDate sai định dạng', () => {
    const res = validateFinancialReportQuery({ startDate: 'sai-dinh-dang' });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/startDate không hợp lệ/i);
  });

  test('trả về lỗi khi endDate sai định dạng', () => {
    const res = validateFinancialReportQuery({ endDate: '2026-13-40' });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/endDate không hợp lệ/i);
  });

  test('trả về lỗi khi startDate > endDate', () => {
    const res = validateFinancialReportQuery({
      startDate: '2026-12-01',
      endDate: '2026-11-01',
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/startDate không thể lớn hơn endDate/i);
  });

  test('chấp nhận query hợp lệ và chuẩn hóa groupBy, page, limit', () => {
    const res = validateFinancialReportQuery({
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      groupBy: 'DAY',
      page: '2',
      limit: '25',
    });
    expect(res.isValid).toBe(true);
    expect(res.value.startDate).toBe('2026-01-01');
    expect(res.value.endDate).toBe('2026-06-30');
    expect(res.value.groupBy).toBe('day');
    expect(res.value.page).toBe(2);
    expect(res.value.limit).toBe(25);
  });
});

describe('financialReportValidator - calculateFinancialMetrics', () => {
  test('tính toán chính xác doanh thu, công nợ, lợi nhuận gộp và tỷ suất lợi nhuận', () => {
    const metrics = calculateFinancialMetrics(100000000, 70000000, 40000000);
    expect(metrics.totalRevenue).toBe(100000000);
    expect(metrics.paidRevenue).toBe(70000000);
    expect(metrics.receivableAmount).toBe(30000000);
    expect(metrics.totalCost).toBe(40000000);
    expect(metrics.grossProfit).toBe(60000000);
    expect(metrics.profitMargin).toBe(60.0);
  });

  test('xử lý an toàn khi doanh thu bằng 0 hoặc giá trị null', () => {
    const metrics = calculateFinancialMetrics(0, 0, 1000000);
    expect(metrics.totalRevenue).toBe(0);
    expect(metrics.receivableAmount).toBe(0);
    expect(metrics.grossProfit).toBe(-1000000);
    expect(metrics.profitMargin).toBe(0);
  });
});

describe('financialReportValidator - toFinancialSummaryDTO', () => {
  test('chuyển đổi đầy đủ cấu trúc DTO cho báo cáo tổng quan', () => {
    const raw = {
      startDate: '2026-01-01',
      endDate: '2026-10-31',
      totalRevenue: 50000000,
      paidRevenue: 40000000,
      totalCost: 20000000,
      ordersCount: 5,
      completedOrdersCount: 3,
      receiptsCount: 2,
      revenueByOrderType: [
        { order_type: 'CUSTOM', orders_count: 2, total_revenue: 20000000, paid_revenue: 15000000 },
        { order_type: 'READY', orders_count: 3, total_revenue: 30000000, paid_revenue: 25000000 },
      ],
      timeline: [
        { period: '2026-09', revenue: 20000000, cost: 10000000 },
        { period: '2026-10', revenue: 30000000, cost: 10000000 },
      ],
      topProducts: [
        { item_name: 'Bàn ăn gỗ sồi', quantity_sold: 5, total_revenue: 22500000 },
      ],
    };

    const dto = toFinancialSummaryDTO(raw);
    expect(dto.period.startDate).toBe('2026-01-01');
    expect(dto.metrics.totalRevenue).toBe(50000000);
    expect(dto.metrics.grossProfit).toBe(30000000);
    expect(dto.metrics.profitMargin).toBe(60);
    expect(dto.revenueByOrderType).toHaveLength(2);
    expect(dto.revenueByOrderType[0].type_name).toBe('Hàng đặt làm');
    expect(dto.timeline).toHaveLength(2);
    expect(dto.timeline[0].profit).toBe(10000000);
    expect(dto.topProducts[0].item_name).toBe('Bàn ăn gỗ sồi');
  });
});

describe('financialReportValidator - toFinancialOrderDTO', () => {
  test('trả về null nếu raw là null hoặc undefined', () => {
    expect(toFinancialOrderDTO(null)).toBeNull();
  });

  test('chuyển đổi dữ liệu đơn hàng và tính remaining_amount', () => {
    const raw = {
      order_id: 1,
      order_code: 'ORD-001',
      order_type: 'CUSTOM',
      contact_name: 'Khách A',
      contact_phone: '0901112222',
      total_amount: 10000000,
      deposit_amount: 3000000,
      paid_amount: 5000000,
      status: 'IN_PRODUCTION',
      createdate: '2026-10-15T10:00:00Z',
    };

    const dto = toFinancialOrderDTO(raw);
    expect(dto.order_code).toBe('ORD-001');
    expect(dto.order_type_label).toBe('Hàng đặt làm');
    expect(dto.remaining_amount).toBe(5000000);
  });
});

describe('financialReportValidator - toFinancialReceiptDTO', () => {
  test('trả về null nếu raw là null', () => {
    expect(toFinancialReceiptDTO(null)).toBeNull();
  });

  test('chuyển đổi dữ liệu phiếu nhập kho', () => {
    const raw = {
      receipt_id: 2,
      receipt_code: 'RCP-002',
      supplier_id: 5,
      supplier: { supplier_name: 'Gỗ An Cường' },
      receipt_date: '2026-10-01',
      total_amount: 25000000,
      status: 'CONFIRMED',
      receiver: { full_name: 'Nguyễn Kho' },
    };

    const dto = toFinancialReceiptDTO(raw);
    expect(dto.receipt_code).toBe('RCP-002');
    expect(dto.supplier_name).toBe('Gỗ An Cường');
    expect(dto.received_by_name).toBe('Nguyễn Kho');
    expect(dto.total_amount).toBe(25000000);
  });
});

