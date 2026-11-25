import React from 'react';
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
      user_account_id: 1,
      email: 'sales1@gocnha.vn',
      full_name: 'Nguyễn Văn Minh',
      phone_number: '0901234567',
      role_id: 2,
      role: {
        role_id: 2,
        role_name: 'Kinh doanh (Sales)',
        role_code: 'SALES',
      },
      status: 'ACTIVE',
      gender: 'MALE',
      dob: '1992-05-15',
      address: '123 Cầu Giấy, Hà Nội',
      note: 'Phụ trách khách hàng nội thành',
      createdate: '2026-01-10T08:00:00.000Z',
      createby: 'Owner Admin',
    },
    {
      user_account_id: 2,
      email: 'leader1@gocnha.vn',
      full_name: 'Trần Văn Hùng',
      phone_number: '0912345678',
      role_id: 3,
      role: {
        role_id: 3,
        role_name: 'Tổ trưởng xưởng',
        role_code: 'LEADERSTAFF',
      },
      status: 'ACTIVE',
      gender: 'MALE',
      dob: '1988-11-20',
      address: 'Xưởng gỗ Góc Nhà, Hoài Đức, Hà Nội',
      note: 'Quản đốc xưởng mộc số 1',
      createdate: '2026-01-12T09:30:00.000Z',
      createby: 'Owner Admin',
    },
    {
      user_account_id: 3,
      email: 'sales2@gocnha.vn',
      full_name: 'Lê Thị Thu',
      phone_number: '0987654321',
      role_id: 2,
      role: {
        role_id: 2,
        role_name: 'Kinh doanh (Sales)',
        role_code: 'SALES',
      },
      status: 'INACTIVE',
      gender: 'FEMALE',
      dob: '1995-03-22',
      address: '456 Đống Đa, Hà Nội',
      note: 'Tạm ngưng công tác',
      createdate: '2026-02-01T10:00:00.000Z',
      createby: 'Owner Admin',
    },
  ];

  const mockRoles = [
    {
      role_id: 2,
      role_name: 'Kinh doanh (Sales)',
      role_code: 'SALES',
    },
    {
      role_id: 3,
      role_name: 'Tổ trưởng xưởng (Leader Staff)',
      role_code: 'LEADERSTAFF',
    },
  ];

  const mockStats = {
    total: 3,
    active: 2,
    inactive: 1,
    salesCount: 2,
    leaderCount: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    staffAccountService.getStaffAccounts.mockResolvedValue({
      message: 'Thành công',
      data: mockAccounts,
      pagination: {
        totalItems: 3,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
      stats: mockStats,
    });

    staffAccountService.getStaffRoles.mockResolvedValue({
      message: 'Thành công',
      roles: mockRoles,
    });

    staffAccountService.createStaffAccount.mockResolvedValue({
      message: 'Tạo tài khoản nhân viên thành công',
      account: { user_account_id: 4, email: 'newstaff@gocnha.vn' },
    });

    staffAccountService.updateStaffAccount.mockResolvedValue({
      message: 'Cập nhật tài khoản nhân viên thành công',
      account: { ...mockAccounts[0], full_name: 'Nguyễn Văn Minh Đã Sửa' },
    });

    staffAccountService.changeStaffAccountStatus.mockResolvedValue({
      message: 'Thay đổi trạng thái thành công',
      status: 'INACTIVE',
    });

    staffAccountService.deleteStaffAccount.mockResolvedValue({
      message: 'Xóa tài khoản nhân viên thành công',
    });
  });

  it('renders header, title, and action buttons properly', async () => {
    render(<ManageStaffAccountsPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Quản Lý Tài Khoản Nhân Viên/i })).toBeInTheDocument();
    expect(screen.getByText(/Khu vực dành riêng cho Chủ xưởng quản lý các tài khoản nhân sự/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Làm mới/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tạo tài khoản mới/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(staffAccountService.getStaffAccounts).toHaveBeenCalled();
    });
  });

  it('renders 4 summary statistics KPI cards with proper counts', async () => {
    render(<ManageStaffAccountsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Tổng nhân sự/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Tổng nhân sự/i)).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1); // 3 total
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1); // 2 active
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // 1 inactive, 1 leader
    expect(screen.getByText(/2 Kinh doanh • 1 Tổ trưởng/i)).toBeInTheDocument();
  });

  it('renders staff accounts list in table with staff details and badges', async () => {
    render(<ManageStaffAccountsPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Minh')).toBeInTheDocument();
    });

    expect(screen.getByText('sales1@gocnha.vn')).toBeInTheDocument();
    expect(screen.getByText('0901234567')).toBeInTheDocument();
    expect(screen.getByText('Trần Văn Hùng')).toBeInTheDocument();
    expect(screen.getByText('leader1@gocnha.vn')).toBeInTheDocument();
    expect(screen.getByText('Lê Thị Thu')).toBeInTheDocument();
    expect(screen.getByText('sales2@gocnha.vn')).toBeInTheDocument();
  });

  it('filters accounts when clicking status pill tabs', async () => {
    const user = userEvent.setup();
    render(<ManageStaffAccountsPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Minh')).toBeInTheDocument();
    });

    const activeTab = screen.getByRole('button', { name: /Đang hoạt động/i });
    await user.click(activeTab);

    await waitFor(() => {
      expect(staffAccountService.getStaffAccounts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ACTIVE' })
      );
    });

    const inactiveTab = screen.getByRole('button', { name: /Đã khóa/i });
    await user.click(inactiveTab);

    await waitFor(() => {
      expect(staffAccountService.getStaffAccounts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'INACTIVE' })
      );
    });
  });

  it('filters by search keyword when typing in the search box', async () => {
    const user = userEvent.setup();
    render(<ManageStaffAccountsPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Minh')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo họ tên, email hoặc số điện thoại/i);
    await user.type(searchInput, 'Nguyễn Văn Minh');

    await waitFor(() => {
      expect(staffAccountService.getStaffAccounts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Nguyễn Văn Minh' })
      );
    });
  });

  it('opens create staff account modal when clicking "Tạo tài khoản mới"', async () => {
    const user = userEvent.setup();
    render(<ManageStaffAccountsPage />);

    const createBtn = screen.getByRole('button', { name: /Tạo tài khoản mới/i });
    await user.click(createBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Tạo Tài Khoản Nhân Viên Mới/i })).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/nhanvien@gocnha.vn/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Tạo tài khoản$/i })).toBeInTheDocument();
  });

  it('opens edit modal when clicking edit action button', async () => {
    const user = userEvent.setup();
    render(<ManageStaffAccountsPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Minh')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /Sửa/i });
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Chỉnh Sửa Thông Tin Nhân Viên/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Lưu thay đổi/i })).toBeInTheDocument();
  });

  it('opens detail modal when clicking staff name', async () => {
    const user = userEvent.setup();
    render(<ManageStaffAccountsPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Minh')).toBeInTheDocument();
    });

    const nameBtn = screen.getByText('Nguyễn Văn Minh');
    await user.click(nameBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Nguyễn Văn Minh' })).toBeInTheDocument();
    });

    expect(screen.getByText('Thông tin cá nhân & Liên hệ')).toBeInTheDocument();
    expect(screen.getByText('Phụ trách khách hàng nội thành')).toBeInTheDocument();
  });

  it('opens lock confirmation modal and toggles staff account status', async () => {
    const user = userEvent.setup();
    render(<ManageStaffAccountsPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Minh')).toBeInTheDocument();
    });

    // Account 1 is ACTIVE, has "Khóa" button in table
    const lockButtons = screen.getAllByRole('button', { name: /^Khóa$/i });
    expect(lockButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(lockButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Xác nhận khóa tài khoản\?/i })).toBeInTheDocument();
    });

    const confirmLockBtn = screen.getByRole('button', { name: /^Khóa tài khoản$/i });
    await user.click(confirmLockBtn);

    await waitFor(() => {
      expect(staffAccountService.changeStaffAccountStatus).toHaveBeenCalledWith(1, 'INACTIVE');
    });
  });

  it('opens delete confirmation modal and confirms deleting staff account', async () => {
    const user = userEvent.setup();
    render(<ManageStaffAccountsPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn Minh')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /Xóa/i });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Xóa vĩnh viễn tài khoản nhân sự\?/i })).toBeInTheDocument();
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: /Xóa vĩnh viễn/i });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(staffAccountService.deleteStaffAccount).toHaveBeenCalledWith(1);
    });
  });
});
