// =========================================================
// CreateOrderPage.test.jsx
// Unit tests cho trang POS Tạo đơn hàng (Sale role)
// Sử dụng saleOrderService (Controller riêng biệt)
// =========================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CreateOrderPage } from '../pages/sale-pages/CreateOrderPage';
import * as saleOrderService from '../services/saleOrderService';

vi.mock('../services/saleOrderService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CreateOrderPage (POS)', () => {
  const mockProducts = [
    {
      productId: 1,
      productCode: 'PRD-0001',
      productName: 'Bàn ăn cao cấp gỗ sồi',
      price: 5000000,
      stockQuantity: 10,
      categoryId: 1,
      categoryName: 'Bàn',
      roomId: 1,
      roomName: 'Phòng ăn',
      imageUrl: '',
      isSet: false,
    },
    {
      productId: 2,
      productCode: 'PRD-0002',
      productName: 'Ghế gỗ sồi',
      price: 1200000,
      stockQuantity: 4,
      categoryId: 2,
      categoryName: 'Ghế',
      roomId: 1,
      roomName: 'Phòng ăn',
      imageUrl: '',
      isSet: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    saleOrderService.getProductMetadata.mockResolvedValue({
      data: {
        categories: [{ category_id: 1, category_name: 'Bàn' }],
        rooms: [{ room_id: 1, room_name: 'Phòng ăn' }],
        materials: [],
        colors: [],
      },
    });

    saleOrderService.getWarehouseProducts.mockResolvedValue({
      data: mockProducts,
      pagination: { totalItems: 2, totalPages: 1, currentPage: 1, itemsPerPage: 12 },
    });

    saleOrderService.getProductDetail.mockResolvedValue({
      data: mockProducts[0],
    });
  });

  const renderComponent = () =>
    render(
      <BrowserRouter>
        <CreateOrderPage />
      </BrowserRouter>
    );

  it('Hiển thị giao diện POS với tiêu đề và danh sách sản phẩm', async () => {
    renderComponent();

    expect(screen.getByText(/Tạo Đơn Hàng Tại Quầy \(POS\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Giỏ hàng đã chọn/i)).toBeInTheDocument();
    expect(screen.getByText(/Giỏ hàng đang trống/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn cao cấp gỗ sồi')).toBeInTheDocument();
      expect(screen.getByText('Ghế gỗ sồi')).toBeInTheDocument();
    });

    // Kiểm tra hiển thị giá và số lượng tồn kho
    expect(screen.getByText('Kho: 10')).toBeInTheDocument();
    expect(screen.getByText('Kho: 4 cái')).toBeInTheDocument();
  });

  it('Thêm sản phẩm vào giỏ hàng và cập nhật tổng tiền', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn cao cấp gỗ sồi')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', { name: /Chọn mua/i });
    await user.click(addButtons[0]); // Thêm sản phẩm 1

    // Kiểm tra giỏ hàng đã có sản phẩm
    await waitFor(() => {
      expect(screen.queryByText(/Giỏ hàng đang trống/i)).not.toBeInTheDocument();
      expect(screen.getByText('1 món')).toBeInTheDocument();
    });
  });

  it('Mở modal xem chi tiết sản phẩm khi bấm nút Chi tiết', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn cao cấp gỗ sồi')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết/i });
    await user.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Chi tiết sản phẩm trong kho')).toBeInTheDocument();
    });
  });

  it('Quy trình Tạo hợp đồng -> Ký hợp đồng -> Tạo đơn hàng', async () => {
    const user = userEvent.setup();

    const mockContractDraft = {
      contractId: 10,
      contractCode: 'HD-20261028-0001',
      customerName: 'Nguyễn Văn A',
      customerPhone: '0912345678',
      totalAmount: 5000000,
      depositAmount: 1000000,
      remainingAmount: 4000000,
      status: 'DRAFT',
      items: [
        {
          contractItemId: 1,
          productName: 'Bàn ăn cao cấp gỗ sồi',
          quantity: 1,
          unitPrice: 5000000,
          totalPrice: 5000000,
        },
      ],
    };

    const mockContractSigned = {
      ...mockContractDraft,
      status: 'SIGNED',
    };

    const mockCreatedOrder = {
      orderId: 100,
      orderCode: 'ORD-20261028-0001',
      contractCode: 'HD-20261028-0001',
      totalAmount: 5000000,
      status: 'CONFIRMED',
    };

    saleOrderService.createOfflineContract.mockResolvedValue({ data: mockContractDraft });
    saleOrderService.signContract.mockResolvedValue({ data: mockContractSigned });
    saleOrderService.createOrderFromContract.mockResolvedValue({ data: mockCreatedOrder });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn cao cấp gỗ sồi')).toBeInTheDocument();
    });

    // 1. Thêm vào giỏ
    const addButtons = screen.getAllByRole('button', { name: /Chọn mua/i });
    await user.click(addButtons[0]);

    // 2. Điền thông tin khách hàng
    const nameInput = screen.getByPlaceholderText(/Ví dụ: Nguyễn Văn A/i);
    const phoneInput = screen.getByPlaceholderText(/Ví dụ: 0912345678/i);
    await user.type(nameInput, 'Nguyễn Văn A');
    await user.type(phoneInput, '0912345678');

    // 3. Bấm Tạo hợp đồng
    const submitBtn = screen.getByRole('button', { name: /TẠO HỢP ĐỒNG & CHỐT ĐƠN/i });
    await user.click(submitBtn);

    // 4. Modal Biên bản hợp đồng xuất hiện ở trạng thái DRAFT
    await waitFor(() => {
      expect(screen.getByText(/Biên Bản Hợp Đồng Bán Hàng Tại Quầy/i)).toBeInTheDocument();
      expect(screen.getByText(/BIÊN BẢN CHỜ KÝ \(DRAFT\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /CHỐT HỢP ĐỒNG & KÝ NHẬN TẠI QUẦY/i })).toBeInTheDocument();
    });

    // 5. Bấm Chốt & Ký hợp đồng
    const signBtn = screen.getByRole('button', { name: /CHỐT HỢP ĐỒNG & KÝ NHẬN TẠI QUẦY/i });
    await user.click(signBtn);

    // 6. Hợp đồng chuyển sang SIGNED -> Nút "TẠO ĐƠN HÀNG NGAY" xuất hiện
    await waitFor(() => {
      expect(screen.getByText(/ĐÃ KÝ KẾT HỢP ĐỒNG \(SIGNED\)/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /TẠO ĐƠN HÀNG NGAY/i })).toBeInTheDocument();
    });

    // 7. Bấm Tạo đơn hàng ngay
    const createOrderBtn = screen.getByRole('button', { name: /TẠO ĐƠN HÀNG NGAY/i });
    await user.click(createOrderBtn);

    // 8. Xuất hiện thông báo thành công
    await waitFor(() => {
      expect(screen.getByText(/ĐÃ TẠO ĐƠN HÀNG THÀNH CÔNG!/i)).toBeInTheDocument();
      expect(screen.getByText('ORD-20261028-0001')).toBeInTheDocument();
    });
  });
});
