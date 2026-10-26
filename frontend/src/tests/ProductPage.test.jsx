import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductPage } from '../pages/public-pages/ProductPage';
import * as productService from '../services/productService';

vi.mock('../services/productService');

describe('ProductPage Component', () => {
  const mockCategories = [
    { category_id: 1, category_code: 'TABLE', category_name: 'Bàn' },
    { category_id: 2, category_code: 'CHAIR', category_name: 'Ghế' },
  ];

  const mockRooms = [
    { room_id: 1, room_code: 'LIVING', room_name: 'Phòng khách' },
    { room_id: 2, room_code: 'DINING', room_name: 'Phòng ăn' },
  ];

  const mockProducts = [
    {
      productId: 1,
      productCode: 'TB-001',
      productName: 'Bàn ăn gỗ sồi 6 người',
      price: 4500000,
      stockQuantity: 5,
      categoryId: 1,
      categoryName: 'Bàn',
      roomId: 2,
      roomName: 'Phòng ăn',
      imageUrl: 'https://example.com/table.jpg',
      isSet: false,
    },
    {
      productId: 2,
      productCode: 'GH-001',
      productName: 'Ghế ăn gỗ sồi',
      price: 900000,
      stockQuantity: 0,
      categoryId: 2,
      categoryName: 'Ghế',
      roomId: 2,
      roomName: 'Phòng ăn',
      imageUrl: '',
      isSet: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    productService.getProductMetadata.mockResolvedValue({
      message: 'Thành công',
      data: {
        categories: mockCategories,
        rooms: mockRooms,
      },
    });

    productService.getProducts.mockResolvedValue({
      message: 'Thành công',
      data: mockProducts,
      pagination: {
        totalItems: 2,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 8,
      },
    });
  });

  it('render đúng tiêu đề Banner, dropdown danh mục/phòng và danh sách sản phẩm từ API', async () => {
    render(<ProductPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Sản phẩm' })).toBeInTheDocument();
    expect(screen.getByText('Bộ lọc & Tìm kiếm')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn gỗ sồi 6 người')).toBeInTheDocument();
      expect(screen.getByText('Ghế ăn gỗ sồi')).toBeInTheDocument();
      expect(screen.getByText('Hết hàng')).toBeInTheDocument();
    });

    // Kiểm tra options trong select
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Tất cả danh mục' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Bàn' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Ghế' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Tất cả không gian' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Phòng khách' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Phòng ăn' })).toBeInTheDocument();
    });
  });

  it('lọc theo danh mục và không gian phòng khi chọn dropdown và bấm Áp dụng', async () => {
    const user = userEvent.setup();
    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn gỗ sồi 6 người')).toBeInTheDocument();
    });

    // Chọn danh mục "Bàn" (value: 1)
    const categorySelect = screen.getByLabelText('Danh mục');
    await user.selectOptions(categorySelect, '1');

    // Chọn phòng "Phòng ăn" (value: 2)
    const roomSelect = screen.getByLabelText('Không gian phòng');
    await user.selectOptions(roomSelect, '2');

    // Bấm "Áp dụng"
    const applyButton = screen.getByRole('button', { name: /áp dụng/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(productService.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          category_id: '1',
          room_id: '2',
          page: 1,
          limit: 8,
        })
      );
    });
  });

  it('đặt lại bộ lọc khi nhấn nút xóa bộ lọc', async () => {
    const user = userEvent.setup();
    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn gỗ sồi 6 người')).toBeInTheDocument();
    });

    // Chọn danh mục và áp dụng
    const categorySelect = screen.getByLabelText('Danh mục');
    await user.selectOptions(categorySelect, '1');
    const applyButton = screen.getByRole('button', { name: /áp dụng/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /xóa toàn bộ bộ lọc/i })).toBeInTheDocument();
    });

    // Click nút xóa bộ lọc
    const resetButton = screen.getByRole('button', { name: /xóa toàn bộ bộ lọc/i });
    await user.click(resetButton);

    await waitFor(() => {
      expect(productService.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 8,
        })
      );
    });
  });

  it('hiển thị thông báo lỗi và nút Thử lại khi API gặp sự cố', async () => {
    productService.getProducts.mockRejectedValueOnce(new Error('Network error'));
    render(<ProductPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
    });
  });

  it('hiển thị trạng thái rỗng khi không tìm thấy sản phẩm nào', async () => {
    productService.getProducts.mockResolvedValueOnce({
      message: 'Thành công',
      data: [],
      pagination: { totalItems: 0, totalPages: 1 },
    });

    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy sản phẩm phù hợp')).toBeInTheDocument();
    });
  });

  it('hiển thị phân trang ngay cả khi không đủ trang (totalPages <= 1)', async () => {
    // mockProducts có 2 items và totalPages = 1
    render(<ProductPage />);

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Phân trang' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Trang 1' })).toBeInTheDocument();
      // Không có nút Trang sau vì chỉ có 1 trang
      expect(screen.queryByRole('button', { name: 'Trang sau' })).not.toBeInTheDocument();
    });
  });

  it('hiển thị đầy đủ các trang và nút Trang sau khi có nhiều trang (totalPages >= 2)', async () => {
    const user = userEvent.setup();
    productService.getProducts.mockResolvedValueOnce({
      message: 'Thành công',
      data: mockProducts,
      pagination: {
        totalItems: 16,
        totalPages: 2,
        currentPage: 1,
        itemsPerPage: 8,
      },
    });

    render(<ProductPage />);

    // Chờ sản phẩm render và phân trang xuất hiện
    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Phân trang' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Trang 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Trang 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Trang sau' })).toBeInTheDocument();
    });

    // Bấm chuyển sang trang 2
    const page2Button = screen.getByRole('button', { name: 'Trang 2' });
    await user.click(page2Button);

    await waitFor(() => {
      expect(productService.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 8,
        })
      );
    });
  });
});
