import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractsPage } from '../pages/sale-pages/ContractsPage';
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

vi.mock('../components/common/PrintContractModal', () => ({
  PrintContractModal: ({ isOpen }) => (isOpen ? <div data-testid="print-modal">Print Modal</div> : null),
}));

describe('ContractsPage Component', () => {
  const mockContracts = [
    {
      contractId: 1,
      contractCode: 'HD-20261120-0001',
      customerName: 'Nguyễn Văn An',
      customerPhone: '0901234567',
      totalAmount: 15000000,
      depositAmount: 5000000,
      status: 'DRAFT',
      contractFileUrl: null,
      items: [
        { productName: 'Bàn ăn gỗ sồi', quantity: 1, unitPrice: 15000000, totalPrice: 15000000 },
      ],
    },
    {
      contractId: 2,
      contractCode: 'HD-20261120-0002',
      customerName: 'Trần Thị Bình',
      customerPhone: '0908888999',
      totalAmount: 28000000,
      depositAmount: 28000000,
      status: 'SIGNED',
      contractFileUrl: 'https://example.com/contract.jpg',
      items: [
        { productName: 'Giường ngủ gỗ gõ', quantity: 1, unitPrice: 28000000, totalPrice: 28000000 },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    saleOrderService.getContracts.mockResolvedValue({
      data: mockContracts,
      pagination: {
        totalItems: 2,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });
    saleOrderService.getContractById.mockImplementation((id) => {
      const found = mockContracts.find((c) => c.contractId === id);
      return Promise.resolve({ data: found });
    });
  });

  it('renders header and contract list correctly', async () => {
    render(<ContractsPage />);

    expect(screen.getByText('Hợp đồng bán hàng')).toBeInTheDocument();
    expect(screen.getByText('Lập hợp đồng tại quầy')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('HD-20261120-0001')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
      expect(screen.getByText('HD-20261120-0002')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị Bình')).toBeInTheDocument();
    });
  });

  it('navigates to create order on button click', async () => {
    render(<ContractsPage />);
    const user = userEvent.setup();

    const createBtn = screen.getByText('Lập hợp đồng tại quầy');
    await user.click(createBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/sale/create-order');
  });

  it('filters contracts when selecting a status tab', async () => {
    render(<ContractsPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('HD-20261120-0001')).toBeInTheDocument();
    });

    const draftTab = screen.getByRole('button', { name: /Chờ ký/i });
    await user.click(draftTab);

    await waitFor(() => {
      expect(saleOrderService.getContracts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DRAFT' })
      );
    });
  });

  it('opens detail modal on clicking Chi tiết', async () => {
    render(<ContractsPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('HD-20261120-0001')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết/i });
    await user.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Chi tiết hợp đồng HD-20261120-0001/i)).toBeInTheDocument();
      expect(screen.getByText('Bàn ăn gỗ sồi')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Xác nhận đã ký bản giấy/i })).toBeInTheDocument();
    });
  });

  it('shows empty state when no contracts match', async () => {
    saleOrderService.getContracts.mockResolvedValueOnce({
      data: [],
      pagination: { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
    });

    render(<ContractsPage />);

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy hợp đồng nào')).toBeInTheDocument();
    });
  });
});
