import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageMaterialsPage } from '../pages/owner-pages/ManageMaterialsPage';
import * as rawMaterialService from '../services/rawMaterialService';
import * as productService from '../services/productService';

vi.mock('../services/rawMaterialService');
vi.mock('../services/productService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ManageMaterialsPage Component', () => {
  const mockMaterials = [
    {
      rawMaterialId: 1,
      rawCode: 'WOOD-OAK',
      rawName: 'Gỗ sồi xẻ',
      materialName: 'Gỗ sồi',
      unit: 'BOARD',
      quantityOnHand: 60,
      minQuantity: 20,
      isLowStock: false,
      status: 'ACTIVE',
    },
    {
      rawMaterialId: 2,
      rawCode: 'WOOD-PINE',
      rawName: 'Gỗ thông xẻ',
      materialName: 'Gỗ thông',
      unit: 'BOARD',
      quantityOnHand: 8,
      minQuantity: 10,
      isLowStock: true,
      status: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    rawMaterialService.getRawMaterials.mockResolvedValue({
      message: 'Thành công',
      data: mockMaterials,
      pagination: { totalItems: 2, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });
    rawMaterialService.getRawMaterialStockSummary.mockResolvedValue({
      message: 'Thành công',
      data: {
        totalMaterials: 2,
        lowStockMaterials: 1,
        outOfStockMaterials: 0,
        normalStockMaterials: 1,
        totalQuantity: 68,
      },
    });
    rawMaterialService.getNextRawMaterialCode.mockResolvedValue({
      message: 'Thành công',
      data: { nextCode: 'MAT-0003' },
    });
    productService.getProductMetadata.mockResolvedValue({
      message: 'Thành công',
      data: {
        materials: [{ material_id: 1, material_name: 'Gỗ sồi' }, { material_id: 3, material_name: 'Gỗ thông' }],
      },
    });
  });

  it('render đúng tiêu đề và danh sách nguyên vật liệu, không hiển thị nút thêm vật tư', async () => {
    render(<ManageMaterialsPage />);

    expect(screen.getByText('Quản lý Nguyên vật liệu')).toBeInTheDocument();
    expect(screen.queryByTestId('add-material-btn')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Gỗ sồi xẻ')).toBeInTheDocument();
      expect(screen.getByText('Gỗ thông xẻ')).toBeInTheDocument();
      expect(screen.getByText('Sắp hết')).toBeInTheDocument();
    });
  });

  it('mở modal xóa vật tư khi click nút xóa', async () => {
    const user = userEvent.setup();
    render(<ManageMaterialsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-material-1')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId('delete-material-1');
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Xóa nguyên vật liệu')).toBeInTheDocument();
    });
  });
});
