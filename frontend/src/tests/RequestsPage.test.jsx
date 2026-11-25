import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestsPage } from '../pages/sale-pages/RequestsPage';
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
  },
}));

describe('RequestsPage Component', () => {
  const mockRequests = [
    {
      requestId: 201,
      requestCode: 'REQ-20261124-0001',
      customerName: 'Đặng Quốc Anh',
      customerPhone: '0933221100',
      orderType: 'CUSTOM',
      status: 'DESIGNED',
      createdAt: '2026-11-24T08:00:00Z',
      items: [
        {
          requestItemId: 1,
          itemName: 'Bộ bàn ghế ăn gỗ sồi 6 ghế',
          quantity: 1,
          unitPrice: 16500000,
          lengthCm: 160,
          widthCm: 80,
          heightCm: 75,
        },
      ],
    },
    {
      requestId: 202,
      requestCode: 'REQ-20261124-0002',
      customerName: 'Lê Thu Hương',
      customerPhone: '0977665544',
      orderType: 'READY',
      status: 'CONFIRMED',
      createdAt: '2026-11-24T09:30:00Z',
      items: [
        {
          requestItemId: 2,
          itemName: 'Kệ tivi gỗ óc chó cao cấp',
          quantity: 1,
          unitPrice: 9200000,
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
    render(<RequestsPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Quản lý yêu cầu đặt hàng' })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('REQ-20261124-0001')).toBeInTheDocument();
      expect(screen.getByText('Đặng Quốc Anh')).toBeInTheDocument();
      expect(screen.getByText('REQ-20261124-0002')).toBeInTheDocument();
      expect(screen.getByText('Lê Thu Hương')).toBeInTheDocument();
    });
  });

  it('filters requests when clicking a status tab', async () => {
    render(<RequestsPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('REQ-20261124-0001')).toBeInTheDocument();
    });

    // Check all 7 requested status tabs are rendered
    expect(screen.getByRole('button', { name: /Tất cả yêu cầu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chờ xử lý/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chờ thiết kế/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đã có bản vẽ/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chờ ký hợp đồng/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đã chuyển đơn hàng/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Đã từ chối/i })).toBeInTheDocument();

    const designedTab = screen.getByRole('button', { name: /Đã có bản vẽ/i });
    await user.click(designedTab);

    await waitFor(() => {
      expect(saleOrderService.getRequests).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'DESIGNED',
        })
      );
    });
  });

  it('opens detail modal on clicking Chi tiết', async () => {
    render(<RequestsPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('REQ-20261124-0001')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết/i });
    await user.click(detailButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Chi tiết yêu cầu' })).toBeInTheDocument();
      expect(screen.getByText('#REQ-20261124-0001')).toBeInTheDocument();
      expect(screen.getByText('Bộ bàn ghế ăn gỗ sồi 6 ghế')).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('opens contract modal on clicking Tạo HĐ', async () => {
    render(<RequestsPage />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('REQ-20261124-0001')).toBeInTheDocument();
    });

    const createContractBtn = screen.getAllByRole('button', { name: /Tạo HĐ/i })[0];
    await user.click(createContractBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Chuyển yêu cầu thành Hợp đồng' })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Đặng Quốc Anh')).toBeInTheDocument();
    });
  });
});
