// =========================================================
// orderManagementValidator.test.js
// Unit tests cho orderManagementValidator (Owner Order Management)
// =========================================================

const {
  VALID_STATUSES,
  STATUS_LABELS,
  NEXT_ORDER_STATUS,
  getNextOrderStatus,
  validateUpdateStatusInput,
  toOrderManagementDTO,
} = require('../src/utils/orderManagementValidator');

describe('orderManagementValidator', () => {
  describe('Hằng số & Mapping trạng thái', () => {
    test('STATUS_LABELS hiển thị "Đang xử lý" cho IN_PRODUCTION', () => {
      expect(STATUS_LABELS.IN_PRODUCTION).toBe('Đang xử lý');
    });

    test('STATUS_LABELS hiển thị "Đang xử lý" cho PROCESSING', () => {
      expect(STATUS_LABELS.PROCESSING).toBe('Đang xử lý');
    });

    test('NEXT_ORDER_STATUS quy định đúng quy trình chuyển tiếp hợp lệ', () => {
      expect(NEXT_ORDER_STATUS.NEW).toBe('CONFIRMED');
      expect(NEXT_ORDER_STATUS.CONFIRMED).toBe('IN_PRODUCTION');
      expect(NEXT_ORDER_STATUS.IN_PRODUCTION).toBe('COMPLETED');
      expect(NEXT_ORDER_STATUS.PROCESSING).toBe('COMPLETED');
    });

    test('getNextOrderStatus trả về trạng thái kế tiếp chuẩn xác', () => {
      expect(getNextOrderStatus('NEW')).toBe('CONFIRMED');
      expect(getNextOrderStatus('CONFIRMED')).toBe('IN_PRODUCTION');
      expect(getNextOrderStatus('IN_PRODUCTION')).toBe('COMPLETED');
      expect(getNextOrderStatus('PROCESSING')).toBe('COMPLETED');
      expect(getNextOrderStatus('COMPLETED')).toBeNull();
      expect(getNextOrderStatus('CANCELLED')).toBeNull();
      expect(getNextOrderStatus(null)).toBeNull();
      expect(getNextOrderStatus(undefined)).toBeNull();
    });
  });

  describe('validateUpdateStatusInput', () => {
    test('hợp lệ với trạng thái CONFIRMED, IN_PRODUCTION, COMPLETED', () => {
      const res1 = validateUpdateStatusInput({ status: 'CONFIRMED' });
      expect(res1.isValid).toBe(true);
      expect(res1.value.status).toBe('CONFIRMED');

      const res2 = validateUpdateStatusInput({ status: 'IN_PRODUCTION' });
      expect(res2.isValid).toBe(true);
      expect(res2.value.status).toBe('IN_PRODUCTION');

      const res3 = validateUpdateStatusInput({ status: 'COMPLETED' });
      expect(res3.isValid).toBe(true);
      expect(res3.value.status).toBe('COMPLETED');
    });

    test('chuẩn hóa PROCESSING thành IN_PRODUCTION', () => {
      const res = validateUpdateStatusInput({ status: 'PROCESSING' });
      expect(res.isValid).toBe(true);
      expect(res.value.status).toBe('IN_PRODUCTION');
    });

    test('từ chối khi thiếu status', () => {
      const res = validateUpdateStatusInput({});
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/bắt buộc/i);
    });

    test('từ chối khi status không phải chuỗi hoặc rỗng', () => {
      const res1 = validateUpdateStatusInput({ status: '   ' });
      expect(res1.isValid).toBe(false);

      const res2 = validateUpdateStatusInput({ status: 123 });
      expect(res2.isValid).toBe(false);
    });

    test('từ chối khi status không nằm trong danh sách hợp lệ', () => {
      const res = validateUpdateStatusInput({ status: 'SOME_RANDOM_STATUS' });
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/không hợp lệ/i);
    });
  });

  describe('toOrderManagementDTO', () => {
    test('trả về null nếu raw là null hoặc undefined', () => {
      expect(toOrderManagementDTO(null)).toBeNull();
      expect(toOrderManagementDTO(undefined)).toBeNull();
    });

    test('chuyển đổi thông tin đơn hàng và gán nhãn "Đang xử lý" cho IN_PRODUCTION', () => {
      const mockRaw = {
        order_id: 10,
        order_code: 'ORD-20261105-0001',
        order_type: 'CUSTOM',
        contract_id: 5,
        contact_name: 'Nguyễn Văn A',
        contact_phone: '0987654321',
        delivery_address: 'Hà Nội',
        total_amount: 10000000,
        deposit_amount: 3000000,
        paid_amount: 3000000,
        status: 'IN_PRODUCTION',
        createdate: '2026-11-05T00:00:00Z',
        items: [],
      };

      const dto = toOrderManagementDTO(mockRaw);
      expect(dto.orderId).toBe(10);
      expect(dto.orderCode).toBe('ORD-20261105-0001');
      expect(dto.status).toBe('IN_PRODUCTION');
      expect(dto.statusLabel).toBe('Đang xử lý');
      expect(dto.nextStatus).toBe('COMPLETED');
      expect(dto.nextStatusLabel).toBe('Hoàn thành');
      expect(dto.remainingAmount).toBe(7000000);
    });

    test('chuyển đổi cho đơn hàng CONFIRMED hiển thị nextStatus là IN_PRODUCTION và nextStatusLabel là "Đang xử lý"', () => {
      const mockRaw = {
        order_id: 11,
        order_code: 'ORD-20261105-0002',
        order_type: 'READY',
        total_amount: 5000000,
        paid_amount: 5000000,
        status: 'CONFIRMED',
        items: [],
      };

      const dto = toOrderManagementDTO(mockRaw);
      expect(dto.status).toBe('CONFIRMED');
      expect(dto.statusLabel).toBe('Đã xác nhận');
      expect(dto.nextStatus).toBe('IN_PRODUCTION');
      expect(dto.nextStatusLabel).toBe('Đang xử lý');
    });

    test('đơn hàng COMPLETED không có nextStatus', () => {
      const mockRaw = {
        order_id: 12,
        order_code: 'ORD-20261105-0003',
        status: 'COMPLETED',
        total_amount: 5000000,
        paid_amount: 5000000,
      };

      const dto = toOrderManagementDTO(mockRaw);
      expect(dto.status).toBe('COMPLETED');
      expect(dto.statusLabel).toBe('Hoàn thành');
      expect(dto.nextStatus).toBeNull();
      expect(dto.nextStatusLabel).toBeNull();
    });
  });
});

