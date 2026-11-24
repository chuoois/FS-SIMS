import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageOrdersPage } from '../pages/owner-pages/ManageOrdersPage';
import * as orderManagementService from '../services/orderManagementService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../services/orderManagementService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ManageOrdersPage Component', () => {
  const mockOrders = [
    {
      orderId: 101,
      orderCode: 'ORD-20261124-0001',
      contractCode: 'HD-20261120-0001',
      contactName: 'Phạm Minh Tuấn',
      contactPhone: '0912345678',
      deliveryAddress: '123 Đường Láng, Đống Đa, Hà Nội',
      orderType: 'CUSTOM',
      totalAmount: 18500000,
      depositAmount: 5000000,
      paidAmount: 5000000,
      remainingAmount: 13500000,
      status: 'CONFIRMED',
      statusLabel: 'Đã xác nhận',
      staffName: 'Lê Văn An',
      expectedDate: '2026-12-10T00:00:00.000Z',
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
      contactName: 'Nguyễn Thị Hoa',
      contactPhone: '0987654321',
      deliveryAddress: '456 Cầu Giấy, Hà Nội',
      orderType: 'READY',
      totalAmount: 4200000,
      depositAmount: 4200000,
      paidAmount: 4200000,
      remainingAmount: 0,
      status: 'COMPLETED',
      statusLabel: 'Hoàn thành',
      staffName: 'Trần Văn Bình',
      expectedDate: '2026-11-25T00:00:00.000Z',
      items: [
        {
          orderItemId: 2,
          productName: 'Ghế ăn gỗ gõ đỏ chạm hoa sen',
          productCode: 'GA-02',
          quantity: 2,
          unitPrice: 2100000,
          totalPrice: 4200000,
          materialName: 'Gỗ gõ đỏ',
        },
      ],
    },
    {
      orderId: 103,
      orderCode: 'ORD-20261124-0003',
      contactName: 'Trần Đại Nghĩa',
      contactPhone: '0933123456',
      orderType: 'CUSTOM',
      totalAmount: 25000000,
      depositAmount: 10000000,
      paidAmount: 10000000,
      remainingAmount: 15000000,
      status: 'NEW',
      statusLabel: 'Mới tạo',
      staffName: 'Lê Văn An',
      expectedDate: '2026-12-20T00:00:00.000Z',
      items: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    orderManagementService.getOrders.mockResolvedValue({
      orders: mockOrders,
      pagination: {
        totalItems: 3,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });
    orderManagementService.getOrderDetail.mockImplementation((id) => {
      const found = mockOrders.find((o) => o.orderId === Number(id));
      return Promise.resolve({ order: found || mockOrders[0] });
    });
    orderManagementService.cancelOrder.mockResolvedValue({
      message: 'Hủy đơn hàng thành công',
    });
    orderManagementService.updateOrderStatus.mockResolvedValue({
      message: 'Cập nhật trạng thái thành công',
    });
  });

  it('renders page header, title, and "Làm mới" button', async () => {
    render(<ManageOrdersPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Quản Lý Đơn Hàng/i })).toBeInTheDocument();
    expect(screen.getByText(/Theo dõi tiến độ gia công xưởng mộc/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Làm mới/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(orderManagementService.getOrders).toHaveBeenCalled();
    });
  });

  it('renders 4 overview stats cards correctly', async () => {
    render(<ManageOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('Tổng đơn hàng')).toBeInTheDocument();
      expect(screen.getAllByText('Đã xác nhận').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Đang gia công').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Đã hoàn thành').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
  });

  it('renders order list in the table with codes and customer details', async () => {
    render(<ManageOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-20261124-0001')).toBeInTheDocument();
      expect(screen.getByText('Phạm Minh Tuấn')).toBeInTheDocument();
      expect(screen.getByText('ORD-20261124-0002')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Thị Hoa')).toBeInTheDocument();
    });
  });

  it('filters by status when clicking status tabs', async () => {
    const user = userEvent.setup();
    render(<ManageOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-20261124-0001')).toBeInTheDocument();
    });

    const confirmedTab = screen.getByRole('button', { name: /Đã xác nhận/i });
    await user.click(confirmedTab);

    await waitFor(() => {
      expect(orderManagementService.getOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'CONFIRMED',
        })
      );
    });
  });

  it('filters by search keyword when typed in search box', async () => {
    const user = userEvent.setup();
    render(<ManageOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-20261124-0001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo mã đơn, tên khách hàng/i);
    await user.type(searchInput, 'ORD-20261124-0001');

    await waitFor(() => {
      expect(orderManagementService.getOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'ORD-20261124-0001',
        })
      );
    });
  });

  it('opens order detail modal when clicking "Chi tiết" button', async () => {
    const user = userEvent.setup();
    render(<ManageOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-20261124-0001')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết/i });
    await user.click(detailButtons[0]);

    await waitFor(() => {
      expect(orderManagementService.getOrderDetail).toHaveBeenCalledWith(101);
      expect(screen.getByText(/Chi tiết đơn hàng —/i)).toBeInTheDocument();
      expect(screen.getByText(/Thông tin người nhận/i)).toBeInTheDocument();
      expect(screen.getByText(/Tình trạng thanh toán/i)).toBeInTheDocument();
      expect(screen.getByText(/Sản phẩm trong đơn/i)).toBeInTheDocument();
      expect(screen.getByText('Tủ quần áo gỗ sồi Nga 4 cánh')).toBeInTheDocument();
    });
  });

  it('advances order status when clicking next status button (e.g. Tiếp nhận đơn)', async () => {
    const user = userEvent.setup();
    render(<ManageOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-20261124-0003')).toBeInTheDocument();
    });

    // Order 103 has status NEW, so it has "Tiếp nhận đơn" button
    const advanceBtn = screen.getByRole('button', { name: /Tiếp nhận đơn/i });
    await user.click(advanceBtn);

    await waitFor(() => {
      expect(orderManagementService.updateOrderStatus).toHaveBeenCalledWith(103, {
        status: 'CONFIRMED',
      });
    });
  });

  it('opens cancel dialog and cancels order successfully', async () => {
    const user = userEvent.setup();
    render(<ManageOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-20261124-0001')).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByRole('button', { name: 'Hủy' });
    await user.click(cancelButtons[0]);

    // Modal appears
    await waitFor(() => {
      expect(screen.getByText('Xác nhận hủy đơn hàng')).toBeInTheDocument();
    });

    const confirmCancelBtn = screen.getByRole('button', { name: /Xác nhận hủy/i });
    await user.click(confirmCancelBtn);

    await waitFor(() => {
      expect(orderManagementService.cancelOrder).toHaveBeenCalledWith(101);
    });
  });
});
