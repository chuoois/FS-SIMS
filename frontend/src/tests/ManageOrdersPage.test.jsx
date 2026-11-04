import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageOrdersPage } from '../pages/owner-pages/ManageOrdersPage';
import * as orderManagementService from '../services/orderManagementService';

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
      orderId: 1,
      orderCode: 'ORD-20261101-0001',
      orderType: 'CUSTOM',
      orderTypeLabel: 'Đặt theo yêu cầu',
      contactName: 'Nguyễn Văn Khách',
      contactPhone: '0901234567',
      staffName: 'Nguyễn Nhân Viên',
      status: 'CONFIRMED',
      statusLabel: 'Đã xác nhận',
      totalAmount: 15000000,
      depositAmount: 5000000,
      paidAmount: 5000000,
      remainingAmount: 10000000,
      expectedDate: '2026-12-01',
      deliveredDate: null,
      items: [],
    },
    {
      orderId: 2,
      orderCode: 'ORD-20261101-0002',
      orderType: 'READY',
      orderTypeLabel: 'Hàng sẵn',
      contactName: 'Trần Thị Mua Hàng',
      contactPhone: '0907654321',
      staffName: 'Lê Nhân Viên Khác',
      status: 'COMPLETED',
      statusLabel: 'Hoàn thành',
      totalAmount: 8000000,
      depositAmount: 0,
      paidAmount: 8000000,
      remainingAmount: 0,
      expectedDate: '2026-11-15',
      deliveredDate: '2026-11-14',
      items: [],
    },
  ];

  const mockPagination = {
    totalItems: 2,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    orderManagementService.getOrders.mockResolvedValue({
      orders: mockOrders,
      pagination: mockPagination,
    });
  });

  // ─── 1. Render cơ bản ────────────────────────────────────────────
  it('hiển thị tiêu đề trang', async () => {
    render(<ManageOrdersPage />);
    await waitFor(() => {
      expect(screen.getByText('Quản lý đơn hàng')).toBeDefined();
    });
  });

  // ─── 2. Danh sách đơn hàng ───────────────────────────────────────
  it('hiển thị danh sách đơn hàng sau khi tải', async () => {
    render(<ManageOrdersPage />);
    await waitFor(() => {
      const codes = screen.getAllByText(/ORD-20261101/);
      expect(codes.length).toBeGreaterThan(0);
    });
  });

  it('hiển thị tên khách hàng trong bảng', async () => {
    render(<ManageOrdersPage />);
    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Khách')).toBeDefined();
      expect(screen.getByText('Trần Thị Mua Hàng')).toBeDefined();
    });
  });

  // ─── 3. Trạng thái rỗng ─────────────────────────────────────────
  it('hiển thị thông báo rỗng khi không có đơn hàng', async () => {
    orderManagementService.getOrders.mockResolvedValueOnce({
      orders: [],
      pagination: { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });
    render(<ManageOrdersPage />);
    await waitFor(() => {
      expect(screen.getByText(/không có đơn hàng/i)).toBeDefined();
    });
  });

  // ─── 4. Thống kê ─────────────────────────────────────────────────
  it('hiển thị card thống kê', async () => {
    render(<ManageOrdersPage />);
    await waitFor(() => {
      // Card labels - xuất hiện đúng 1 lần mỗi card
      expect(screen.getByText('Tổng đơn hàng')).toBeDefined();
      // Các label có thể trùng với dropdown options hoặc badge → dùng getAllByText
      expect(screen.getAllByText('Đã xác nhận').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Đang sản xuất').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Hoàn thành').length).toBeGreaterThan(0);
    });
  });

  // ─── 5. Mở modal chi tiết ────────────────────────────────────────
  it('mở modal chi tiết khi bấm nút Chi tiết', async () => {
    const user = userEvent.setup();
    const mockDetail = {
      ...mockOrders[0],
      contractCode: 'CON-001',
      items: [
        {
          orderItemId: 1,
          productName: 'Bàn gỗ sồi',
          quantity: 2,
          unitPrice: 5000000,
          totalPrice: 10000000,
        },
      ],
    };
    orderManagementService.getOrderDetail.mockResolvedValueOnce({ order: mockDetail });

    render(<ManageOrdersPage />);
    await waitFor(() => screen.getAllByText('Chi tiết'));

    const buttons = screen.getAllByText('Chi tiết');
    await user.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getByText(/chi tiết đơn hàng/i)).toBeDefined();
    });
  });

  // ─── 6. Hủy đơn hàng ────────────────────────────────────────────
  it('hiển thị dialog xác nhận khi bấm nút Hủy', async () => {
    const user = userEvent.setup();
    render(<ManageOrdersPage />);

    await waitFor(() => screen.getAllByText('Hủy'));
    const cancelButtons = screen.getAllByText('Hủy');
    await user.click(cancelButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/xác nhận hủy đơn hàng/i)).toBeDefined();
    });
  });

  // ─── 7. Mở modal cập nhật trạng thái ────────────────────────────
  it('mở modal cập nhật trạng thái khi bấm nút Cập nhật', async () => {
    const user = userEvent.setup();
    render(<ManageOrdersPage />);

    await waitFor(() => screen.getAllByText('Cập nhật'));
    const updateButtons = screen.getAllByText('Cập nhật');
    await user.click(updateButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/cập nhật trạng thái đơn hàng/i)).toBeDefined();
    });
  });

  // ─── 8. Bộ lọc ───────────────────────────────────────────────────
  it('gọi API lại khi thay đổi bộ lọc trạng thái', async () => {
    const user = userEvent.setup();
    render(<ManageOrdersPage />);

    await waitFor(() => screen.getByText('Quản lý đơn hàng'));

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'CONFIRMED');

    await waitFor(() => {
      expect(orderManagementService.getOrders).toHaveBeenCalledTimes(2);
    });
  });
});
