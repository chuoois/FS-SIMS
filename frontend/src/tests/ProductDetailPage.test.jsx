import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProductDetailPage } from '../pages/public-pages/ProductDetailPage';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getProductById } from '../services/productService';

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../context/CartContext', () => ({ useCart: vi.fn() }));
vi.mock('../services/productService', () => ({ getProductById: vi.fn() }));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

describe('ProductDetailPage quantity selector', () => {
  const product = {
    productId: 7,
    productName: 'Bàn ăn gỗ sồi',
    price: 12000000,
    stockQuantity: 3,
  };
  const addItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ isAuthenticated: true });
    useCart.mockReturnValue({ addItem, items: [], loading: false });
    getProductById.mockResolvedValue({ data: product });
    addItem.mockResolvedValue(undefined);
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/products/7']}>
        <Routes>
          <Route path="/products/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('adds the selected quantity to the cart', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'Bàn ăn gỗ sồi' });
    await user.click(screen.getByRole('button', { name: 'Tăng số lượng Bàn ăn gỗ sồi' }));
    await user.click(screen.getByRole('button', { name: 'Tăng số lượng Bàn ăn gỗ sồi' }));

    expect(screen.getByText('3', { selector: 'span' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thêm 3 vào giỏ hàng' }));

    await waitFor(() => expect(addItem).toHaveBeenCalledWith(7, 3));
  });

  it('limits the added quantity to stock remaining after the cart quantity', async () => {
    const user = userEvent.setup();
    useCart.mockReturnValue({
      addItem,
      items: [{ product: { productId: 7 }, quantity: 2 }],
      loading: false,
    });
    renderPage();

    await screen.findByRole('heading', { name: 'Bàn ăn gỗ sồi' });
    const increaseButton = screen.getByRole('button', { name: 'Tăng số lượng Bàn ăn gỗ sồi' });
    expect(screen.getByText('Trong giỏ: 2 / 3')).toBeInTheDocument();
    expect(screen.getByText('Có thể thêm tối đa 1 sản phẩm')).toBeInTheDocument();
    expect(screen.getByText('1', { selector: 'span' })).toBeInTheDocument();
    expect(increaseButton).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Thêm 1 vào giỏ hàng' }));

    await waitFor(() => expect(addItem).toHaveBeenCalledWith(7, 1));
  });

  it('disables adding and links to the cart when stock is already fully in the cart', async () => {
    useCart.mockReturnValue({
      addItem,
      items: [{ product: { productId: 7 }, quantity: 3 }],
      loading: false,
    });
    renderPage();

    await screen.findByRole('heading', { name: 'Bàn ăn gỗ sồi' });

    expect(screen.getByText('Đã đạt giới hạn tồn kho')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đã đạt giới hạn tồn kho' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Xem giỏ hàng' })).toHaveAttribute('href', '/cart');
  });
});
