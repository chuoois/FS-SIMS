import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageStaffAccountsPage } from '../pages/owner-pages/ManageStaffAccountsPage';
import * as staffAccountService from '../services/staffAccountService';

vi.mock('../services/staffAccountService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ManageStaffAccountsPage Component', () => {
  const mockAccounts = [
    {
      user_account_id: 2,
      email: 'sales@fssims.com',
      full_name: 'Nguyễn Văn Sales',
      phone_number: '0901234567',
      role_id: 2,
      status: 'ACTIVE',
      createdate: '2026-01-10T00:00:00.000Z',
      role: { role_id: 2, role_code: 'SALES', role_name: 'Nhân viên kinh doanh' },
    },
    {
      user_account_id: 3,
      email: 'leader@fssims.com',
      full_name: 'Trần Thị Leader',
      phone_number: '0907654321',
      role_id: 3,
      status: 'INACTIVE',
      createdate: '2026-01-12T00:00:00.000Z',
      role: { role_id: 3, role_code: 'LEADERSTAFF', role_name: 'Tổ trưởng xưởng' },
    },
  ];

  const mockRoles = [
    { role_id: 2, role_code: 'SALES', role_name: 'Kinh doanh (Sales)' },
    { role_id: 3, role_code: 'LEADERSTAFF', role_name: 'Tổ trưởng xưởng (Leader Staff)' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    staffAccountService.getStaffAccounts.mockResolvedValue({
      message: 'Thành công',
      data: mockAccounts,
      pagination: { totalItems: 2, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
      stats: { total: 2, active: 1, inactive: 1, salesCount: 1, leaderCount: 1 },
    });
    staffAccountService.getStaffRoles.mockResolvedValue({
      message: 'Thành công',
      roles: mockRoles,
    });
  });

  it('render đúng tiêu đề và danh sách nhân sự với phân trang', async () => {
    render(<ManageStaffAccountsPage />);

    expect(screen.getByText('Quản lý tài khoản nhân viên')).toBeInTheDocument();
    expect(screen.getByText('Tạo tài khoản mới')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('sales@fssims.com')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Văn Sales')).toBeInTheDocument();
      expect(screen.getByText('leader@fssims.com')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị Leader')).toBeInTheDocument();
      expect(screen.getByText(/Trang 1 \/ 1/i)).toBeInTheDocument();
    });
  });

  it('mở modal tạo tài khoản mới khi nhấn nút "Tạo tài khoản mới"', async () => {
    const user = userEvent.setup();
    render(<ManageStaffAccountsPage />);

    const addButton = screen.getByRole('button', { name: /Tạo tài khoản mới/i });
    await user.click(addButton);

    expect(screen.getByText('Tạo tài khoản nhân sự mới')).toBeInTheDocument();
    expect(screen.getByText(/Email đăng nhập/i)).toBeInTheDocument();
  });
});
