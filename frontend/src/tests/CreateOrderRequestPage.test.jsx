import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateOrderRequestPage } from '../pages/sale-pages/CreateOrderRequestPage';
import * as saleOrderService from '../services/saleOrderService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
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
});
