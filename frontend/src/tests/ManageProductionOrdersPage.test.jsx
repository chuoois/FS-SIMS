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

// Mock URL.createObjectURL & revokeObjectURL cho JSDOM
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  window.URL.revokeObjectURL = vi.fn();
}

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
      design_file_url: 'https://cloudinary.com/drawings/blueprint-001.jpg',
      assigned_to: 5,
      leader_name: 'Trần Văn Trưởng',
      leader_phone: '0901234567',
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
      design_file_url: null,
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
      design_file_url: null,
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
      expect(screen.getAllByText('Đang xử lý').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Hoàn thành').length).toBeGreaterThan(0);
      expect(screen.getByText('Xem bản vẽ')).toBeInTheDocument();
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
    expect(screen.getByText(/Bản vẽ kỹ thuật \/ Bản thiết kế/i)).toBeInTheDocument();
    expect(screen.getByText(/Nhấn để chọn file bản vẽ/i)).toBeInTheDocument();
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

  it('7. Mở modal xem chi tiết bản vẽ kỹ thuật khi bấm "Xem bản vẽ"', async () => {
    const user = userEvent.setup();
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261031-0001')).toBeInTheDocument();
    });

    const viewBlueprintBtn = screen.getByRole('button', { name: /Xem bản vẽ/i });
    await user.click(viewBlueprintBtn);

    expect(screen.getByRole('heading', { name: /Bản Vẽ Kỹ Thuật — PO-20261031-0001/i })).toBeInTheDocument();
    const img = screen.getByAltText('Bản vẽ PO-20261031-0001');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://cloudinary.com/drawings/blueprint-001.jpg');
  });

  it('8. Mở modal tải lên bản vẽ khi bấm "Tải lên" trên lệnh chưa có bản vẽ', async () => {
    const user = userEvent.setup();
    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261031-0002')).toBeInTheDocument();
    });

    const uploadBtns = screen.getAllByRole('button', { name: /Tải lên/i });
    await user.click(uploadBtns[0]);

    expect(screen.getByRole('heading', { name: /Tải Lên Bản Vẽ Kỹ Thuật/i })).toBeInTheDocument();
    expect(screen.getByText(/Lệnh gia công: PO-20261031-0002/i)).toBeInTheDocument();
  });

  it('9. Cho phép tải lên file bản vẽ khi tạo lệnh gia công mới', async () => {
    const user = userEvent.setup();
    productionOrderService.createProductionOrder.mockResolvedValueOnce({
      message: 'Tạo lệnh gia công thành công',
    });

    render(<ManageProductionOrdersPage />);

    const createBtn = screen.getByRole('button', { name: /Tạo lệnh gia công/i });
    await user.click(createBtn);

    // Chọn đơn hàng
    const orderSelect = screen.getByLabelText(/Đơn hàng cần gia công/i);
    await user.selectOptions(orderSelect, '20');

    // Giả lập chọn file hình ảnh bản vẽ
    const file = new File(['mock drawing binary'], 'ban-ve-ban-an.png', { type: 'image/png' });
    const fileInput = document.getElementById('create-design-file-input');
    await user.upload(fileInput, file);

    // Kiểm tra tên file hiển thị trên UI sau khi chọn
    expect(screen.getByText('ban-ve-ban-an.png')).toBeInTheDocument();

    // Bấm nút submit
    const submitBtn = screen.getByRole('button', { name: /^Tạo lệnh$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(productionOrderService.createProductionOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: 20,
          design_file: file,
        })
      );
    });
  });

  it('10. Cho phép cập nhật bản vẽ kỹ thuật cho lệnh gia công đã tạo', async () => {
    const user = userEvent.setup();
    productionOrderService.updateProductionOrderDesignFile.mockResolvedValueOnce({
      message: 'Cập nhật bản vẽ kỹ thuật thành công',
    });

    render(<ManageProductionOrdersPage />);

    await waitFor(() => {
      expect(screen.getByText('PO-20261031-0002')).toBeInTheDocument();
    });

    const uploadBtns = screen.getAllByRole('button', { name: /Tải lên/i });
    await user.click(uploadBtns[0]);

    expect(screen.getByRole('heading', { name: /Tải Lên Bản Vẽ Kỹ Thuật/i })).toBeInTheDocument();

    const file = new File(['updated blueprint content'], 'ban-ve-moi.jpg', { type: 'image/jpeg' });
    const fileInput = document.getElementById('upload-drawing-file-input');
    await user.upload(fileInput, file);

    expect(screen.getByText('ban-ve-moi.jpg')).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Lưu bản vẽ/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(productionOrderService.updateProductionOrderDesignFile).toHaveBeenCalledWith(2, file);
    });
  });
});
