import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
      receipt_id: 1,
      receipt_code: 'RCP-20261001-0001',
      supplier_id: 1,
      supplier_name: 'Công ty Gỗ Sài Gòn',
      supplier_code: 'SUP-001',
      receipt_date: '2026-10-01',
      total_amount: 61000000,
      status: 'CONFIRMED',
      received_by: 3,
      receiver_name: 'Lê Văn Tổ Trưởng',
      note: 'Nhập gỗ đầu tháng 10',
      items_count: 3,
      total_quantity: 180,
    },
    {
      receipt_id: 2,
      receipt_code: 'RCP-20261022-0002',
      supplier_id: 2,
      supplier_name: 'Xưởng Gỗ Thông Bình Dương',
      supplier_code: 'SUP-002',
      receipt_date: '2026-10-22',
      total_amount: 10800000,
      status: 'DRAFT',
      received_by: 3,
      receiver_name: 'Lê Văn Tổ Trưởng',
      note: 'Phiếu nháp chờ gỗ về',
      items_count: 1,
      total_quantity: 60,
    },
  ];

  const mockDetailReceipt = {
    receipt_id: 1,
    receipt_code: 'RCP-20261001-0001',
    receipt_date: '2026-10-01',
    total_amount: 61000000,
    status: 'CONFIRMED',
    note: 'Nhập gỗ đầu tháng 10',
    createdate: '2026-10-01T08:00:00Z',
    createby: 'owner@fssims.local',
    supplier: {
      supplier_id: 1,
      supplier_code: 'SUP-001',
      supplier_name: 'Công ty Gỗ Sài Gòn',
      phone_number: '0281234567',
      address: 'KCN Tân Bình, TP.HCM',
    },
    receiver: {
      user_account_id: 3,
      full_name: 'Lê Văn Tổ Trưởng',
      email: 'leader@fssims.local',
    },
    items: [
      {
        receipt_item_id: 1,
        receipt_id: 1,
        raw_material_id: 1,
        raw_code: 'WOOD-OAK',
        raw_name: 'Gỗ sồi xẻ',
        unit: 'BOARD',
        quantity: 100,
        unit_price: 350000,
        line_total: 35000000,
        note: 'Gỗ sồi xẻ (tấm)',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    purchaseReceiptService.getReceipts.mockResolvedValue({
      message: 'Thành công',
      data: mockReceipts,
      pagination: { totalItems: 2, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });

    purchaseReceiptService.getReceiptSummary.mockResolvedValue({
      message: 'Thành công',
      summary: {
        totalReceipts: 2,
        draftCount: 1,
        confirmedCount: 1,
        cancelledCount: 0,
        confirmedTotalAmount: 61000000,
      },
    });

    purchaseReceiptService.getNextReceiptCode.mockResolvedValue({
      message: 'Thành công',
      nextCode: 'RCP-20261027-0003',
    });

    purchaseReceiptService.getReceiptDetail.mockResolvedValue({
      message: 'Thành công',
      receipt: mockDetailReceipt,
    });

    supplierService.getActiveSuppliers.mockResolvedValue({
      suppliers: [
        { supplier_id: 1, supplier_code: 'SUP-001', supplier_name: 'Công ty Gỗ Sài Gòn' },
        { supplier_id: 2, supplier_code: 'SUP-002', supplier_name: 'Xưởng Gỗ Thông Bình Dương' },
      ],
    });

    rawMaterialService.getRawMaterials.mockResolvedValue({
      data: [
        { raw_material_id: 1, raw_code: 'WOOD-OAK', raw_name: 'Gỗ sồi xẻ', unit: 'BOARD', quantity_on_hand: 50 },
        { raw_material_id: 2, raw_code: 'WOOD-PINE', raw_name: 'Gỗ thông xẻ', unit: 'BOARD', quantity_on_hand: 20 },
      ],
      materials: [
        { raw_material_id: 1, raw_code: 'WOOD-OAK', raw_name: 'Gỗ sồi xẻ', unit: 'BOARD', quantity_on_hand: 50 },
        { raw_material_id: 2, raw_code: 'WOOD-PINE', raw_name: 'Gỗ thông xẻ', unit: 'BOARD', quantity_on_hand: 20 },
      ],
    });
  });

  it('render đúng tiêu đề trang và danh sách phiếu nhập kho', async () => {
    render(<ManagePurchaseReceiptsPage />);

    expect(screen.getByText('Quản Lý Phiếu Nhập Kho')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lập phiếu nhập mới/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('RCP-20261001-0001')).toBeInTheDocument();
      expect(screen.getByText('Công ty Gỗ Sài Gòn')).toBeInTheDocument();
      expect(screen.getByText('RCP-20261022-0002')).toBeInTheDocument();
      expect(screen.getByText('Xưởng Gỗ Thông Bình Dương')).toBeInTheDocument();
      expect(screen.getByText('Đã nhập kho')).toBeInTheDocument();
      expect(screen.getByText('Phiếu nháp')).toBeInTheDocument();
    });
  });

  it('mở modal tạo phiếu nhập mới khi nhấn nút "Lập phiếu nhập mới"', async () => {
    const user = userEvent.setup();
    render(<ManagePurchaseReceiptsPage />);

    const createButton = screen.getByRole('button', { name: /Lập phiếu nhập mới/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Lập Phiếu Nhập Kho Mới')).toBeInTheDocument();
      expect(screen.getByText(/Chi tiết danh sách nguyên vật liệu nhập/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\+ Tạo nhanh NVL mới/i })).toBeInTheDocument();
      expect(screen.getByText(/Gỗ sồi xẻ \(WOOD-OAK\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Lưu nháp \(DRAFT\)/i)).toBeInTheDocument();
    });
  });

  it('mở modal xem chi tiết phiếu nhập khi nhấn vào mã phiếu', async () => {
    const user = userEvent.setup();
    render(<ManagePurchaseReceiptsPage />);

    await waitFor(() => {
      expect(screen.getByText('RCP-20261001-0001')).toBeInTheDocument();
    });

    const receiptLink = screen.getByText('RCP-20261001-0001');
    await user.click(receiptLink);

    await waitFor(() => {
      expect(purchaseReceiptService.getReceiptDetail).toHaveBeenCalledWith(1);
      expect(screen.getByText('Thông tin Nhà Cung Cấp')).toBeInTheDocument();
      expect(screen.getByText('Gỗ sồi xẻ')).toBeInTheDocument();
      expect(screen.getByText('WOOD-OAK')).toBeInTheDocument();
    });
  });

  it('mở modal in phiếu nhập khi nhấn nút in', async () => {
    const user = userEvent.setup();
    render(<ManagePurchaseReceiptsPage />);

    await waitFor(() => {
      expect(screen.getByText('RCP-20261001-0001')).toBeInTheDocument();
    });

    const printButton = screen.getAllByLabelText('In phiếu nhập kho')[0];
    await user.click(printButton);

    await waitFor(() => {
      expect(purchaseReceiptService.getReceiptDetail).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.getByText('PHIẾU NHẬP KHO NGUYÊN VẬT LIỆU')).toBeInTheDocument();
      expect(screen.getByText(/Xưởng Nội Thất & Gia Công Gỗ Góc Nhà/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /In phiếu ngay/i })).toBeInTheDocument();
    });
  });

  it('mở modal chỉnh sửa khi nhấn nút sửa trên dòng phiếu nháp (DRAFT)', async () => {
    const user = userEvent.setup();
    purchaseReceiptService.getReceiptDetail.mockResolvedValueOnce({
      receipt: {
        receipt_id: 2,
        receipt_code: 'RCP-20261022-0002',
        supplier_id: 2,
        receipt_date: '2026-10-22',
        status: 'DRAFT',
        note: 'Phiếu nháp chờ gỗ về',
        items: [
          {
            raw_material_id: 1,
            raw_name: 'Gỗ sồi xẻ',
            quantity: 60,
            unit_price: 180000,
            line_total: 10800000,
          },
        ],
      },
    });

    render(<ManagePurchaseReceiptsPage />);

    await waitFor(() => {
      expect(screen.getByText('RCP-20261022-0002')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle('Chỉnh sửa phiếu nháp');
    expect(editBtn).toBeInTheDocument();
    await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText(/Chỉnh Sửa Phiếu Nhập \(RCP-20261022-0002\)/i)).toBeInTheDocument();
      expect(screen.getByText('Lưu thay đổi (Nháp)')).toBeInTheDocument();
    });
  });
});
