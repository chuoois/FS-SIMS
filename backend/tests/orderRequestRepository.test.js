jest.mock('../src/config/sequelize', () => ({
  sequelize: { transaction: jest.fn() },
}));
jest.mock('../src/models/CartModel', () => ({
  Cart: { findOne: jest.fn() },
}));
jest.mock('../src/models/CartItemModel', () => ({
  CartItem: { findAll: jest.fn(), destroy: jest.fn() },
}));
jest.mock('../src/models/OrderRequestModel', () => ({
  OrderRequest: { create: jest.fn() },
}));
jest.mock('../src/models/OrderRequestItemModel', () => ({
  OrderRequestItem: { bulkCreate: jest.fn() },
}));
jest.mock('../src/models/ProductModel', () => ({
  Product: { findAll: jest.fn() },
}));

const { sequelize } = require('../src/config/sequelize');
const { Cart } = require('../src/models/CartModel');
const { CartItem } = require('../src/models/CartItemModel');
const { OrderRequest } = require('../src/models/OrderRequestModel');
const { OrderRequestItem } = require('../src/models/OrderRequestItemModel');
const { Product } = require('../src/models/ProductModel');
const {
  createReadyOrderRequestFromCart,
} = require('../src/models/orderRequestRepository');

describe('orderRequestRepository', () => {
  const transaction = {
    LOCK: { UPDATE: 'UPDATE' },
    commit: jest.fn(),
    rollback: jest.fn(),
  };
  const product = {
    product_id: 21,
    product_name: 'Ghế ăn gỗ sồi',
    category_id: 2,
    room_id: 3,
    material_id: 4,
    color_id: 5,
    length_cm: 50,
    width_cm: 45,
    height_cm: 80,
    price: 1200000,
    stock_quantity: 8,
    description: 'Gỗ tự nhiên',
    status: 'ACTIVE',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockResolvedValue(transaction);
    Cart.findOne.mockResolvedValue({ cart_id: 8 });
    CartItem.findAll.mockResolvedValue([{ product_id: 21, quantity: 2 }]);
    Product.findAll.mockResolvedValue([product]);
    OrderRequest.create.mockResolvedValue({
      request_id: 14,
      request_code: 'RQ-20261103-AB12CD34',
      status: 'PENDING',
      title: 'Yêu cầu mua hàng (1 sản phẩm)',
    });
    OrderRequestItem.bulkCreate.mockResolvedValue([]);
    CartItem.destroy.mockResolvedValue(1);
  });

  test('tạo yêu cầu READY cùng item snapshot và xóa các món trong giỏ', async () => {
    const result = await createReadyOrderRequestFromCart({
      customerAccountId: 17,
      contactName: 'Nguyễn Văn A',
      contactPhone: '0901234567',
      contactEmail: 'customer@example.com',
      deliveryAddress: '12 Lê Lợi',
      description: 'Giao giờ hành chính',
      createBy: 'customer@example.com',
    });

    expect(OrderRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        order_type: 'READY',
        request_type: 'SINGLE',
        customer_account_id: 17,
        contact_name: 'Nguyễn Văn A',
        status: 'PENDING',
      }),
      { transaction }
    );
    expect(OrderRequestItem.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({
        request_id: 14,
        product_id: 21,
        item_name: 'Ghế ăn gỗ sồi',
        quantity: 2,
        unit_price: 1200000,
      })],
      { transaction }
    );
    expect(CartItem.destroy).toHaveBeenCalledWith({
      where: { cart_id: 8 },
      transaction,
    });
    expect(transaction.commit).toHaveBeenCalled();
    expect(result).toMatchObject({ requestId: 14, status: 'PENDING' });
  });

  test('không tạo yêu cầu khi giỏ hàng trống', async () => {
    CartItem.findAll.mockResolvedValue([]);

    await expect(createReadyOrderRequestFromCart({
      customerAccountId: 17,
      contactName: 'Nguyễn Văn A',
      contactPhone: '0901234567',
    })).rejects.toMatchObject({ statusCode: 409, message: 'Giỏ hàng đang trống.' });

    expect(OrderRequest.create).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });

  test('không tạo yêu cầu khi tồn kho không đủ', async () => {
    Product.findAll.mockResolvedValue([{ ...product, stock_quantity: 1 }]);

    await expect(createReadyOrderRequestFromCart({
      customerAccountId: 17,
      contactName: 'Nguyễn Văn A',
      contactPhone: '0901234567',
    })).rejects.toMatchObject({ statusCode: 409 });

    expect(OrderRequest.create).not.toHaveBeenCalled();
    expect(CartItem.destroy).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });
});
