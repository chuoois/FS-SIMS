import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageFinancialReportsPage } from '../pages/owner-pages/ManageFinancialReportsPage';
import * as financialReportService from '../services/financialReportService';
import * as financialExportUtils from '../utils/financialExportUtils';

vi.mock('../services/financialReportService');
vi.mock('../utils/financialExportUtils', () => ({
  formatCurrency: (val) => `${Number(val || 0).toLocaleString('vi-VN')} ₫`,
  exportFinancialToExcel: vi.fn(),
  printFinancialReport: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ManageFinancialReportsPage Component', () => {
  const mockSummary = {
    metrics: {
      totalRevenue: 150000000,
      paidRevenue: 100000000,
      receivableAmount: 50000000,
      totalCost: 60000000,
      grossProfit: 90000000,
      profitMargin: 60,
      ordersCount: 15,
      completedOrdersCount: 10,
      receiptsCount: 5,
    },
    revenueByOrderType: [
      {
        order_type: 'CUSTOM',
        type_name: 'Hàng đặt làm (Custom)',
        orders_count: 10,
        total_revenue: 100000000,
        paid_revenue: 70000000,
      },
      {
        order_type: 'READY',
        type_name: 'Hàng sẵn có (Ready)',
        orders_count: 5,
        total_revenue: 50000000,
        paid_revenue: 30000000,
      },
    ],
    timeline: [
      {
        period: '2026-11-20',
        revenue: 50000000,
        cost: 20000000,
        profit: 30000000,
      },
    ],
    topProducts: [
      {
        item_name: 'Bàn họp gỗ sồi Bắc Mỹ 3m2',
        quantity_sold: 4,
        total_revenue: 48000000,
      },
      {
        item_name: 'Tủ quần áo gỗ gõ đỏ 4 cánh',
        quantity_sold: 2,
        total_revenue: 40000000,
      },
    ],
  };

  const mockOrders = [
    {
      order_id: 101,
      order_code: 'ORD-202611-001',
      contact_name: 'Trần Văn Long',
      contact_phone: '0912345678',
      order_type: 'CUSTOM',
      order_type_label: 'Hàng đặt làm',
      total_amount: 35000000,
      paid_amount: 25000000,
      remaining_amount: 10000000,
      status: 'CONFIRMED',
      createdate: '2026-11-20T10:00:00Z',
    },
  ];

  const mockReceipts = [
    {
      receipt_id: 201,
      receipt_code: 'REC-202611-001',
      supplier_name: 'Công ty Gỗ Nam Thành',
      receipt_date: '2026-11-15T09:00:00Z',
      total_amount: 25000000,
      status: 'CONFIRMED',
      received_by_name: 'Nguyễn Văn Kho',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    financialReportService.getFinancialSummary.mockResolvedValue({
      summary: mockSummary,
    });
    financialReportService.getFinancialOrders.mockResolvedValue({
      orders: mockOrders,
      pagination: {
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });
    financialReportService.getFinancialReceipts.mockResolvedValue({
      receipts: mockReceipts,
      pagination: {
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });
  });

  it('renders header, title and description matching FSSIMS design system', async () => {
    render(<ManageFinancialReportsPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Báo Cáo Tài Chính/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Theo dõi dòng tiền, doanh thu bán hàng, chi phí nhập vật tư và hiệu quả kinh doanh xưởng nội thất Góc Nhà/i)
    ).toBeInTheDocument();
  });

  it('renders 6 financial KPI cards with correct data', async () => {
    render(<ManageFinancialReportsPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/150.000.000 ₫/i).length).toBeGreaterThanOrEqual(1); // Tổng doanh thu
      expect(screen.getAllByText(/100.000.000 ₫/i).length).toBeGreaterThanOrEqual(1); // Thực thu
      expect(screen.getAllByText(/50.000.000 ₫/i).length).toBeGreaterThanOrEqual(1); // Khoản phải thu
      expect(screen.getAllByText(/60.000.000 ₫/i).length).toBeGreaterThanOrEqual(1); // Chi phí vật tư
      expect(screen.getAllByText(/90.000.000 ₫/i).length).toBeGreaterThanOrEqual(1); // Lợi nhuận gộp
      expect(screen.getAllByText(/60%/i).length).toBeGreaterThanOrEqual(1); // Tỷ suất lợi nhuận
    });
  });

  it('allows clicking period presets (Tháng trước, Quý này, Năm nay)', async () => {
    const user = userEvent.setup();
    render(<ManageFinancialReportsPage />);

    const lastMonthBtn = screen.getByRole('button', { name: /Tháng trước/i });
    expect(lastMonthBtn).toBeInTheDocument();

    await user.click(lastMonthBtn);
    expect(financialReportService.getFinancialSummary).toHaveBeenCalled();
  });

  it('switches between detail tabs (Orders, Receipts, Top Products)', async () => {
    const user = userEvent.setup();
    render(<ManageFinancialReportsPage />);

    // Tab 1: Orders (mặc định)
    await waitFor(() => {
      expect(screen.getByText('ORD-202611-001')).toBeInTheDocument();
      expect(screen.getByText('Trần Văn Long')).toBeInTheDocument();
    });

    // Chuyển sang Tab 2: Receipts
    const receiptsTabBtn = screen.getByRole('button', { name: /Chi Phí Nhập Vật Tư/i });
    await user.click(receiptsTabBtn);

    await waitFor(() => {
      expect(financialReportService.getFinancialReceipts).toHaveBeenCalled();
      expect(screen.getByText('REC-202611-001')).toBeInTheDocument();
      expect(screen.getByText('Công ty Gỗ Nam Thành')).toBeInTheDocument();
    });

    // Chuyển sang Tab 3: Top Products
    const topProductsTabBtn = screen.getByRole('button', { name: /Top Sản Phẩm Doanh Thu Cao/i });
    await user.click(topProductsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Bàn họp gỗ sồi Bắc Mỹ 3m2')).toBeInTheDocument();
      expect(screen.getByText('Tủ quần áo gỗ gõ đỏ 4 cánh')).toBeInTheDocument();
    });
  });

  it('triggers export excel and PDF when action buttons are clicked', async () => {
    const user = userEvent.setup();
    financialReportService.getFinancialExportData.mockResolvedValue({
      exportData: {
        summary: mockSummary,
        orders: mockOrders,
        receipts: mockReceipts,
      },
    });

    render(<ManageFinancialReportsPage />);

    const exportExcelBtn = screen.getByRole('button', { name: /Xuất Excel/i });
    await user.click(exportExcelBtn);

    await waitFor(() => {
      expect(financialReportService.getFinancialExportData).toHaveBeenCalled();
      expect(financialExportUtils.exportFinancialToExcel).toHaveBeenCalled();
    });

    const exportPdfBtn = screen.getByRole('button', { name: /Xuất PDF \/ In/i });
    await user.click(exportPdfBtn);

    expect(financialExportUtils.printFinancialReport).toHaveBeenCalled();
  });
});
