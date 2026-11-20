// ==============================================================================
// saleCustomerController.test.js
// Automated Unit Tests for Sale Customer Management
// Enterprise / Clean Architecture Standard:
// - Standard Identifier Codes: UTCID01 -> UTCID10
// - 3-Phase Structure: Arrange - Act - Assert
// - Function-level describe blocks matching project conventions
// ==============================================================================

jest.mock('../src/models/SaleCustomerModel', () => ({
  getCustomersWithPagination: jest.fn(),
  findCustomerById: jest.fn(),
  createCustomerBySales: jest.fn(),
}));

jest.mock('../src/models/SaleRequestModel', () => ({
  getCustomersForSales: jest.fn(),
}));

const {
  getCustomersWithPagination: getCustomersModel,
  findCustomerById: findCustomerByIdModel,
  createCustomerBySales: createCustomerBySalesModel,
} = require('../src/models/SaleCustomerModel');

const {
  getCustomersForSales,
} = require('../src/models/SaleRequestModel');

const {
  createSaleCustomer,
  getSaleCustomers,
  getSaleCustomerById,
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
    test('UTCID07 - SALE retrieves paginated customer list successfully', async () => {
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

    test('UTCID08 - SALE searches customer autocomplete dropdown by keyword', async () => {
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
    test('UTCID09 - SALE views customer details by ID successfully', async () => {
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

    test('UTCID10 - Returns 404 Not Found when requested customer ID does not exist', async () => {
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
});
