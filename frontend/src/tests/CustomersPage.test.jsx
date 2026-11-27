import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomersPage } from '../pages/sale-pages/CustomersPage';
import * as saleOrderService from '../services/saleOrderService';
import toast from 'react-hot-toast';

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
      address: '123 Đường Láng, Hà Nội',
      note: 'Khách VIP',
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
      address: '456 Nguyễn Trãi, Hà Nội',
      note: '',
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
    saleOrderService.updateSaleCustomer.mockResolvedValue({
      message: 'Cập nhật thông tin khách hàng thành công',
      data: { ...mockCustomers[0], full_name: 'Nguyễn Văn Minh (Đã sửa)' },
    });
    saleOrderService.deleteSaleCustomer.mockResolvedValue({
      message: 'Xóa khách hàng thành công',
      data: null,
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

  it('opens edit customer modal with prefilled fields and saves changes', async () => {
    render(<CustomersPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Minh')).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: 'Sửa khách hàng Nguyễn Văn Minh' });
    await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Chỉnh sửa thông tin khách hàng' })).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Họ và tên khách hàng/i);
    expect(nameInput).toHaveValue('Nguyễn Văn Minh');

    await user.clear(nameInput);
    await user.type(nameInput, 'Nguyễn Văn Minh (Đã sửa)');

    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(saleOrderService.updateSaleCustomer).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          fullName: 'Nguyễn Văn Minh (Đã sửa)',
          phoneNumber: '0901112233',
          email: 'minh@gmail.com',
          status: 'ACTIVE',
        })
      );
      expect(toast.success).toHaveBeenCalledWith('Cập nhật thông tin khách hàng thành công');
    });
  });

  it('shows API error toast when updating customer fails', async () => {
    saleOrderService.updateSaleCustomer.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { detail: 'Email "thu@gmail.com" đã được sử dụng bởi một tài khoản khác.' },
      },
    });

    render(<CustomersPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Minh')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Sửa khách hàng Nguyễn Văn Minh' }));
    await user.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Email "thu@gmail.com" đã được sử dụng bởi một tài khoản khác.'
      );
    });
  });

  it('opens delete modal and deletes customer successfully', async () => {
    render(<CustomersPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Trần Thị Thu')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Xóa khách hàng Trần Thị Thu' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Xóa vĩnh viễn khách hàng?' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Xác nhận xóa/i }));

    await waitFor(() => {
      expect(saleOrderService.deleteSaleCustomer).toHaveBeenCalledWith(2);
      expect(toast.success).toHaveBeenCalledWith('Xóa khách hàng thành công');
    });
  });

  it('handles 409 conflict on delete and allows switching customer to INACTIVE', async () => {
    saleOrderService.deleteSaleCustomer.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          detail: 'Không thể xóa vì khách hàng "Nguyễn Văn Minh" đã phát sinh 2 yêu cầu, 1 hợp đồng trong hệ thống.',
        },
      },
    });

    render(<CustomersPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Minh')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Xóa khách hàng Nguyễn Văn Minh' }));
    await user.click(screen.getByRole('button', { name: /Xác nhận xóa/i }));

    await waitFor(() => {
      expect(screen.getByText(/Ràng buộc dữ liệu giao dịch/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Chuyển sang ngừng hoạt động/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Chuyển sang ngừng hoạt động/i }));

    await waitFor(() => {
      expect(saleOrderService.updateSaleCustomer).toHaveBeenCalledWith(1, { status: 'INACTIVE' });
      expect(toast.success).toHaveBeenCalledWith('Đã chuyển khách hàng sang ngừng hoạt động');
    });
  });
});
