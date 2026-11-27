import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateOrderRequestPage } from '../pages/sale-pages/CreateOrderRequestPage';
import * as saleOrderService from '../services/saleOrderService';
import toast from 'react-hot-toast';

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

vi.mock('../services/saleOrderService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('CreateOrderRequestPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    saleOrderService.getProductMetadata.mockResolvedValue({
      data: {
        categories: [{ categoryId: 1, categoryName: 'Tủ áo' }],
        rooms: [{ roomId: 1, roomName: 'Phòng ngủ' }],
        materials: [{ materialId: 1, materialName: 'Gỗ Sồi' }],
        colors: [{ colorId: 1, colorName: 'Tự nhiên', hexValue: '#D2B48C' }],
      },
    });
  });

  it('renders header and form sections properly', async () => {
    render(<CreateOrderRequestPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Tạo yêu cầu đặt đóng nội thất' })
    ).toBeInTheDocument();
    expect(screen.getByText('1. Thông tin khách hàng & địa điểm lắp đặt')).toBeInTheDocument();
    expect(screen.getByText(/2. Danh mục sản phẩm đặt đóng theo yêu cầu/i)).toBeInTheDocument();
  });

  it('adds and removes item in custom product list', async () => {
    render(<CreateOrderRequestPage />);
    const user = userEvent.setup();

    expect(screen.getByText('Sản phẩm #1: Chưa đặt tên')).toBeInTheDocument();

    const addButtons = screen.getAllByRole('button', { name: /Thêm sản phẩm/i });
    await user.click(addButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Sản phẩm #2: Chưa đặt tên')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole('button', { name: /Xóa món/i });
    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('Sản phẩm #2: Chưa đặt tên')).not.toBeInTheDocument();
    });
  });

  it('does not allow submitting when required fields are empty', async () => {
    render(<CreateOrderRequestPage />);
    const user = userEvent.setup();

    const submitBtn = screen.getByRole('button', { name: /Kiểm tra & Gửi yêu cầu thiết kế/i });
    await user.click(submitBtn);

    expect(screen.queryByText('Kiểm tra hồ sơ yêu cầu đặt đóng nội thất')).not.toBeInTheDocument();
  });

  it('loads existing CUSTOM request in edit mode and submits update', async () => {
    mockSearchParams = new URLSearchParams('editId=203');
    saleOrderService.getRequestById.mockResolvedValueOnce({
      data: {
        requestId: 203,
        requestCode: 'REQ-20261124-0003',
        orderType: 'CUSTOM',
        status: 'DESIGNING',
        title: 'Tủ quần áo phòng master',
        contactName: 'Phạm Minh Khoa',
        contactPhone: '0911223344',
        contactEmail: 'khoa@example.com',
        deliveryAddress: '123 Lê Lợi, Hà Nội',
        expectedDate: '2026-12-20',
        items: [
          {
            requestItemId: 3,
            itemName: 'Tủ quần áo kịch trần',
            categoryId: 1,
            roomId: 1,
            materialId: 1,
            colorId: 1,
            lengthCm: 220,
            widthCm: 60,
            heightCm: 260,
            quantity: 1,
            unitPrice: 14000000,
            technicalNotes: 'Cánh lùa',
            images: [],
          },
        ],
        images: [],
      },
    });
    saleOrderService.updateSalesOrderRequest.mockResolvedValueOnce({
      message: 'Cập nhật yêu cầu thiết kế thành công',
    });

    render(<CreateOrderRequestPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Chỉnh sửa yêu cầu đặt đóng nội thất/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Phạm Minh Khoa')).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue('Tủ quần áo phòng master');
    await user.clear(titleInput);
    await user.type(titleInput, 'Tủ quần áo phòng master (Đã sửa)');

    await user.click(screen.getByRole('button', { name: /Kiểm tra & Cập nhật yêu cầu/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Xác nhận cập nhật yêu cầu/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Xác nhận cập nhật yêu cầu/i }));

    await waitFor(() => {
      expect(saleOrderService.updateSalesOrderRequest).toHaveBeenCalledWith(
        '203',
        expect.objectContaining({
          title: 'Tủ quần áo phòng master (Đã sửa)',
          contactName: 'Phạm Minh Khoa',
          contactPhone: '0911223344',
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Cập nhật yêu cầu thiết kế thành công');
      expect(mockNavigate).toHaveBeenCalledWith('/sale/requests');
    });
  });

  it('redirects back to requests list if request was already approved by owner', async () => {
    mockSearchParams = new URLSearchParams('editId=201');
    saleOrderService.getRequestById.mockResolvedValueOnce({
      data: {
        requestId: 201,
        requestCode: 'REQ-20261124-0001',
        orderType: 'CUSTOM',
        status: 'DESIGNED',
      },
    });

    render(<CreateOrderRequestPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Chỉ có thể chỉnh sửa yêu cầu đặt đóng khi Chủ xưởng chưa duyệt.'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/sale/requests');
    });
  });
});
