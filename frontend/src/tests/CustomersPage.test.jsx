// =========================================================
// CustomersPage.test.jsx
// Unit tests cho trang Quản lý khách hàng (Sale role)
// Mock service theo đúng pattern dự án
// =========================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CustomersPage } from '../pages/sale-pages/CustomersPage';
import * as saleOrderService from '../services/saleOrderService';

// Mock service
jest.mock('../services/saleOrderService');

const mockPagination = {
  totalItems: 2,
  totalPages: 1,
  currentPage: 1,
  itemsPerPage: 10,
};

const mockCustomers = [
  {
    user_account_id: 1,
    full_name: 'Nguyễn Thị Mai',
    email: 'mai@example.com',
    phone_number: '0901234567',
    status: 'ACTIVE',
    address: '123 Nguyễn Trãi, HCM',
    createdate: '2026-01-15T00:00:00.000Z',
    totalRequests: 3,
    totalContracts: 1,
    totalOrders: 1,
  },
  {
    user_account_id: 2,
    full_name: 'Trần Văn Bình',
    email: 'binh@example.com',
    phone_number: '0912345678',
    status: 'INACTIVE',
    address: null,
    createdate: '2026-02-20T00:00:00.000Z',
    totalRequests: 0,
    totalContracts: 0,
    totalOrders: 0,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <Toaster />
      <CustomersPage />
    </MemoryRouter>
  );
}

describe('CustomersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    saleOrderService.getCustomers.mockResolvedValue({
      data: mockCustomers,
      pagination: mockPagination,
    });
  });

  test('hiển thị tiêu đề trang và danh sách khách hàng', async () => {
    renderPage();

    expect(screen.getByText('Quản lý khách hàng')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Thị Mai')).toBeInTheDocument();
      expect(screen.getByText('Trần Văn Bình')).toBeInTheDocument();
    });
  });

  test('hiển thị trạng thái badge đúng (ACTIVE / INACTIVE)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Hoạt động')).toBeInTheDocument();
      expect(screen.getByText('Ngừng HĐ')).toBeInTheDocument();
    });
  });

  test('gọi lại API khi thay đổi bộ lọc status', async () => {
    renderPage();

    await waitFor(() => {
      expect(saleOrderService.getCustomers).toHaveBeenCalledTimes(1);
    });

    const statusSelect = screen.getAllByRole('combobox')[1]; // status là select thứ 2
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });

    await waitFor(() => {
      expect(saleOrderService.getCustomers).toHaveBeenCalledTimes(2);
      expect(saleOrderService.getCustomers).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'ACTIVE' })
      );
    });
  });

  test('mở modal chi tiết khi nhấn nút Xem', async () => {
    saleOrderService.getCustomerById.mockResolvedValue({
      data: {
        ...mockCustomers[0],
        requests: [],
        contracts: [],
        orders: [],
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Thị Mai')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText('Xem');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(saleOrderService.getCustomerById).toHaveBeenCalledWith(1);
    });
  });

  test('hiển thị thông báo rỗng khi không có khách hàng', async () => {
    saleOrderService.getCustomers.mockResolvedValue({
      data: [],
      pagination: { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy khách hàng')).toBeInTheDocument();
    });
  });
});

