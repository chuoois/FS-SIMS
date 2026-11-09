// =========================================================
// ManageCustomerRequestsPage.test.jsx
// Unit tests cho ManageCustomerRequestsPage component
// Chạy: npm test --prefix frontend -- src/tests/ManageCustomerRequestsPage.test.jsx --run
// =========================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ManageCustomerRequestsPage } from '../pages/owner-pages/ManageCustomerRequestsPage';

// ── Mock service ──
vi.mock('../services/saleOrderService', () => ({
  getRequests: vi.fn(),
  getRequestById: vi.fn(),
  updateRequestDesign: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import { getRequests, getRequestById, updateRequestDesign } from '../services/saleOrderService';

// ── Dữ liệu mẫu (Tất cả là CUSTOM theo yêu cầu) ──
const mockRequests = [
  {
    requestId: 1,
    requestCode: 'RQ-20240115-ABCD',
    orderType: 'CUSTOM',
    customerName: 'Nguyễn Văn A',
    customerPhone: '0901234567',
    title: 'Yêu cầu làm bàn ăn gỗ sồi 6 ghế',
    status: 'PENDING',
    designFileUrl: null,
    createdate: '2024-01-15T08:00:00.000Z',
  },
  {
    requestId: 2,
    requestCode: 'RQ-20240116-EFGH',
    orderType: 'CUSTOM',
    customerName: 'Trần Thị B',
    customerPhone: '0909876543',
    title: 'Yêu cầu đặt tủ áo cánh lùa gỗ công nghiệp',
    status: 'CONVERTED',
    designFileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.png',
    createdate: '2024-01-16T10:00:00.000Z',
  },
];

const mockPagination = {
  totalItems: 2,
  totalPages: 1,
  currentPage: 1,
  itemsPerPage: 20,
};

const mockDetail = {
  requestId: 1,
  requestCode: 'RQ-20240115-ABCD',
  orderType: 'CUSTOM',
  status: 'PENDING',
  customerName: 'Nguyễn Văn A',
  customerPhone: '0901234567',
  customerEmail: 'a@test.com',
  deliveryAddress: '123 Đường ABC, TP.HCM',
  title: 'Yêu cầu làm bàn ăn gỗ sồi 6 ghế',
  description: 'Ghi chú của khách: Kích thước 1m8 x 0.9m',
  designNote: 'Bản vẽ 2D hoàn thiện',
  designFileUrl: null,
  items: [
    { itemName: 'Bàn ăn 6 ghế', quantity: 1, unitPrice: null, lengthCm: 180, widthCm: 90, heightCm: 75 },
  ],
  images: [
    { imageId: 10, imageUrl: 'https://example.com/sample.jpg' },
  ],
  contract: null,
  createdate: '2024-01-15T08:00:00.000Z',
};

function mockSuccess() {
  getRequests.mockResolvedValue({
    data: mockRequests,
    requests: mockRequests,
    pagination: mockPagination,
    totalItems: 2,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 20,
  });
}

describe('ManageCustomerRequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuccess();
  });

  it('hiển thị tiêu đề "Quản Lý Yêu Cầu Khách Hàng (Hàng Đặt Làm)"', async () => {
    render(<ManageCustomerRequestsPage />);
    expect(screen.getByText(/Quản Lý Yêu Cầu Khách Hàng/i)).toBeInTheDocument();
  });

  it('gọi getRequests với order_type là CUSTOM', async () => {
    render(<ManageCustomerRequestsPage />);
    await waitFor(() => {
      expect(getRequests).toHaveBeenCalledWith(
        expect.objectContaining({ order_type: 'CUSTOM' })
      );
    });
  });

  it('hiển thị danh sách yêu cầu sau khi load', async () => {
    render(<ManageCustomerRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    expect(screen.getByText('RQ-20240115-ABCD')).toBeInTheDocument();
  });

  it('hiển thị badge trạng thái đúng', async () => {
    render(<ManageCustomerRequestsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Chờ xử lý').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Đã chuyển HĐ').length).toBeGreaterThan(0);
  });

  it('hiển thị trạng thái bản thiết kế', async () => {
    render(<ManageCustomerRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText('Chưa gửi thiết kế')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Đã có bản thiết kế').length).toBeGreaterThan(0);
  });

  it('hiển thị empty state khi không có yêu cầu', async () => {
    getRequests.mockResolvedValue({
      data: [],
      requests: [],
      pagination: { totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 10 },
      totalItems: 0,
    });
    render(<ManageCustomerRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy yêu cầu đặt làm nào')).toBeInTheDocument();
    });
  });

  it('có dropdown lọc theo trạng thái', async () => {
    render(<ManageCustomerRequestsPage />);
    const statusSelect = screen.getByLabelText('Lọc theo trạng thái');
    expect(statusSelect).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tất cả trạng thái' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Chờ xử lý' })).toBeInTheDocument();
  });

  it('nút Xóa bộ lọc reset bộ lọc tìm kiếm', async () => {
    render(<ManageCustomerRequestsPage />);
    const searchInput = screen.getByPlaceholderText(/Tìm theo mã yêu cầu/i);

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'test search' } });
    });
    expect(searchInput.value).toBe('test search');

    await act(async () => {
      fireEvent.click(screen.getByText('Xóa bộ lọc'));
    });
    expect(searchInput.value).toBe('');
  });

  it('mở modal chi tiết khi nhấn nút Xem & Gửi thiết kế', async () => {
    getRequestById.mockResolvedValue({ data: mockDetail });
    render(<ManageCustomerRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /Xem chi tiết/i });
    await act(async () => {
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Chi tiết yêu cầu đặt làm')).toBeInTheDocument();
    });
    expect(screen.getByText('Bản thiết kế gửi cho bộ phận Sales')).toBeInTheDocument();
  });

  it('cho phép gửi bản thiết kế và ghi chú sang cho Sales', async () => {
    getRequestById.mockResolvedValue({ data: mockDetail });
    updateRequestDesign.mockResolvedValue({
      message: 'Cập nhật bản thiết kế thành công.',
      data: {
        requestId: 1,
        designNote: 'Bản vẽ CAD kích thước chuẩn',
        designFileUrl: 'https://cloudinary.com/sample.pdf',
      },
    });

    render(<ManageCustomerRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /Xem chi tiết/i });
    await act(async () => {
      fireEvent.click(viewButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText('Gửi bản thiết kế sang Sales')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Bản vẽ chi tiết kích thước/i);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Bản vẽ CAD kích thước chuẩn' } });
    });

    const sendBtn = screen.getByText('Gửi bản thiết kế sang Sales');
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    await waitFor(() => {
      expect(updateRequestDesign).toHaveBeenCalledWith(
        1,
        expect.any(FormData)
      );
    });
  });

  it('hiển thị thông báo khi API lỗi', async () => {
    getRequests.mockRejectedValue({
      response: { data: { message: 'Lỗi kết nối máy chủ' } },
    });
    render(<ManageCustomerRequestsPage />);
    await waitFor(() => {
      expect(screen.getByText('Lỗi kết nối máy chủ')).toBeInTheDocument();
    });
  });
});
