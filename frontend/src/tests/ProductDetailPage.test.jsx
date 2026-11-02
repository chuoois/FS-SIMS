import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProductDetailPage } from '../pages/public-pages/ProductDetailPage';
import * as productService from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

vi.mock('../services/productService', () => ({
  getProductById: vi.fn(),
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../context/CartContext', () => ({
  useCart: vi.fn(),
}));

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ isAuthenticated: true });
    useCart.mockReturnValue({ addItem: vi.fn().mockResolvedValue({}), loading: false });
  });

  const renderPage = (url = '/products/12') =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/san-pham/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('tải và hiển thị chi tiết sản phẩm theo mã trên URL', async () => {
    productService.getProductById.mockResolvedValue({
      data: {
        productId: 12,
        productCode: 'SOFA-012',
        productName: 'Sofa gỗ sồi',
        price: 12500000,
        stockQuantity: 4,
        imageUrl: 'https://example.com/sofa.jpg',
        description: 'Sofa gỗ sồi tự nhiên.',
        categoryName: 'Sofa',
        materialName: 'Gỗ sồi',
        dimensions: { formatted: '220 x 80 x 90 cm' },
        setItems: [
          {
            setItemId: 31,
            productId: 21,
            productCode: 'GH-021',
            productName: 'Ghế ăn gỗ sồi',
            quantity: 2,
            unitPrice: 1200000,
            imageUrl: 'https://example.com/chair.jpg',
            stockQuantity: 8,
            dimensions: '50 x 45 x 90 cm',
            materialName: 'Gỗ sồi',
            colorName: 'Tự nhiên',
            description: 'Ghế chắc chắn, hoàn thiện thủ công.',
          },
        ],
      },
    });

    renderPage('/san-pham/12');

    await waitFor(() => {
      expect(productService.getProductById).toHaveBeenCalledWith('12');
    });
    expect(await screen.findByRole('heading', { name: 'Sofa gỗ sồi' })).toBeInTheDocument();
    expect(screen.getByText('12.500.000 ₫')).toBeInTheDocument();
    expect(screen.getByText('Gỗ sồi')).toBeInTheDocument();
    expect(screen.getByText('Sofa gỗ sồi tự nhiên.')).toBeInTheDocument();
    const setDetailsToggle = screen.getByRole('button', { name: /sản phẩm trong bộ/i });
    expect(setDetailsToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Ghế ăn gỗ sồi')).not.toBeInTheDocument();
    fireEvent.click(setDetailsToggle);
    expect(setDetailsToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Ghế ăn gỗ sồi')).toBeInTheDocument();
    expect(screen.getByText('50 x 45 x 90 cm')).toBeInTheDocument();
    expect(screen.getByText('Ghế chắc chắn, hoàn thiện thủ công.')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link').some((link) => link.getAttribute('href') === '/products/21')
    ).toBe(true);
    expect(screen.queryByRole('link', { name: 'Liên hệ tư vấn' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm vào giỏ hàng' }));
    await waitFor(() => {
      expect(useCart().addItem).toHaveBeenCalledWith(12, 1);
    });
  });

  it('hiển thị lỗi API và cho phép quay lại danh sách sản phẩm', async () => {
    productService.getProductById.mockRejectedValue({
      response: { status: 404 },
    });

    renderPage();

    expect(
      await screen.findByText('Sản phẩm không tồn tại hoặc hiện không được kinh doanh.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /quay lại danh sách sản phẩm/i })).toHaveAttribute(
      'href',
      '/products'
    );
  });
});
