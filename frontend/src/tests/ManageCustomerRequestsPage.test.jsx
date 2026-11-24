import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManageCustomerRequestsPage from '../pages/owner-pages/ManageCustomerRequestsPage';
import * as saleOrderService from '../services/saleOrderService';

vi.mock('../services/saleOrderService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ManageCustomerRequestsPage Component', () => {
  const mockRequests = [
    {
      requestId: 501,
      requestCode: 'REQ-WOOD-202611-001',
      customerName: 'Trần Văn Long',
      customerPhone: '0912345678',
      orderType: 'CUSTOM',
      status: 'DESIGNING',
      createdAt: '2026-11-24T08:00:00Z',
      items: [
        {
          requestItemId: 101,
          itemName: 'Bàn họp gỗ sồi tự nhiên 3m2',
          quantity: 1,
          lengthCm: 320,
          widthCm: 120,
          heightCm: 76,
          notes: 'Gỗ sồi Bắc Mỹ, sơn bóng PU mờ',
        },
      ],
      designs: [],
    },
    {
      requestId: 502,
      requestCode: 'REQ-WOOD-202611-002',
      customerName: 'Hoàng Minh Tuấn',
      customerPhone: '0987654321',
      orderType: 'CUSTOM',
      status: 'DESIGNED',
      createdAt: '2026-11-24T09:15:00Z',
      items: [
        {
          requestItemId: 102,
          itemName: 'Tủ rượu gỗ gõ đỏ 4 cánh',
          quantity: 1,
          lengthCm: 220,
          widthCm: 45,
          heightCm: 210,
          notes: 'Chạm hoa văn tân cổ điển nhẹ',
        },
      ],
      designs: [
        {
          imageId: 1,
          imageUrl: 'https://example.com/banve1.jpg',
          imageType: 'TECHNICAL_DRAWING',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    saleOrderService.getRequests.mockResolvedValue({
      data: mockRequests,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 2,
        itemsPerPage: 10,
      },
    });
    saleOrderService.getRequestById.mockImplementation((id) => {
      const found = mockRequests.find((r) => r.requestId === id);
      return Promise.resolve({ data: found });
    });
  });

  it('renders header, status tabs, and request table correctly', async () => {
    render(<ManageCustomerRequestsPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Quản lý yêu cầu khách hàng' })
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Làm mới/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('REQ-WOOD-202611-001')).toBeInTheDocument();
      expect(screen.getByText('Trần Văn Long')).toBeInTheDocument();
      expect(screen.getByText('REQ-WOOD-202611-002')).toBeInTheDocument();
      expect(screen.getByText('Hoàng Minh Tuấn')).toBeInTheDocument();
    });
  });

  it('filters requests when clicking status tabs', async () => {
    render(<ManageCustomerRequestsPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('REQ-WOOD-202611-001')).toBeInTheDocument();
    });

    // Check only allowed owner status tabs exist
    expect(screen.getByRole('button', { name: /Tất cả yêu cầu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chờ thiết kế/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đã có bản vẽ/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chờ ký hợp đồng/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đã chuyển đơn hàng/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đã từ chối/i })).toBeInTheDocument();

    // Verify removed tabs do not exist
    expect(screen.queryByRole('button', { name: /Chờ xử lý/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Đã chốt duyệt/i })).not.toBeInTheDocument();

    const designingTab = screen.getByRole('button', { name: /Chờ thiết kế/i });
    await user.click(designingTab);

    // Filter should trigger API call with status=DESIGNING
    await waitFor(() => {
      expect(saleOrderService.getRequests).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DESIGNING' })
      );
    });
  });

  it('searches with custom keywords', async () => {
    render(<ManageCustomerRequestsPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('REQ-WOOD-202611-001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo mã yêu cầu/i);
    await user.type(searchInput, 'Hoàng Minh');

    await waitFor(() => {
      expect(saleOrderService.getRequests).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Hoàng Minh' })
      );
    });
  });

  it('opens detail modal when clicking action button', async () => {
    render(<ManageCustomerRequestsPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('REQ-WOOD-202611-001')).toBeInTheDocument();
    });

    const actionButtons = screen.getAllByRole('button', { name: /Xem & Gửi thiết kế/i });
    await user.click(actionButtons[0]);

    await waitFor(() => {
      expect(saleOrderService.getRequestById).toHaveBeenCalledWith(501);
      expect(screen.getByText('Chi tiết yêu cầu đặt đóng')).toBeInTheDocument();
    });
  });
});
