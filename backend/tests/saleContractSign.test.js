const { validateSignContractInput } = require('../src/utils/saleOrderValidator');

describe('Sale Contract Signing Validation', () => {
  describe('validateSignContractInput - contract_file_url / proof photo mandatory', () => {
    it('báo lỗi nếu thiếu hoàn toàn contract_file_url', () => {
      const result = validateSignContractInput({});
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Ảnh chụp/bản scan hợp đồng đã ký là bắt buộc');
    });

    it('báo lỗi nếu contract_file_url là chuỗi rỗng', () => {
      const result = validateSignContractInput({
        contract_file_url: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Ảnh chụp/bản scan hợp đồng đã ký là bắt buộc');
    });

    it('báo lỗi nếu contract_file_url chỉ chứa khoảng trắng', () => {
      const result = validateSignContractInput({
        contract_file_url: '    ',
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Ảnh chụp/bản scan hợp đồng đã ký là bắt buộc');
    });

    it('báo lỗi nếu contract_file_url là null hoặc undefined', () => {
      const resultNull = validateSignContractInput({ contract_file_url: null });
      expect(resultNull.isValid).toBe(false);

      const resultUndef = validateSignContractInput({ contract_file_url: undefined });
      expect(resultUndef.isValid).toBe(false);
    });

    it('hợp lệ khi có contract_file_url (link Cloudinary/ảnh hợp lệ)', () => {
      const result = validateSignContractInput({
        contract_file_url: 'https://res.cloudinary.com/demo/image/upload/sample_contract.jpg',
        signed_place: 'Showroom Hà Nội',
        note: 'Đã thanh toán đủ cọc',
      });

      expect(result.isValid).toBe(true);
      expect(result.value.contract_file_url).toBe(
        'https://res.cloudinary.com/demo/image/upload/sample_contract.jpg'
      );
      expect(result.value.signed_place).toBe('Showroom Hà Nội');
      expect(result.value.note).toBe('Đã thanh toán đủ cọc');
    });

    it('dùng signed_place mặc định nếu không truyền', () => {
      const result = validateSignContractInput({
        contract_file_url: 'https://res.cloudinary.com/demo/image/upload/sample_contract.jpg',
      });

      expect(result.isValid).toBe(true);
      expect(result.value.signed_place).toBe('Cửa hàng Góc Nhà');
    });
  });
});
