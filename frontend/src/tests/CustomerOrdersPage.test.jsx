import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CustomerOrdersPage } from '../pages/public-pages/CustomerOrdersPage';
import { CustomerOrderDetailPage } from '../pages/public-pages/CustomerOrderDetailPage';
import * as customerOrderService from '../services/customerOrderService';

vi.mock('../services/customerOrderService', () => ({
  getMyOrders: vi.fn(),
  getMyOrderById: vi.fn(),
}));

const mockOrder = {
  orderId: 31,
  orderCode: 'ORD-20261102-0001',
  orderType: 'READY',
  status: 'CONFIRMED',
  createdAt: '2026-11-02T10:00:00.000Z',
  expectedDate: '2026-11-10',
  totalAmount: 2500000,
  paidAmount: 500000,
  remainingAmount: 2000000,
  contactName: 'Nguyễn An',
  contactPhone: '0900000000',
  deliveryAddress: 'Quận 1, TP.HCM',
  items: [{
    orderItemId: 3,
    productName: 'Bàn ăn gỗ sồi',
    productCode: 'BAN-001',
    quantity: 1,
    unitPrice: 2500000,
    totalPrice: 2500000,
  }],
};

describe('Customer order pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị danh sách đơn hàng và link đến chi tiết', async () => {
    customerOrderService.getMyOrders.mockResolvedValue({
      data: [mockOrder],
      pagination: { totalItems: 1, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });

    render(
      <MemoryRouter>
        <CustomerOrdersPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('ORD-20261102-0001')).toBeInTheDocument();
    expect(screen.getByText('Đã xác nhận')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /xem chi tiết/i })).toHaveAttribute(
      'href',
      '/my-orders/31'
    );
  });

  it('hiển thị chi tiết đơn hàng và các sản phẩm trong đơn', async () => {
    customerOrderService.getMyOrderById.mockResolvedValue({ data: mockOrder });

    render(
      <MemoryRouter initialEntries={['/my-orders/31']}>
        <CustomerOrderDetailPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Bàn ăn gỗ sồi')).toBeInTheDocument();
    expect(screen.getByText('Quận 1, TP.HCM')).toBeInTheDocument();
    expect(screen.getByText(/2\.000\.000/)).toBeInTheDocument();
  });

  it('hiển thị lỗi khi API từ chối hoặc không tìm thấy đơn hàng', async () => {
    customerOrderService.getMyOrderById.mockRejectedValue({
      response: { status: 404 },
    });

    render(
      <MemoryRouter initialEntries={['/my-orders/99']}>
        <CustomerOrderDetailPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText('Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn này.')
      ).toBeInTheDocument();
    });
  });
});
