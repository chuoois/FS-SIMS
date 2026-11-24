import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageProductionOrdersPage } from '../pages/owner-pages/ManageProductionOrdersPage';
import * as productionOrderService from '../services/productionOrderService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ search: '', state: null }),
}));

vi.mock('../services/productionOrderService');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ManageProductionOrdersPage Component', () => {
  const mockProductionOrders = [
    {
      production_id: 201,
      production_code: 'PO-20261124-0001',
      production_type: 'CUSTOM',
      order_id: 101,
      order_code: 'ORD-20261124-0001',
      customer_name: 'Phạm Minh Tuấn',
      assigned_to: 10,
      leader_name: 'Trần Văn Hưng (Tổ trưởng)',
      leader_phone: '0988776655',
      planned_start: '2026-11-24',
      planned_end: '2026-12-08',
      status: 'IN_PROGRESS',
      order_status: 'IN_PRODUCTION',
      items: [
        {
          order_item_id: 1,
          item_name: 'Tủ quần áo gỗ sồi Nga 4 cánh',
          product_code: 'TQA-01',
          quantity_planned: 1,
          quantity_done: 0,
          dimensions: '200 × 60 × 220 cm',
          materialName: 'Gỗ sồi Nga',
          colorName: 'Màu tự nhiên',
          designImages: ['https://example.com/blueprint1.jpg'],
          inspectionImages: [],
        },
      ],
    },
    {
      production_id: 202,
      production_code: 'PO-20261124-0002',
      production_type: 'CUSTOM',
      order_id: 102,
      order_code: 'ORD-20261124-0002',
      customer_name: 'Nguyễn Thị Hoa',
      assigned_to: null,
      leader_name: null,
      leader_phone: null,
      planned_start: '2026-11-25',
      planned_end: '2026-12-10',
      status: 'DRAFT',
      order_status: 'CONFIRMED',
      items: [
        {
          order_item_id: 2,
          item_name: 'Bàn ăn gỗ óc chó 6 ghế',
          product_code: 'BA-02',
          quantity_planned: 1,
          quantity_done: 0,
          dimensions: '180 × 90 × 75 cm',
          materialName: 'Gỗ óc chó',
          colorName: 'Màu hạt dẻ',
          designImages: [],
          inspectionImages: [],
        },
      ],
    },
    {
      production_id: 203,
      production_code: 'PO-20261124-0003',
      production_type: 'CUSTOM',
      order_id: 103,
      order_code: 'ORD-20261124-0003',
      customer_name: 'Lê Hoàng Nam',
      assigned_to: 11,
      leader_name: 'Nguyễn Văn Đạt (Tổ trưởng)',
      leader_phone: '0911223344',
      planned_start: '2026-11-20',
      planned_end: '2026-11-30',
      status: 'COMPLETED',
      order_status: 'COMPLETED',
      items: [],
    },
  ];

  const mockEligibleOrders = [
    {
      order_id: 105,
      order_code: 'ORD-20261124-0005',
      contact_name: 'Vũ Thị Mai',
      total_amount: 15000000,
    },
  ];

  const mockStaffLeaders = [
    {
      user_account_id: 10,
      full_name: 'Trần Văn Hưng',
      phone_number: '0988776655',
      email: 'hung.tran@gocnha.vn',
    },
    {
      user_account_id: 11,
      full_name: 'Nguyễn Văn Đạt',
      phone_number: '0911223344',
      email: 'dat.nguyen@gocnha.vn',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    productionOrderService.getProductionOrders.mockResolvedValue({
      productionOrders: mockProductionOrders,
      pagination: {
        totalItems: 3,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      },
    });
    productionOrderService.getProductionOrderDetail.mockImplementation((id) => {
      const found = mockProductionOrders.find((po) => po.production_id === Number(id));
      return Promise.resolve({ productionOrder: found || mockProductionOrders[0] });
    });
    productionOrderService.getEligibleOrders.mockResolvedValue({
      data: mockEligibleOrders,
    });
    productionOrderService.getStaffLeaders.mockResolvedValue({
      data: mockStaffLeaders,
    });
    productionOrderService.createProductionOrder.mockResolvedValue({
      message: 'Tạo lệnh gia công thành công',
    });
    productionOrderService.assignLeader.mockResolvedValue({
      message: 'Phân công trưởng nhóm thành công',
    });
    productionOrderService.cancelProductionOrder.mockResolvedValue({
      message: 'Hủy lệnh gia công thành công',
    });
    productionOrderService.inspectProductionOrder.mockResolvedValue({
      message: 'Đã duyệt nghiệm thu đạt chuẩn',
    });
  });

  it('renders header, title, and action buttons', async () => {
    render(<ManageProductionOrdersPage />);

    expect(screen.getByRole('heading', { level: 1, name: /Quản Lý Lệnh Gia Công/i })).toBeInTheDocument();
    expect(screen.getByText(/Theo dõi tiến độ, tạo lệnh sản xuất/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Làm mới/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tạo lệnh gia công/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(productionOrderService.getProductionOrders).toHaveBeenCalled();
      expect(productionOrderService.getEligibleOrders).toHaveBeenCalled();
      expect(productionOrderService.getStaffLeaders).toHaveBeenCalled();
    });
  });

  it('renders 4 stats cards with correct numbers', async () => {
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('Tổng lệnh gia công')).toBeInTheDocument();
      expect(screen.getAllByText('Chờ sản xuất').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Đang gia công').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Đã hoàn thành').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1); // tổng 3 lệnh
  });

  it('renders production orders table with codes and customer details', async () => {
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261124-0001')).toBeInTheDocument();
      expect(screen.getByText('ORD-20261124-0001')).toBeInTheDocument();
      expect(screen.getByText('Phạm Minh Tuấn')).toBeInTheDocument();
      expect(screen.getByText('Trần Văn Hưng (Tổ trưởng)')).toBeInTheDocument();

      expect(screen.getByText('PO-20261124-0002')).toBeInTheDocument();
      expect(screen.getByText('ORD-20261124-0002')).toBeInTheDocument();
      expect(screen.getByText('Nguyễn Thị Hoa')).toBeInTheDocument();
      expect(screen.getByText('Chưa phân công')).toBeInTheDocument();
    });
  });

  it('filters by status when clicking status tabs', async () => {
    const user = userEvent.setup();
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261124-0001')).toBeInTheDocument();
    });

    const inProgressTab = screen.getByRole('button', { name: /Đang gia công/i });
    await user.click(inProgressTab);

    await waitFor(() => {
      expect(productionOrderService.getProductionOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'IN_PROGRESS',
        })
      );
    });
  });

  it('filters by search keyword when typed in search box', async () => {
    const user = userEvent.setup();
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261124-0001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Tìm theo mã lệnh gia công/i);
    await user.type(searchInput, 'PO-20261124-0001');

    await waitFor(() => {
      expect(productionOrderService.getProductionOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'PO-20261124-0001',
        })
      );
    });
  });

  it('opens create modal when clicking "Tạo lệnh gia công" button', async () => {
    const user = userEvent.setup();
    render(<ManageProductionOrdersPage />);

    const createBtn = screen.getByRole('button', { name: /Tạo lệnh gia công/i });
    await user.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Tạo Lệnh Gia Công')).toBeInTheDocument();
      expect(screen.getByLabelText(/Đơn hàng cần gia công/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Trưởng nhóm sản xuất/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Ngày bắt đầu dự kiến/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Ngày kết thúc dự kiến/i)).toBeInTheDocument();
    });
  });

  it('opens detail modal when clicking "Chi tiết" button', async () => {
    const user = userEvent.setup();
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261124-0001')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByRole('button', { name: /Chi tiết/i });
    await user.click(detailButtons[0]);

    await waitFor(() => {
      expect(productionOrderService.getProductionOrderDetail).toHaveBeenCalledWith(201);
      expect(screen.getByText(/Chi tiết lệnh gia công —/i)).toBeInTheDocument();
      expect(screen.getByText('Tủ quần áo gỗ sồi Nga 4 cánh')).toBeInTheDocument();
    });
  });

  it('opens assign leader modal and submits leader assignment', async () => {
    const user = userEvent.setup();
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261124-0001')).toBeInTheDocument();
    });

    const assignButtons = screen.getAllByRole('button', { name: /Phân công/i });
    await user.click(assignButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Phân Công Trưởng Nhóm')).toBeInTheDocument();
      expect(screen.getByLabelText(/Chọn Trưởng nhóm sản xuất/i)).toBeInTheDocument();
    });

    const leaderSelect = screen.getByLabelText(/Chọn Trưởng nhóm sản xuất/i);
    await user.selectOptions(leaderSelect, '11');

    const submitAssignBtn = screen.getByRole('button', { name: /Lưu phân công/i });
    await user.click(submitAssignBtn);

    await waitFor(() => {
      expect(productionOrderService.assignLeader).toHaveBeenCalledWith(201, {
        assigned_to: 11,
      });
    });
  });

  it('opens cancel modal and cancels order successfully', async () => {
    const user = userEvent.setup();
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261124-0001')).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByRole('button', { name: 'Hủy' });
    await user.click(cancelButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Xác nhận hủy lệnh gia công')).toBeInTheDocument();
    });

    const confirmCancelBtn = screen.getByRole('button', { name: /Xác nhận hủy lệnh/i });
    await user.click(confirmCancelBtn);

    await waitFor(() => {
      expect(productionOrderService.cancelProductionOrder).toHaveBeenCalledWith(201);
    });
  });

  it('opens image inspection modal when clicking "Ảnh" button', async () => {
    const user = userEvent.setup();
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261124-0001')).toBeInTheDocument();
    });

    const imageButtons = screen.getAllByRole('button', { name: 'Ảnh' });
    await user.click(imageButtons[0]);

    await waitFor(() => {
      expect(productionOrderService.getProductionOrderDetail).toHaveBeenCalledWith(201);
      expect(screen.getByText(/Hồ sơ ảnh & Nghiệm thu —/i)).toBeInTheDocument();
      expect(screen.getByText(/Tất cả sản phẩm/i)).toBeInTheDocument();
    });
  });
});
