const mockCart = { findOrCreate: jest.fn() };

jest.mock('../src/config/sequelize', () => ({
  sequelize: { define: jest.fn(() => mockCart) },
}));
jest.mock('../src/models/CartItemModel', () => ({
  CartItem: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
  },
}));
jest.mock('../src/models/ProductModel', () => ({
  findProductById: jest.fn(),
}));

const { Cart } = require('../src/models/CartModel');
const { CartItem } = require('../src/models/CartItemModel');
const { findProductById } = require('../src/models/ProductModel');
const { addProductToCart, updateCartItemQuantity } = require('../src/models/CartModel');

describe('CartModel', () => {
  const cart = { cart_id: 8 };
  const product = { status: 'ACTIVE', stock_quantity: 8 };

  beforeEach(() => {
    jest.clearAllMocks();
    Cart.findOrCreate.mockResolvedValue([cart, true]);
    findProductById.mockResolvedValue(product);
  });

  test('cộng số lượng khi sản phẩm đã có trong giỏ', async () => {
    const existingItem = { quantity: 2, update: jest.fn().mockResolvedValue(true) };
    CartItem.findOne.mockResolvedValue(existingItem);

    await addProductToCart(17, 21, 3, 'customer@example.com');

    expect(existingItem.update).toHaveBeenCalledWith({
      quantity: 5,
      modifieby: 'customer@example.com',
    });
  });

  test('không thêm số lượng vượt quá tồn kho', async () => {
    const existingItem = { quantity: 7, update: jest.fn() };
    CartItem.findOne.mockResolvedValue(existingItem);

    await expect(addProductToCart(17, 21, 2, 'customer@example.com')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(existingItem.update).not.toHaveBeenCalled();
  });

  test('không cập nhật số lượng vượt quá tồn kho', async () => {
    CartItem.findOne.mockResolvedValue({ update: jest.fn() });

    await expect(updateCartItemQuantity(17, 21, 9, 'customer@example.com')).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
