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
      orderType: 'CUSTOM',
      orderTypeLabel: 'Đặt theo yêu cầu',
      contactName: 'Lê Gia Công',
      contactPhone: '0908888888',
      staffName: 'Trần Bán Hàng',
      status: 'IN_PRODUCTION',
      statusLabel: 'Đang xử lý',
      totalAmount: 20000000,
      depositAmount: 10000000,
      paidAmount: 10000000,
      remainingAmount: 10000000,
      expectedDate: '2026-12-10',
      deliveredDate: null,
      items: [],
    },
    {
      orderId: 3,
      orderCode: 'ORD-20261101-0003',
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
    {
      orderId: 4,
      orderCode: 'ORD-20261101-0004',
      orderType: 'READY',
      orderTypeLabel: 'Hàng sẵn',
      contactName: 'Hoàng Văn Mới',
      contactPhone: '0903333333',
      staffName: null,
      status: 'NEW',
      statusLabel: 'Mới',
      totalAmount: 4000000,
      depositAmount: 0,
      paidAmount: 0,
      remainingAmount: 4000000,
      expectedDate: '2026-11-20',
      deliveredDate: null,
      items: [],
    },
  ];

  const mockPagination = {
    totalItems: 4,
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
    orderManagementService.updateOrderStatus.mockResolvedValue({
      message: 'Cập nhật trạng thái thành công',
      order: { ...mockOrders[0], status: 'IN_PRODUCTION', statusLabel: 'Đang xử lý' },
    });
    orderManagementService.getStaffLeaders.mockResolvedValue({
      data: [
        {
          userAccountId: 3,
          fullName: 'Lê Văn Tổ Trưởng',
          email: 'leader@fssims.local',
          phoneNumber: '0900000003',
        },
      ],
      leaders: [
        {
          userAccountId: 3,
          fullName: 'Lê Văn Tổ Trưởng',
          email: 'leader@fssims.local',
          phoneNumber: '0900000003',
        },
      ],
    });
    orderManagementService.assignLeaderToOrder.mockResolvedValue({
      message: 'Phân công Tổ trưởng thành công',
      order: {
        ...mockOrders[0],
        assignedTo: 3,
        staffName: 'Lê Văn Tổ Trưởng',
      },
    });
  });

  // ─── 1. Render cơ bản ────────────────────────────────────────────
  it('hiển thị tiêu đề trang', async () => {
    render(<ManageOrdersPage />);
    await waitFor(() => {
      expect(screen.getByText(/quản lý đơn hàng/i)).toBeDefined();
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
      expect(screen.getByText('Lê Gia Công')).toBeDefined();
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

  // ─── 4. Thống kê & Nhãn trạng thái ───────────────────────────────
  it('hiển thị card thống kê với nhãn "Đang xử lý" thay vì "Đang sản xuất"', async () => {
    render(<ManageOrdersPage />);
    await waitFor(() => {
      expect(screen.getByText('Tổng đơn hàng')).toBeDefined();
      expect(screen.getAllByText('Đã xác nhận').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Đang xử lý').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Hoàn thành').length).toBeGreaterThan(0);
      // Đảm bảo không còn nhãn "Đang sản xuất"
      expect(screen.queryByText('Đang sản xuất')).toBeNull();
    });
  });

  // ─── 5. Không dùng Select/Dropdown để đổi trạng thái đơn hàng ─────
  it('không sử dụng Select/Dropdown để thay đổi trạng thái đơn hàng', async () => {
    render(<ManageOrdersPage />);
    await waitFor(() => screen.getByText(/quản lý đơn hàng/i));

    // Không tồn tại select đổi trạng thái như id="new-status" hay nhãn "Trạng thái mới"
    expect(screen.queryByLabelText(/Trạng thái mới/i)).toBeNull();
    expect(screen.queryByRole('combobox', { name: /Trạng thái mới/i })).toBeNull();
  });

  // ─── 6. Nút hành động chuyển sang trạng thái kế tiếp ─────────────
  it('hiển thị đúng nút hành động kế tiếp cho từng trạng thái đơn hàng', async () => {
    render(<ManageOrdersPage />);
    await waitFor(() => screen.getByText(/quản lý đơn hàng/i));

    // Đơn NEW (id: 4) -> Nút "Xác nhận đơn"
    expect(screen.getByRole('button', { name: /Xác nhận đơn/i })).toBeDefined();

    // Đơn CONFIRMED (id: 1) -> Nút "Chuyển xử lý"
    expect(screen.getByRole('button', { name: /Chuyển xử lý/i })).toBeDefined();

    // Đơn IN_PRODUCTION (id: 2) -> Nút "Hoàn thành đơn"
    expect(screen.getByRole('button', { name: /Hoàn thành đơn/i })).toBeDefined();
  });

  it('đơn hàng COMPLETED không hiển thị nút chuyển trạng thái', async () => {
    render(<ManageOrdersPage />);
    await waitFor(() => {
      expect(screen.getByText('ORD-20261101-0003')).toBeDefined();
    });
    await waitFor(() => screen.getByText(/quản lý đơn hàng/i));

    // Đơn COMPLETED không có nút chuyển trạng thái nào
    const row = screen.getByText('ORD-20261101-0003').closest('tr');
    expect(row).toBeDefined();
    // Trong dòng này chỉ có nút Chi tiết, không có nút Chuyển xử lý hay Hoàn thành
    const buttonsInRow = row.querySelectorAll('button');
    const buttonTexts = Array.from(buttonsInRow).map((b) => b.textContent);
    expect(buttonTexts).toContain('Chi tiết');
    expect(buttonTexts).not.toContain('Chuyển xử lý');
    expect(buttonTexts).not.toContain('Hoàn thành đơn');
    expect(buttonTexts).not.toContain('Xác nhận đơn');
  });

  // ─── 7. Nhấn nút tự động cập nhật sang trạng thái kế tiếp ────────
  it('khi Owner nhấn nút "Chuyển xử lý", tự động gọi API cập nhật sang IN_PRODUCTION', async () => {
    const user = userEvent.setup();
    render(<ManageOrdersPage />);

    await waitFor(() => screen.getByRole('button', { name: /Chuyển xử lý/i }));
    const advanceButton = screen.getByRole('button', { name: /Chuyển xử lý/i });
    await user.click(advanceButton);

    await waitFor(() => {
      expect(orderManagementService.updateOrderStatus).toHaveBeenCalledWith(1, {
        status: 'IN_PRODUCTION',
      });
    });
  });

  it('sau khi cập nhật sang IN_PRODUCTION, nút hành động tự động chuyển thành "Hoàn thành đơn"', async () => {
    const user = userEvent.setup();
    let currentOrders = [...mockOrders];
    orderManagementService.getOrders.mockImplementation(async () => ({
      orders: currentOrders,
      pagination: mockPagination,
    }));
    orderManagementService.updateOrderStatus.mockImplementation(async (id, data) => {
      currentOrders = currentOrders.map((o) =>
        o.orderId === id ? { ...o, status: data.status, statusLabel: 'Đang xử lý' } : o
      );
      return { message: 'OK' };
    });

    render(<ManageOrdersPage />);

    await waitFor(() => screen.getByRole('button', { name: /Chuyển xử lý/i }));
    const advanceBtn = screen.getByRole('button', { name: /Chuyển xử lý/i });
    await user.click(advanceBtn);

    // Sau khi nhấn, đơn 1 chuyển sang IN_PRODUCTION, nút biến thành "Hoàn thành đơn"
    await waitFor(() => {
      // Trước đó chỉ có 1 nút "Hoàn thành đơn" (từ đơn 2), nay phải có 2 nút "Hoàn thành đơn"
      const completedButtons = screen.getAllByRole('button', { name: /Hoàn thành đơn/i });
      expect(completedButtons.length).toBe(2);
    });
  });

  // ─── 8. Mở modal chi tiết ────────────────────────────────────────
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

  // ─── 9. Hủy đơn hàng ────────────────────────────────────────────
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

  // ─── 10. Bộ lọc danh sách ─────────────────────────────────────────
  it('gọi API lại khi thay đổi bộ lọc trạng thái', async () => {
    const user = userEvent.setup();
    render(<ManageOrdersPage />);

    await waitFor(() => screen.getByText(/quản lý đơn hàng/i));

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'CONFIRMED');

    await waitFor(() => {
      expect(orderManagementService.getOrders).toHaveBeenCalledTimes(2);
    });
  });

  // ─── 11. Giao việc -> Chuyển sang Quản lý lệnh gia công ─────────────
  it('cho phép Owner bấm nút "Giao việc" để chuyển sang trang Quản lý lệnh gia công', async () => {
    const user = userEvent.setup();
    render(<ManageOrdersPage />);

    await waitFor(() => screen.getByText('ORD-20261101-0001'));

    const assignButtons = screen.getAllByRole('button', { name: /^Giao việc$/i });
    expect(assignButtons.length).toBeGreaterThan(0);
    expect(assignButtons[0]).toHaveTextContent('Giao việc');
    await user.click(assignButtons[0]);
  });

  // ─── 12. Giữ lại & hiển thị bản vẽ thiết kế trong Chi tiết đơn hàng CUSTOM ─
  it('hiển thị bản vẽ thiết kế của Chủ xưởng và ảnh mẫu khách trong Chi tiết đơn hàng theo yêu cầu', async () => {
    const user = userEvent.setup();
    const customOrderDetail = {
      ...mockOrders[0],
      contractCode: 'HD-20261111-0001',
      requestCode: 'RQ-20261111-0001',
      images: [],
      items: [
        {
          orderItemId: 101,
          productName: 'Bàn ăn gỗ sồi thiết kế riêng',
          quantity: 1,
          unitPrice: 15000000,
          totalPrice: 15000000,
          lengthCm: 200,
          widthCm: 95,
          heightCm: 75,
          materialName: 'Gỗ Sồi Nga',
          colorName: 'Tự nhiên',
          colorHex: '#C69C6D',
          description: 'Vát cạnh 45 độ, phủ sơn mờ 2K',
          images: [
            {
              imageId: 17,
              imageUrl: 'https://cdn.example.com/customer-table.jpg',
              imageType: 'CUSTOMER_REF',
              isOwnerDesign: false,
            },
            {
              imageId: 19,
              imageUrl: 'https://cdn.example.com/design_files/owner-table-cad.png',
              imageType: 'OWNER_DESIGN',
              isOwnerDesign: true,
            },
          ],
        },
      ],
    };
    orderManagementService.getOrderDetail.mockResolvedValueOnce({ order: customOrderDetail });

    render(<ManageOrdersPage />);
    await waitFor(() => screen.getAllByText('Chi tiết'));

    await user.click(screen.getAllByText('Chi tiết')[0]);

    await waitFor(() => {
      expect(screen.getByText(/Yêu cầu: RQ-20261111-0001/)).toBeInTheDocument();
      expect(screen.getByText('Đã lưu 1 bản vẽ xưởng')).toBeInTheDocument();
      expect(screen.getByText('Gỗ Sồi Nga')).toBeInTheDocument();
      expect(screen.getByText('Ảnh mẫu khách gửi')).toBeInTheDocument();
      expect(screen.getByText('Bản vẽ thiết kế của Chủ xưởng')).toBeInTheDocument();
      expect(screen.getByAltText('Bản vẽ xưởng 1')).toHaveAttribute(
        'src',
        'https://cdn.example.com/design_files/owner-table-cad.png'
      );
    });
  });
});
