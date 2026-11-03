import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CartPage } from '../pages/public-pages/Cartpage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../context/CartContext', () => ({
  useCart: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

describe('CartPage', () => {
  const updateItem = vi.fn().mockResolvedValue({});
  const removeItem = vi.fn().mockResolvedValue({});
  const refreshCart = vi.fn().mockResolvedValue({});
  const submitRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { fullName: 'Nguyễn Văn A', phoneNumber: '0901234567', address: '12 Lê Lợi' },
    });
    submitRequest.mockResolvedValue({ requestCode: 'RQ-20261103-AB12CD34' });
    useCart.mockReturnValue({
      items: [{
        cartItemId: 1,
        quantity: 2,
        lineTotal: 2400000,
        product: {
          productId: 21,
          productCode: 'GH-021',
          productName: 'Ghế ăn gỗ sồi',
          price: 1200000,
          imageUrl: '',
          stockQuantity: 8,
          isSet: false,
        },
      }],
      itemCount: 2,
      subtotal: 2400000,
      loading: false,
      error: '',
      refreshCart,
      updateItem,
      removeItem,
      submitRequest,
    });
  });

  it('hiển thị giỏ hàng từ dữ liệu tài khoản', () => {
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Ghế ăn gỗ sồi')).toBeInTheDocument();
    expect(screen.getAllByText('2.400.000 ₫')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'Sản phẩm (2)' })).toBeInTheDocument();
  });

  it('gửi yêu cầu cập nhật số lượng khi bấm nút tăng', async () => {
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tăng số lượng Ghế ăn gỗ sồi' }));

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith(21, 3);
    });
  });

  it('xóa sản phẩm khỏi giỏ khi bấm nút xóa', async () => {
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xóa Ghế ăn gỗ sồi khỏi giỏ hàng' }));

    await waitFor(() => {
      expect(removeItem).toHaveBeenCalledWith(21);
    });
  });

  it('gửi yêu cầu mua hàng cho sale từ giỏ hàng', async () => {
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu cho sale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gửi yêu cầu' }));

    await waitFor(() => {
      expect(submitRequest).toHaveBeenCalledWith({
        contactName: 'Nguyễn Văn A',
        contactPhone: '0901234567',
        deliveryAddress: '12 Lê Lợi',
        description: '',
      });
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Đã gửi yêu cầu RQ-20261103-AB12CD34 cho nhân viên bán hàng.'
    );
  });

  it('hiển thị lỗi khi không gửi được yêu cầu', async () => {
    submitRequest.mockRejectedValue({
      response: { data: { message: 'Giỏ hàng đang trống.' } },
    });
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu cho sale' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gửi yêu cầu' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Giỏ hàng đang trống.');
    });
  });
});
