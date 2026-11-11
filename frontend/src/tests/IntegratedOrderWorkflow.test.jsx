import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CreateOrderRequestPage } from '../pages/sale-pages/CreateOrderRequestPage';
import { LeaderOrdersPage } from '../pages/staff-pages/LeaderOrdersPage';
import { OwnerRequestsTab } from '../pages/owner-pages/OwnerRequestsTab';
import { ManageOrdersPage } from '../pages/owner-pages/ManageOrdersPage';
import * as saleOrderService from '../services/saleOrderService';
import * as orderManagementService from '../services/orderManagementService';

vi.mock('../services/saleOrderService', () => ({
  getProductMetadata: vi.fn(),
  getCustomers: vi.fn(),
  createSalesOrderRequest: vi.fn(),
  updateSalesOrderRequest: vi.fn(),
  getRequestById: vi.fn(),
  uploadRequestImages: vi.fn(),
  createRequestMaterial: vi.fn(),
  createRequestColor: vi.fn(),
  confirmOrderDelivery: vi.fn(),
  completeOrderDelivery: vi.fn(),
}));

vi.mock('../services/orderManagementService', () => ({
  getOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
  cancelOrder: vi.fn(),
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
    expect(screen.getByText(/Tạo đơn theo yêu cầu/i)).toBeInTheDocument();
    expect(screen.getByText(/1. Thông tin khách hàng/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Thông số kỹ thuật/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Hình ảnh thiết kế/i)).toBeInTheDocument();

    // Các trường kích thước kỹ thuật
    expect(screen.getByText(/Chiều dài \(cm\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Chiều rộng \(cm\)/i)).toBeInTheDocument();
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

  it('2b. CreateOrderRequestPage: Chế độ chỉnh sửa (?editId) cho phép tìm và thêm mới Chất liệu & Màu sắc trực tiếp', async () => {
    const user = userEvent.setup();
    saleOrderService.getRequestById.mockResolvedValue({
      data: {
        requestId: 77,
        requestCode: 'RQ-EDIT-0077',
        contactName: 'Phạm Văn Sửa',
        contactPhone: '0911223344',
        title: 'Đơn cần bổ sung chất liệu & màu',
        items: [
          {
            requestItemId: 7701,
            itemName: 'Tủ áo gỗ mới',
            materialId: 1,
            colorId: 1,
            quantity: 1,
            unitPrice: 10000000,
          },
        ],
      },
    });
    saleOrderService.createRequestMaterial.mockResolvedValue({
      data: { material_id: 99, material_name: 'Gỗ Óc Chó Mỹ' },
    });
    saleOrderService.createRequestColor.mockResolvedValue({
      data: { color_id: 88, color_name: 'Sơn Trắng Ngọc Trai', hex_value: '#F5F5F0' },
    });

    render(
      <MemoryRouter initialEntries={['/sale/requests/create?editId=77']}>
        <CreateOrderRequestPage />
      </MemoryRouter>
    );

    await screen.findByDisplayValue('Tủ áo gỗ mới');
    const materialInput = await screen.findByPlaceholderText(/Chọn hoặc gõ để tìm\/thêm chất liệu/i);
    const colorInput = await screen.findByPlaceholderText(/Chọn hoặc gõ để tìm\/thêm màu sắc/i);
    await waitFor(() => {
      expect(materialInput).toHaveValue('Gỗ Sồi');
      expect(colorInput).toHaveValue('Màu gỗ tự nhiên');
    });

    await user.click(materialInput);
    await user.clear(materialInput);
    await user.type(materialInput, 'Gỗ Óc Chó Mỹ');
    const addMatBtn = await screen.findByText(/Thêm mới chất liệu: "Gỗ Óc Chó Mỹ"/i);
    fireEvent.mouseDown(addMatBtn);

    await waitFor(() => {
      expect(saleOrderService.createRequestMaterial).toHaveBeenCalledWith({ material_name: 'Gỗ Óc Chó Mỹ' });
      expect(materialInput).toHaveValue('Gỗ Óc Chó Mỹ');
    });

    await user.click(colorInput);
    await user.clear(colorInput);
    await user.type(colorInput, 'Sơn Trắng Ngọc Trai');
    const addColorBtn = await screen.findByText(/Thêm mới màu sắc: "Sơn Trắng Ngọc Trai"/i);
    fireEvent.mouseDown(addColorBtn);

    await waitFor(() => {
      expect(saleOrderService.createRequestColor).toHaveBeenCalledWith(
        expect.objectContaining({ color_name: 'Sơn Trắng Ngọc Trai' })
      );
      expect(colorInput).toHaveValue('Sơn Trắng Ngọc Trai');
    });
  });

  it('2c. CreateOrderRequestPage: Upload ảnh gắn riêng từng sản phẩm và chặn submit khi upload ảnh thất bại (401)', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <CreateOrderRequestPage />
      </MemoryRouter>
    );

    // Điền khách hàng & sản phẩm 1
    fireEvent.change(screen.getByPlaceholderText(/VD: Nguyễn Văn A/i), { target: { value: 'Nguyễn Văn Ảnh' } });
    fireEvent.change(screen.getByPlaceholderText(/VD: 0912345678/i), { target: { value: '0912345678' } });
    fireEvent.change(screen.getByPlaceholderText(/VD: Tủ quần áo 4 cánh lùa kịch trần/i), { target: { value: 'Tủ áo 1' } });

    // Thêm sản phẩm thứ 2
    await user.click(screen.getByRole('button', { name: /Thêm sản phẩm/i }));
    const itemNameInputs = screen.getAllByPlaceholderText(/VD: Tủ quần áo 4 cánh lùa kịch trần/i);
    fireEvent.change(itemNameInputs[1], { target: { value: 'Bàn trang điểm 2' } });

    // Upload ảnh thất bại (401) cho sản phẩm 1
    saleOrderService.uploadRequestImages.mockRejectedValueOnce({ response: { status: 401 } });
    const fileInputs = container.querySelectorAll('input[type="file"]');
    const file1 = new File(['img1'], 'item1.png', { type: 'image/png' });
    fireEvent.change(fileInputs[0], { target: { files: [file1] } });

    await waitFor(() => {
      expect(screen.getByText(/Phiên đăng nhập đã hết hạn.*\(401\)/i)).toBeInTheDocument();
    });

    // Không được mở modal submit khi còn lỗi upload ảnh
    await user.click(screen.getByRole('button', { name: /Kiểm Tra & Gửi Chủ Xưởng Thẩm Định/i }));
    expect(screen.queryByText(/Xác nhận thông tin yêu cầu trước khi gửi Chủ xưởng/i)).not.toBeInTheDocument();

    // Upload lại thành công cho sản phẩm 1 và upload riêng cho sản phẩm 2
    saleOrderService.uploadRequestImages
      .mockResolvedValueOnce({ urls: ['https://cdn.example.com/item1.png'] })
      .mockResolvedValueOnce({ urls: ['https://cdn.example.com/item2.png'] });

    fireEvent.change(fileInputs[0], { target: { files: [file1] } });
    const file2 = new File(['img2'], 'item2.png', { type: 'image/png' });
    fireEvent.change(fileInputs[1], { target: { files: [file2] } });

    await waitFor(() => {
      expect(screen.queryByText(/Phiên đăng nhập đã hết hạn/i)).not.toBeInTheDocument();
      expect(screen.getAllByText('1 ảnh').length).toBe(2);
    });

    // Mở modal và gửi đơn -> ảnh được gắn đúng riêng từng sản phẩm
    saleOrderService.createSalesOrderRequest.mockResolvedValueOnce({ data: { requestId: 901 } });
    await user.click(screen.getByRole('button', { name: /Kiểm Tra & Gửi Chủ Xưởng Thẩm Định/i }));
    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận gửi Chủ xưởng/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(saleOrderService.createSalesOrderRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          contactName: 'Nguyễn Văn Ảnh',
          items: [
            expect.objectContaining({
              itemName: 'Tủ áo 1',
              images: [{ imageUrl: 'https://cdn.example.com/item1.png', requestItemId: null, sortOrder: 0 }],
            }),
            expect.objectContaining({
              itemName: 'Bàn trang điểm 2',
              images: [{ imageUrl: 'https://cdn.example.com/item2.png', requestItemId: null, sortOrder: 0 }],
            }),
          ],
          images: [
            { imageUrl: 'https://cdn.example.com/item1.png', requestItemId: null, itemIndex: 0, sortOrder: 0 },
            { imageUrl: 'https://cdn.example.com/item2.png', requestItemId: null, itemIndex: 1, sortOrder: 0 },
          ],
        })
      );
    });
  });

  it('2d. CreateOrderRequestPage: Ngăn gửi trùng khi nhấn liên tục, hiển thị lỗi 500 rõ ràng và giữ nguyên dữ liệu form', async () => {
    const user = userEvent.setup();
    let rejectSubmit;
    saleOrderService.createSalesOrderRequest.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectSubmit = reject;
        })
    );

    render(
      <MemoryRouter>
        <CreateOrderRequestPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/VD: Nguyễn Văn A/i), { target: { value: 'Lê Bảo Toàn' } });
    fireEvent.change(screen.getByPlaceholderText(/VD: 0912345678/i), { target: { value: '0977665544' } });
    fireEvent.change(screen.getByPlaceholderText(/VD: Tủ quần áo 4 cánh lùa kịch trần/i), { target: { value: 'Kệ tivi gỗ óc chó' } });

    await user.click(screen.getByRole('button', { name: /Kiểm Tra & Gửi Chủ Xưởng Thẩm Định/i }));
    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận gửi Chủ xưởng/i });

    // Nhấn liên tục nhiều lần -> chỉ được gọi API 1 lần duy nhất
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);
    expect(saleOrderService.createSalesOrderRequest).toHaveBeenCalledTimes(1);

    // Giả lập backend trả lỗi 500 Internal Server Error
    rejectSubmit({
      response: {
        status: 500,
        data: { message: 'Lỗi máy chủ khi tạo đơn yêu cầu thiết kế' },
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Không thể gửi yêu cầu đơn hàng/i)).toBeInTheDocument();
      expect(screen.getByText(/Lỗi máy chủ \(500\): Lỗi máy chủ khi tạo đơn yêu cầu thiết kế/i)).toBeInTheDocument();
    });

    // Quay lại chỉnh sửa -> toàn bộ dữ liệu người dùng đã nhập vẫn được giữ nguyên
    await user.click(screen.getByRole('button', { name: /Chỉnh sửa lại/i }));
    expect(screen.getByPlaceholderText(/VD: Nguyễn Văn A/i)).toHaveValue('Lê Bảo Toàn');
    expect(screen.getByPlaceholderText(/VD: 0912345678/i)).toHaveValue('0977665544');
    expect(screen.getByPlaceholderText(/VD: Tủ quần áo 4 cánh lùa kịch trần/i)).toHaveValue('Kệ tivi gỗ óc chó');
  });

  it('3. LeaderOrdersPage: Hiển thị danh sách đơn sản xuất và nút Tiếp nhận / Nghiệm thu', async () => {
    orderManagementService.getOrderDetail.mockResolvedValue({
      order: {
        orderId: 502,
        orderCode: 'ORD-LEADER-002',
        contactName: 'Lê Gia Công',
        contactPhone: '0908888888',
        orderType: 'CUSTOM',
        status: 'IN_PRODUCTION',
        totalAmount: 25000000,
        expectedDate: '2026-11-25',
        items: [{ orderItemId: 2, itemName: 'Tủ bếp Acrylic', lengthCm: 320, widthCm: 60, heightCm: 240, quantity: 1, unitPrice: 25000000 }],
      },
    });
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

  it('4. OwnerRequestsTab: Hiển thị đơn yêu cầu thiết kế từ Sales để Chủ xưởng thẩm định và chốt thiết kế', async () => {
    orderManagementService.getOwnerRequests.mockResolvedValue({
      message: 'Lấy danh sách yêu cầu thiết kế thành công',
      data: [
        {
          requestId: 88,
          requestCode: 'REQ-20261107-0088',
          contactName: 'Trần Khách May Đo',
          contactPhone: '0988888888',
          orderType: 'CUSTOM',
          status: 'PENDING',
          createdAt: '2026-11-07T10:00:00Z',
          items: [{ itemName: 'Tủ rượu gỗ sồi', lengthCm: 200, widthCm: 60, heightCm: 210, quantity: 1 }],
          images: [],
        },
      ],
      pagination: { totalItems: 1, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });

    render(
      <MemoryRouter>
        <OwnerRequestsTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('REQ-20261107-0088')).toBeInTheDocument();
      expect(screen.getByText('Trần Khách May Đo')).toBeInTheDocument();
      expect(screen.getAllByText('Chờ thẩm định').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /Thẩm định & Chốt/i })).toBeInTheDocument();
    });
  });

  it('4b. OwnerRequestsTab: Hiển thị header/thống kê đồng bộ, ảnh theo sản phẩm và chốt thiết kế inline không dùng window.confirm', async () => {
    const user = userEvent.setup();
    const onReviewed = vi.fn();
    const requestItem = {
      requestItemId: 501,
      itemName: 'Tủ áo gỗ gõ đỏ',
      lengthCm: 220,
      widthCm: 60,
      heightCm: 240,
      quantity: 1,
      unitPrice: 28000000,
      description: 'Cửa lùa 3 cánh',
    };

    orderManagementService.getOwnerRequests.mockResolvedValue({
      message: 'OK',
      data: [
        {
          requestId: 89,
          requestCode: 'REQ-20261111-0089',
          title: 'Tủ áo phòng ngủ master',
          contactName: 'Nguyễn Minh Tuấn',
          contactPhone: '0977112233',
          orderType: 'CUSTOM',
          status: 'PENDING',
          createdAt: '2026-11-11T05:00:00Z',
          items: [requestItem],
          images: [],
        },
      ],
      pagination: { totalItems: 1, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });

    orderManagementService.getOwnerRequestById.mockResolvedValue({
      data: {
        requestId: 89,
        requestCode: 'REQ-20261111-0089',
        title: 'Tủ áo phòng ngủ master',
        contactName: 'Nguyễn Minh Tuấn',
        contactPhone: '0977112233',
        deliveryAddress: '99 Nguyễn Huệ, Quận 1',
        orderType: 'CUSTOM',
        status: 'PENDING',
        createdAt: '2026-11-11T05:00:00Z',
        items: [requestItem],
        images: [
          {
            requestImageId: 901,
            requestItemId: 501,
            imageUrl: 'https://res.cloudinary.com/demo/image/upload/tu-ao.jpg',
          },
        ],
      },
    });

    orderManagementService.reviewOwnerRequest.mockResolvedValue({ message: 'OK' });

    render(
      <MemoryRouter>
        <OwnerRequestsTab onReviewed={onReviewed} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Thẩm Định Yêu Cầu Thiết Kế')).toBeInTheDocument();
      expect(screen.getByText('Tổng yêu cầu')).toBeInTheDocument();
      expect(screen.getByText('REQ-20261111-0089')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Thẩm định & Chốt/i }));

    await waitFor(() => {
      expect(screen.getByText('Tủ áo gỗ gõ đỏ')).toBeInTheDocument();
      expect(screen.getByAltText('Tủ áo gỗ gõ đỏ - ảnh 1')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Chốt thiết kế \(Khóa bản vẽ\)/i }));

    await waitFor(() => {
      expect(screen.getByText('Xác nhận chốt thiết kế & khóa bản vẽ sản xuất')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Xác nhận chốt thiết kế/i }));

    await waitFor(() => {
      expect(orderManagementService.reviewOwnerRequest).toHaveBeenCalledWith(89, {
        action: 'FINALIZE_DESIGN',
        reason: undefined,
        note: undefined,
      });
      expect(onReviewed).toHaveBeenCalledTimes(1);
    });
  });

  it('5. LeaderOrdersPage: Gửi yêu cầu nghiệm thu kèm ảnh thành phẩm lên Owner', async () => {
    const user = userEvent.setup();
    orderManagementService.getLeaderOrders.mockResolvedValue({
      orders: [
        {
          orderId: 502,
          orderCode: 'ORD-LEADER-002',
          contactName: 'Lê Gia Công',
          contactPhone: '0908888888',
          orderType: 'CUSTOM',
          status: 'IN_PRODUCTION',
          totalAmount: 25000000,
          expectedDate: '2026-11-25',
          items: [{ orderItemId: 2, itemName: 'Tủ bếp Acrylic', lengthCm: 320, widthCm: 60, heightCm: 240, quantity: 1, unitPrice: 25000000 }],
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
      expect(screen.getByText('ORD-LEADER-002')).toBeInTheDocument();
      expect(screen.getAllByText('Đang gia công').length).toBeGreaterThanOrEqual(1);
    });

    // Mở chi tiết đơn hàng
    const detailBtn = screen.getByRole('button', { name: /Chi tiết/i });
    await user.click(detailBtn);

    // Trong modal chi tiết, bấm "Gửi Chủ xưởng nghiệm thu"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Gửi Chủ xưởng nghiệm thu/i })).toBeInTheDocument();
    });
    const sendInspectBtn = screen.getByRole('button', { name: /Gửi Chủ xưởng nghiệm thu/i });
    await user.click(sendInspectBtn);

    // Modal nộp nghiệm thu xuất hiện
    await waitFor(() => {
      expect(screen.getByText(/Nộp nghiệm thu sản phẩm/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Tải ảnh thành phẩm thực tế/i).length).toBeGreaterThanOrEqual(1);
    });

    // Nhập ghi chú tự kiểm
    const noteInput = screen.getByPlaceholderText(/VD: Đã hoàn thiện sơn PU 3 lớp/i);
    fireEvent.change(noteInput, { target: { value: 'Sản phẩm hoàn thiện sơn bóng, kiểm tra phụ kiện đạt chuẩn.' } });

    // Dán link ảnh minh họa thành phẩm
    const linkInput = screen.getByPlaceholderText(/Hoặc dán URL ảnh trực tiếp/i);
    fireEvent.change(linkInput, { target: { value: 'https://example.com/finished-product.jpg' } });
    const addLinkBtn = screen.getByRole('button', { name: /Thêm link/i });
    await user.click(addLinkBtn);

    // Bấm nộp nghiệm thu
    const submitInspectBtn = screen.getByRole('button', { name: /Xác nhận nộp nghiệm thu/i });
    await user.click(submitInspectBtn);

    await waitFor(() => {
      expect(orderManagementService.leaderSubmitInspection).toHaveBeenCalledWith(
        502,
        expect.objectContaining({
          note: 'Sản phẩm hoàn thiện sơn bóng, kiểm tra phụ kiện đạt chuẩn.',
          images: expect.arrayContaining(['https://example.com/finished-product.jpg']),
        })
      );
    });
  });

  it('6. ManageOrdersPage: Hiển thị đơn Chờ nghiệm thu (UNDER_INSPECTION), xem ảnh thành phẩm và bấm Đạt nghiệm thu', async () => {
    const user = userEvent.setup();
    orderManagementService.getOrders.mockResolvedValue({
      orders: [
        {
          orderId: 601,
          orderCode: 'ORD-INSPECT-001',
          contactName: 'Khách Đặt Tủ',
          contactPhone: '0933333333',
          staffName: 'Lê Văn Tổ Trưởng',
          orderType: 'CUSTOM',
          status: 'UNDER_INSPECTION',
          totalAmount: 30000000,
          paidAmount: 15000000,
          remainingAmount: 15000000,
          inspectionNote: 'Đã hoàn thiện sắc nét, kiểm tra đóng mở êm.',
          inspectionImages: ['https://example.com/cabinet-front.jpg'],
          items: [],
        },
      ],
      pagination: { totalItems: 1, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });

    render(
      <MemoryRouter>
        <ManageOrdersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ORD-INSPECT-001')).toBeInTheDocument();
      expect(screen.getAllByText('Chờ nghiệm thu').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /Thẩm định nghiệm thu/i })).toBeInTheDocument();
    });

    // Mở modal thẩm định nghiệm thu
    const inspectBtn = screen.getByRole('button', { name: /Thẩm định nghiệm thu/i });
    await user.click(inspectBtn);

    // Modal thẩm định xuất hiện với thông tin và ảnh thành phẩm
    await waitFor(() => {
      expect(screen.getByText(/Thẩm định & Nghiệm thu sản phẩm/i)).toBeInTheDocument();
      expect(screen.getByText(/Đã hoàn thiện sắc nét, kiểm tra đóng mở êm/i)).toBeInTheDocument();
      expect(screen.getByAltText(/Ảnh thành phẩm 1/i)).toBeInTheDocument();
    });

    // Bấm Xác nhận nghiệm thu (mặc định ĐẠT)
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận nghiệm thu/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(orderManagementService.inspectOrder).toHaveBeenCalledWith(
        601,
        expect.objectContaining({
          result: 'PASSED',
        })
      );
    });
  });
});
