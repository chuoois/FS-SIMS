// ==============================================================================
// saleCustomerController.test.js
// Automated Unit Tests for Sale Customer Management
// Enterprise / Clean Architecture Standard:
// - Standard Identifier Codes: UTCID01 -> UTCID10
// - 3-Phase Structure: Arrange - Act - Assert
// - Function-level describe blocks matching project conventions
// ==============================================================================

jest.mock('../src/config/sequelize', () => ({
  sequelize: {
    query: jest.fn(),
    QueryTypes: { SELECT: 'SELECT' },
  },
}));

jest.mock('../src/models/userAccount.model', () => ({
  UserAccount: {
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../src/models/userRole.model', () => ({
  UserRole: { findOne: jest.fn() },
  findUserRoleByCode: jest.fn(),
}));

jest.mock('../src/models/SaleCustomerModel', () => ({
  getCustomersWithPagination: jest.fn(),
  findCustomerById: jest.fn(),
  createCustomerBySales: jest.fn(),
  updateCustomerBySales: jest.fn(),
  deleteCustomerBySales: jest.fn(),
}));

jest.mock('../src/models/SaleRequestModel', () => ({
  getCustomersForSales: jest.fn(),
}));

const { sequelize } = require('../src/config/sequelize');
const { UserAccount } = require('../src/models/userAccount.model');
const { findUserRoleByCode } = require('../src/models/userRole.model');
const realSaleCustomerModel = jest.requireActual('../src/models/SaleCustomerModel');

const {
  validateCreateSaleCustomerInput,
  validateUpdateSaleCustomerInput,
} = require('../src/utils/saleCustomerValidator');

const {
  getCustomersWithPagination: getCustomersModel,
  findCustomerById: findCustomerByIdModel,
  createCustomerBySales: createCustomerBySalesModel,
  updateCustomerBySales: updateCustomerBySalesModel,
  deleteCustomerBySales: deleteCustomerBySalesModel,
} = require('../src/models/SaleCustomerModel');

const {
  getCustomersForSales,
} = require('../src/models/SaleRequestModel');

const {
  createSaleCustomer,
  getSaleCustomers,
  getSaleCustomerById,
  updateSaleCustomer,
  deleteSaleCustomer,
} = require('../src/controllers/saleCustomerController');

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
    body: {},
    params: {},
    query: {},
    user: { sub: 2, email: 'sales@fssims.local', full_name: 'Sales Staff' },
    ...overrides,
  };
}

describe('saleCustomerController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSaleCustomer', () => {
    test('UTCID01 - SALE creates a new customer successfully with valid details', async () => {
      // Arrange
      const newCustomerInput = {
        fullName: 'Trần Văn Nam',
        phoneNumber: '0987654321',
        email: 'nam.tran@example.com',
        address: '123 Đường Láng, Hà Nội',
        note: 'VIP Customer',
      };
      const req = createRequest({ body: newCustomerInput });
      const res = createResponse();
      const createdMockCustomer = {
        customerAccountId: 101,
        ...newCustomerInput,
        createBy: 'sales@fssims.local',
      };
      createCustomerBySalesModel.mockResolvedValue(createdMockCustomer);

      // Act
      await createSaleCustomer(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tạo khách hàng mới thành công',
          data: createdMockCustomer,
        })
      );
      expect(createCustomerBySalesModel).toHaveBeenCalledTimes(1);
      expect(createCustomerBySalesModel).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Trần Văn Nam',
          phoneNumber: '0987654321',
        })
      );
    });

    test('UTCID02 - Returns 400 Bad Request when customer full name is missing', async () => {
      // Arrange
      const req = createRequest({
        body: { fullName: '', phoneNumber: '0987654321' },
      });
      const res = createResponse();

      // Act
      await createSaleCustomer(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Họ và tên khách hàng là bắt buộc.' })
      );
      expect(createCustomerBySalesModel).not.toHaveBeenCalled();
    });

    test('UTCID03 - Returns 400 Bad Request when customer phone number is missing', async () => {
      // Arrange
      const req = createRequest({
        body: { fullName: 'Trần Văn Nam', phoneNumber: '' },
      });
      const res = createResponse();

      // Act
      await createSaleCustomer(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Số điện thoại khách hàng là bắt buộc.' })
      );
      expect(createCustomerBySalesModel).not.toHaveBeenCalled();
    });

    test('UTCID04 - Returns 400 Bad Request when phone number contains invalid characters', async () => {
      // Arrange
      const req = createRequest({
        body: { fullName: 'Trần Văn Nam', phoneNumber: '0987abc321' },
      });
      const res = createResponse();

      // Act
      await createSaleCustomer(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Số điện thoại không hợp lệ'),
        })
      );
      expect(createCustomerBySalesModel).not.toHaveBeenCalled();
    });

    test('UTCID05 - Returns 400 Bad Request when customer email format is invalid', async () => {
      // Arrange
      const req = createRequest({
        body: { fullName: 'Trần Văn Nam', phoneNumber: '0987654321', email: 'invalid_email_format' },
      });
      const res = createResponse();

      // Act
      await createSaleCustomer(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Địa chỉ email không đúng định dạng.' })
      );
      expect(createCustomerBySalesModel).not.toHaveBeenCalled();
    });

    test('UTCID06 - Returns 409 Conflict when customer email already exists in system', async () => {
      // Arrange
      const req = createRequest({
        body: { fullName: 'Trần Văn Nam', phoneNumber: '0987654321', email: 'duplicate.email@example.com' },
      });
      const res = createResponse();
      createCustomerBySalesModel.mockRejectedValue(
        new Error('Email "duplicate.email@example.com" đã được sử dụng bởi một tài khoản khác.')
      );

      // Act
      await createSaleCustomer(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('đã được sử dụng'),
        })
      );
      expect(createCustomerBySalesModel).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSaleCustomers', () => {
    test('UTCID01 - SALE retrieves paginated customer list successfully', async () => {
      // Arrange
      const req = createRequest({ query: { page: '1', limit: '10' } });
      const res = createResponse();
      const mockCustomersResult = {
        customers: [
          { customerAccountId: 1, fullName: 'Customer One', phoneNumber: '0901111111' },
          { customerAccountId: 2, fullName: 'Customer Two', phoneNumber: '0902222222' },
        ],
        totalItems: 2,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      };
      getCustomersModel.mockResolvedValue(mockCustomersResult);

      // Act
      await getSaleCustomers(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy danh sách khách hàng thành công',
          data: mockCustomersResult.customers,
          pagination: expect.objectContaining({ totalItems: 2 }),
        })
      );
      expect(getCustomersModel).toHaveBeenCalledTimes(1);
    });

    test('UTCID02 - SALE searches customer autocomplete dropdown by keyword', async () => {
      // Arrange
      const req = createRequest({ query: { mode: 'dropdown', search: 'Nam' } });
      const res = createResponse();
      const mockDropdownData = [
        { user_account_id: 10, full_name: 'Nguyễn Văn Nam', phone_number: '0912345678' },
      ];
      getCustomersForSales.mockResolvedValue(mockDropdownData);

      // Act
      await getSaleCustomers(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy danh sách khách hàng thành công',
          data: [
            expect.objectContaining({ customerAccountId: 10, fullName: 'Nguyễn Văn Nam' }),
          ],
        })
      );
      expect(getCustomersForSales).toHaveBeenCalledTimes(1);
      expect(getCustomersForSales).toHaveBeenCalledWith({ search: 'Nam' });
    });
  });

  describe('getSaleCustomerById', () => {
    test('UTCID01 - SALE views customer details by ID successfully', async () => {
      // Arrange
      const req = createRequest({ params: { id: '15' } });
      const res = createResponse();
      const mockCustomerDetail = {
        customerAccountId: 15,
        fullName: 'Phạm Nhật Vượng',
        phoneNumber: '0909999999',
        requests: [],
        contracts: [],
        orders: [],
      };
      findCustomerByIdModel.mockResolvedValue(mockCustomerDetail);

      // Act
      await getSaleCustomerById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy thông tin khách hàng thành công',
          data: mockCustomerDetail,
        })
      );
      expect(findCustomerByIdModel).toHaveBeenCalledWith('15');
    });

    test('UTCID02 - Returns 404 Not Found when requested customer ID does not exist', async () => {
      // Arrange
      const req = createRequest({ params: { id: '9999' } });
      const res = createResponse();
      findCustomerByIdModel.mockResolvedValue(null);

      // Act
      await getSaleCustomerById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Không tìm thấy khách hàng' })
      );
      expect(findCustomerByIdModel).toHaveBeenCalledWith('9999');
    });
  });

  describe('updateSaleCustomer', () => {
    test('UTCID01 - SALE updates customer information successfully', async () => {
      // Arrange
      const req = createRequest({
        params: { id: '15' },
        body: {
          fullName: 'Trần Văn Nam (Đã sửa)',
          phoneNumber: '0987654322',
          email: 'nam.updated@example.com',
          address: '456 Cầu Giấy, Hà Nội',
          status: 'ACTIVE',
          note: 'Khách hàng thân thiết',
        },
      });
      const res = createResponse();
      const updatedMockCustomer = {
        user_account_id: 15,
        full_name: 'Trần Văn Nam (Đã sửa)',
        phone_number: '0987654322',
        email: 'nam.updated@example.com',
        address: '456 Cầu Giấy, Hà Nội',
        status: 'ACTIVE',
        note: 'Khách hàng thân thiết',
      };
      updateCustomerBySalesModel.mockResolvedValue(updatedMockCustomer);

      // Act
      await updateSaleCustomer(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cập nhật thông tin khách hàng thành công',
          data: updatedMockCustomer,
        })
      );
      expect(updateCustomerBySalesModel).toHaveBeenCalledWith(
        15,
        expect.objectContaining({
          fullName: 'Trần Văn Nam (Đã sửa)',
          phoneNumber: '0987654322',
          email: 'nam.updated@example.com',
          status: 'ACTIVE',
          modifieBy: 'sales@fssims.local',
        })
      );
    });

    test('UTCID02 - Returns 400 Bad Request when customer ID param is invalid', async () => {
      const req = createRequest({
        params: { id: 'abc' },
        body: { fullName: 'Nguyễn Văn A' },
      });
      const res = createResponse();

      await updateSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'ID khách hàng không hợp lệ.' })
      );
      expect(updateCustomerBySalesModel).not.toHaveBeenCalled();
    });

    test('UTCID03 - Returns 400 Bad Request when update payload has invalid phone number', async () => {
      const req = createRequest({
        params: { id: '15' },
        body: { fullName: 'Nguyễn Văn A', phoneNumber: 'invalid_phone' },
      });
      const res = createResponse();

      await updateSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Số điện thoại không hợp lệ'),
        })
      );
      expect(updateCustomerBySalesModel).not.toHaveBeenCalled();
    });

    test('UTCID04 - Returns 404 Not Found when updating non-existent customer', async () => {
      const req = createRequest({
        params: { id: '9999' },
        body: { fullName: 'Nguyễn Văn A' },
      });
      const res = createResponse();
      updateCustomerBySalesModel.mockResolvedValue(null);

      await updateSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Không tìm thấy khách hàng' })
      );
    });

    test('UTCID05 - Returns 409 Conflict when updated email is already used by another account', async () => {
      const req = createRequest({
        params: { id: '15' },
        body: { email: 'used@example.com' },
      });
      const res = createResponse();
      updateCustomerBySalesModel.mockRejectedValue(
        new Error('Email "used@example.com" đã được sử dụng bởi một tài khoản khác.')
      );

      await updateSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('đã được sử dụng'),
        })
      );
    });
  });

  describe('deleteSaleCustomer', () => {
    test('UTCID01 - SALE deletes customer without relations successfully', async () => {
      const req = createRequest({ params: { id: '20' } });
      const res = createResponse();
      deleteCustomerBySalesModel.mockResolvedValue({ deleted: true, reason: null });

      await deleteSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Xóa khách hàng thành công',
          data: null,
        })
      );
      expect(deleteCustomerBySalesModel).toHaveBeenCalledWith(20);
    });

    test('UTCID02 - Returns 400 Bad Request when customer ID param is invalid', async () => {
      const req = createRequest({ params: { id: '0' } });
      const res = createResponse();

      await deleteSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'ID khách hàng không hợp lệ.' })
      );
      expect(deleteCustomerBySalesModel).not.toHaveBeenCalled();
    });

    test('UTCID03 - Returns 404 Not Found when deleting non-existent customer', async () => {
      const req = createRequest({ params: { id: '9999' } });
      const res = createResponse();
      deleteCustomerBySalesModel.mockResolvedValue({ deleted: false, reason: 'NOT_FOUND' });

      await deleteSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Không tìm thấy khách hàng' })
      );
    });

    test('UTCID04 - Returns 409 Conflict when customer has existing requests, contracts, or orders', async () => {
      const req = createRequest({ params: { id: '15' } });
      const res = createResponse();
      deleteCustomerBySalesModel.mockResolvedValue({
        deleted: false,
        reason: 'HAS_RELATIONS',
        customer: { user_account_id: 15, full_name: 'Nguyễn Văn Minh' },
        counts: { totalRequests: 2, totalContracts: 1, totalOrders: 0 },
      });

      await deleteSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestAction: 'INACTIVE',
          message: expect.stringContaining('2 yêu cầu, 1 hợp đồng'),
        })
      );
    });
  });
});

describe('saleCustomerValidator', () => {
  describe('validateCreateSaleCustomerInput', () => {
    test('accepts valid customer payload and trims fields', () => {
      const result = validateCreateSaleCustomerInput({
        fullName: '  Nguyễn Văn A  ',
        phoneNumber: ' 0912345678 ',
        email: '  Customer@Example.COM ',
        address: '  Hà Nội ',
        note: '  Khách VIP ',
      });

      expect(result).toEqual({
        isValid: true,
        value: {
          fullName: 'Nguyễn Văn A',
          phoneNumber: '0912345678',
          email: 'customer@example.com',
          address: 'Hà Nội',
          note: 'Khách VIP',
        },
      });
    });

    test('rejects missing fullName or phoneNumber', () => {
      expect(validateCreateSaleCustomerInput({ fullName: '  ', phoneNumber: '0912345678' })).toEqual({
        isValid: false,
        error: 'Họ và tên khách hàng là bắt buộc.',
      });
      expect(validateCreateSaleCustomerInput({ fullName: 'Nguyễn Văn A', phoneNumber: '' })).toEqual({
        isValid: false,
        error: 'Số điện thoại khách hàng là bắt buộc.',
      });
    });

    test('rejects invalid phoneNumber or email', () => {
      expect(validateCreateSaleCustomerInput({ fullName: 'An', phoneNumber: '123abc' }).isValid).toBe(false);
      expect(
        validateCreateSaleCustomerInput({ fullName: 'An', phoneNumber: '0912345678', email: 'bad-email' })
      ).toEqual({
        isValid: false,
        error: 'Địa chỉ email không đúng định dạng.',
      });
    });
  });

  describe('validateUpdateSaleCustomerInput', () => {
    test('accepts partial status update', () => {
      expect(validateUpdateSaleCustomerInput({ status: 'inactive' })).toEqual({
        isValid: true,
        value: { status: 'INACTIVE' },
      });
    });

    test('accepts full customer update with optional fields', () => {
      const result = validateUpdateSaleCustomerInput({
        fullName: ' Trần Thị Bình ',
        phoneNumber: '0988776655',
        email: 'Binh@Example.com',
        status: 'ACTIVE',
        gender: 'female',
        dob: '1995-05-20',
        address: 'TP.HCM',
        note: '',
      });

      expect(result).toEqual({
        isValid: true,
        value: {
          fullName: 'Trần Thị Bình',
          phoneNumber: '0988776655',
          email: 'binh@example.com',
          status: 'ACTIVE',
          gender: 'FEMALE',
          dob: '1995-05-20',
          address: 'TP.HCM',
          note: null,
        },
      });
    });

    test('rejects empty payload or invalid status/gender/dob', () => {
      expect(validateUpdateSaleCustomerInput({})).toEqual({
        isValid: false,
        error: 'Vui lòng cung cấp ít nhất một thông tin cần cập nhật.',
      });
      expect(validateUpdateSaleCustomerInput({ status: 'DELETED' }).isValid).toBe(false);
      expect(validateUpdateSaleCustomerInput({ gender: 'UNKNOWN' }).isValid).toBe(false);
      expect(validateUpdateSaleCustomerInput({ dob: '20-05-1995' }).isValid).toBe(false);
    });
  });
});

describe('SaleCustomerModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findUserRoleByCode.mockResolvedValue({ role_id: 4, role_code: 'CUSTOMER' });
  });

  describe('updateCustomerBySales', () => {
    test('returns null when customer does not exist or is not CUSTOMER role', async () => {
      UserAccount.findOne.mockResolvedValueOnce(null);

      const result = await realSaleCustomerModel.updateCustomerBySales(99, { fullName: 'Test' });

      expect(result).toBeNull();
      expect(UserAccount.update).not.toHaveBeenCalled();
    });

    test('throws duplicate email error when new email belongs to another account', async () => {
      UserAccount.findOne
        .mockResolvedValueOnce({ user_account_id: 10, role_id: 4, email: 'old@example.com' })
        .mockResolvedValueOnce({ user_account_id: 20, email: 'taken@example.com' });

      await expect(
        realSaleCustomerModel.updateCustomerBySales(10, { email: 'taken@example.com' })
      ).rejects.toThrow('Email "taken@example.com" đã được sử dụng bởi một tài khoản khác.');

      expect(UserAccount.update).not.toHaveBeenCalled();
    });

    test('updates customer fields and returns updated record', async () => {
      const updatedRecord = {
        user_account_id: 10,
        full_name: 'Nguyễn Văn B',
        phone_number: '0901234567',
        email: 'new@example.com',
        status: 'INACTIVE',
      };
      UserAccount.findOne
        .mockResolvedValueOnce({ user_account_id: 10, role_id: 4, email: 'old@example.com' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(updatedRecord);
      UserAccount.update.mockResolvedValueOnce([1]);

      const result = await realSaleCustomerModel.updateCustomerBySales(10, {
        fullName: 'Nguyễn Văn B',
        phoneNumber: '0901234567',
        email: 'new@example.com',
        status: 'INACTIVE',
        modifieBy: 'sales@fssims.com',
      });

      expect(UserAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'Nguyễn Văn B',
          phone_number: '0901234567',
          email: 'new@example.com',
          status: 'INACTIVE',
          modifieby: 'sales@fssims.com',
        }),
        { where: { user_account_id: 10, role_id: 4 } }
      );
      expect(result).toEqual(updatedRecord);
    });
  });

  describe('deleteCustomerBySales', () => {
    test('returns NOT_FOUND when customer does not exist', async () => {
      UserAccount.findOne.mockResolvedValueOnce(null);

      const result = await realSaleCustomerModel.deleteCustomerBySales(999);

      expect(result).toEqual({ deleted: false, reason: 'NOT_FOUND' });
      expect(UserAccount.destroy).not.toHaveBeenCalled();
    });

    test('returns HAS_RELATIONS when customer has requests, contracts, or orders', async () => {
      const existing = { user_account_id: 10, full_name: 'Nguyễn Văn A' };
      UserAccount.findOne.mockResolvedValueOnce(existing);
      sequelize.query
        .mockResolvedValueOnce([{ customer_account_id: 10, cnt: 1 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ customer_account_id: 10, cnt: 2 }]);

      const result = await realSaleCustomerModel.deleteCustomerBySales(10);

      expect(result).toEqual({
        deleted: false,
        reason: 'HAS_RELATIONS',
        customer: existing,
        counts: { totalRequests: 1, totalContracts: 0, totalOrders: 2 },
      });
      expect(UserAccount.destroy).not.toHaveBeenCalled();
    });

    test('deletes customer when no relations exist', async () => {
      UserAccount.findOne.mockResolvedValueOnce({ user_account_id: 10, full_name: 'Nguyễn Văn A' });
      sequelize.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      UserAccount.destroy.mockResolvedValueOnce(1);

      const result = await realSaleCustomerModel.deleteCustomerBySales(10);

      expect(UserAccount.destroy).toHaveBeenCalledWith({
        where: { user_account_id: 10, role_id: 4 },
      });
      expect(result).toEqual({ deleted: true, reason: null });
    });
  });
});
