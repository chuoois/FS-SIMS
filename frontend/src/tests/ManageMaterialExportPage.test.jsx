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
  const mockSummary = {
    totalIssues: 12,
    draftCount: 3,
    confirmedCount: 8,
    cancelledCount: 1,
    totalQuantityIssued: 240,
  };

  const mockIssues = [
    {
      issue_id: 1,
      issue_code: 'EXP-202611-001',
      issue_date: '2026-11-24T00:00:00Z',
      production_id: 10,
      production_code: 'PO-202611-001',
      production_type: 'CUSTOM',
      issuer_name: 'Nguyễn Văn Kho',
      items_count: 2,
      total_quantity: 45,
      status: 'CONFIRMED',
      note: 'Xuất gỗ sồi đóng bàn họp',
    },
    {
      issue_id: 2,
      issue_code: 'EXP-202611-002',
      issue_date: '2026-11-24T00:00:00Z',
      production_id: 11,
      production_code: 'PO-202611-002',
      production_type: 'STOCK',
      issuer_name: 'Trần Văn Kho',
      items_count: 1,
      total_quantity: 20,
      status: 'DRAFT',
      note: 'Phiếu nháp chờ duyệt',
    },
  ];

  const mockRawMaterials = [
    {
      raw_material_id: 101,
      raw_code: 'RAW-OAK-01',
      raw_name: 'Gỗ sồi Bắc Mỹ xẻ sấy',
      unit: 'm3',
      quantity_on_hand: 50,
    },
  ];

  const mockProductionOrders = [
    {
      production_id: 10,
      production_code: 'PO-202611-001',
      production_type: 'CUSTOM',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    materialExportService.getMaterialExportSummary.mockResolvedValue({
      summary: mockSummary,
    });
    materialExportService.getMaterialExports.mockResolvedValue({
      data: mockIssues,
      pagination: {
        totalItems: 2,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });
    materialExportService.getProductionOrdersForExport.mockResolvedValue({
      data: mockProductionOrders,
    });
    materialExportService.getNextMaterialExportCode.mockResolvedValue({
      nextCode: 'EXP-202611-003',
    });
    rawMaterialService.getRawMaterials.mockResolvedValue({
      data: mockRawMaterials,
    });
  });

  it('renders header, title, and action buttons', async () => {
    render(<ManageMaterialExportPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Quản Lý Phiếu Xuất Kho/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Xuất nguyên vật liệu gỗ từ kho xưởng phục vụ cho các lệnh gia công sản xuất đồ nội thất Góc Nhà/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lập phiếu xuất mới/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Làm mới/i })).toBeInTheDocument();
  });

  it('renders 4 summary cards with correct stats', async () => {
    render(<ManageMaterialExportPage />);

    await waitFor(() => {
      expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1); // Tổng số phiếu
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1); // Phiếu nháp
      expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1); // Đã xuất kho
      expect(screen.getAllByText('240').length).toBeGreaterThanOrEqual(1); // Tổng SL gỗ
    });
  });

  it('filters issues when clicking status tabs', async () => {
    const user = userEvent.setup();
    render(<ManageMaterialExportPage />);

    const draftTab = screen.getByRole('button', { name: /Phiếu nháp/i });
    expect(draftTab).toBeInTheDocument();

    await user.click(draftTab);
    expect(materialExportService.getMaterialExports).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'DRAFT',
      })
    );
  });

  it('opens create modal when clicking "Lập phiếu xuất mới"', async () => {
    const user = userEvent.setup();
    render(<ManageMaterialExportPage />);

    const createBtn = screen.getByRole('button', { name: /Lập phiếu xuất mới/i });
    await user.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText(/Lập Phiếu Xuất Kho Nguyên Vật Liệu Mới/i)).toBeInTheDocument();
      expect(screen.getByText(/Chi tiết nguyên vật liệu xuất kho/i)).toBeInTheDocument();
    });
  });

  it('opens detail modal when clicking slip code in the table', async () => {
    const user = userEvent.setup();
    materialExportService.getMaterialExportDetail.mockResolvedValue({
      issue: {
        ...mockIssues[0],
        items: [
          {
            raw_code: 'RAW-OAK-01',
            raw_name: 'Gỗ sồi Bắc Mỹ xẻ sấy',
            unit: 'm3',
            quantity: 45,
            note: 'Gỗ hộp',
          },
        ],
      },
    });

    render(<ManageMaterialExportPage />);

    await waitFor(() => {
      expect(screen.getByText('EXP-202611-001')).toBeInTheDocument();
    });

    await user.click(screen.getByText('EXP-202611-001'));

    await waitFor(() => {
      expect(materialExportService.getMaterialExportDetail).toHaveBeenCalledWith(1);
      expect(screen.getByText(/Danh sách nguyên vật liệu xuất/i)).toBeInTheDocument();
    });
  });
});
