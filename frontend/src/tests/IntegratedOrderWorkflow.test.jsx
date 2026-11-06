import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CreateOrderRequestPage } from '../pages/sale-pages/CreateOrderRequestPage';
import { LeaderOrdersPage } from '../pages/staff-pages/LeaderOrdersPage';
import * as saleOrderService from '../services/saleOrderService';
import * as orderManagementService from '../services/orderManagementService';

vi.mock('../services/saleOrderService', () => ({
  getProductMetadata: vi.fn(),
  getCustomers: vi.fn(),
  createSalesOrderRequest: vi.fn(),
  updateSalesOrderRequest: vi.fn(),
  getRequestById: vi.fn(),
  confirmOrderDelivery: vi.fn(),
  completeOrderDelivery: vi.fn(),
}));

vi.mock('../services/orderManagementService', () => ({
  getLeaderOrders: vi.fn(),
  leaderAcceptOrder: vi.fn(),
  leaderUpdateProgress: vi.fn(),
  leaderSubmitInspection: vi.fn(),
  getOrderDetail: vi.fn(),
  getStaffLeaders: vi.fn(),
  assignLeaderToOrder: vi.fn(),
  inspectOrder: vi.fn(),
  getOwnerRequests: vi.fn(),
  getOwnerRequestById: vi.fn(),
  reviewOwnerRequest: vi.fn(),
}));

describe('Frontend Integrated Workflow - Order Request & Leader Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    saleOrderService.getProductMetadata.mockResolvedValue({
      data: {
        categories: [{ categoryId: 1, categoryName: 'Tủ kệ' }],
        rooms: [{ roomId: 1, roomName: 'Phòng khách' }],
        materials: [{ materialId: 1, materialName: 'Gỗ Sồi' }],
        colors: [{ colorId: 1, colorName: 'Màu gỗ tự nhiên' }],
      },
    });

    saleOrderService.getCustomers.mockResolvedValue({
      data: [
        {
          user_account_id: 11,
          customerAccountId: 11,
          full_name: 'Phạm Minh Khách',
          phone_number: '0900000011',
          email: 'khach@fssims.local',
          address: '45 Lê Lợi, Q1',
        },
      ],
    });
  });

  it('1. CreateOrderRequestPage: Hiển thị form thông tin khách hàng, giao nhận và thông số kỹ thuật (D x R x C)', async () => {
    render(
      <MemoryRouter>
        <CreateOrderRequestPage />
      </MemoryRouter>
    );

    // Tiêu đề
    expect(screen.getByText(/Lập Yêu Cầu Thiết Kế & May Đo Mới/i)).toBeInTheDocument();
    expect(screen.getByText(/1. Thông tin khách hàng & Giao nhận/i)).toBeInTheDocument();
    expect(screen.getByText(/2. Chi tiết sản phẩm & Thông số kỹ thuật/i)).toBeInTheDocument();
    expect(screen.getByText(/3. Hình ảnh thiết kế & Bản vẽ 3D\/2D/i)).toBeInTheDocument();

    // Các trường kích thước kỹ thuật
    expect(screen.getByText(/Chiều dài \(cm\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Chiều rộng \/ Sâu \(cm\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Chiều cao \(cm\)/i)).toBeInTheDocument();
  });

  it('2. CreateOrderRequestPage: Nhập thông tin, kích thước và mở modal xác nhận trước khi gửi', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CreateOrderRequestPage />
      </MemoryRouter>
    );

    // Điền thông tin khách
    const nameInput = screen.getByPlaceholderText(/VD: Nguyễn Văn A/i);
    const phoneInput = screen.getByPlaceholderText(/VD: 0912345678/i);
    fireEvent.change(nameInput, { target: { value: 'Trần Khách May Đo' } });
    fireEvent.change(phoneInput, { target: { value: '0988888888' } });

    // Điền sản phẩm
    const itemNameInput = screen.getByPlaceholderText(/VD: Tủ quần áo 4 cánh lùa kịch trần/i);
    fireEvent.change(itemNameInput, { target: { value: 'Tủ rượu gỗ sồi' } });

    // Điền kích thước
    const lengthInput = screen.getByPlaceholderText(/VD: 220/i);
    const widthInput = screen.getByPlaceholderText(/VD: 60/i);
    const heightInput = screen.getByPlaceholderText(/VD: 260/i);
    fireEvent.change(lengthInput, { target: { value: '200' } });
    fireEvent.change(widthInput, { target: { value: '60' } });
    fireEvent.change(heightInput, { target: { value: '210' } });

    // Nút gửi duyệt
    const submitBtn = screen.getByRole('button', { name: /Kiểm Tra & Gửi Chủ Xưởng Thẩm Định/i });
    await user.click(submitBtn);

    // Modal tóm tắt thông tin xuất hiện
    await waitFor(() => {
      expect(screen.getByText(/Xác nhận thông tin yêu cầu trước khi gửi Chủ xưởng/i)).toBeInTheDocument();
      expect(screen.getByText(/200 x 60 x 210 cm/i)).toBeInTheDocument();
      expect(screen.getByText('Trần Khách May Đo')).toBeInTheDocument();
    });
  });

  it('3. LeaderOrdersPage: Hiển thị danh sách đơn sản xuất và nút Tiếp nhận / Nghiệm thu', async () => {
    orderManagementService.getLeaderOrders.mockResolvedValue({
      orders: [
        {
          orderId: 501,
          orderCode: 'ORD-LEADER-001',
          contactName: 'Khách Hàng Xưởng',
          contactPhone: '0911223344',
          orderType: 'CUSTOM',
          status: 'CONFIRMED',
          totalAmount: 18000000,
          expectedDate: '2026-11-20',
          items: [
            {
              orderItemId: 1,
              itemName: 'Bàn họp gỗ sồi 3m',
              lengthCm: 300,
              widthCm: 120,
              heightCm: 75,
              quantity: 1,
              unitPrice: 18000000,
            },
          ],
        },
      ],
      pagination: { totalItems: 1, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });

    render(
      <MemoryRouter>
        <LeaderOrdersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ORD-LEADER-001')).toBeInTheDocument();
      expect(screen.getByText('Khách Hàng Xưởng')).toBeInTheDocument();
      expect(screen.getAllByText('Chờ tiếp nhận').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /Tiếp nhận/i })).toBeInTheDocument();
    });
  });
});
