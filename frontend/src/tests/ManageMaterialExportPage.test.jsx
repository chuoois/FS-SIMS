import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageMaterialExportPage } from '../pages/owner-pages/ManageMaterialExportPage';
import * as materialExportService from '../services/materialExportService';
import * as rawMaterialService from '../services/rawMaterialService';

vi.mock('../services/materialExportService');
vi.mock('../services/rawMaterialService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ManageMaterialExportPage Component', () => {
  const mockIssues = [
    {
      issue_id: 1,
      issue_code: 'EXP-20261027-0001',
      production_id: 10,
      production_code: 'PO-202610-001',
      production_type: 'CUSTOM',
      issue_date: '2026-10-27',
      status: 'CONFIRMED',
      issued_by: 1,
      issuer_name: 'Chủ xưởng Góc Nhà',
      note: 'Xuất gỗ sồi làm bàn ăn',
      items_count: 2,
      total_quantity: 15,
    },
    {
      issue_id: 2,
      issue_code: 'EXP-20261027-0002',
      production_id: 11,
      production_code: 'PO-202610-002',
      production_type: 'STANDARD',
      issue_date: '2026-10-27',
      status: 'DRAFT',
      issued_by: 1,
      issuer_name: 'Chủ xưởng Góc Nhà',
      note: 'Phiếu nháp chờ thợ nhận gỗ',
      items_count: 1,
      total_quantity: 5,
    },
  ];

  const mockDetailIssue = {
    issue_id: 1,
    issue_code: 'EXP-20261027-0001',
    issue_date: '2026-10-27',
    status: 'CONFIRMED',
    note: 'Xuất gỗ sồi làm bàn ăn',
    createdate: '2026-10-27T08:00:00Z',
    createby: 'owner@fssims.local',
    production_order: {
      production_id: 10,
      production_code: 'PO-202610-001',
      production_type: 'CUSTOM',
      status: 'IN_PROGRESS',
    },
    issuer: {
      user_account_id: 1,
      full_name: 'Chủ xưởng Góc Nhà',
      email: 'owner@fssims.local',
    },
    items: [
      {
        issue_item_id: 1,
        issue_id: 1,
        raw_material_id: 1,
        raw_code: 'WOOD-OAK',
        raw_name: 'Gỗ sồi xẻ',
        unit: 'BOARD',
        quantity: 10,
        note: 'Tấm dày 3cm',
      },
      {
        issue_item_id: 2,
        issue_id: 1,
        raw_material_id: 2,
        raw_code: 'WOOD-PINE',
        raw_name: 'Gỗ thông xẻ',
        unit: 'BOARD',
        quantity: 5,
        note: 'Khung phụ',
      },
    ],
  };

  const mockProductionOrders = [
    { production_id: 10, production_code: 'PO-202610-001', production_type: 'CUSTOM', status: 'IN_PROGRESS' },
    { production_id: 11, production_code: 'PO-202610-002', production_type: 'STANDARD', status: 'IN_PROGRESS' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    materialExportService.getMaterialExports.mockResolvedValue({
      message: 'Thành công',
      data: mockIssues,
      pagination: { totalItems: 2, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });

    materialExportService.getMaterialExportSummary.mockResolvedValue({
      message: 'Thành công',
      summary: {
        totalIssues: 2,
        draftCount: 1,
        confirmedCount: 1,
        cancelledCount: 0,
        totalQuantityIssued: 20,
      },
    });

    materialExportService.getNextMaterialExportCode.mockResolvedValue({
      message: 'Thành công',
      nextCode: 'EXP-20261027-0003',
    });

    materialExportService.getProductionOrdersForExport.mockResolvedValue({
      message: 'Thành công',
      productionOrders: mockProductionOrders,
    });

    materialExportService.getMaterialExportDetail.mockResolvedValue({
      message: 'Thành công',
      issue: mockDetailIssue,
    });

    rawMaterialService.getRawMaterials.mockResolvedValue({
      data: [
        { raw_material_id: 1, raw_code: 'WOOD-OAK', raw_name: 'Gỗ sồi xẻ', unit: 'BOARD', quantity_on_hand: 50 },
        { raw_material_id: 2, raw_code: 'WOOD-PINE', raw_name: 'Gỗ thông xẻ', unit: 'BOARD', quantity_on_hand: 20 },
      ],
    });
  });

  it('render đúng tiêu đề trang, thẻ thống kê và danh sách phiếu xuất kho', async () => {
    render(<ManageMaterialExportPage />);

    expect(screen.getByText('Quản Lý Phiếu Xuất Kho')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lập phiếu xuất mới/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('EXP-20261027-0001')).toBeInTheDocument();
      expect(screen.getByText('PO-202610-001')).toBeInTheDocument();
      expect(screen.getByText('EXP-20261027-0002')).toBeInTheDocument();
      expect(screen.getByText('PO-202610-002')).toBeInTheDocument();
      expect(screen.getAllByText('Đã xuất kho').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Phiếu nháp').length).toBeGreaterThan(0);
    });
  });

  it('mở modal tạo phiếu xuất kho khi nhấn nút "Lập phiếu xuất mới"', async () => {
    const user = userEvent.setup();
    render(<ManageMaterialExportPage />);

    const createButton = screen.getByRole('button', { name: /Lập phiếu xuất mới/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Lập Phiếu Xuất Kho Nguyên Vật Liệu Mới')).toBeInTheDocument();
      expect(screen.getByText(/Chi tiết nguyên vật liệu xuất kho/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Thêm mặt hàng/i })).toBeInTheDocument();
      expect(screen.getByText(/Lưu nháp \(DRAFT\)/i)).toBeInTheDocument();
      expect(screen.getByText('Lưu & Xuất kho ngay')).toBeInTheDocument();
    });
  });

  it('mở modal xem chi tiết phiếu xuất kho khi nhấn vào mã phiếu', async () => {
    const user = userEvent.setup();
    render(<ManageMaterialExportPage />);

    await waitFor(() => {
      expect(screen.getByText('EXP-20261027-0001')).toBeInTheDocument();
    });

    const issueLink = screen.getByText('EXP-20261027-0001');
    await user.click(issueLink);

    await waitFor(() => {
      expect(materialExportService.getMaterialExportDetail).toHaveBeenCalledWith(1);
      expect(screen.getByText('Thông Tin Xuất Kho')).toBeInTheDocument();
      expect(screen.getByText('Gỗ sồi xẻ')).toBeInTheDocument();
      expect(screen.getByText('WOOD-OAK')).toBeInTheDocument();
      expect(screen.getByText('Tấm dày 3cm')).toBeInTheDocument();
    });
  });

  it('mở modal in phiếu xuất kho mẫu 02-VT khi nhấn nút in', async () => {
    const user = userEvent.setup();
    render(<ManageMaterialExportPage />);

    await waitFor(() => {
      expect(screen.getByText('EXP-20261027-0001')).toBeInTheDocument();
    });

    const printButton = screen.getAllByLabelText('In phiếu xuất kho')[0];
    await user.click(printButton);

    await waitFor(() => {
      expect(materialExportService.getMaterialExportDetail).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.getByText('PHIẾU XUẤT KHO NGUYÊN VẬT LIỆU')).toBeInTheDocument();
      expect(screen.getByText(/Xưởng Nội Thất & Gia Công Gỗ Góc Nhà/i)).toBeInTheDocument();
      expect(screen.getByText(/Mẫu số: 02-VT/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /In phiếu ngay/i })).toBeInTheDocument();
    });
  });

  it('mở modal chỉnh sửa khi nhấn nút sửa trên phiếu nháp (DRAFT)', async () => {
    const user = userEvent.setup();
    materialExportService.getMaterialExportDetail.mockResolvedValueOnce({
      issue: {
        issue_id: 2,
        issue_code: 'EXP-20261027-0002',
        production_id: 11,
        issue_date: '2026-10-27',
        status: 'DRAFT',
        note: 'Phiếu nháp chờ thợ nhận gỗ',
        items: [
          {
            raw_material_id: 1,
            quantity: 5,
            note: '5 tấm gỗ sồi',
          },
        ],
      },
    });

    render(<ManageMaterialExportPage />);

    await waitFor(() => {
      expect(screen.getByText('EXP-20261027-0002')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle('Chỉnh sửa phiếu nháp');
    expect(editBtn).toBeInTheDocument();
    await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText(/Chỉnh Sửa Phiếu Xuất Kho \(EXP-20261027-0002\)/i)).toBeInTheDocument();
      expect(screen.getByText('Lưu thay đổi (Nháp)')).toBeInTheDocument();
    });
  });
});
