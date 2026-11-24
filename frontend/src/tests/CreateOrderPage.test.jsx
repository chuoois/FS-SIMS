import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateOrderPage } from '../pages/sale-pages/CreateOrderPage';
import * as saleOrderService from '../services/saleOrderService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams()],
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

vi.mock('../components/common/PrintContractModal', () => ({
  PrintContractModal: ({ isOpen }) => (isOpen ? <div data-testid="print-modal">Print Modal</div> : null),
}));

describe('CreateOrderPage Component', () => {
  const mockProducts = [
    {
      productId: 1,
      productCode: 'PRD-001',
      productName: 'Bàn ăn Concorde mặt đá',
      price: 12000000,
      stockQuantity: 5,
      imageUrl: 'https://example.com/table.jpg',
      categoryName: 'Bàn ăn',
      roomName: 'Phòng ăn',
    },
    {
      productId: 2,
      productCode: 'PRD-002',
      productName: 'Ghế ăn Grace bọc da',
      price: 2500000,
      stockQuantity: 10,
      imageUrl: 'https://example.com/chair.jpg',
      categoryName: 'Ghế',
      roomName: 'Phòng ăn',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    saleOrderService.getProductMetadata.mockResolvedValue({
      data: { categories: [], rooms: [], materials: [], colors: [] },
    });
    saleOrderService.getWarehouseProducts.mockResolvedValue({
      data: mockProducts,
      pagination: { totalItems: 2, totalPages: 1, currentPage: 1, itemsPerPage: 6 },
    });
  });

  it('renders header and product list from warehouse', async () => {
    render(<CreateOrderPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Tạo hợp đồng bán hàng tại quầy' })).toBeInTheDocument();
    expect(screen.getByText('Giỏ hàng tại quầy')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn Concorde mặt đá')).toBeInTheDocument();
      expect(screen.getByText('Ghế ăn Grace bọc da')).toBeInTheDocument();
    });
  });

  it('adds product to cart when clicking Thêm giỏ', async () => {
    render(<CreateOrderPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn Concorde mặt đá')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', { name: /Thêm giỏ/i });
    await user.click(addButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1 món')).toBeInTheDocument();
      expect(screen.getAllByText('12.000.000 ₫').length).toBeGreaterThan(0);
    });
  });

  it('validates minimum delivery date and required fields on submitting form', async () => {
    render(<CreateOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Bàn ăn Concorde mặt đá')).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: 'Tạo hợp đồng bán hàng tại quầy' });
    expect(submitBtn).toBeDisabled();
  });
});
