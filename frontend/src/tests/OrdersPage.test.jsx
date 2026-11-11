// =========================================================
// OrdersPage.test.jsx
// Unit tests cho trang Quản lý đơn hàng (OrdersPage) của Sale/Owner
// Kiểm tra chức năng tìm kiếm theo Tên khách hàng, Mã đơn hàng
// Kiểm tra chức năng bộ lọc theo Trạng thái, Loại đơn, Đặt lại bộ lọc
// =========================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OrdersPage } from '../pages/sale-pages/OrdersPage';
import * as saleOrderService from '../services/saleOrderService';

vi.mock('../services/saleOrderService', () => ({
  getOrders: vi.fn(),
  getOrderById: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockOrders = [
  {
    orderId: 1,
    orderCode: 'ORD-20261102-0001',
    contractCode: 'HD-20261102-0001',
    contactName: 'Nguyễn Văn A',
    contactPhone: '0912345678',
    deliveryAddress: '123 Lê Lợi, Q1, TP.HCM',
    totalAmount: 15000000,
    depositAmount: 4500000,
    remainingAmount: 10500000,
    status: 'CONFIRMED',
    orderType: 'READY',
    items: [
      {
        orderItemId: 101,
        productName: 'Bàn ăn cao cấp gỗ sồi',
        productCode: 'PRD-0001',
        quantity: 1,
        unitPrice: 15000000,
        totalPrice: 15000000,
      },
    ],
  },
  {
    orderId: 2,
    orderCode: 'ORD-20261102-0002',
    contractCode: 'HD-20261102-0002',
    contactName: 'Trần Thị B',
    contactPhone: '0987654321',
    deliveryAddress: '456 Nguyễn Huệ, Q1, TP.HCM',
    totalAmount: 8000000,
    depositAmount: 0,
    remainingAmount: 8000000,
    status: 'IN_PRODUCTION',
    orderType: 'CUSTOM',
    items: [
      {
        orderItemId: 102,
        productName: 'Tủ quần áo gỗ gõ đỏ 4 cánh',
        productCode: 'PRD-0002',
        quantity: 1,
        unitPrice: 8000000,
        totalPrice: 8000000,
      },
    ],
  },
];

describe('OrdersPage - Quản lý đơn hàng (Search & Filter)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saleOrderService.getOrders.mockResolvedValue({
      data: mockOrders,
      pagination: { totalItems: 2, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });
    saleOrderService.getOrderById.mockResolvedValue({
      data: mockOrders[0],
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    );

  it('Hiển thị giao diện danh sách đơn hàng và các tiêu chí tìm kiếm', async () => {
    renderComponent();

    expect(screen.getByText('Quản Lý Đơn Hàng')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tìm theo tên khách hàng, mã đơn hàng/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('ORD-20261102-0001')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText('ORD-20261102-0002')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    });

    // Thanh phân trang hiển thị thông tin
    expect(screen.getByText(/Hiển thị/i)).toBeInTheDocument();
    expect(screen.getByText(/trên tổng số/i)).toBeInTheDocument();
    expect(screen.getByText(/Trang 1 \/ 1/i)).toBeInTheDocument();
  });

  it('Hỗ trợ thay đổi số lượng đơn hàng hiển thị mỗi trang (page size selector)', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ORD-20261102-0001')).toBeInTheDocument();
    });

    // Chọn hiển thị 20 đơn hàng mỗi trang
    const pageSizeSelect = screen.getByLabelText(/Số đơn hàng mỗi trang/i);
    await user.selectOptions(pageSizeSelect, '20');

    await waitFor(() => {
      expect(saleOrderService.getOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          page: 1,
        })
      );
    });
  });

  it('Tìm kiếm theo Tên khách hàng', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ORD-20261102-0001')).toBeInTheDocument();
    });

    // 1. Chọn tiêu chí tìm kiếm: Tên khách hàng
    const searchBySelect = screen.getByLabelText(/Tiêu chí tìm kiếm/i);
    await user.selectOptions(searchBySelect, 'CUSTOMER_NAME');

    // Kiểm tra placeholder đổi tương ứng
    expect(screen.getByPlaceholderText(/Nhập họ tên khách hàng/i)).toBeInTheDocument();

    // 2. Nhập tên khách hàng cần tìm
    const searchInput = screen.getByPlaceholderText(/Nhập họ tên khách hàng/i);
    await user.type(searchInput, 'Nguyễn Văn A');

    // Chờ debounce 300ms
    await waitFor(() => {
      expect(saleOrderService.getOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_name: 'Nguyễn Văn A',
        })
      );
    });
  });

  it('Tìm kiếm theo Mã đơn hàng', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ORD-20261102-0001')).toBeInTheDocument();
    });

    // 1. Chọn tiêu chí tìm kiếm: Mã đơn hàng
    const searchBySelect = screen.getByLabelText(/Tiêu chí tìm kiếm/i);
    await user.selectOptions(searchBySelect, 'ORDER_CODE');

    // Kiểm tra placeholder đổi tương ứng
    expect(screen.getByPlaceholderText(/Nhập mã đơn hàng/i)).toBeInTheDocument();

    // 2. Nhập mã đơn hàng cần tìm
    const searchInput = screen.getByPlaceholderText(/Nhập mã đơn hàng/i);
    await user.type(searchInput, 'ORD-20261102-0001');

    // Chờ debounce 300ms
    await waitFor(() => {
      expect(saleOrderService.getOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          order_code: 'ORD-20261102-0001',
        })
      );
    });
  });

  it('Lọc đơn hàng theo Trạng thái', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ORD-20261102-0001')).toBeInTheDocument();
    });

    // Chọn lọc trạng thái Đã xác nhận (CONFIRMED)
    const statusSelect = screen.getByLabelText(/Lọc trạng thái/i);
    await user.selectOptions(statusSelect, 'CONFIRMED');

    await waitFor(() => {
      expect(saleOrderService.getOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'CONFIRMED',
        })
      );
    });
  });

  it('Đặt lại bộ lọc khi đang có tìm kiếm hoặc filter kích hoạt', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ORD-20261102-0001')).toBeInTheDocument();
    });

    // Lọc theo trạng thái
    const statusSelect = screen.getByLabelText(/Lọc trạng thái/i);
    await user.selectOptions(statusSelect, 'CONFIRMED');

    // Nút Đặt lại bộ lọc xuất hiện
    const resetBtn = await screen.findByRole('button', { name: /Đặt lại bộ lọc/i });
    expect(resetBtn).toBeInTheDocument();

    // Bấm đặt lại
    await user.click(resetBtn);

    // Kiểm tra trạng thái đã trở về ALL
    await waitFor(() => {
      expect(statusSelect).toHaveValue('ALL');
    });
  });

  it('Mở modal xem chi tiết đơn hàng khi bấm nút Xem', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ORD-20261102-0001')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /Xem/i });
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(saleOrderService.getOrderById).toHaveBeenCalledWith(1);
      expect(screen.getByText(/Chi tiết đơn hàng #ORD-20261102-0001/i)).toBeInTheDocument();
      expect(screen.getByText('123 Lê Lợi, Q1, TP.HCM')).toBeInTheDocument();
      expect(screen.getByText('Bàn ăn cao cấp gỗ sồi')).toBeInTheDocument();
    });
  });

  it('Hiển thị chi tiết đơn hàng đặt làm với thông số kỹ thuật và bản vẽ thiết kế từ Chủ xưởng', async () => {
    const user = userEvent.setup();
    const customOrderDetail = {
      orderId: 2,
      orderCode: 'ORD-20261102-0002',
      contractCode: 'HD-20261102-0002',
      requestCode: 'RQ-20261102-0002',
      requestTitle: 'Đóng tủ quần áo phòng ngủ',
      contactName: 'Trần Thị B',
      contactPhone: '0987654321',
      deliveryAddress: '456 Nguyễn Huệ, Q1, TP.HCM',
      totalAmount: 8000000,
      depositAmount: 2400000,
      paidAmount: 2400000,
      remainingAmount: 5600000,
      status: 'IN_PRODUCTION',
      orderType: 'CUSTOM',
      staffName: 'Lê Văn Tổ Trưởng',
      note: '[Phân công SX]: Tổ trưởng: Lê Văn Tổ Trưởng',
      images: [],
      items: [
        {
          orderItemId: 102,
          productName: 'Tủ quần áo gỗ gõ đỏ 4 cánh',
          lengthCm: 220,
          widthCm: 60,
          heightCm: 240,
          materialName: 'Gỗ gõ đỏ',
          colorName: 'Sơn PU bóng mờ',
          description: 'Chia 2 buồng treo + 3 ngăn kéo',
          quantity: 1,
          unitPrice: 8000000,
          totalPrice: 8000000,
          images: [
            {
              imageId: 1,
              imageUrl: 'https://res.cloudinary.com/demo/image/upload/app_uploads/customer.jpg',
              imageType: 'CUSTOMER_REF',
              isOwnerDesign: false,
            },
            {
              imageId: 2,
              imageUrl: 'https://res.cloudinary.com/demo/image/upload/design_files/owner-workshop.jpg',
              imageType: 'OWNER_DESIGN',
              isOwnerDesign: true,
            },
          ],
        },
      ],
    };

    saleOrderService.getOrderById.mockResolvedValueOnce({ data: customOrderDetail });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('ORD-20261102-0002')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /Xem/i });
    await user.click(viewButtons[1]);

    await waitFor(() => {
      expect(screen.getByText(/Chi tiết đơn hàng #ORD-20261102-0002/i)).toBeInTheDocument();
      expect(screen.getByText('RQ-20261102-0002')).toBeInTheDocument();
      expect(screen.getByText('220 × 60 × 240 cm')).toBeInTheDocument();
      expect(screen.getByText('Gỗ gõ đỏ')).toBeInTheDocument();
      expect(screen.getByText('Chia 2 buồng treo + 3 ngăn kéo')).toBeInTheDocument();
      expect(screen.getByText('Ảnh mẫu khách gửi')).toBeInTheDocument();
      expect(screen.getByText('Bản vẽ thiết kế của Chủ xưởng')).toBeInTheDocument();
      expect(screen.getByText('Đã có 1 bản vẽ xưởng')).toBeInTheDocument();
    });
  });
});

