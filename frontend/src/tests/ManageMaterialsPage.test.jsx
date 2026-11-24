import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageMaterialsPage } from '../pages/owner-pages/ManageMaterialsPage';
import * as rawMaterialService from '../services/rawMaterialService';
import * as productManagerService from '../services/productManagerService';

vi.mock('../services/rawMaterialService');
vi.mock('../services/productManagerService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ManageMaterialsPage Component', () => {
  const mockStockSummary = {
    totalMaterials: 25,
    normalStockMaterials: 18,
    lowStockMaterials: 5,
    outOfStockMaterials: 2,
    totalQuantity: 340,
  };

  const mockMaterials = [
    {
      rawMaterialId: 1,
      rawCode: 'RAW-OAK-01',
      rawName: 'Gỗ sồi trắng Bắc Mỹ xẻ sấy',
      materialId: 2,
      materialName: 'Gỗ sồi',
      unit: 'BOARD',
      quantityOnHand: 45,
      minQuantity: 10,
      isLowStock: false,
      status: 'ACTIVE',
      description: 'Quy cách 2.5cm x 15cm x 2m',
    },
    {
      rawMaterialId: 2,
      rawCode: 'RAW-RED-02',
      rawName: 'Gỗ gõ đỏ Nam Phi phách',
      materialId: 3,
      materialName: 'Gỗ gõ đỏ',
      unit: 'BOARD',
      quantityOnHand: 4,
      minQuantity: 10,
      isLowStock: true,
      status: 'ACTIVE',
      description: 'Gỗ phách dày 5cm',
    },
  ];

  const mockWoodMaterials = [
    { material_id: 2, material_name: 'Gỗ sồi' },
    { material_id: 3, material_name: 'Gỗ gõ đỏ' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    rawMaterialService.getRawMaterialStockSummary.mockResolvedValue({
      data: mockStockSummary,
    });
    rawMaterialService.getRawMaterials.mockResolvedValue({
      data: mockMaterials,
      pagination: {
        totalItems: 2,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });
    rawMaterialService.getNextRawMaterialCode.mockResolvedValue({
      data: { nextCode: 'RAW-WOOD-03' },
    });
    productManagerService.getProductMetadata.mockResolvedValue({
      data: { materials: mockWoodMaterials },
    });
  });

  it('renders header, title, and action buttons', async () => {
    render(<ManageMaterialsPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Quản Lý Nguyên Vật Liệu/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Theo dõi khối lượng gỗ, phụ kiện và định mức tồn kho tối thiểu để chủ động kế hoạch sản xuất/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm nguyên vật liệu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Làm mới/i })).toBeInTheDocument();
  });

  it('renders 4 stock summary cards with correct numbers', async () => {
    render(<ManageMaterialsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('25').length).toBeGreaterThanOrEqual(1); // Tổng loại vật tư
      expect(screen.getAllByText('18').length).toBeGreaterThanOrEqual(1); // Tồn kho an toàn
      expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1); // Cảnh báo sắp hết
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1); // Hết vật tư
    });
  });

  it('filters materials when clicking stock status tabs', async () => {
    const user = userEvent.setup();
    render(<ManageMaterialsPage />);

    const lowStockTab = screen.getByRole('button', { name: /Cảnh báo sắp hết/i });
    expect(lowStockTab).toBeInTheDocument();

    await user.click(lowStockTab);
    await waitFor(() => {
      expect(rawMaterialService.getRawMaterials).toHaveBeenCalledWith(
        expect.objectContaining({
          stock_status: 'LOW_STOCK',
        })
      );
    });
  });

  it('opens create modal when clicking "Thêm nguyên vật liệu"', async () => {
    const user = userEvent.setup();
    render(<ManageMaterialsPage />);

    const addBtn = screen.getByRole('button', { name: /Thêm nguyên vật liệu/i });
    await user.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText(/Thêm Nguyên Vật Liệu Mới/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tên nguyên vật liệu/i)).toBeInTheDocument();
    });
  });

  it('opens detail modal when clicking Eye icon button', async () => {
    const user = userEvent.setup();
    rawMaterialService.getRawMaterialDetail.mockResolvedValue({
      data: mockMaterials[0],
      usage: { receiptCount: 3, issueCount: 2, totalUsage: 5 },
    });

    render(<ManageMaterialsPage />);

    await waitFor(() => {
      expect(screen.getByText('RAW-OAK-01')).toBeInTheDocument();
    });

    const eyeButtons = screen.getAllByTitle(/Xem chi tiết/i);
    await user.click(eyeButtons[0]);

    await waitFor(() => {
      expect(rawMaterialService.getRawMaterialDetail).toHaveBeenCalledWith(1);
      expect(screen.getByText(/Chi tiết nguyên vật liệu/i)).toBeInTheDocument();
    });
  });

  it('opens edit modal when clicking Pencil icon button', async () => {
    const user = userEvent.setup();
    render(<ManageMaterialsPage />);

    await waitFor(() => {
      expect(screen.getByText('RAW-OAK-01')).toBeInTheDocument();
    });

    const editBtn = screen.getByTestId('edit-material-1');
    await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText(/Chỉnh sửa:/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Gỗ sồi trắng Bắc Mỹ xẻ sấy')).toBeInTheDocument();
    });
  });

  it('opens delete modal when clicking Trash icon button', async () => {
    const user = userEvent.setup();
    rawMaterialService.getRawMaterialDetail.mockResolvedValue({
      usage: { receiptCount: 1, issueCount: 1, totalUsage: 2 },
    });

    render(<ManageMaterialsPage />);

    await waitFor(() => {
      expect(screen.getByText('RAW-OAK-01')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId('delete-material-1');
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/Xóa nguyên vật liệu/i)).toBeInTheDocument();
    });
  });
});
