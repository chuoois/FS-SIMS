import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageProductionOrdersPage } from '../pages/owner-pages/ManageProductionOrdersPage';
import * as productionOrderService from '../services/productionOrderService';

vi.mock('../services/productionOrderService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ManageProductionOrdersPage Component', () => {
  const mockOrders = [
    {
      production_id: 1,
      production_code: 'PO-20261031-0001',
      production_type: 'CUSTOM',
      order_id: 10,
      order_code: 'ORD-20261028-0001',
      customer_name: 'Nguyễn Văn A',
      status: 'DRAFT',
      planned_start: '2026-11-01',
      planned_end: '2026-11-15',
      assigned_to: 5,
      leader_name: 'Trần Văn Trưởng',
      leader_phone: '0901234567',
      items: [
        {
          production_item_id: 1,
          item_name: 'Tủ giày 3 tầng',
          quantity_planned: 1,
          quantity_done: 0,
          dimensions: '100 × 35 × 110 cm',
        },
      ],
    },
    {
      production_id: 2,
      production_code: 'PO-20261031-0002',
      production_type: 'CUSTOM',
      order_id: 11,
      order_code: 'ORD-20261028-0002',
      customer_name: 'Trần Thị B',
      status: 'IN_PROGRESS',
      planned_start: '2026-11-05',
      planned_end: '2026-11-20',
      assigned_to: null,
      leader_name: null,
      leader_phone: null,
    },
    {
      production_id: 3,
      production_code: 'PO-20261031-0003',
      production_type: 'CUSTOM',
      order_id: 12,
      order_code: 'ORD-20261028-0003',
      customer_name: 'Lê Văn C',
      status: 'COMPLETED',
      planned_start: '2026-10-01',
      planned_end: '2026-10-25',
      assigned_to: 6,
      leader_name: 'Lê Văn Phó',
      leader_phone: '0907654321',
    },
  ];

  const mockEligibleOrders = [
    {
      order_id: 20,
      order_code: 'ORD-20261028-0020',
      contact_name: 'Khách Đặt Bàn Ghế',
      total_amount: 15000000,
    },
  ];

  const mockStaffLeaders = [
    {
      user_account_id: 5,
      full_name: 'Trần Văn Trưởng',
      phone_number: '0901234567',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    productionOrderService.getProductionOrders.mockResolvedValue({
      message: 'OK',
      productionOrders: mockOrders,
      pagination: {
        totalItems: 3,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });
    productionOrderService.getEligibleOrders.mockResolvedValue({
      message: 'OK',
      data: mockEligibleOrders,
    });
    productionOrderService.getStaffLeaders.mockResolvedValue({
      message: 'OK',
      data: mockStaffLeaders,
    });
  });

  it('1. Hiển thị đúng tiêu đề trang và các nút chức năng chính', async () => {
    render(<ManageProductionOrdersPage />);

    expect(screen.getByText('Quản Lý Lệnh Gia Công')).toBeInTheDocument();
    expect(screen.getByText(/Theo dõi tiến độ, tạo lệnh sản xuất/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tạo lệnh gia công/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Làm mới/i })).toBeInTheDocument();
  });

  it('2. Hiển thị danh sách lệnh gia công và thông tin chi tiết các cột', async () => {
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261031-0001')).toBeInTheDocument();
      expect(screen.getByText('PO-20261031-0002')).toBeInTheDocument();
      expect(screen.getByText('ORD-20261028-0001')).toBeInTheDocument();
      expect(screen.getByText('Trần Văn Trưởng')).toBeInTheDocument();
      expect(screen.getByText('Chưa phân công')).toBeInTheDocument();
      expect(screen.getAllByText('Chờ sản xuất').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Đang gia công').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Hoàn thành').length).toBeGreaterThan(0);
    });
  });

  it('3. Hiển thị trạng thái rỗng khi không có lệnh gia công nào', async () => {
    productionOrderService.getProductionOrders.mockResolvedValueOnce({
      message: 'OK',
      productionOrders: [],
      pagination: {
        totalItems: 0,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });

    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy lệnh gia công nào')).toBeInTheDocument();
    });
  });

  it('4. Mở modal tạo lệnh gia công khi bấm nút "Tạo lệnh gia công"', async () => {
    const user = userEvent.setup();
    render(<ManageProductionOrdersPage />);

    const createBtn = screen.getByRole('button', { name: /Tạo lệnh gia công/i });
    await user.click(createBtn);

    expect(screen.getByRole('heading', { name: 'Tạo Lệnh Gia Công' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Đơn hàng cần gia công/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ngày bắt đầu dự kiến/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ngày kết thúc dự kiến/i)).toBeInTheDocument();
  });

  it('5. Mở modal phân công khi bấm nút "Phân công"', async () => {
    const user = userEvent.setup();
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261031-0001')).toBeInTheDocument();
    });

    const assignBtns = screen.getAllByRole('button', { name: /Phân công/i });
    await user.click(assignBtns[0]);

    expect(screen.getByRole('heading', { name: 'Phân Công Trưởng Nhóm' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Chọn Trưởng nhóm sản xuất/i)).toBeInTheDocument();
  });

  it('6. Mở modal xác nhận hủy lệnh khi bấm nút "Hủy"', async () => {
    const user = userEvent.setup();
    productionOrderService.cancelProductionOrder.mockResolvedValueOnce({
      message: 'Hủy lệnh thành công',
    });

    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261031-0001')).toBeInTheDocument();
    });

    const cancelBtns = screen.getAllByRole('button', { name: /Hủy/i });
    await user.click(cancelBtns[0]);

    expect(screen.getByRole('heading', { name: 'Hủy Lệnh Gia Công' })).toBeInTheDocument();
    expect(screen.getByText(/Bạn có chắc chắn muốn hủy lệnh gia công/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận hủy lệnh/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(productionOrderService.cancelProductionOrder).toHaveBeenCalledWith(1);
    });
  });

  it('7. Hiển thị sản phẩm của đơn trong modal chi tiết khi bấm nút "Chi tiết"', async () => {
    const user = userEvent.setup();
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261031-0001')).toBeInTheDocument();
    });

    const detailBtns = screen.getAllByRole('button', { name: /Chi tiết/i });
    expect(detailBtns.length).toBeGreaterThan(0);
    await user.click(detailBtns[0]);

    expect(screen.getByRole('heading', { name: /Chi Tiết Lệnh #PO-20261031-0001/i })).toBeInTheDocument();
    expect(screen.getByText(/Danh Sách Sản Phẩm Cần Gia Công/i)).toBeInTheDocument();
    expect(screen.getByText('Tủ giày 3 tầng')).toBeInTheDocument();
    expect(screen.getByText(/100 × 35 × 110 cm/i)).toBeInTheDocument();
  });
});
