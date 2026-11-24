jest.mock('../src/models/SupplierModel', () => ({
  findSupplierById: jest.fn(),
  findSupplierByCode: jest.fn(),
  findSupplierByPhone: jest.fn(),
  getSuppliersWithPagination: jest.fn(),
  getSupplierWithReceiptHistory: jest.fn(),
  countMaterialReceiptsBySupplierId: jest.fn(),
  createSupplier: jest.fn(),
  updateSupplier: jest.fn(),
  deleteSupplier: jest.fn(),
  getActiveSuppliers: jest.fn(),
  generateNextSupplierCode: jest.fn(),
}));

const {
  findSupplierById,
  findSupplierByCode,
  findSupplierByPhone,
  getSuppliersWithPagination,
  getSupplierWithReceiptHistory,
  countMaterialReceiptsBySupplierId,
  createSupplier: createSupplierModel,
  updateSupplier: updateSupplierModel,
  deleteSupplier: deleteSupplierModel,
  getActiveSuppliers: getActiveSuppliersModel,
  generateNextSupplierCode,
} = require('../src/models/SupplierModel');

const {
  getSuppliers,
  getActiveSuppliers,
  getNextSupplierCode,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../src/controllers/supplierController');

function createResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function createRequest(overrides = {}) {
  return {
    user: { full_name: 'Test Owner', email: 'owner@example.com' },
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}

describe('supplierController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSuppliers', () => {
    it('returns supplier list with pagination on valid query', async () => {
      const mockResult = {
        suppliers: [
          {
            supplier_id: 1,
            supplier_code: 'NCC001',
            supplier_name: 'Gỗ An Cường',
            status: 'ACTIVE',
          },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      };
      getSuppliersWithPagination.mockResolvedValue(mockResult);

      const req = createRequest({ query: { page: 1, limit: 10 } });
      const res = createResponse();

      await getSuppliers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy danh sách nhà cung cấp thành công',
          data: expect.any(Array),
          pagination: expect.objectContaining({ totalItems: 1 }),
        }),
      );
    });
  });

  describe('getActiveSuppliers', () => {
    it('returns active suppliers list successfully', async () => {
      getActiveSuppliersModel.mockResolvedValue([
        { supplier_id: 1, supplier_code: 'NCC001', supplier_name: 'NCC A', status: 'ACTIVE' },
      ]);

      const req = createRequest();
      const res = createResponse();

      await getActiveSuppliers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy danh sách nhà cung cấp khả dụng thành công',
          suppliers: expect.any(Array),
        }),
      );
    });
  });

  describe('getSupplierById', () => {
    it('returns 400 when id is invalid', async () => {
      const req = createRequest({ params: { id: 'invalid' } });
      const res = createResponse();

      await getSupplierById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'ID nhà cung cấp không hợp lệ' }),
      );
    });

    it('returns 404 when supplier is not found', async () => {
      getSupplierWithReceiptHistory.mockResolvedValue(null);

      const req = createRequest({ params: { id: '999' } });
      const res = createResponse();

      await getSupplierById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Không tìm thấy thông tin nhà cung cấp' }),
      );
    });

    it('returns supplier details and receipt history on valid id', async () => {
      const mockSupplier = {
        supplier_id: 1,
        supplier_code: 'NCC001',
        supplier_name: 'Gỗ Đức Thành',
        phone_number: '0901234567',
        address: 'Hà Nội',
        status: 'ACTIVE',
        materialReceiptSupplierIdRecords: [
          {
            receipt_id: 10,
            receipt_code: 'PNK-202611-0001',
            receipt_date: '2026-11-20',
            total_amount: 5000000,
            status: 'COMPLETED',
          },
        ],
      };
      getSupplierWithReceiptHistory.mockResolvedValue(mockSupplier);

      const req = createRequest({ params: { id: '1' } });
      const res = createResponse();

      await getSupplierById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy thông tin chi tiết nhà cung cấp thành công',
          supplier: expect.objectContaining({
            supplier_id: 1,
            supplier_name: 'Gỗ Đức Thành',
            totalReceipts: 1,
          }),
        }),
      );
    });
  });

  describe('getNextSupplierCode', () => {
    it('returns generated next supplier code', async () => {
      generateNextSupplierCode.mockResolvedValue('NCC005');

      const req = createRequest();
      const res = createResponse();

      await getNextSupplierCode(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy mã nhà cung cấp tiếp theo thành công',
          nextCode: 'NCC005',
        }),
      );
    });
  });

  describe('createSupplier', () => {
    it('returns 400 when supplier_name is missing', async () => {
      const req = createRequest({ body: { supplier_name: '' } });
      const res = createResponse();

      await createSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Tên nhà cung cấp là bắt buộc' }),
      );
    });

    it('returns 409 when supplier_code already exists', async () => {
      findSupplierByCode.mockResolvedValue({ supplier_id: 1, supplier_code: 'NCC001' });

      const req = createRequest({
        body: { supplier_code: 'NCC001', supplier_name: 'Nhà Cung Cấp Trùng' },
      });
      const res = createResponse();

      await createSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Mã nhà cung cấp 'NCC001' đã tồn tại trên hệ thống",
        }),
      );
    });

    it('returns 409 when phone_number already exists', async () => {
      findSupplierByCode.mockResolvedValue(null);
      findSupplierByPhone.mockResolvedValue({
        supplier_id: 1,
        supplier_code: 'NCC001',
        supplier_name: 'Gỗ Đức Thành',
      });

      const req = createRequest({
        body: { supplier_name: 'NCC Trùng SĐT', phone_number: '0901234567' },
      });
      const res = createResponse();

      await createSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Số điện thoại '0901234567' đã được đăng ký bởi nhà cung cấp 'Gỗ Đức Thành'"),
        }),
      );
      expect(createSupplierModel).not.toHaveBeenCalled();
    });

    it('creates supplier successfully when data is valid', async () => {
      findSupplierByCode.mockResolvedValue(null);
      generateNextSupplierCode.mockResolvedValue('NCC002');
      createSupplierModel.mockResolvedValue({
        supplier_id: 2,
        supplier_code: 'NCC002',
        supplier_name: 'Công ty Gỗ Nam Định',
        status: 'ACTIVE',
      });

      const req = createRequest({
        body: { supplier_name: 'Công ty Gỗ Nam Định' },
      });
      const res = createResponse();

      await createSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tên nhà cung cấp mới thành công'.replace('Tên', 'Tạo'),
          supplier: expect.objectContaining({ supplier_id: 2 }),
        }),
      );
    });
  });

  describe('updateSupplier', () => {
    it('returns 400 when client tries to change supplier_code', async () => {
      const req = createRequest({
        params: { id: '1' },
        body: { supplier_code: 'NCC999' },
      });
      const res = createResponse();

      await updateSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Không được phép thay đổi mã nhà cung cấp (supplier_code)',
        }),
      );
    });

    it('returns 404 when supplier to update is not found', async () => {
      findSupplierById.mockResolvedValue(null);

      const req = createRequest({
        params: { id: '99' },
        body: { supplier_name: 'Tên mới' },
      });
      const res = createResponse();

      await updateSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 409 when updated phone_number already belongs to another supplier', async () => {
      findSupplierById.mockResolvedValue({ supplier_id: 2, supplier_name: 'Công ty Hiện Tại' });
      findSupplierByPhone.mockResolvedValue({
        supplier_id: 1,
        supplier_code: 'NCC001',
        supplier_name: 'Gỗ Đức Thành',
      });

      const req = createRequest({
        params: { id: '2' },
        body: { phone_number: '0901234567' },
      });
      const res = createResponse();

      await updateSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Số điện thoại '0901234567' đã được đăng ký bởi nhà cung cấp 'Gỗ Đức Thành'"),
        }),
      );
      expect(updateSupplierModel).not.toHaveBeenCalled();
    });

    it('updates supplier successfully', async () => {
      findSupplierById.mockResolvedValue({ supplier_id: 1, supplier_name: 'Tên cũ' });
      updateSupplierModel.mockResolvedValue({
        supplier_id: 1,
        supplier_code: 'NCC001',
        supplier_name: 'Tên đã cập nhật',
        status: 'ACTIVE',
      });

      const req = createRequest({
        params: { id: '1' },
        body: { supplier_name: 'Tên đã cập nhật' },
      });
      const res = createResponse();

      await updateSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cập nhật thông tin nhà cung cấp thành công',
          supplier: expect.objectContaining({ supplier_name: 'Tên đã cập nhật' }),
        }),
      );
    });
  });

  describe('deleteSupplier', () => {
    it('returns 409 when supplier has existing material receipts', async () => {
      findSupplierById.mockResolvedValue({ supplier_id: 1, supplier_name: 'Gỗ Sao Mai' });
      countMaterialReceiptsBySupplierId.mockResolvedValue(3);

      const req = createRequest({ params: { id: '1' } });
      const res = createResponse();

      await deleteSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestAction: 'INACTIVE',
          receiptCount: 3,
        }),
      );
    });

    it('deletes supplier successfully when no receipts exist', async () => {
      findSupplierById.mockResolvedValue({ supplier_id: 1, supplier_name: 'Gỗ Mới' });
      countMaterialReceiptsBySupplierId.mockResolvedValue(0);
      deleteSupplierModel.mockResolvedValue(true);

      const req = createRequest({ params: { id: '1' } });
      const res = createResponse();

      await deleteSupplier(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Xóa nhà cung cấp thành công' }),
      );
    });
  });
});
