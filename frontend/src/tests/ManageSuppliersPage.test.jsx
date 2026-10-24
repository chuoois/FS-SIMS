import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageSuppliersPage } from '../pages/owner-pages/ManageSuppliersPage';
import * as supplierService from '../services/supplierService';

vi.mock('../services/supplierService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ManageSuppliersPage Component', () => {
  const mockSuppliers = [
    {
      supplier_id: 1,
      supplier_code: 'NCC_ANCUONG',
      supplier_name: 'Công ty Gỗ An Cường',
      phone_number: '02838629999',
      address: 'Bình Dương',
      note: 'Gỗ ván công nghiệp',
      status: 'ACTIVE',
      createdate: '2026-01-15T00:00:00.000Z',
      createby: 'owner@fssims.com',
    },
    {
      supplier_id: 2,
      supplier_code: 'NCC_HAFELE',
      supplier_name: 'Phụ kiện Hafele',
      phone_number: '02839113113',
      address: 'TP.HCM',
      note: 'Bản lề, ray trượt',
      status: 'INACTIVE',
      createdate: '2026-02-10T00:00:00.000Z',
      createby: 'owner@fssims.com',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    supplierService.getSuppliers.mockResolvedValue({
      message: 'Thành công',
      data: mockSuppliers,
      pagination: { totalItems: 2, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });
    supplierService.getNextSupplierCode.mockResolvedValue({
      message: 'Thành công',
      nextCode: 'NCC003',
    });
  });

  it('render đúng tiêu đề và danh sách nhà cung cấp', async () => {
    render(<ManageSuppliersPage />);

    expect(screen.getByText('Quản lý Nhà cung cấp')).toBeInTheDocument();
    expect(screen.getByText('Thêm nhà cung cấp')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('NCC_ANCUONG')).toBeInTheDocument();
      expect(screen.getByText('Công ty Gỗ An Cường')).toBeInTheDocument();
      expect(screen.getByText('NCC_HAFELE')).toBeInTheDocument();
      expect(screen.getByText('Phụ kiện Hafele')).toBeInTheDocument();
    });
  });

  it('mở modal thêm mới khi nhấn nút "Thêm nhà cung cấp"', async () => {
    const user = userEvent.setup();
    render(<ManageSuppliersPage />);

    const addButton = screen.getByRole('button', { name: /Thêm nhà cung cấp/i });
    await user.click(addButton);

    expect(screen.getByText('Thêm mới Nhà cung cấp')).toBeInTheDocument();
    expect(screen.getByText(/Mã nhà cung cấp \(Tự động sinh\)/i)).toBeInTheDocument();
  });
});
