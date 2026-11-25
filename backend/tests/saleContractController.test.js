// ==============================================================================
// saleContractController.test.js
// Automated Unit Tests for Sale Contract Management
// Enterprise / Clean Architecture Standard:
// - Standard Identifier Codes: UTCID11 -> UTCID22
// - 3-Phase Structure: Arrange - Act - Assert
// - Function-level describe blocks matching project conventions
// ==============================================================================

jest.mock('../src/models/ContractModel', () => ({
  createOfflineContract: jest.fn(),
  signContract: jest.fn(),
  findContractById: jest.fn(),
  getContractsWithPagination: jest.fn(),
}));

jest.mock('../src/models/SaleRequestModel', () => ({
  convertRequestToContract: jest.fn(),
}));

jest.mock('../src/models/OrderRequestModel', () => ({
  OrderRequest: {
    update: jest.fn().mockResolvedValue([1]),
  },
}));

const {
  createOfflineContract: createOfflineContractModel,
  signContract: signContractModel,
  findContractById: findContractByIdModel,
  getContractsWithPagination: getContractsModel,
} = require('../src/models/ContractModel');

const {
  convertRequestToContract: convertRequestToContractModel,
} = require('../src/models/SaleRequestModel');

const { OrderRequest } = require('../src/models/OrderRequestModel');

const {
  createOfflineContract,
  signContract,
  getContracts,
  getContractById,
  convertRequestToContract,
} = require('../src/controllers/saleContractController');

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
    file: null,
    user: { sub: 2, email: 'sales@fssims.local', full_name: 'Sales Staff' },
    ...overrides,
  };
}

const getFutureDateString = (days = 15) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

describe('saleContractController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOfflineContract', () => {
    test('UTCID1 - SALE creates a draft offline sales contract successfully at counter', async () => {
      // Arrange
      const validContractPayload = {
        customer_name: 'Lê Văn Tám',
        customer_phone: '0912345678',
        deposit_amount: 1000000,
        delivery_date: getFutureDateString(15),
        signed_place: 'Showroom 01',
        items: [
          { productId: 1, quantity: 2, unitPrice: 2000000 },
        ],
      };
      const req = createRequest({ body: validContractPayload });
      const res = createResponse();
      const mockCreatedContract = {
        contract_id: 50,
        contract_code: 'CT-20261120-0050',
        customer_name: 'Lê Văn Tám',
        customer_phone: '0912345678',
        total_amount: 4000000,
        deposit_amount: 1000000,
        status: 'DRAFT',
        items: [],
      };
      createOfflineContractModel.mockResolvedValue(mockCreatedContract);

      // Act
      await createOfflineContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lập biên bản hợp đồng thành công',
          data: expect.objectContaining({ contractId: 50, contractCode: 'CT-20261120-0050' }),
        })
      );
      expect(createOfflineContractModel).toHaveBeenCalledTimes(1);
    });

    test('UTCID2 - Returns 400 Bad Request when contract items list is empty', async () => {
      // Arrange
      const invalidPayload = {
        customer_name: 'Lê Văn Tám',
        customer_phone: '0912345678',
        delivery_date: getFutureDateString(15),
        items: [],
      };
      const req = createRequest({ body: invalidPayload });
      const res = createResponse();

      // Act
      await createOfflineContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Hợp đồng phải có ít nhất một sản phẩm'),
        })
      );
      expect(createOfflineContractModel).not.toHaveBeenCalled();
    });

    test('UTCID3 - Returns 400 Bad Request when delivery date is less than 10 days from creation', async () => {
      // Arrange
      const invalidPayload = {
        customer_name: 'Lê Văn Tám',
        customer_phone: '0912345678',
        delivery_date: getFutureDateString(3),
        items: [{ productId: 1, quantity: 1, unitPrice: 1000000 }],
      };
      const req = createRequest({ body: invalidPayload });
      const res = createResponse();

      // Act
      await createOfflineContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('phải cách thời điểm tạo'),
        })
      );
      expect(createOfflineContractModel).not.toHaveBeenCalled();
    });

    test('UTCID4 - Returns 400 Bad Request when inventory stock is insufficient to fulfill contract', async () => {
      // Arrange
      const contractPayload = {
        customer_name: 'Lê Văn Tám',
        customer_phone: '0912345678',
        delivery_date: getFutureDateString(15),
        items: [{ productId: 1, quantity: 999, unitPrice: 1000000 }],
      };
      const req = createRequest({ body: contractPayload });
      const res = createResponse();
      createOfflineContractModel.mockRejectedValue(
        new Error('Sản phẩm "Bàn ăn" chỉ còn 5 trong kho, không đủ số lượng yêu cầu (999).')
      );

      // Act
      await createOfflineContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('chỉ còn 5 trong kho'),
        })
      );
      expect(createOfflineContractModel).toHaveBeenCalledTimes(1);
    });
  });

  describe('signContract', () => {
    test('UTCID1 - SALE signs contract successfully with uploaded proof file attached via req.file', async () => {
      // Arrange
      const req = createRequest({
        params: { id: '50' },
        file: { path: 'https://res.cloudinary.com/fssims/contracts/signed_proof_123.jpg' },
        body: { signed_place: 'Góc Nhà Store' },
      });
      const res = createResponse();
      const mockSignedContract = {
        contract_id: 50,
        contract_code: 'CT-20261120-0050',
        status: 'SIGNED',
        contract_file_url: 'https://res.cloudinary.com/fssims/contracts/signed_proof_123.jpg',
        signed_place: 'Góc Nhà Store',
        items: [],
      };
      signContractModel.mockResolvedValue(mockSignedContract);

      // Act
      await signContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Chốt và ký hợp đồng thành công',
          data: expect.objectContaining({ status: 'SIGNED', contractId: 50 }),
        })
      );
      expect(signContractModel).toHaveBeenCalledTimes(1);
      expect(signContractModel).toHaveBeenCalledWith(
        50,
        expect.objectContaining({
          contractFileUrl: 'https://res.cloudinary.com/fssims/contracts/signed_proof_123.jpg',
        })
      );
    });

    test('UTCID2 - SALE signs contract successfully with proof image URL provided via req.body.contract_file_url', async () => {
      // Arrange
      const req = createRequest({
        params: { id: '50' },
        body: {
          signed_place: 'Northern Showroom',
          contract_file_url: 'https://res.cloudinary.com/fssims/contracts/scanned_doc.pdf',
        },
      });
      const res = createResponse();
      const mockSignedContract = {
        contract_id: 50,
        status: 'SIGNED',
        contract_file_url: 'https://res.cloudinary.com/fssims/contracts/scanned_doc.pdf',
        items: [],
      };
      signContractModel.mockResolvedValue(mockSignedContract);

      // Act
      await signContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Chốt và ký hợp đồng thành công' })
      );
      expect(signContractModel).toHaveBeenCalledTimes(1);
    });

    test('UTCID3 - Returns 400 Bad Request when signing contract without proof document image', async () => {
      // Arrange
      const req = createRequest({
        params: { id: '50' },
        body: { signed_place: 'Northern Showroom', contract_file_url: '' },
      });
      const res = createResponse();

      // Act
      await signContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Ảnh chụp/bản scan hợp đồng đã ký là bắt buộc'),
        })
      );
      expect(signContractModel).not.toHaveBeenCalled();
    });

    test('UTCID5 - SALE signs contract linked to an order request and updates order_request status to CONVERTED', async () => {
      // Arrange
      const req = createRequest({
        params: { id: '55' },
        file: { path: 'https://res.cloudinary.com/fssims/contracts/signed_proof_55.jpg' },
        body: { signed_place: 'Góc Nhà Store' },
      });
      const res = createResponse();
      const mockSignedContract = {
        contract_id: 55,
        contract_code: 'CT-20261120-0055',
        request_id: 201,
        status: 'SIGNED',
        contract_file_url: 'https://res.cloudinary.com/fssims/contracts/signed_proof_55.jpg',
        signed_place: 'Góc Nhà Store',
        items: [],
      };
      signContractModel.mockResolvedValue(mockSignedContract);
      OrderRequest.update.mockResolvedValue([1]);

      // Act
      await signContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(OrderRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CONVERTED' }),
        { where: { request_id: 201 } }
      );
    });

    test('UTCID4 - Returns 400 Bad Request when contract ID param is not a valid number', async () => {
      // Arrange
      const req = createRequest({
        params: { id: 'abc_invalid' },
        body: { contract_file_url: 'https://res.cloudinary.com/image.jpg' },
      });
      const res = createResponse();

      // Act
      await signContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Mã hợp đồng không hợp lệ.' })
      );
      expect(signContractModel).not.toHaveBeenCalled();
    });
  });

  describe('getContracts', () => {
    test('UTCID1 - SALE retrieves contract list with search and status filters', async () => {
      // Arrange
      const req = createRequest({
        query: { page: '1', limit: '10', status: 'SIGNED', search: '0912' },
      });
      const res = createResponse();
      const mockContractsData = {
        contracts: [
          { contract_id: 1, contract_code: 'CT-01', status: 'SIGNED', items: [] },
        ],
        totalItems: 1,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
      };
      getContractsModel.mockResolvedValue(mockContractsData);

      // Act
      await getContracts(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy danh sách hợp đồng thành công',
          pagination: expect.objectContaining({ totalItems: 1 }),
        })
      );
      expect(getContractsModel).toHaveBeenCalledTimes(1);
    });
  });

  describe('getContractById', () => {
    test('UTCID1 - SALE views contract details by ID successfully', async () => {
      // Arrange
      const req = createRequest({ params: { id: '77' } });
      const res = createResponse();
      const mockContractDetail = {
        contract_id: 77,
        contract_code: 'CT-2026-0077',
        customer_name: 'Hoàng Thùy Linh',
        status: 'SIGNED',
        items: [{ contract_item_id: 1, item_name: 'Kệ tivi', quantity: 1, unit_price: 3500000 }],
      };
      findContractByIdModel.mockResolvedValue(mockContractDetail);

      // Act
      await getContractById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Lấy thông tin hợp đồng thành công',
          data: expect.objectContaining({ contractId: 77, customerName: 'Hoàng Thùy Linh' }),
        })
      );
      expect(findContractByIdModel).toHaveBeenCalledWith(77);
    });
  });

  describe('convertRequestToContract', () => {
    test('UTCID1 - SALE converts custom design request to contract successfully', async () => {
      // Arrange
      const req = createRequest({
        params: { id: '30' },
        body: {
          customer_name: 'Nguyễn Bính',
          customer_phone: '0988776655',
          deposit_amount: 2000000,
          delivery_date: getFutureDateString(14),
          signed_place: 'Góc Nhà Studio',
        },
      });
      const res = createResponse();
      const mockConvertedContract = {
        contract_id: 88,
        contract_code: 'CT-CUSTOM-88',
        contract_type: 'CUSTOM',
        customer_name: 'Nguyễn Bính',
        status: 'DRAFT',
        items: [],
      };
      convertRequestToContractModel.mockResolvedValue(mockConvertedContract);

      // Act
      await convertRequestToContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Chuyển yêu cầu thành hợp đồng thành công',
          data: expect.objectContaining({ contract_id: 88 }),
        })
      );
      expect(convertRequestToContractModel).toHaveBeenCalledTimes(1);
    });

    test('UTCID2 - Returns 400 Bad Request when converting request with delivery date under 10 days', async () => {
      // Arrange
      const req = createRequest({
        params: { id: '30' },
        body: {
          customer_name: 'Nguyễn Bính',
          customer_phone: '0988776655',
          delivery_date: getFutureDateString(4),
        },
      });
      const res = createResponse();

      // Act
      await convertRequestToContract(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('phải cách thời điểm tạo hợp đồng ít nhất 10 ngày'),
        })
      );
      expect(convertRequestToContractModel).not.toHaveBeenCalled();
    });
  });
});
