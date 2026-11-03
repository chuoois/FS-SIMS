// =========================================================
// RequestsPage.test.jsx
// Unit tests cho trang Quản lý yêu cầu (RequestsPage) của Sale/Owner
// Kiểm tra danh sách, phân trang, lọc, xem chi tiết và chuyển thành hợp đồng
// =========================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RequestsPage } from '../pages/sale-pages/RequestsPage';
import * as saleOrderService from '../services/saleOrderService';

vi.mock('../services/saleOrderService', () => ({
  getRequests: vi.fn(),
  getRequestById: vi.fn(),
  convertRequestToContract: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockRequests = [
  {
    requestId: 1,
    requestCode: 'RQ-20261103-0001',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0912345678',
    customerEmail: 'nguyenvana@gmail.com',
    deliveryAddress: '123 Lê Lợi, Q1, TP.HCM',
    orderType: 'READY',
    status: 'PENDING',
    createdAt: '2026-11-03T10:00:00.000Z',
    items: [
      {
        requestItemId: 1,
        productId: 10,
        itemName: 'Bàn ăn thông minh',
        quantity: 2,
        unitPrice: 6000000,
      },
    ],
  },
  {
    requestId: 2,
    requestCode: 'RQ-20261103-0002',
    customerName: 'Trần Thị B',
    customerPhone: '0987654321',
    customerEmail: 'tranthib@gmail.com',
    deliveryAddress: '456 Nguyễn Huệ, Q1, TP.HCM',
    orderType: 'CUSTOM',
    status: 'CONVERTED',
    createdAt: '2026-11-03T11:00:00.000Z',
    items: [
      {
        requestItemId: 2,
        productId: null,
        itemName: 'Tủ bếp gỗ sồi thiết kế',
        quantity: 1,
        unitPrice: 25000000,
      },
    ],
    contract: {
      contractId: 10,
      contractCode: 'HD-20261103-0001',
      status: 'DRAFT',
    },
  },
];

describe('RequestsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    saleOrderService.getRequests.mockResolvedValue({
      message: 'Lấy danh sách yêu cầu khách hàng thành công',
      data: mockRequests,
      pagination: {
        totalItems: 2,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });

    saleOrderService.getRequestById.mockImplementation((id) => {
      const found = mockRequests.find((r) => r.requestId === Number(id));
      return Promise.resolve({
        message: 'Lấy chi tiết yêu cầu thành công',
        data: found || mockRequests[0],
      });
    });

    saleOrderService.convertRequestToContract.mockResolvedValue({
      message: 'Chuyển yêu cầu thành hợp đồng thành công',
      data: {
        contractId: 99,
        contractCode: 'HD-20261103-0099',
        requestCode: 'RQ-20261103-0001',
        totalAmount: 12000000,
        depositAmount: 3600000,
      },
    });
  });

  it('renders header, filter controls and request list correctly', async () => {
    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Yêu cầu của khách hàng')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm kiếm...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('RQ-20261103-0001')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText('RQ-20261103-0002')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    });
  });

  it('displays correct status badges and action buttons', async () => {
    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Chờ xử lý')).toBeInTheDocument();
      expect(screen.getByText('Đã chuyển HĐ')).toBeInTheDocument();
    });

    // PENDING should have 'Tạo HĐ' button
    expect(screen.getByText('Tạo HĐ')).toBeInTheDocument();
    // CONVERTED should have 'Xem HĐ' button
    expect(screen.getByText('Xem HĐ')).toBeInTheDocument();
  });

  it('opens detail modal when clicking view button', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('RQ-20261103-0001')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByTitle('Xem chi tiết');
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Chi tiết yêu cầu')).toBeInTheDocument();
      expect(screen.getByText('nguyenvana@gmail.com')).toBeInTheDocument();
    });
  });

  it('opens convert modal and converts request to contract', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tạo HĐ')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Tạo HĐ'));

    await waitFor(() => {
      expect(screen.getByText('Chuyển thành Hợp đồng')).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Tạo Hợp đồng/i });
    expect(submitBtn).toBeInTheDocument();

    await user.click(submitBtn);

    await waitFor(() => {
      expect(saleOrderService.convertRequestToContract).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          deposit_amount: expect.any(Number),
        })
      );
    });
  });

  it('resets filters when clicking reset button', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Tìm kiếm...');
    await user.type(searchInput, 'Nguyễn Văn');

    await waitFor(() => {
      expect(screen.getByText(/Đặt lại/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Đặt lại/));

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });
});

