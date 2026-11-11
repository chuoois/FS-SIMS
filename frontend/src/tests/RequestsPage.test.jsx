// =========================================================
// RequestsPage.test.jsx
// Unit tests cho trang Quản lý yêu cầu (RequestsPage) của Sale/Owner
// Kiểm tra danh sách, phân trang, lọc, xem chi tiết và chuyển thành hợp đồng
// =========================================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RequestsPage } from '../pages/sale-pages/RequestsPage';
import * as saleOrderService from '../services/saleOrderService';

vi.mock('../services/saleOrderService', () => ({
  getRequests: vi.fn(),
  getRequestById: vi.fn(),
  convertRequestToContract: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockRequests = [
  {
    requestId: 1,
    requestCode: 'RQ-20261103-0001',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0912345678',
    customerEmail: 'nguyenvana@gmail.com',
    deliveryAddress: '', // Khách chưa có địa chỉ lúc gửi yêu cầu
    orderType: 'READY',
    status: 'PENDING',
    createdAt: '2026-11-03T10:00:00.000Z',
    items: [
      {
        requestItemId: 1,
        productId: 10,
        itemName: 'Bàn ăn thông minh',
        quantity: 2,
        unitPrice: 6000000,
      },
    ],
  },
  {
    requestId: 2,
    requestCode: 'RQ-20261103-0002',
    customerName: 'Trần Thị B',
    customerPhone: '0987654321',
    customerEmail: 'tranthib@gmail.com',
    deliveryAddress: '456 Nguyễn Huệ, Q1, TP.HCM',
    orderType: 'CUSTOM',
    status: 'CONVERTED',
    createdAt: '2026-11-03T11:00:00.000Z',
    items: [
      {
        requestItemId: 2,
        productId: null,
        itemName: 'Tủ bếp gỗ sồi thiết kế',
        quantity: 1,
        unitPrice: 25000000,
      },
    ],
    contract: {
      contractId: 10,
      contractCode: 'HD-20261103-0001',
      status: 'DRAFT',
    },
  },
  {
    requestId: 3,
    requestCode: 'RQ-20261103-0003',
    customerName: 'Lê Văn C',
    customerPhone: '0901122334',
    customerEmail: 'levanc@gmail.com',
    deliveryAddress: '123 Ba Tháng Hai, Q10, TP.HCM',
    orderType: 'CUSTOM',
    status: 'REQUEST_CHANGE',
    rejectReason: 'Kích thước tủ bếp dài 350cm không phù hợp góc tường, yêu cầu giảm xuống 300cm',
    createdAt: '2026-11-03T14:00:00.000Z',
    items: [
      {
        requestItemId: 3,
        productId: null,
        itemName: 'Tủ bếp góc L',
        quantity: 1,
        unitPrice: 30000000,
        lengthCm: 350,
        widthCm: 60,
        heightCm: 220,
      },
    ],
  },
];

describe('RequestsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    saleOrderService.getRequests.mockResolvedValue({
      message: 'Lấy danh sách yêu cầu khách hàng thành công',
      data: mockRequests,
      pagination: {
        totalItems: 2,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });

    saleOrderService.getRequestById.mockImplementation((id) => {
      const found = mockRequests.find((r) => r.requestId === Number(id));
      return Promise.resolve({
        message: 'Lấy chi tiết yêu cầu thành công',
        data: found || mockRequests[0],
      });
    });

    saleOrderService.convertRequestToContract.mockResolvedValue({
      message: 'Chuyển yêu cầu thành hợp đồng thành công',
      data: {
        contractId: 99,
        contractCode: 'HD-20261103-0099',
        requestCode: 'RQ-20261103-0001',
        totalAmount: 12000000,
        depositAmount: 3600000,
      },
    });
  });

  it('renders header, filter controls and request list correctly', async () => {
    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Yêu cầu của khách hàng')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm kiếm...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('RQ-20261103-0001')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText('RQ-20261103-0002')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    });
  });

  it('displays correct status badges and action buttons', async () => {
    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // PENDING should have 'Tạo HĐ' button
      expect(screen.getByText('Tạo HĐ')).toBeInTheDocument();
      // CONVERTED should have 'Xem HĐ' button
      expect(screen.getByText('Xem HĐ')).toBeInTheDocument();
    });
  });

  it('opens detail modal when clicking view button', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('RQ-20261103-0001')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByTitle('Xem chi tiết');
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Chi tiết yêu cầu')).toBeInTheDocument();
      expect(screen.getByText('nguyenvana@gmail.com')).toBeInTheDocument();
    });
  });

  it('opens convert modal, displays POS-like cart and customer form, allows filling missing address', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tạo HĐ')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Tạo HĐ'));

    // Modal opens
    await waitFor(() => {
      expect(screen.getByText('Chuyển yêu cầu thành Hợp đồng')).toBeInTheDocument();
      // Check POS-like cart header
      expect(screen.getByText('Giỏ hàng sản phẩm')).toBeInTheDocument();
      // Check item in cart
      expect(screen.getByText('Bàn ăn thông minh')).toBeInTheDocument();
      // Check customer form header
      expect(screen.getByText('Thông tin khách hàng & Giao nhận')).toBeInTheDocument();
    });

    // Pre-filled customer name
    const nameInput = screen.getByDisplayValue('Nguyễn Văn A');
    expect(nameInput).toBeInTheDocument();

    // Fill in missing address
    const addressInput = screen.getByPlaceholderText(/Địa chỉ số nhà, đường/i);
    await user.type(addressInput, '789 Điện Biên Phủ, Q3, TP.HCM');

    const submitBtn = screen.getByRole('button', { name: /Tạo Hợp đồng/i });
    expect(submitBtn).toBeInTheDocument();

    await user.click(submitBtn);

    await waitFor(() => {
      expect(saleOrderService.convertRequestToContract).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          customer_name: 'Nguyễn Văn A',
          customer_phone: '0912345678',
          customer_address: '789 Điện Biên Phủ, Q3, TP.HCM',
          deposit_amount: expect.any(Number),
          items: expect.any(Array),
        })
      );
    });
  });

  it('resets filters when clicking reset button', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Tìm kiếm...');
    await user.type(searchInput, 'Nguyễn Văn');

    await waitFor(() => {
      expect(screen.getByText(/Đặt lại/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/Đặt lại/));

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  it('displays REQUEST_CHANGE requests with alert banner, "Sửa đơn" button, and modal feedback', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );

    // 1. Kiểm tra alert banner hiển thị cảnh báo đơn cần sửa
    await waitFor(() => {
      expect(screen.getByText(/Có 1 yêu cầu cần Sales chỉnh sửa theo ý kiến Chủ xưởng/i)).toBeInTheDocument();
      expect(screen.getByText('RQ-20261103-0003')).toBeInTheDocument();
      expect(screen.getByText('Lê Văn C')).toBeInTheDocument();
    });

    // 2. Kiểm tra Badge trạng thái và ghi chú lý do sửa của Chủ xưởng trên bảng
    expect(screen.getByText('Yêu cầu sửa')).toBeInTheDocument();
    expect(screen.getByText(/⚠️ Sửa: Kích thước tủ bếp dài 350cm/i)).toBeInTheDocument();

    // 3. Nút "Sửa đơn" phải xuất hiện trên dòng đơn REQUEST_CHANGE
    const editBtns = screen.getAllByRole('button', { name: /Sửa đơn/i });
    expect(editBtns.length).toBeGreaterThan(0);

    // 4. Mở modal chi tiết của đơn REQUEST_CHANGE
    const viewButtons = screen.getAllByTitle('Xem chi tiết');
    // Button thứ 3 là của đơn requestId = 3
    await user.click(viewButtons[2]);

    await waitFor(() => {
      expect(screen.getByText('Chi tiết yêu cầu')).toBeInTheDocument();
      expect(screen.getByText(/Chủ xưởng yêu cầu chỉnh sửa thiết kế \/ thông số kỹ thuật/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Kích thước tủ bếp dài 350cm không phù hợp/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByRole('button', { name: /Chỉnh sửa bản vẽ & Gửi lại/i })).toBeInTheDocument();
    });
  });

  it('displays per-item workshop design files sent from Owner separately from customer reference images', async () => {
    const user = userEvent.setup();
    const requestWithOwnerDesign = {
      requestId: 21,
      requestCode: 'RQ-20261110-0001',
      customerName: 'Việt Khách Hàng',
      customerPhone: '0987654321',
      deliveryAddress: '10 Hai Bà Trưng, Q1',
      orderType: 'CUSTOM',
      status: 'PENDING',
      createdAt: '2026-11-10T17:44:52.000Z',
      items: [
        {
          requestItemId: 34,
          itemName: 'Tủ áo cánh lùa',
          lengthCm: 200,
          widthCm: 60,
          heightCm: 220,
          quantity: 1,
          unitPrice: 12000000,
          description: 'Gỗ sồi tự nhiên, sơn PU mờ',
          images: [
            {
              imageId: 17,
              requestItemId: 34,
              imageUrl: 'https://res.cloudinary.com/demo/image/upload/app_uploads/ref.jpg',
              imageType: 'CUSTOMER_REF',
              isOwnerDesign: false,
              createdBy: 'sales@fssims.local',
            },
            {
              imageId: 19,
              requestItemId: 34,
              imageUrl: 'https://res.cloudinary.com/demo/image/upload/design_files/owner-cad.jpg',
              imageType: 'OWNER_DESIGN',
              isOwnerDesign: true,
              createdBy: 'owner@fssims.local',
            },
          ],
        },
      ],
      images: [],
    };

    saleOrderService.getRequests.mockResolvedValueOnce({
      data: [requestWithOwnerDesign],
      pagination: { totalItems: 1, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });
    saleOrderService.getRequestById.mockResolvedValueOnce({
      data: requestWithOwnerDesign,
    });

    render(
      <MemoryRouter>
        <RequestsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('RQ-20261110-0001')).toBeInTheDocument();
      expect(screen.getByText('1 bản vẽ xưởng')).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Xem chi tiết'));

    await waitFor(() => {
      expect(screen.getByText('Chủ xưởng đã gửi 1 bản vẽ')).toBeInTheDocument();
      expect(screen.getByText('Ảnh mẫu khách gửi')).toBeInTheDocument();
      expect(screen.getByText('Bản vẽ thiết kế từ Chủ xưởng')).toBeInTheDocument();
      expect(screen.getByText('Gỗ sồi tự nhiên, sơn PU mờ')).toBeInTheDocument();
    });

    const imgs = screen.getAllByRole('img');
    const srcs = imgs.map((el) => el.getAttribute('src'));
    expect(srcs).toContain('https://res.cloudinary.com/demo/image/upload/app_uploads/ref.jpg');
    expect(srcs).toContain('https://res.cloudinary.com/demo/image/upload/design_files/owner-cad.jpg');
  });
});
