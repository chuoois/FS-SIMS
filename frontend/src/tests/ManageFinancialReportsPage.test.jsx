import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageFinancialReportsPage } from '../pages/owner-pages/ManageFinancialReportsPage';
import * as financialReportService from '../services/financialReportService';
import * as financialExportUtils from '../utils/financialExportUtils';

vi.mock('../services/financialReportService');
vi.mock('react-hot-toast', () => {
  const toastFn = vi.fn();
  toastFn.success = vi.fn();
  toastFn.error = vi.fn();
  return {
    default: toastFn,
    toast: toastFn,
  };
});

// Mock window.print & URL & HTMLAnchorElement.click cho JSDOM
if (typeof window !== 'undefined') {
  window.print = vi.fn();
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  window.URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = vi.fn();
}

describe('ManageFinancialReportsPage Component', () => {
  const mockSummary = {
    period: {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    },
    metrics: {
      totalRevenue: 100000000,
      paidRevenue: 80000000,
      receivableAmount: 20000000,
      totalCost: 35000000,
      grossProfit: 65000000,
      profitMargin: 65.0,
      ordersCount: 8,
      completedOrdersCount: 5,
      receiptsCount: 3,
    },
    revenueByOrderType: [
      {
        order_type: 'CUSTOM',
        type_name: 'Hàng đặt làm',
        orders_count: 3,
        total_revenue: 40000000,
        paid_revenue: 30000000,
      },
      {
        order_type: 'READY',
        type_name: 'Hàng sẵn có',
        orders_count: 5,
        total_revenue: 60000000,
        paid_revenue: 50000000,
      },
    ],
    timeline: [
      { period: '2026-10', revenue: 100000000, cost: 35000000, profit: 65000000 },
    ],
    topProducts: [
      { item_name: 'Bàn ăn gỗ sồi 6 người', quantity_sold: 5, total_revenue: 22500000 },
      { item_name: 'Tủ quần áo gỗ thông 2 cánh', quantity_sold: 2, total_revenue: 13600000 },
    ],
  };

  const mockOrders = [
    {
      order_id: 1,
      order_code: 'ORD-20261017-0001',
      order_type: 'READY',
      order_type_label: 'Hàng sẵn',
      contact_name: 'Phạm Minh Khách',
      contact_phone: '0900000011',
      total_amount: 11200000,
      deposit_amount: 5000000,
      paid_amount: 11200000,
      remaining_amount: 0,
      status: 'COMPLETED',
      createdate: '2026-10-17T10:00:00Z',
    },
    {
      order_id: 2,
      order_code: 'ORD-20261020-0002',
      order_type: 'CUSTOM',
      order_type_label: 'Hàng đặt làm',
      contact_name: 'Võ Thị Hoa',
      contact_phone: '0900000012',
      total_amount: 3500000,
      deposit_amount: 1500000,
      paid_amount: 1500000,
      remaining_amount: 2000000,
      status: 'IN_PRODUCTION',
      createdate: '2026-10-20T14:00:00Z',
    },
  ];

  const mockReceipts = [
    {
      receipt_id: 1,
      receipt_code: 'RCP-20261001-0001',
      supplier_id: 1,
      supplier_name: 'Gỗ Đức Thành',
      receipt_date: '2026-10-01',
      total_amount: 61000000,
      status: 'CONFIRMED',
      received_by_name: 'Trần Trưởng',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    financialReportService.getFinancialSummary.mockResolvedValue({
      message: 'OK',
      summary: mockSummary,
    });
    financialReportService.getFinancialOrders.mockResolvedValue({
      message: 'OK',
      orders: mockOrders,
      pagination: {
        totalItems: 2,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });
    financialReportService.getFinancialReceipts.mockResolvedValue({
      message: 'OK',
      receipts: mockReceipts,
      pagination: {
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });
    financialReportService.getFinancialExportData.mockResolvedValue({
      message: 'OK',
      exportData: {
        summary: mockSummary,
        orders: mockOrders,
        receipts: mockReceipts,
      },
    });
  });

  it('1. Hiển thị đúng tiêu đề trang, các nút xuất báo cáo và các thẻ KPI tài chính', async () => {
    render(<ManageFinancialReportsPage />);

    expect(screen.getByText('Báo Cáo Tài Chính')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xuất Excel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xuất PDF \/ In/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Làm mới/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Tổng doanh thu')).toBeInTheDocument();
      expect(screen.getByText('Thực thu (Đã thu)')).toBeInTheDocument();
      expect(screen.getByText('Khoản phải thu')).toBeInTheDocument();
      expect(screen.getByText('Chi phí nhập vật tư')).toBeInTheDocument();
      expect(screen.getByText('Lợi nhuận gộp')).toBeInTheDocument();
      expect(screen.getByText('Tỷ suất lợi nhuận')).toBeInTheDocument();

      // Kiểm tra giá trị hiển thị format tiền tệ
      expect(screen.getAllByText('100.000.000 đ').length).toBeGreaterThan(0);
      expect(screen.getAllByText('80.000.000 đ').length).toBeGreaterThan(0);
      expect(screen.getAllByText('20.000.000 đ').length).toBeGreaterThan(0);
      expect(screen.getAllByText('35.000.000 đ').length).toBeGreaterThan(0);
      expect(screen.getAllByText('65.000.000 đ').length).toBeGreaterThan(0);
      expect(screen.getAllByText('65%').length).toBeGreaterThan(0);
    });
  });

  it('2. Hiển thị phân tích cơ cấu doanh thu theo loại đơn (CUSTOM vs READY)', async () => {
    render(<ManageFinancialReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cơ Cấu Doanh Thu Theo Loại Đơn')).toBeInTheDocument();
      expect(screen.getAllByText('Hàng đặt làm').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Hàng sẵn có').length).toBeGreaterThan(0);
      expect(screen.getByText('40.000.000 đ')).toBeInTheDocument();
      expect(screen.getByText('60.000.000 đ')).toBeInTheDocument();
    });
  });

  it('3. Hiển thị danh sách chi tiết đơn hàng trong tab "Doanh Thu Đơn Hàng"', async () => {
    render(<ManageFinancialReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-20261017-0001')).toBeInTheDocument();
      expect(screen.getByText('Phạm Minh Khách')).toBeInTheDocument();
      expect(screen.getAllByText('11.200.000 đ').length).toBeGreaterThan(0);
      expect(screen.getByText('ORD-20261020-0002')).toBeInTheDocument();
      expect(screen.getByText('Võ Thị Hoa')).toBeInTheDocument();
    });
  });

  it('4. Chuyển tab sang "Chi Phí Nhập Vật Tư" hiển thị danh sách phiếu nhập', async () => {
    const user = userEvent.setup();
    render(<ManageFinancialReportsPage />);

    const receiptTabBtn = screen.getByRole('button', { name: /Chi Phí Nhập Vật Tư/i });
    await user.click(receiptTabBtn);

    await waitFor(() => {
      expect(financialReportService.getFinancialReceipts).toHaveBeenCalled();
      expect(screen.getByText('RCP-20261001-0001')).toBeInTheDocument();
      expect(screen.getByText('Gỗ Đức Thành')).toBeInTheDocument();
      expect(screen.getByText('61.000.000 đ')).toBeInTheDocument();
    });
  });

  it('5. Chuyển tab sang "Top Sản Phẩm Doanh Thu Cao" hiển thị các sản phẩm hàng đầu', async () => {
    const user = userEvent.setup();
    render(<ManageFinancialReportsPage />);

    const topProductsTabBtn = screen.getByRole('button', { name: /Top Sản Phẩm Doanh Thu Cao/i });
    await user.click(topProductsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn gỗ sồi 6 người')).toBeInTheDocument();
      expect(screen.getByText('Tủ quần áo gỗ thông 2 cánh')).toBeInTheDocument();
    });
  });

  it('6. Thay đổi preset thời gian gọi lại API với khoảng ngày mới', async () => {
    const user = userEvent.setup();
    render(<ManageFinancialReportsPage />);

    const thisYearBtn = screen.getByRole('button', { name: 'Năm nay' });
    await user.click(thisYearBtn);

    await waitFor(() => {
      expect(financialReportService.getFinancialSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.stringMatching(/^\d{4}-01-01$/),
        })
      );
    });
  });

  it('7. Bấm nút "Xuất Excel" gọi getFinancialExportData và tạo file download', async () => {
    const user = userEvent.setup();
    const exportExcelSpy = vi.spyOn(financialExportUtils, 'exportFinancialToExcel');

    render(<ManageFinancialReportsPage />);

    const exportBtn = screen.getByRole('button', { name: /Xuất Excel/i });
    await user.click(exportBtn);

    await waitFor(() => {
      expect(financialReportService.getFinancialExportData).toHaveBeenCalled();
      expect(exportExcelSpy).toHaveBeenCalled();
    });
  });

  it('8. Bấm nút "Xuất PDF / In" kích hoạt printFinancialReport', async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(financialExportUtils, 'printFinancialReport');

    render(<ManageFinancialReportsPage />);

    const printBtn = screen.getByRole('button', { name: /Xuất PDF \/ In/i });
    await user.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
    expect(window.print).toHaveBeenCalled();
  });
});
