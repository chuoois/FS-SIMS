import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrdersPage } from '../pages/sale-pages/OrdersPage';
import * as saleOrderService from '../services/saleOrderService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../services/saleOrderService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('OrdersPage Component', () => {
  const mockOrders = [
    {
      orderId: 101,
      orderCode: 'ORD-20261124-0001',
      contractCode: 'HD-20261120-0001',
      contactName: 'Phạm Minh Tuấn',
      contactPhone: '0912345678',
      orderType: 'CUSTOM',
      totalAmount: 18500000,
      depositAmount: 5000000,
      paidAmount: 5000000,
      remainingAmount: 13500000,
      status: 'CONFIRMED',
      items: [
        {
          orderItemId: 1,
          productName: 'Tủ quần áo gỗ sồi Nga 4 cánh',
          productCode: 'TQA-01',
          quantity: 1,
          unitPrice: 18500000,
          totalPrice: 18500000,
          lengthCm: 200,
          widthCm: 60,
          heightCm: 220,
          materialName: 'Gỗ sồi Nga',
          colorName: 'Màu tự nhiên',
        },
      ],
    },
    {
      orderId: 102,
      orderCode: 'ORD-20261124-0002',
      contractCode: null,
      contactName: 'Hoàng Lan Anh',
      contactPhone: '0987654321',
      orderType: 'READY',
      totalAmount: 4200000,
      depositAmount: 4200000,
      paidAmount: 4200000,
      remainingAmount: 0,
      status: 'READY_TO_DELIVER',
      items: [
        {
          orderItemId: 2,
          productName: 'Bàn trà sofa gỗ hương',
          productCode: 'BT-02',
          quantity: 1,
          unitPrice: 4200000,
          totalPrice: 4200000,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    saleOrderService.getOrders.mockResolvedValue({
      data: mockOrders,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 2,
        itemsPerPage: 10,
      },
    });
    saleOrderService.getOrderById.mockImplementation((id) => {
      const found = mockOrders.find((o) => o.orderId === id);
      return Promise.resolve({ data: found });
    });
  });

  it('renders page header, status tabs, and order table correctly', async () => {
    render(<OrdersPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Quản lý đơn hàng' })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('ORD-20261124-0001')).toBeInTheDocument();
      expect(screen.getByText('Phạm Minh Tuấn')).toBeInTheDocument();
      expect(screen.getByText('ORD-20261124-0002')).toBeInTheDocument();
      expect(screen.getByText('Hoàng Lan Anh')).toBeInTheDocument();
    });
  });

  it('filters orders when clicking a status tab', async () => {
    render(<OrdersPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('ORD-20261124-0001')).toBeInTheDocument();
    });

    const confirmedTab = screen.getByRole('button', { name: /Đã xác nhận/i });
    await user.click(confirmedTab);

    await waitFor(() => {
      expect(saleOrderService.getOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'CONFIRMED',
        })
      );
    });
  });

  it('opens detail modal on clicking Chi tiết', async () => {
    render(<OrdersPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('ORD-20261124-0001')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết/i });
    await user.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Chi tiết đơn hàng ORD-20261124-0001/i)).toBeInTheDocument();
      expect(screen.getAllByText('Tủ quần áo gỗ sồi Nga 4 cánh').length).toBeGreaterThan(0);
      expect(screen.getByText('Tình trạng thanh toán')).toBeInTheDocument();
    });
  });

  it('navigates to create order page on clicking Tạo đơn tại quầy', async () => {
    render(<OrdersPage />);
    const user = userEvent.setup();

    const createBtn = screen.getByRole('button', { name: /Tạo đơn tại quầy/i });
    await user.click(createBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/sale/create-order');
  });
});
