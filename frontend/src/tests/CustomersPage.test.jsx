import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomersPage } from '../pages/sale-pages/CustomersPage';
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
  },
}));

describe('CustomersPage Component', () => {
  const mockCustomers = [
    {
      user_account_id: 1,
      full_name: 'Nguyễn Văn Minh',
      email: 'minh@gmail.com',
      phone_number: '0901112233',
      status: 'ACTIVE',
      totalRequests: 2,
      totalContracts: 1,
      totalOrders: 1,
      createdate: '2026-11-01',
    },
    {
      user_account_id: 2,
      full_name: 'Trần Thị Thu',
      email: 'thu@gmail.com',
      phone_number: '0909998877',
      status: 'INACTIVE',
      totalRequests: 0,
      totalContracts: 0,
      totalOrders: 0,
      createdate: '2026-11-05',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    saleOrderService.getCustomers.mockResolvedValue({
      data: mockCustomers,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 2,
        itemsPerPage: 10,
      },
    });
    saleOrderService.getCustomerById.mockImplementation((id) => {
      const found = mockCustomers.find((c) => c.user_account_id === id);
      return Promise.resolve({ data: found });
    });
  });

  it('renders header and customer table correctly', async () => {
    render(<CustomersPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Quản lý khách hàng' })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Minh')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị Thu')).toBeInTheDocument();
    });
  });

  it('opens detail modal on clicking Chi tiết', async () => {
    render(<CustomersPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Minh')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết/i });
    await user.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Thông tin cá nhân')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Yêu cầu đặt đóng/i })).toBeInTheDocument();
    });
  });

  it('opens create customer modal on clicking Thêm khách hàng', async () => {
    render(<CustomersPage />);
    const user = userEvent.setup();

    const addBtn = screen.getByRole('button', { name: /Thêm khách hàng/i });
    await user.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Thêm mới khách hàng' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Nguyễn Văn A')).toBeInTheDocument();
    });
  });
});
