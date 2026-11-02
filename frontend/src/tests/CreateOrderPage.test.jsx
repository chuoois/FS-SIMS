// =========================================================
// CreateOrderPage.test.jsx
// Unit tests cho trang POS Tạo đơn hàng (Sale role)
// Sử dụng saleOrderService (Controller riêng biệt)
// Kiểm tra luồng KÝ NGOÀI BẢN GIẤY (không dùng chữ ký số)
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
      productCode: 'SET-0001',
      productName: 'Bộ bàn ăn 6 ghế gỗ sồi',
      price: 9500000,
      stockQuantity: 4,
      categoryId: 1,
      categoryName: 'Bàn ghế',
      roomId: 1,
      roomName: 'Phòng ăn',
      imageUrl: '',
      isSet: true,
      totalSetItems: 7,
      setItems: [
        {
          setItemId: 101,
          productId: 10,
          productCode: 'TB-01',
          productName: 'Bàn ăn gỗ sồi mặt kính',
          quantity: 1,
          unitPrice: 4500000,
          imageUrl: '',
          dimensions: '160 x 80 x 75 cm',
        },
        {
          setItemId: 102,
          productId: 11,
          productCode: 'GH-01',
          productName: 'Ghế ăn gỗ sồi nệm da',
          quantity: 6,
          unitPrice: 900000,
          imageUrl: '',
          dimensions: '45 x 45 x 90 cm',
        },
      ],
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

    saleOrderService.getProductDetail.mockImplementation(async (id) => {
      const found = mockProducts.find((p) => p.productId === id) || mockProducts[0];
      return { data: found };
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
      expect(screen.getByText('Bộ bàn ăn 6 ghế gỗ sồi')).toBeInTheDocument();
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

  it('Mở modal xem chi tiết sản phẩm bộ SET và hiển thị đúng thành phần các món con, không bị undefined', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Bộ bàn ăn 6 ghế gỗ sồi')).toBeInTheDocument();
    });

    // Bấm nút "Chi tiết" của sản phẩm thứ 2 (Bộ bàn ăn SET-0001)
    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết/i });
    await user.click(detailButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Chi tiết sản phẩm trong kho')).toBeInTheDocument();
      expect(screen.getByText(/Thành phần trong bộ/i)).toBeInTheDocument();
      // Kiểm tra tên các món con được render chính xác
      expect(screen.getByText('Bàn ăn gỗ sồi mặt kính')).toBeInTheDocument();
      expect(screen.getByText('Ghế ăn gỗ sồi nệm da')).toBeInTheDocument();
      expect(screen.getByText('x1 cái')).toBeInTheDocument();
      expect(screen.getByText('x6 cái')).toBeInTheDocument();
      // Đảm bảo tuyệt đối không có từ undefined nào xuất hiện
      expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
    });
  });

  it('Quy trình Tạo hợp đồng -> In/Xuất bản giấy -> Ký ngoài bản giấy -> Tạo đơn hàng', async () => {
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
      // Hiển thị hướng dẫn quy trình ký ngoài bản giấy
      expect(screen.getByText(/Quy trình ký hợp đồng bản giấy ngoài quầy/i)).toBeInTheDocument();
      // Nút in bản giấy
      expect(screen.getAllByRole('button', { name: /In /i }).length).toBeGreaterThan(0);
      // Nút xác nhận đã ký bản giấy
      expect(screen.getByRole('button', { name: /XÁC NHẬN ĐÃ KÝ BẢN GIẤY TẠI QUẦY/i })).toBeInTheDocument();
    });

    // 5. Bấm Xác nhận đã ký bản giấy
    const signBtn = screen.getByRole('button', { name: /XÁC NHẬN ĐÃ KÝ BẢN GIẤY TẠI QUẦY/i });
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
