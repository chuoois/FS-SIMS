import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { ManageProductsPage } from '../pages/owner-pages/ManageProductsPage';
import * as productService from '../services/productManagerService';

vi.mock('../services/productManagerService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ManageProductsPage Component', () => {
  const mockProducts = [
    {
      productId: 1,
      productCode: 'SP-001',
      productName: 'Bàn ăn gỗ sồi 6 ghế',
      categoryName: 'Bàn ăn',
      roomName: 'Phòng bếp',
      materialName: 'Gỗ Sồi',
      colorName: 'Tự nhiên',
      dimensions: '160 × 80 × 75 cm',
      price: 8500000,
      stockQuantity: 10,
      status: 'ACTIVE',
      isSet: false,
      images: ['https://example.com/ban-an.jpg'],
    },
    {
      productId: 2,
      productCode: 'SET-001',
      productName: 'Bộ phòng ngủ Hoàng Gia',
      categoryName: 'Bộ nội thất',
      roomName: 'Phòng ngủ',
      materialName: 'Gỗ Gõ Đỏ',
      colorName: 'Nâu cánh gián',
      dimensions: 'Nhiều món',
      price: 45000000,
      stockQuantity: 2,
      status: 'ACTIVE',
      isSet: true,
      totalSetItems: 3,
      setItems: [
        {
          setItemId: 10,
          productId: 101,
          productCode: 'SP-101',
          productName: 'Giường ngủ 1m8',
          dimensions: '180 × 200 cm',
          quantity: 1,
          status: 'ACTIVE',
          imageUrl: 'https://example.com/giuong.jpg',
        },
      ],
      images: ['https://example.com/bo-phong-ngu.jpg'],
    },
  ];

  const mockMetadata = {
    categories: [{ category_id: 1, category_name: 'Bàn ăn' }],
    rooms: [{ room_id: 1, room_name: 'Phòng bếp' }],
    materials: [{ material_id: 1, material_name: 'Gỗ Sồi' }],
    colors: [{ color_id: 1, color_name: 'Tự nhiên' }],
  };

  const mockStockSummary = {
    totalProducts: 2,
    inStock: 2,
    lowStock: 0,
    outOfStock: 0,
    totalQuantity: 12,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    productService.getProducts.mockResolvedValue({
      data: mockProducts,
      pagination: {
        totalItems: 2,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });
    productService.getProductMetadata.mockResolvedValue({ data: mockMetadata });
    productService.getProductStockSummary.mockResolvedValue({ data: mockStockSummary });
    productService.getNextProductCode.mockResolvedValue({ data: { nextCode: 'SP-002' } });
  });

  it('renders page header, title, and action buttons with amber-900 styling', async () => {
    render(<ManageProductsPage />);

    expect(screen.getByText('Quản Lý Sản Phẩm')).toBeInTheDocument();
    expect(
      screen.getByText('Thêm mới sản phẩm, cập nhật tồn kho, hình ảnh và kiểm tra tình trạng hàng hóa của xưởng.')
    ).toBeInTheDocument();

    const addBtn = screen.getByTestId('add-product-btn');
    expect(addBtn).toBeInTheDocument();
    expect(addBtn.className).toContain('bg-amber-900');
    expect(addBtn.className).toContain('text-white');

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn gỗ sồi 6 ghế')).toBeInTheDocument();
      expect(screen.getByText('Bộ phòng ngủ Hoàng Gia')).toBeInTheDocument();
    });
  });

  it('displays overview KPI cards with formatted values', async () => {
    render(<ManageProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tổng sản phẩm')).toBeInTheDocument();
      expect(screen.getByText('Còn hàng')).toBeInTheDocument();
      expect(screen.getByText('Tổng tồn thành phẩm')).toBeInTheDocument();
    });
  });

  it('renders ProductStatusBadge and price formatted in VND with symbol ₫', async () => {
    render(<ManageProductsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Đang kinh doanh').length).toBeGreaterThan(0);
      expect(screen.getByText('8.500.000 ₫')).toBeInTheDocument();
      expect(screen.getByText('45.000.000 ₫')).toBeInTheDocument();
    });
  });

  it('opens Create Product modal when clicking "+ Thêm sản phẩm mới" button', async () => {
    render(<ManageProductsPage />);

    const addBtn = screen.getByTestId('add-product-btn');
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Thêm sản phẩm mới' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sản phẩm lẻ/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Bộ sản phẩm/i })).toBeInTheDocument();
    });
  });

  it('opens Delete Product modal when clicking Trash2 icon button', async () => {
    render(<ManageProductsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-product-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-product-1'));

    await waitFor(() => {
      expect(screen.getByText('Xóa sản phẩm')).toBeInTheDocument();
      expect(screen.getByText(/Bạn có chắc chắn muốn xóa sản phẩm/)).toBeInTheDocument();
    });
  });
});
