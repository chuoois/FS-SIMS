const {
  validateCreateOfflineContractInput,
  validateCreateSalesRequestInput,
} = require('../src/utils/saleOrderValidator');

describe('Sale Delivery Date Validation', () => {
  const getOffsetDateStr = (offsetDays) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const validBaseContractData = {
    customer_name: 'Nguyễn Văn A',
    customer_phone: '0912345678',
    deposit_amount: 500000,
    items: [
      {
        product_id: 1,
        quantity: 1,
        unit_price: 1000000,
      },
    ],
  };

  describe('validateCreateOfflineContractInput - delivery_date', () => {
    it('báo lỗi nếu không có ngày hẹn giao hàng', () => {
      const result = validateCreateOfflineContractInput({
        ...validBaseContractData,
        delivery_date: '',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Ngày hẹn giao hàng là bắt buộc');
    });

    it('báo lỗi nếu ngày hẹn giao hàng ở trong quá khứ', () => {
      const yesterday = getOffsetDateStr(-1);
      const result = validateCreateOfflineContractInput({
        ...validBaseContractData,
        delivery_date: yesterday,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('không thể ở trong quá khứ');
    });

    it('báo lỗi nếu ngày hẹn giao hàng cách hôm nay ít hơn 10 ngày (ví dụ 5 ngày)', () => {
      const fiveDaysLater = getOffsetDateStr(5);
      const result = validateCreateOfflineContractInput({
        ...validBaseContractData,
        delivery_date: fiveDaysLater,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('ít nhất 10 ngày');
    });

    it('hợp lệ nếu ngày hẹn giao hàng cách hôm nay đúng 10 ngày', () => {
      const tenDaysLater = getOffsetDateStr(10);
      const result = validateCreateOfflineContractInput({
        ...validBaseContractData,
        delivery_date: tenDaysLater,
      });

      expect(result.isValid).toBe(true);
      expect(result.value.delivery_date).toBe(tenDaysLater);
    });

    it('hợp lệ nếu ngày hẹn giao hàng cách hôm nay hơn 10 ngày (ví dụ 15 ngày)', () => {
      const fifteenDaysLater = getOffsetDateStr(15);
      const result = validateCreateOfflineContractInput({
        ...validBaseContractData,
        delivery_date: fifteenDaysLater,
      });

      expect(result.isValid).toBe(true);
      expect(result.value.delivery_date).toBe(fifteenDaysLater);
    });
  });

  describe('validateCreateSalesRequestInput - expectedDate', () => {
    const validBaseRequestData = {
      contactName: 'Trần Thị B',
      contactPhone: '0987654321',
      items: [{ itemName: 'Bàn ăn gỗ sồi', quantity: 1 }],
    };

    it('báo lỗi nếu ngày mong muốn hoàn thiện ở trong quá khứ', () => {
      const yesterday = getOffsetDateStr(-2);
      const result = validateCreateSalesRequestInput({
        ...validBaseRequestData,
        expectedDate: yesterday,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('không thể ở trong quá khứ');
    });

    it('báo lỗi nếu ngày mong muốn hoàn thiện cách ngày tạo ít hơn 10 ngày', () => {
      const threeDaysLater = getOffsetDateStr(3);
      const result = validateCreateSalesRequestInput({
        ...validBaseRequestData,
        expectedDate: threeDaysLater,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('ít nhất 10 ngày');
    });

    it('hợp lệ nếu ngày mong muốn hoàn thiện cách ít nhất 10 ngày', () => {
      const twelveDaysLater = getOffsetDateStr(12);
      const result = validateCreateSalesRequestInput({
        ...validBaseRequestData,
        expectedDate: twelveDaysLater,
      });

      expect(result.isValid).toBe(true);
      expect(result.data.expectedDate).toBe(twelveDaysLater);
    });
  });
});
