// =========================================================
// ContractsPage.test.jsx
// Unit tests cho trang Quản lý hợp đồng (ContractsPage) của Sale/Owner
// Kiểm tra chức năng phân trang (Pagination), tìm kiếm và bộ lọc
// =========================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ContractsPage } from '../pages/sale-pages/ContractsPage';
import * as saleOrderService from '../services/saleOrderService';

vi.mock('../services/saleOrderService', () => ({
  getContracts: vi.fn(),
  getContractById: vi.fn(),
  signContract: vi.fn(),
  createOrderFromContract: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockContracts = [
  {
    contractId: 1,
    contractCode: 'HD-20261102-0001',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0912345678',
    customerAddress: '123 Lê Lợi, Q1, TP.HCM',
    totalAmount: 15000000,
    depositAmount: 4500000,
    remainingAmount: 10500000,
    status: 'DRAFT',
    createdAt: '2026-11-02T10:00:00.000Z',
    items: [
      {
        contractItemId: 101,
        productName: 'Bàn ăn cao cấp gỗ sồi',
        productCode: 'PRD-0001',
        quantity: 1,
        unitPrice: 15000000,
        totalPrice: 15000000,
      },
    ],
  },
  {
    contractId: 2,
    contractCode: 'HD-20261102-0002',
    customerName: 'Trần Thị B',
    customerPhone: '0987654321',
    customerAddress: '456 Nguyễn Huệ, Q1, TP.HCM',
    totalAmount: 8000000,
    depositAmount: 0,
    remainingAmount: 8000000,
    status: 'SIGNED',
    createdAt: '2026-11-02T11:00:00.000Z',
    items: [
      {
        contractItemId: 102,
        productName: 'Tủ quần áo gỗ gõ đỏ 4 cánh',
        productCode: 'PRD-0002',
        quantity: 1,
        unitPrice: 8000000,
        totalPrice: 8000000,
      },
    ],
  },
];

describe('ContractsPage - Quản lý hợp đồng (Pagination & Search)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saleOrderService.getContracts.mockResolvedValue({
      data: mockContracts,
      pagination: { totalItems: 2, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });
    saleOrderService.getContractById.mockResolvedValue({
      data: mockContracts[0],
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <ContractsPage />
      </MemoryRouter>
    );

  it('Hiển thị giao diện danh sách hợp đồng và thanh phân trang', async () => {
    renderComponent();

    expect(screen.getByText('Danh Sách Hợp Đồng')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('HD-20261102-0001')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText('HD-20261102-0002')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    });

    // Thanh phân trang hiển thị thông tin
    expect(screen.getByText(/Hiển thị/i)).toBeInTheDocument();
    expect(screen.getByText(/trên tổng số/i)).toBeInTheDocument();
    expect(screen.getByText(/Trang 1 \/ 1/i)).toBeInTheDocument();
  });

  it('Hỗ trợ thay đổi số lượng hợp đồng hiển thị mỗi trang (page size selector)', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('HD-20261102-0001')).toBeInTheDocument();
    });

    // Chọn hiển thị 20 hợp đồng mỗi trang
    const pageSizeSelect = screen.getByLabelText(/Số hợp đồng mỗi trang/i);
    await user.selectOptions(pageSizeSelect, '20');

    await waitFor(() => {
      expect(saleOrderService.getContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          page: 1,
        })
      );
    });
  });

  it('Tìm kiếm hợp đồng theo Tên khách hàng', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('HD-20261102-0001')).toBeInTheDocument();
    });

    // Chọn tiêu chí: Tên khách hàng
    const searchBySelect = screen.getByLabelText(/Tiêu chí tìm kiếm hợp đồng/i);
    await user.selectOptions(searchBySelect, 'CUSTOMER_NAME');

    const searchInput = screen.getByPlaceholderText(/Nhập họ tên khách hàng cần tìm/i);
    await user.type(searchInput, 'Nguyễn Văn A');

    await waitFor(() => {
      expect(saleOrderService.getContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_name: 'Nguyễn Văn A',
        })
      );
    });
  });

  it('Lọc hợp đồng theo trạng thái DRAFT / SIGNED', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('HD-20261102-0001')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText(/Lọc trạng thái hợp đồng/i);
    await user.selectOptions(statusSelect, 'DRAFT');

    await waitFor(() => {
      expect(saleOrderService.getContracts).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'DRAFT',
        })
      );
    });
  });
});

