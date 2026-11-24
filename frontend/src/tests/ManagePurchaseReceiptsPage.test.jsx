import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManagePurchaseReceiptsPage } from '../pages/owner-pages/ManagePurchaseReceiptsPage';
import * as purchaseReceiptService from '../services/purchaseReceiptService';
import * as supplierService from '../services/supplierService';
import * as rawMaterialService from '../services/rawMaterialService';

vi.mock('../services/purchaseReceiptService');
vi.mock('../services/supplierService');
vi.mock('../services/rawMaterialService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ManagePurchaseReceiptsPage Component', () => {
  const mockReceipts = [
    {
      purchase_receipt_id: 1,
      receipt_code: 'PNK-20261124-001',
      supplier_id: 10,
      supplier_name: 'Công ty Gỗ Hoàng Gia',
      supplier_phone: '0987654321',
      receipt_date: '2026-11-24',
      total_amount: 45000000,
      status: 'CONFIRMED',
      status_label: 'Đã nhập kho',
      note: 'Nhập gỗ sồi Nga kiện lớn',
      created_by_name: 'Nguyễn Văn Quản',
      created_at: '2026-11-24T08:30:00Z',
      items: [
        {
          receipt_item_id: 1,
          raw_material_id: 101,
          raw_code: 'GO-SOI-NGA',
          raw_name: 'Gỗ sồi Nga nhập khẩu tấm 20mm',
          unit: 'TAM',
          unit_display: 'Tấm',
          quantity: 30,
          unit_price: 1500000,
          total_price: 45000000,
          note: 'Chất lượng loại 1',
        },
      ],
    },
    {
      purchase_receipt_id: 2,
      receipt_code: 'PNK-20261124-002',
      supplier_id: 11,
      supplier_name: 'Công ty Phụ Kiện Mộc An',
      supplier_phone: '0912345678',
      receipt_date: '2026-11-24',
      total_amount: 8500000,
      status: 'DRAFT',
      status_label: 'Phiếu nháp',
      note: 'Bản lề giảm chấn Hafele',
      created_by_name: 'Nguyễn Văn Quản',
      created_at: '2026-11-24T09:15:00Z',
      items: [
        {
          receipt_item_id: 2,
          raw_material_id: 102,
          raw_code: 'PK-BAN-LE',
          raw_name: 'Bản lề giảm chấn inox 304',
          unit: 'PCS',
          unit_display: 'Cái',
          quantity: 100,
          unit_price: 85000,
          total_price: 8500000,
        },
      ],
    },
    {
      purchase_receipt_id: 3,
      receipt_code: 'PNK-20261120-001',
      supplier_id: 12,
      supplier_name: 'Sơn Đại Hưng',
      supplier_phone: '0909090909',
      receipt_date: '2026-11-20',
      total_amount: 12000000,
      status: 'CANCELLED',
      status_label: 'Đã hủy',
      note: 'Hàng sai quy cách màng sơn',
      created_by_name: 'Nguyễn Văn Quản',
      created_at: '2026-11-20T10:00:00Z',
      items: [
        {
          receipt_item_id: 3,
          raw_material_id: 103,
          raw_code: 'SON-PU-01',
          raw_name: 'Sơn lót PU cao cấp bóng mờ',
          unit: 'THUNG',
          unit_display: 'Thùng',
          quantity: 10,
          unit_price: 1200000,
          total_price: 12000000,
        },
      ],
    },
  ];

  const mockSummary = {
    totalReceipts: 3,
    confirmedCount: 1,
    draftCount: 1,
    cancelledCount: 1,
    confirmedTotalAmount: 45000000,
  };

  const mockSuppliers = [
    { supplier_id: 10, supplier_name: 'Công ty Gỗ Hoàng Gia' },
    { supplier_id: 11, supplier_name: 'Công ty Phụ Kiện Mộc An' },
    { supplier_id: 12, supplier_name: 'Sơn Đại Hưng' },
  ];

  const mockRawMaterials = [
    {
      raw_material_id: 101,
      raw_code: 'GO-SOI-NGA',
      raw_name: 'Gỗ sồi Nga nhập khẩu tấm 20mm',
      unit: 'TAM',
      unit_display: 'Tấm',
    },
    {
      raw_material_id: 102,
      raw_code: 'PK-BAN-LE',
      raw_name: 'Bản lề giảm chấn inox 304',
      unit: 'PCS',
      unit_display: 'Cái',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    purchaseReceiptService.getReceipts.mockResolvedValue({
      message: 'Thành công',
      data: mockReceipts,
      pagination: {
        totalItems: 3,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });
    purchaseReceiptService.getReceiptSummary.mockResolvedValue({
      message: 'Thành công',
      summary: mockSummary,
    });
    purchaseReceiptService.getNextReceiptCode.mockResolvedValue({
      message: 'Thành công',
      nextCode: 'PNK-20261124-003',
    });
    purchaseReceiptService.getReceiptDetail.mockImplementation(async (id) => {
      const found = mockReceipts.find((r) => r.purchase_receipt_id === Number(id));
      return {
        message: 'Thành công',
        receipt: found || mockReceipts[0],
      };
    });
    purchaseReceiptService.createReceipt.mockResolvedValue({
      message: 'Tạo phiếu nhập thành công',
      receipt: { purchase_receipt_id: 4, receipt_code: 'PNK-20261124-003' },
    });
    purchaseReceiptService.confirmReceipt.mockResolvedValue({
      message: 'Xác nhận nhập kho thành công',
    });
    purchaseReceiptService.cancelReceipt.mockResolvedValue({
      message: 'Hủy phiếu nhập kho thành công',
    });
    purchaseReceiptService.deleteReceipt.mockResolvedValue({
      message: 'Xóa phiếu nhập thành công',
    });

    supplierService.getActiveSuppliers.mockResolvedValue({
      suppliers: mockSuppliers,
    });
    rawMaterialService.getRawMaterials.mockResolvedValue({
      data: mockRawMaterials,
    });
    rawMaterialService.getNextRawMaterialCode.mockResolvedValue({
      nextCode: 'NVL-20261124-001',
    });
  });

  it('renders header, title, and action buttons properly', async () => {
    render(<ManagePurchaseReceiptsPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Quản Lý Phiếu Nhập Kho/i })).toBeInTheDocument();
    expect(screen.getByText(/Theo dõi, ghi nhận và quản lý hoạt động nhập/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Làm mới/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lập phiếu nhập mới/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(purchaseReceiptService.getReceipts).toHaveBeenCalled();
    });
  });

  it('renders summary statistics cards with proper counts and amounts', async () => {
    render(<ManagePurchaseReceiptsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Tổng phiếu nhập/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Tổng phiếu nhập/i)).toBeInTheDocument();
    // 3 total receipts, 1 confirmed, 1 draft, 1 cancelled
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/45.000.000/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the receipts list in the table correctly', async () => {
    render(<ManagePurchaseReceiptsPage />);

    await waitFor(() => {
      expect(screen.getByText('PNK-20261124-001')).toBeInTheDocument();
    });

    expect(screen.getByText('PNK-20261124-002')).toBeInTheDocument();
    expect(screen.getByText('PNK-20261120-001')).toBeInTheDocument();
    expect(screen.getByText('Công ty Gỗ Hoàng Gia')).toBeInTheDocument();
    expect(screen.getByText('Công ty Phụ Kiện Mộc An')).toBeInTheDocument();
    expect(screen.getByText('Sơn Đại Hưng')).toBeInTheDocument();
  });

  it('filters receipts when clicking status pill tabs', async () => {
    const user = userEvent.setup();
    render(<ManagePurchaseReceiptsPage />);

    await waitFor(() => {
      expect(screen.getByText('PNK-20261124-001')).toBeInTheDocument();
    });

    const confirmedTab = screen.getByRole('button', { name: /Đã nhập kho/i });
    await user.click(confirmedTab);

    await waitFor(() => {
      expect(purchaseReceiptService.getReceipts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CONFIRMED' })
      );
    });

    const draftTab = screen.getByRole('button', { name: /Phiếu nháp/i });
    await user.click(draftTab);

    await waitFor(() => {
      expect(purchaseReceiptService.getReceipts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DRAFT' })
      );
    });
  });

  it('filters by search keyword when typing in the search box', async () => {
    const user = userEvent.setup();
    render(<ManagePurchaseReceiptsPage />);

    await waitFor(() => {
      expect(screen.getByText('PNK-20261124-001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo mã phiếu, ghi chú, tên nhà cung cấp/i);
    await user.type(searchInput, 'PNK-20261124-001');

    await waitFor(() => {
      expect(purchaseReceiptService.getReceipts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'PNK-20261124-001' })
      );
    });
  });

  it('opens create receipt modal when clicking "Lập phiếu nhập mới"', async () => {
    const user = userEvent.setup();
    render(<ManagePurchaseReceiptsPage />);

    const createBtn = screen.getByRole('button', { name: /Lập phiếu nhập mới/i });
    await user.click(createBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Lập Phiếu Nhập Kho Mới/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/-- Chọn nhà cung cấp --/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lưu nháp/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nhập kho ngay/i })).toBeInTheDocument();
  });

  it('opens detail modal when clicking receipt code or detail action', async () => {
    const user = userEvent.setup();
    render(<ManagePurchaseReceiptsPage />);

    await waitFor(() => {
      expect(screen.getByText('PNK-20261124-001')).toBeInTheDocument();
    });

    const receiptLink = screen.getByText('PNK-20261124-001');
    await user.click(receiptLink);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Chi tiết phiếu nhập/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Gỗ sồi Nga nhập khẩu tấm 20mm')).toBeInTheDocument();
  });

  it('opens print voucher modal when clicking print button', async () => {
    const user = userEvent.setup();
    render(<ManagePurchaseReceiptsPage />);

    await waitFor(() => {
      expect(screen.getByText('PNK-20261124-001')).toBeInTheDocument();
    });

    const printButtons = screen.getAllByRole('button', { name: /In/i });
    await user.click(printButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/PHIẾU NHẬP KHO NGUYÊN VẬT LIỆU/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Xưởng Nội Thất & Gia Công Gỗ Góc Nhà/i)).toBeInTheDocument();
  });

  it('opens delete confirmation modal and confirms deleting draft receipt', async () => {
    const user = userEvent.setup();
    render(<ManagePurchaseReceiptsPage />);

    await waitFor(() => {
      expect(screen.getByText('PNK-20261124-002')).toBeInTheDocument();
    });

    // PNK-20261124-002 is DRAFT, has delete button
    const deleteButtons = screen.getAllByRole('button', { name: /Xóa/i });
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Xác nhận xóa phiếu nhập\?/i })).toBeInTheDocument();
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: /Xóa vĩnh viễn/i });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(purchaseReceiptService.deleteReceipt).toHaveBeenCalled();
    });
  });
});
