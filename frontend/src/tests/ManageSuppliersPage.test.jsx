import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageSuppliersPage } from '../pages/owner-pages/ManageSuppliersPage';
import * as supplierService from '../services/supplierService';
import toast from 'react-hot-toast';

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
      supplier_code: 'NCC001',
      supplier_name: 'Công ty Gỗ Hoàng Gia',
      phone_number: '0987654321',
      address: 'KCN Bình Dương, Phường Tân Uyên, TP. Tân Uyên',
      note: 'Chuyên cung cấp gỗ sồi Nga và gỗ óc chó Bắc Mỹ',
      status: 'ACTIVE',
      createdate: '2026-01-10T08:00:00.000Z',
    },
    {
      supplier_id: 2,
      supplier_code: 'NCC002',
      supplier_name: 'Công ty Phụ Kiện Mộc An',
      phone_number: '0912345678',
      address: '123 Đường Giải Phóng, Hà Nội',
      note: 'Bản lề giảm chấn, ray trượt Hafele chính hãng',
      status: 'ACTIVE',
      createdate: '2026-01-15T09:30:00.000Z',
    },
    {
      supplier_id: 3,
      supplier_code: 'NCC003',
      supplier_name: 'Sơn PU Đại Hưng',
      phone_number: '0909090909',
      address: 'KCN Sài Đồng, Long Biên, Hà Nội',
      note: 'Tạm ngưng nhập sơn do đổi nhà xưởng',
      status: 'INACTIVE',
      createdate: '2026-02-01T10:00:00.000Z',
    },
  ];

  const mockDetailWithReceipts = {
    supplier_id: 1,
    supplier_code: 'NCC001',
    supplier_name: 'Công ty Gỗ Hoàng Gia',
    phone_number: '0987654321',
    address: 'KCN Bình Dương, Phường Tân Uyên, TP. Tân Uyên',
    note: 'Chuyên cung cấp gỗ sồi Nga và gỗ óc chó Bắc Mỹ',
    status: 'ACTIVE',
    totalReceipts: 2,
    materialReceipts: [
      {
        receipt_id: 101,
        receipt_code: 'PNK-20261120-001',
        receipt_date: '2026-11-20',
        total_amount: 45000000,
        status: 'CONFIRMED',
        note: 'Gỗ sồi Nga 20mm',
      },
      {
        receipt_id: 102,
        receipt_code: 'PNK-20261124-001',
        receipt_date: '2026-11-24',
        total_amount: 32000000,
        status: 'DRAFT',
        note: 'Gỗ óc chó tấm',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    supplierService.getSuppliers.mockResolvedValue({
      message: 'Thành công',
      data: mockSuppliers,
      pagination: {
        totalItems: 3,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });

    supplierService.getNextSupplierCode.mockResolvedValue({
      message: 'Thành công',
      nextCode: 'NCC004',
    });

    supplierService.getSupplierDetail.mockImplementation(async (id) => {
      if (Number(id) === 1) {
        return { message: 'Thành công', supplier: mockDetailWithReceipts };
      }
      const found = mockSuppliers.find((s) => s.supplier_id === Number(id));
      return {
        message: 'Thành công',
        supplier: { ...found, totalReceipts: 0, materialReceipts: [] },
      };
    });

    supplierService.createSupplier.mockResolvedValue({
      message: 'Tạo nhà cung cấp thành công',
      supplier: { supplier_id: 4, supplier_code: 'NCC004', supplier_name: 'Nhà cung cấp mới' },
    });

    supplierService.updateSupplier.mockResolvedValue({
      message: 'Cập nhật nhà cung cấp thành công',
      supplier: { ...mockSuppliers[0], supplier_name: 'Công ty Gỗ Hoàng Gia Đã Sửa' },
    });

    supplierService.deleteSupplier.mockResolvedValue({
      message: 'Xóa nhà cung cấp thành công',
    });
  });

  it('renders header, title, and action buttons properly', async () => {
    render(<ManageSuppliersPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Quản Lý Nhà Cung Cấp/i })).toBeInTheDocument();
    expect(screen.getByText(/Quản lý đối tác cung ứng vật tư gỗ, phụ kiện ngũ kim/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Làm mới/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thêm nhà cung cấp/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(supplierService.getSuppliers).toHaveBeenCalled();
    });
  });

  it('renders 3 summary statistics cards with correct counts', async () => {
    render(<ManageSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Tổng nhà cung cấp/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Tổng nhà cung cấp/i)).toBeInTheDocument();
    // 3 total, 2 active, 1 inactive
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  it('renders suppliers list in table with supplier codes, names, and phone numbers', async () => {
    render(<ManageSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Công ty Gỗ Hoàng Gia')).toBeInTheDocument();
    });

    expect(screen.getByText('NCC001')).toBeInTheDocument();
    expect(screen.getByText('0987654321')).toBeInTheDocument();
    expect(screen.getByText('Công ty Phụ Kiện Mộc An')).toBeInTheDocument();
    expect(screen.getByText('NCC002')).toBeInTheDocument();
    expect(screen.getByText('Sơn PU Đại Hưng')).toBeInTheDocument();
    expect(screen.getByText('NCC003')).toBeInTheDocument();
  });

  it('filters suppliers when clicking status pill tabs', async () => {
    const user = userEvent.setup();
    render(<ManageSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Công ty Gỗ Hoàng Gia')).toBeInTheDocument();
    });

    const activeTab = screen.getByRole('button', { name: /Đang hoạt động/i });
    await user.click(activeTab);

    await waitFor(() => {
      expect(supplierService.getSuppliers).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ACTIVE' })
      );
    });

    const inactiveTab = screen.getByRole('button', { name: /Ngừng hoạt động/i });
    await user.click(inactiveTab);

    await waitFor(() => {
      expect(supplierService.getSuppliers).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'INACTIVE' })
      );
    });
  });

  it('filters by search keyword when typing in the search box', async () => {
    const user = userEvent.setup();
    render(<ManageSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Công ty Gỗ Hoàng Gia')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo mã nhà cung cấp, tên hoặc số điện thoại/i);
    await user.type(searchInput, 'Hoàng Gia');

    await waitFor(() => {
      expect(supplierService.getSuppliers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Hoàng Gia' })
      );
    });
  });

  it('opens create supplier modal when clicking "Thêm nhà cung cấp" and displays next code', async () => {
    const user = userEvent.setup();
    render(<ManageSuppliersPage />);

    const createBtn = screen.getByRole('button', { name: /Thêm nhà cung cấp/i });
    await user.click(createBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Thêm Mới Nhà Cung Cấp/i })).toBeInTheDocument();
    });

    expect(supplierService.getNextSupplierCode).toHaveBeenCalled();
    expect(screen.getByDisplayValue('NCC004')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lưu nhà cung cấp/i })).toBeInTheDocument();
  });

  it('prevents creating supplier when phone number is already used by another supplier', async () => {
    const user = userEvent.setup();
    render(<ManageSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Công ty Gỗ Hoàng Gia')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /Thêm nhà cung cấp/i });
    await user.click(createBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Thêm Mới Nhà Cung Cấp/i })).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Công ty Cổ phần Gỗ Hoàng Gia/i);
    const phoneInput = screen.getByPlaceholderText(/02838629999/i);
    const submitBtn = screen.getByRole('button', { name: /Lưu nhà cung cấp/i });

    // Try creating with phone '0987654321', which already belongs to NCC001 (Công ty Gỗ Hoàng Gia)
    await user.type(nameInput, 'Công ty Gỗ Test Trùng SĐT');
    await user.type(phoneInput, '0987654321');
    await user.click(submitBtn);

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Số điện thoại '0987654321' đã được sử dụng bởi nhà cung cấp 'Công ty Gỗ Hoàng Gia'")
    );
    expect(supplierService.createSupplier).not.toHaveBeenCalled();
  });

  it('opens edit modal when clicking edit button and submits updates', async () => {
    const user = userEvent.setup();
    render(<ManageSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Công ty Gỗ Hoàng Gia')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /Sửa/i });
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Chỉnh Sửa Nhà Cung Cấp/i })).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Công ty Gỗ Hoàng Gia')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(supplierService.updateSupplier).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ supplier_name: 'Công ty Gỗ Hoàng Gia' })
      );
    });
  });

  it('prevents updating supplier when new phone number is already used by another supplier', async () => {
    const user = userEvent.setup();
    render(<ManageSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Công ty Phụ Kiện Mộc An')).toBeInTheDocument();
    });

    // Click edit on supplier 2 (NCC002, Công ty Phụ Kiện Mộc An)
    const editButtons = screen.getAllByRole('button', { name: /Sửa/i });
    await user.click(editButtons[1]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Chỉnh Sửa Nhà Cung Cấp/i })).toBeInTheDocument();
    });

    // Supplier 2 currently has phone 0912345678. Try changing it to 0987654321 (which belongs to NCC001)
    const phoneInput = screen.getByDisplayValue('0912345678');
    await user.clear(phoneInput);
    await user.type(phoneInput, '0987654321');

    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    await user.click(saveBtn);

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Số điện thoại '0987654321' đã được sử dụng bởi nhà cung cấp 'Công ty Gỗ Hoàng Gia'")
    );
    expect(supplierService.updateSupplier).not.toHaveBeenCalled();
  });

  it('opens detail modal with receipt history when clicking supplier name or detail button', async () => {
    const user = userEvent.setup();
    render(<ManageSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Công ty Gỗ Hoàng Gia')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết/i });
    await user.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Lịch sử phiếu nhập nguyên vật liệu/i)).toBeInTheDocument();
    });

    expect(screen.getByText('PNK-20261120-001')).toBeInTheDocument();
    expect(screen.getByText('PNK-20261124-001')).toBeInTheDocument();
    expect(screen.getAllByText(/45.000.000/i).length).toBeGreaterThanOrEqual(1);
  });

  it('opens delete confirmation modal and confirms deletion when no conflict', async () => {
    const user = userEvent.setup();
    render(<ManageSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Công ty Gỗ Hoàng Gia')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /Xóa/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Xóa vĩnh viễn nhà cung cấp\?/i })).toBeInTheDocument();
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: /Xác nhận Xóa/i });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(supplierService.deleteSupplier).toHaveBeenCalledWith(1);
    });
  });

  it('handles 409 conflict when supplier has receipts and allows quick deactivation to INACTIVE', async () => {
    const user = userEvent.setup();
    supplierService.deleteSupplier.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          message: 'Không thể xóa nhà cung cấp vì đã có 2 phiếu nhập kho liên quan.',
        },
      },
    });

    render(<ManageSuppliersPage />);

    await waitFor(() => {
      expect(screen.getByText('Công ty Gỗ Hoàng Gia')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /Xóa/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Xóa vĩnh viễn nhà cung cấp\?/i })).toBeInTheDocument();
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: /Xác nhận Xóa/i });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/Cảnh báo ràng buộc toàn vẹn dữ liệu/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Không thể xóa nhà cung cấp vì đã có 2 phiếu nhập kho liên quan/i)).toBeInTheDocument();

    const deactivateBtn = screen.getByRole('button', { name: /Chuyển sang INACTIVE/i });
    await user.click(deactivateBtn);

    await waitFor(() => {
      expect(supplierService.updateSupplier).toHaveBeenCalledWith(1, { status: 'INACTIVE' });
    });
  });
});
