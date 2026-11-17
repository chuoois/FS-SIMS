import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeaderOrdersPage } from '../pages/staff-pages/LeaderOrdersPage';
import * as leaderStaffService from '../services/leaderStaffService';
import toast from 'react-hot-toast';

vi.mock('../services/leaderStaffService');
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
      orderCode: 'ORD-20261114-0001',
      orderType: 'CUSTOM',
      orderTypeLabel: 'Đặt theo yêu cầu',
      contactName: 'Nguyễn Văn Khách',
      contactPhone: '0901234567',
      deliveryAddress: '123 Đường Xưởng Mộc',
      contractCode: 'CON-20261114-0001',
      status: 'CONFIRMED',
      statusLabel: 'Chờ tiếp nhận',
      expectedDate: '2026-12-01',
      isProductionCompleted: false,
      rejectReason: null,
      items: [
        {
          orderItemId: 101,
          productName: 'Bàn ăn gỗ sồi 6 ghế',
          lengthCm: 180,
          widthCm: 90,
          heightCm: 75,
          quantity: 1,
          materialName: 'Gỗ Sồi Nga',
          colorName: 'Tự nhiên',
          colorHex: '#D2B48C',
          description: 'Sơn PU 3 lớp mờ 50%',
        },
      ],
    },
    {
      orderId: 2,
      orderCode: 'ORD-20261114-0002',
      orderType: 'CUSTOM',
      orderTypeLabel: 'Đặt theo yêu cầu',
      contactName: 'Trần Gia Công',
      contactPhone: '0908888888',
      deliveryAddress: '456 Phố Nội Thất',
      contractCode: 'CON-20261114-0002',
      status: 'IN_PRODUCTION',
      statusLabel: 'Đang gia công',
      expectedDate: '2026-12-10',
      isProductionCompleted: true,
      rejectReason: null,
      items: [],
    },
    {
      orderId: 3,
      orderCode: 'ORD-20261114-0003',
      orderType: 'CUSTOM',
      orderTypeLabel: 'Đặt theo yêu cầu',
      contactName: 'Lê Cần Làm Lại',
      contactPhone: '0907777777',
      deliveryAddress: '789 Xưởng Khắc Phục',
      contractCode: 'CON-20261114-0003',
      status: 'IN_PRODUCTION',
      statusLabel: 'Đang gia công',
      expectedDate: '2026-12-15',
      isProductionCompleted: false,
      rejectReason: 'Mối ghép chân bàn bị hở, sơn chưa đều góc khuất',
      items: [],
    },
  ];

  const mockPagination = {
    totalItems: 3,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    leaderStaffService.getLeaderOrders.mockResolvedValue({
      orders: mockOrders,
      pagination: mockPagination,
    });
    leaderStaffService.getLeaderOrderDetail.mockResolvedValue({
      order: mockOrders[0],
    });
    leaderStaffService.leaderAcceptOrder.mockResolvedValue({
      message: 'Tiếp nhận đơn hàng vào sản xuất thành công',
      order: { ...mockOrders[0], status: 'IN_PRODUCTION' },
    });
    leaderStaffService.leaderUpdateProgress.mockResolvedValue({
      message: 'Cập nhật tiến độ thành công',
      order: { ...mockOrders[1], isProductionCompleted: true },
    });
    leaderStaffService.leaderSubmitInspection.mockResolvedValue({
      message: 'Đã gửi yêu cầu nghiệm thu lên Chủ xưởng thành công',
      order: { ...mockOrders[1], status: 'UNDER_INSPECTION' },
    });
  });

  // ─── 1. Render cơ bản & tiêu đề ──────────────────────────────────
  it('hiển thị tiêu đề trang và badge Tổ Trưởng Xưởng', async () => {
    render(<LeaderOrdersPage />);
    await waitFor(() => {
      expect(screen.getByText(/quản lý sản xuất đơn hàng/i)).toBeInTheDocument();
      expect(screen.getByText('Tổ Trưởng Xưởng')).toBeInTheDocument();
    });
  });

  // ─── 2. Danh sách đơn hàng & Cảnh báo nghiệm thu thất bại ─────────
  it('hiển thị danh sách đơn hàng được phân công cho Tổ trưởng', async () => {
    render(<LeaderOrdersPage />);
    await waitFor(() => {
      expect(screen.getByText('ORD-20261114-0001')).toBeInTheDocument();
      expect(screen.getByText('ORD-20261114-0002')).toBeInTheDocument();
      expect(screen.getByText('ORD-20261114-0003')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn Khách')).toBeInTheDocument();
      expect(screen.getByText('Trần Gia Công')).toBeInTheDocument();
    });
  });

  it('hiển thị banner cảnh báo khi có đơn nghiệm thu CHƯA ĐẠT cần khắc phục', async () => {
    render(<LeaderOrdersPage />);
    await waitFor(() => {
      expect(screen.getByText(/nghiệm thu CHƯA ĐẠT — cần khắc phục và gửi lại/i)).toBeInTheDocument();
      expect(screen.getByText('Làm lại (Nghiệm thu chưa đạt)')).toBeInTheDocument();
    });
  });

  it('hiển thị tiến độ nội bộ (Đã hoàn thành / Đang làm)', async () => {
    render(<LeaderOrdersPage />);
    await waitFor(() => {
      expect(screen.getByText('Đã hoàn thành')).toBeInTheDocument();
      expect(screen.getByText('Đang làm')).toBeInTheDocument();
    });
  });

  // ─── 3. Tiếp nhận sản xuất ───────────────────────────────────────
  it('cho phép Tổ trưởng bấm tiếp nhận đơn hàng đang ở trạng thái CONFIRMED', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    render(<LeaderOrdersPage />);
    await waitFor(() => {
      expect(screen.getByText('Tiếp nhận')).toBeInTheDocument();
    });

    const acceptBtn = screen.getByText('Tiếp nhận');
    await user.click(acceptBtn);

    expect(leaderStaffService.leaderAcceptOrder).toHaveBeenCalledWith(1);
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/tiếp nhận sản xuất/i));
    });
  });

  // ─── 4. Xem chi tiết bản vẽ & thông số kỹ thuật ──────────────────
  it('mở modal chi tiết khi nhấn Xem chi tiết và hiển thị thông số D x R x C cm', async () => {
    const user = userEvent.setup();
    render(<LeaderOrdersPage />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText('Xem chi tiết');
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    const firstViewBtn = screen.getAllByText('Xem chi tiết')[0];
    await user.click(firstViewBtn);

    await waitFor(() => {
      expect(screen.getByText(/bản vẽ kỹ thuật & thông số gia công/i)).toBeInTheDocument();
      expect(screen.getByText(/bản vẽ đã khóa/i)).toBeInTheDocument();
      expect(screen.getByText('180 × 90 × 75 cm')).toBeInTheDocument();
      expect(screen.getByText('Gỗ Sồi Nga')).toBeInTheDocument();
      expect(screen.getByText('Tự nhiên')).toBeInTheDocument();
    });
  });

  // ─── 5. Cập nhật tiến độ sản xuất ────────────────────────────────
  it('mở modal cập nhật tiến độ và cho phép toggle Hoàn thành / Chưa hoàn thành', async () => {
    const user = userEvent.setup();
    render(<LeaderOrdersPage />);

    await waitFor(() => {
      const progressBtns = screen.getAllByText('Tiến độ');
      expect(progressBtns.length).toBeGreaterThan(0);
    });

    // Bấm nút Tiến độ của đơn hàng thứ 2
    const progressBtn = screen.getAllByText('Tiến độ')[0];
    await user.click(progressBtn);

    await waitFor(() => {
      expect(screen.getByText(/cập nhật tiến độ gia công/i)).toBeInTheDocument();
      expect(screen.getByText('Chưa hoàn thành')).toBeInTheDocument();
      expect(screen.getByText('Đã hoàn thành')).toBeInTheDocument();
    });

    // Bấm nút lưu tiến độ
    const saveBtn = screen.getByText('Lưu tiến độ');
    await user.click(saveBtn);

    expect(leaderStaffService.leaderUpdateProgress).toHaveBeenCalledWith(2, expect.objectContaining({
      isCompleted: true,
    }));
  });

  // ─── 6. Gửi nghiệm thu lên Chủ xưởng ─────────────────────────────
  it('mở modal nghiệm thu và gửi yêu cầu nghiệm thu lên Chủ xưởng', async () => {
    const user = userEvent.setup();
    render(<LeaderOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('Nghiệm thu')).toBeInTheDocument();
    });

    const inspectBtn = screen.getByText('Nghiệm thu');
    await user.click(inspectBtn);

    await waitFor(() => {
      expect(screen.getByText(/nộp nghiệm thu sản phẩm/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByText('Xác nhận nộp nghiệm thu');
    await user.click(submitBtn);

    expect(leaderStaffService.leaderSubmitInspection).toHaveBeenCalledWith(2, expect.objectContaining({
      images: [],
    }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/nghiệm thu/i));
    });
  });
});

