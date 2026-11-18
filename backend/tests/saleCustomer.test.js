jest.mock('../src/models/SaleCustomerModel', () => ({
  createCustomerBySales: jest.fn(),
  getCustomersWithPagination: jest.fn(),
  findCustomerById: jest.fn(),
}));

jest.mock('../src/models/SaleRequestModel', () => ({
  getCustomersForSales: jest.fn(),
}));

const { createCustomerBySales } = require('../src/models/SaleCustomerModel');
const { getCustomersForSales } = require('../src/models/SaleRequestModel');
const { createSaleCustomer, getSaleCustomers } = require('../src/controllers/saleOrderController');

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
    user: { sub: 1, email: 'sales@example.com', role: 'SALES' },
    body: {},
    params: {},
    query: {},
    ...overrides,
  };
}

describe('saleOrderController - Customers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSaleCustomer', () => {
    it('trả về 400 nếu thiếu họ và tên', async () => {
      const req = createRequest({ body: { phoneNumber: '0912345678' } });
      const res = createResponse();

      await createSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Họ và tên khách hàng là bắt buộc.' })
      );
    });

    it('trả về 400 nếu thiếu số điện thoại', async () => {
      const req = createRequest({ body: { fullName: 'Nguyễn Văn A' } });
      const res = createResponse();

      await createSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Số điện thoại khách hàng là bắt buộc.' })
      );
    });

    it('trả về 400 nếu số điện thoại không hợp lệ', async () => {
      const req = createRequest({ body: { fullName: 'Nguyễn Văn A', phoneNumber: 'abc' } });
      const res = createResponse();

      await createSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Số điện thoại không hợp lệ') })
      );
    });

    it('trả về 400 nếu email không đúng định dạng', async () => {
      const req = createRequest({
        body: { fullName: 'Nguyễn Văn A', phoneNumber: '0912345678', email: 'invalid-email' },
      });
      const res = createResponse();

      await createSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Địa chỉ email không đúng định dạng.' })
      );
    });

    it('tạo khách hàng thành công và trả về 201', async () => {
      const customerMock = {
        customerAccountId: 101,
        fullName: 'Nguyễn Văn A',
        phoneNumber: '0912345678',
        email: 'nguyenvana@gmail.com',
        address: '123 Đường ABC, Hà Nội',
      };
      createCustomerBySales.mockResolvedValue(customerMock);

      const req = createRequest({
        body: {
          fullName: 'Nguyễn Văn A',
          phoneNumber: '0912345678',
          email: 'nguyenvana@gmail.com',
          address: '123 Đường ABC, Hà Nội',
        },
      });
      const res = createResponse();

      await createSaleCustomer(req, res);

      expect(createCustomerBySales).toHaveBeenCalledWith({
        fullName: 'Nguyễn Văn A',
        phoneNumber: '0912345678',
        email: 'nguyenvana@gmail.com',
        address: '123 Đường ABC, Hà Nội',
        note: undefined,
        createBy: 'sales@example.com',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Tạo khách hàng mới thành công',
        data: customerMock,
      });
    });

    it('trả về 409 nếu email đã được sử dụng', async () => {
      createCustomerBySales.mockRejectedValue(new Error('Email "test@example.com" đã được sử dụng bởi một tài khoản khác.'));

      const req = createRequest({
        body: {
          fullName: 'Nguyễn Văn B',
          phoneNumber: '0912345679',
          email: 'test@example.com',
        },
      });
      const res = createResponse();

      await createSaleCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('đã được sử dụng') })
      );
    });
  });

  describe('getSaleCustomers dropdown mode', () => {
    it('trả về danh sách autocomplete khi mode=dropdown', async () => {
      const listMock = [
        {
          user_account_id: 1,
          full_name: 'Trần Văn B',
          phone_number: '0987654321',
          email: 'b@example.com',
          address: '456 Phố Huế',
        },
      ];
      getCustomersForSales.mockResolvedValue(listMock);

      const req = createRequest({ query: { mode: 'dropdown', search: '0987' } });
      const res = createResponse();

      await getSaleCustomers(req, res);

      expect(getCustomersForSales).toHaveBeenCalledWith({ search: '0987' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Lấy danh sách khách hàng thành công',
        data: [
          {
            customerAccountId: 1,
            fullName: 'Trần Văn B',
            phoneNumber: '0987654321',
            email: 'b@example.com',
            address: '456 Phố Huế',
          },
        ],
      });
    });
  });
});
