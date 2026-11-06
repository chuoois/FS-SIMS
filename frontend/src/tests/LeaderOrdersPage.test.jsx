import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LeaderOrdersPage } from '../pages/staff-pages/LeaderOrdersPage';
import * as orderManagementService from '../services/orderManagementService';
import toast from 'react-hot-toast';

vi.mock('../services/orderManagementService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LeaderOrdersPage Component', () => {
  const mockOrders = [
    {
      orderId: 1,
      orderCode: 'ORD-202611-001',
      contractCode: 'CTR-202611-001',
      contactName: 'Nguyễn Văn A',
      contactPhone: '0912345678',
      status: 'CONFIRMED',
      deliveryDate: '2026-12-01',
      productionNote: '',
      items: [
        {
          orderItemId: 11,
          productName: 'Bàn ăn gỗ sồi may đo',
          materialName: 'Gỗ sồi Nga',
          colorName: 'Màu tự nhiên',
          lengthCm: 180,
          widthCm: 90,
          heightCm: 75,
          quantity: 1,
          customRequirements: 'Bo tròn 4 góc mép bàn',
        },
      ],
      images: [
        {
          imageUrl: 'https://example.com/ban-an.jpg',
          imageType: 'OVERALL',
        },
      ],
    },
    {
      orderId: 2,
      orderCode: 'ORD-202611-002',
      contractCode: 'CTR-202611-002',
      contactName: 'Trần Thị B',
      contactPhone: '0987654321',
      status: 'IN_PRODUCTION',
      deliveryDate: '2026-12-15',
      productionNote: 'Đang tiến hành xẻ gỗ và chà nhám',
      items: [],
      images: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    orderManagementService.getLeaderOrders.mockResolvedValue({
      data: mockOrders,
      pagination: { totalItems: 2, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });
    orderManagementService.leaderAcceptOrder.mockResolvedValue({ success: true });
    orderManagementService.leaderUpdateProgress.mockResolvedValue({ success: true });
    orderManagementService.leaderSubmitInspection.mockResolvedValue({ success: true });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <LeaderOrdersPage />
      </BrowserRouter>
    );

  it('Hiển thị danh sách đơn hàng được giao cho Tổ trưởng', async () => {
    renderComponent();

    expect(screen.getByText(/Quản Lý Đơn Hàng & Tiến Độ Sản Xuất/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('ORD-202611-001')).toBeInTheDocument();
      expect(screen.getByText('ORD-202611-002')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Chờ tiếp nhận')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Đang gia công')[0]).toBeInTheDocument();
  });

  it('Tổ trưởng bấm "Tiếp nhận sản xuất" cho đơn CONFIRMED', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ORD-202611-001')).toBeInTheDocument();
    });

    const acceptBtn = screen.getByRole('button', { name: /Tiếp nhận sản xuất/i });
    await user.click(acceptBtn);

    await waitFor(() => {
      expect(orderManagementService.leaderAcceptOrder).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Đã tiếp nhận sản xuất/i));
    });
  });

  it('Tổ trưởng mở modal xem bản vẽ đã khóa của Chủ xưởng (chống sửa đổi)', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ORD-202611-001')).toBeInTheDocument();
    });

    const viewDetailBtns = screen.getAllByRole('button', { name: /Bản vẽ đã chốt/i });
    await user.click(viewDetailBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Bản Vẽ & Thông Số Kỹ Thuật Đã Chốt/i)).toBeInTheDocument();
      expect(screen.getByText(/Bản vẽ thiết kế đã được Owner chốt và khóa chống sửa đổi/i)).toBeInTheDocument();
      expect(screen.getByText('Bàn ăn gỗ sồi may đo')).toBeInTheDocument();
      expect(screen.getByText('180 x 90 x 75 cm')).toBeInTheDocument();
      expect(screen.getByText('Gỗ sồi Nga')).toBeInTheDocument();
    });
  });

  it('Tổ trưởng bấm "Gửi nghiệm thu" lên Chủ xưởng khi hoàn thành sản xuất', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ORD-202611-002')).toBeInTheDocument();
    });

    const inspectBtn = screen.getByRole('button', { name: /Gửi nghiệm thu/i });
    await user.click(inspectBtn);

    await waitFor(() => {
      expect(screen.getByText(/Gửi nghiệm thu chất lượng: #ORD-202611-002/i)).toBeInTheDocument();
    });

    const confirmSubmitBtn = screen.getByRole('button', { name: /Xác nhận Gửi Nghiệm Thu/i });
    await user.click(confirmSubmitBtn);

    await waitFor(() => {
      expect(orderManagementService.leaderSubmitInspection).toHaveBeenCalledWith(2, expect.any(String));
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Đã gửi yêu cầu nghiệm thu/i));
    });
  });
});
