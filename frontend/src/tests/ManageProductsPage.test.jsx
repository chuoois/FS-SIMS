import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
      productCode: 'TB-001',
      productName: 'Bàn ăn gỗ sồi 6 người',
      categoryName: 'Bàn',
      roomName: 'Phòng ăn',
      materialName: 'Gỗ sồi',
      colorName: 'Màu gỗ tự nhiên',
      price: 4500000,
      stockQuantity: 5,
      status: 'ACTIVE',
    },
    {
      productId: 2,
      productCode: 'GH-001',
      productName: 'Ghế ăn gỗ sồi',
      categoryName: 'Ghế',
      roomName: 'Phòng ăn',
      materialName: 'Gỗ sồi',
      colorName: 'Màu gỗ tự nhiên',
      price: 900000,
      stockQuantity: 0,
      status: 'ACTIVE',
    },
    {
      productId: 3,
      productCode: 'SET-002',
      productName: 'Bộ bàn ăn gỗ óc chó 6 món',
      productType: 'SET',
      isSet: true,
      totalSetItems: 6,
      categoryName: 'Bộ bàn ghế',
      roomName: 'Phòng ăn',
      materialName: 'Gỗ óc chó',
      colorName: 'Nâu óc chó',
      price: 15800000,
      stockQuantity: 4,
      status: 'ACTIVE',
      setItems: [
        {
          setItemId: 101,
          productId: 10,
          productCode: 'TB-003',
          productName: 'Bàn ăn gỗ óc chó 1m8',
          quantity: 1,
          unitPrice: 8500000,
          stockQuantity: 5,
        },
        {
          setItemId: 102,
          productId: 11,
          productCode: 'GH-002',
          productName: 'Ghế ăn gỗ óc chó bọc đệm',
          quantity: 4,
          unitPrice: 1400000,
          stockQuantity: 24,
        },
        {
          setItemId: 103,
          productId: 12,
          productCode: 'GB-001',
          productName: 'Ghế băng dài gỗ óc chó 1m4',
          quantity: 1,
          unitPrice: 2600000,
          stockQuantity: 6,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    productService.getProducts.mockResolvedValue({
      message: 'Thành công',
      data: mockProducts,
      pagination: { totalItems: 3, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });
    productService.getProductMetadata.mockResolvedValue({
      message: 'Thành công',
      data: {
        categories: [{ category_id: 1, category_name: 'Bàn' }],
        rooms: [{ room_id: 1, room_name: 'Phòng ăn' }],
        materials: [{ material_id: 1, material_name: 'Gỗ sồi' }],
        colors: [{ color_id: 1, color_name: 'Màu gỗ tự nhiên' }],
      },
    });
    productService.getProductStockSummary.mockResolvedValue({
      message: 'Thành công',
      data: {
        totalProducts: 3,
        inStock: 2,
        lowStock: 1,
        outOfStock: 1,
        totalQuantity: 9,
      },
    });
    productService.getNextProductCode.mockResolvedValue({
      message: 'Thành công',
      data: { nextCode: 'PRD-0003' },
    });
    productService.getProductDetail = vi.fn().mockResolvedValue({
      message: 'Thành công',
      data: {
        productId: 10,
        productCode: 'TB-003',
        productName: 'Bàn ăn gỗ óc chó 1m8',
        productType: 'SINGLE',
        categoryId: 1,
        roomId: 1,
        materialId: 1,
        colorId: 1,
        price: 8500000,
        stockQuantity: 5,
        isPartOfSet: true,
        inSets: [{ setId: 3, setCode: 'SET-002', setName: 'Bộ bàn ăn gỗ óc chó 6 món' }],
        status: 'ACTIVE',
      },
    });
    productService.createProductMaterial = vi.fn().mockResolvedValue({
      message: 'Thành công',
      data: { material_id: 88, material_code: 'GO_HUONG', material_name: 'Gỗ hương' },
    });
    productService.createProductColor = vi.fn().mockResolvedValue({
      message: 'Thành công',
      data: { color_id: 77, color_code: 'XANH_REU', color_name: 'Xanh rêu', hex_value: '#2E7D32' },
    });
  });

  it('render đúng tiêu đề và các sản phẩm', async () => {
    render(<ManageProductsPage />);

    expect(screen.getByText('Quản lý Sản phẩm (Kho thành phẩm)')).toBeInTheDocument();
    expect(screen.getByTestId('add-product-btn')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn gỗ sồi 6 người')).toBeInTheDocument();
      expect(screen.getByText('Ghế ăn gỗ sồi')).toBeInTheDocument();
      expect(screen.getByText('Bộ bàn ăn gỗ óc chó 6 món')).toBeInTheDocument();
    });
  });

  it('mở modal thêm sản phẩm khi click Thêm sản phẩm mới', async () => {
    const user = userEvent.setup();
    render(<ManageProductsPage />);

    const addBtn = screen.getByTestId('add-product-btn');
    await user.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Thêm sản phẩm mới' })).toBeInTheDocument();
    });
  });

  it('mở modal xóa sản phẩm khi click nút xóa', async () => {
    const user = userEvent.setup();
    render(<ManageProductsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-product-1')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId('delete-product-1');
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Xóa sản phẩm')).toBeInTheDocument();
    });
  });

  it('xổ xuống dropdown hiển thị các sản phẩm con khi click vào bộ sản phẩm', async () => {
    const user = userEvent.setup();
    render(<ManageProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Bộ bàn ăn gỗ óc chó 6 món')).toBeInTheDocument();
    });

    // Dropdown ban đầu chưa xổ xuống
    expect(screen.queryByTestId('set-dropdown-3')).not.toBeInTheDocument();

    // Click nút toggle bộ SET
    const toggleBtn = screen.getByTestId('toggle-set-3');
    await user.click(toggleBtn);

    // Dropdown xổ xuống hiển thị đầy đủ các sản phẩm con
    await waitFor(() => {
      expect(screen.getByTestId('set-dropdown-3')).toBeInTheDocument();
      expect(screen.getByText('Danh sách các món con thuộc bộ:')).toBeInTheDocument();
      expect(screen.getByText('Bàn ăn gỗ óc chó 1m8')).toBeInTheDocument();
      expect(screen.getByText('Ghế ăn gỗ óc chó bọc đệm')).toBeInTheDocument();
      expect(screen.getByText('Ghế băng dài gỗ óc chó 1m4')).toBeInTheDocument();
    });
  });

  it('mở modal chỉnh sửa sản phẩm con khi click nút sửa ở dòng sản phẩm con trong dropdown', async () => {
    const user = userEvent.setup();
    render(<ManageProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Bộ bàn ăn gỗ óc chó 6 món')).toBeInTheDocument();
    });

    // Mở dropdown bộ sản phẩm
    const toggleBtn = screen.getByTestId('toggle-set-3');
    await user.click(toggleBtn);

    await waitFor(() => {
      expect(screen.getByTestId('edit-child-product-10')).toBeInTheDocument();
    });

    // Click nút sửa sản phẩm con TB-003
    await user.click(screen.getByTestId('edit-child-product-10'));

    await waitFor(() => {
      expect(screen.getByText(/Chỉnh sửa sản phẩm con/)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Bàn ăn gỗ óc chó 1m8')).toBeInTheDocument();
    });
  });

  it('cho phép tạo sản phẩm con mới trực tiếp trong bộ khi tạo bộ sản phẩm', async () => {
    const user = userEvent.setup();
    productService.createProduct.mockResolvedValueOnce({
      message: 'Thêm mới sản phẩm thành công',
      data: {
        productId: 99,
        productCode: 'SP000099',
        productName: 'Ghế ăn bọc nệm cao cấp',
        dimensions: { formatted: '45x45x90 cm' },
        imageUrl: null,
      },
    });

    render(<ManageProductsPage />);

    // Mở modal Thêm sản phẩm mới
    const addBtn = screen.getByTestId('add-product-btn');
    await user.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Thêm sản phẩm mới' })).toBeInTheDocument();
    });

    // Chuyển loại sản phẩm sang Bộ sản phẩm
    const setTypeBtn = screen.getByRole('button', { name: /Bộ sản phẩm/i });
    await user.click(setTypeBtn);

    // Chờ xuất hiện tab toggle thêm sản phẩm thành phần
    await waitFor(() => {
      expect(screen.getByText('Tạo mới sản phẩm con trực tiếp')).toBeInTheDocument();
    });

    // Click chuyển sang tab "Tạo mới sản phẩm con trực tiếp"
    await user.click(screen.getByText('Tạo mới sản phẩm con trực tiếp'));

    // Nhập tên sản phẩm con mới
    const childNameInput = screen.getByPlaceholderText('VD: Ghế ăn bọc nệm, Mặt bàn kính cường lực...');
    await user.type(childNameInput, 'Ghế ăn bọc nệm cao cấp');

    // Click nút "Tạo & Đưa vào bộ ngay"
    const createChildBtn = screen.getByRole('button', { name: /Tạo & Đưa vào bộ ngay/i });
    await user.click(createChildBtn);

    // Xác nhận sản phẩm con vừa tạo xuất hiện trong bảng các món con
    await waitFor(() => {
      expect(screen.getByText('Ghế ăn bọc nệm cao cấp')).toBeInTheDocument();
      expect(screen.getByText('SP000099')).toBeInTheDocument();
    });
  });

  it('cho phép tìm và thêm mới chất liệu ngay trong form tạo sản phẩm', async () => {
    const user = userEvent.setup();

    render(<ManageProductsPage />);

    // Mở modal Thêm sản phẩm mới
    const addBtn = screen.getByTestId('add-product-btn');
    await user.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Thêm sản phẩm mới' })).toBeInTheDocument();
    });

    // Tìm ô nhập chất liệu
    const materialInput = screen.getByPlaceholderText('Chọn hoặc gõ để tìm/thêm chất liệu...');
    expect(materialInput).toBeInTheDocument();

    // Gõ chất liệu mới chưa có trong hệ thống
    await user.click(materialInput);
    fireEvent.change(materialInput, { target: { value: 'Gỗ hương' } });

    // Nút thêm mới hiển thị
    const createMatBtn = await screen.findByRole('button', { name: /Thêm mới chất liệu: "Gỗ hương"/i });
    expect(createMatBtn).toBeInTheDocument();

    await user.click(createMatBtn);

    // Kiểm tra gọi service createProductMaterial
    expect(productService.createProductMaterial).toHaveBeenCalledWith({ material_name: 'Gỗ hương' });

    // Sau khi tạo xong, ô chất liệu hiển thị Gỗ hương
    await waitFor(() => {
      expect(screen.getByDisplayValue('Gỗ hương')).toBeInTheDocument();
    });
  });
});
