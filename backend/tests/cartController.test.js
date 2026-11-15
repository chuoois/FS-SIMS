jest.mock('../src/models/CartModel', () => ({
  findOrCreateCart: jest.fn(),
  getCartItems: jest.fn(),
  addProductToCart: jest.fn(),
  updateCartItemQuantity: jest.fn(),
  removeCartItem: jest.fn(),
}));

jest.mock('../src/utils/productValidator', () => ({
  toProductDTO: jest.fn(),
}));

const {
  findOrCreateCart,
  getCartItems,
  addProductToCart,
  updateCartItemQuantity,
  removeCartItem,
} = require('../src/models/CartModel');
const { toProductDTO } = require('../src/utils/productValidator');
const { ApiError } = require('../src/utils/ApiError');
const {
  getCart,
  addItem,
  updateItem,
  deleteItem,
} = require('../src/controllers/cartController');

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
    user: { sub: 9, email: 'customer@example.com' },
    body: {},
    params: {},
    originalUrl: '/api/cart',
    traceId: 'trace-cart-test',
    ...overrides,
  };
}

function expectApiError(next, statusCode, detail) {
  expect(next).toHaveBeenCalledTimes(1);
  expect(next.mock.calls[0][0]).toBeInstanceOf(ApiError);
  expect(next.mock.calls[0][0]).toMatchObject({ statusCode, detail });
}

describe('cartController', () => {
  let next;
  const cart = { cart_id: 33 };
  const cartItem = { cart_item_id: 5, quantity: 2 };
  const product = { product_id: 12, status: 'ACTIVE' };
  const productDTO = { productId: 12, productName: 'Chair', price: '15.5' };

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
    findOrCreateCart.mockResolvedValue(cart);
    getCartItems.mockResolvedValue([{ cartItem, product }]);
    addProductToCart.mockResolvedValue(cart);
    updateCartItemQuantity.mockResolvedValue(cart);
    removeCartItem.mockResolvedValue(cart);
    toProductDTO.mockReturnValue(productDTO);
  });

  describe('getCart', () => {
    test('returns the cart in the standard success response format', async () => {
      const req = createRequest();
      const res = createResponse();

      await getCart(req, res, next);

      expect(findOrCreateCart).toHaveBeenCalledWith(9, 'customer@example.com');
      expect(getCartItems).toHaveBeenCalledWith(33);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        message: 'Lấy giỏ hàng thành công',
        data: {
          items: [{
            cartItemId: 5,
            quantity: 2,
            product: productDTO,
            lineTotal: 31,
          }],
          itemCount: 2,
          subtotal: 31,
        },
        instance: '/api/cart',
        traceId: 'trace-cart-test',
        timestamp: expect.any(String),
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('rejects requests without a valid customer account', async () => {
      await getCart(createRequest({ user: undefined }), createResponse(), next);

      expectApiError(next, 401, 'Tài khoản khách hàng không hợp lệ.');
      expect(findOrCreateCart).not.toHaveBeenCalled();
    });

    test('hides unexpected model errors and passes them to the error middleware', async () => {
      const error = new Error('database unavailable');
      findOrCreateCart.mockRejectedValue(error);

      await getCart(createRequest(), createResponse(), next);

      expectApiError(next, 500, 'Lỗi máy chủ khi lấy giỏ hàng');
      expect(next.mock.calls[0][0].cause).toBe(error);
    });
  });

  describe('addItem', () => {
    test.each([
      ['invalid product ID', { productId: 0 }, 400, 'Mã sản phẩm không hợp lệ.'],
      ['quantity below one', { productId: 12, quantity: 0 }, 400, 'Số lượng phải là số nguyên từ 1 đến 99.'],
      ['fractional quantity', { productId: 12, quantity: 1.5 }, 400, 'Số lượng phải là số nguyên từ 1 đến 99.'],
      ['quantity above limit', { productId: 12, quantity: 100 }, 400, 'Số lượng phải là số nguyên từ 1 đến 99.'],
    ])('rejects %s', async (_description, body, statusCode, detail) => {
      await addItem(createRequest({ body }), createResponse(), next);

      expectApiError(next, statusCode, detail);
      expect(addProductToCart).not.toHaveBeenCalled();
    });

    test('uses the default quantity and returns the updated cart', async () => {
      const req = createRequest({ body: { productId: '12' } });
      const res = createResponse();

      await addItem(req, res, next);

      expect(addProductToCart).toHaveBeenCalledWith(9, 12, 1, 'customer@example.com');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 200,
        message: 'Đã thêm sản phẩm vào giỏ hàng',
        data: expect.objectContaining({ itemCount: 2, subtotal: 31 }),
      }));
      expect(next).not.toHaveBeenCalled();
    });

    test('preserves expected model-level client errors', async () => {
      const error = new Error('Sản phẩm chỉ còn 1 trong kho.');
      error.statusCode = 400;
      addProductToCart.mockRejectedValue(error);

      await addItem(
        createRequest({ body: { productId: 12, quantity: 2 } }),
        createResponse(),
        next,
      );

      expectApiError(next, 400, 'Sản phẩm chỉ còn 1 trong kho.');
    });
  });

  describe('updateItem', () => {
    test('rejects invalid quantities before updating the cart', async () => {
      await updateItem(
        createRequest({ params: { productId: '12' }, body: { quantity: 0 } }),
        createResponse(),
        next,
      );

      expectApiError(next, 400, 'Số lượng phải là số nguyên từ 1 đến 99.');
      expect(updateCartItemQuantity).not.toHaveBeenCalled();
    });

    test('returns not found when the product is not in the cart', async () => {
      updateCartItemQuantity.mockResolvedValue(null);

      await updateItem(
        createRequest({ params: { productId: '12' }, body: { quantity: 3 } }),
        createResponse(),
        next,
      );

      expectApiError(next, 404, 'Sản phẩm không có trong giỏ hàng.');
    });

    test('updates quantity and returns the updated cart', async () => {
      const res = createResponse();

      await updateItem(
        createRequest({ params: { productId: '12' }, body: { quantity: 3 } }),
        res,
        next,
      );

      expect(updateCartItemQuantity).toHaveBeenCalledWith(9, 12, 3, 'customer@example.com');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Cập nhật số lượng thành công',
        data: expect.objectContaining({ itemCount: 2, subtotal: 31 }),
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('deleteItem', () => {
    test('rejects an invalid product ID', async () => {
      await deleteItem(
        createRequest({ params: { productId: 'abc' } }),
        createResponse(),
        next,
      );

      expectApiError(next, 400, 'Mã sản phẩm không hợp lệ.');
      expect(removeCartItem).not.toHaveBeenCalled();
    });

    test('returns not found when the product is not in the cart', async () => {
      removeCartItem.mockResolvedValue(null);

      await deleteItem(
        createRequest({ params: { productId: '12' } }),
        createResponse(),
        next,
      );

      expectApiError(next, 404, 'Sản phẩm không có trong giỏ hàng.');
    });

    test('removes the item and returns the updated cart', async () => {
      const res = createResponse();

      await deleteItem(
        createRequest({ params: { productId: '12' } }),
        res,
        next,
      );

      expect(removeCartItem).toHaveBeenCalledWith(9, 12, 'customer@example.com');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Đã xóa sản phẩm khỏi giỏ hàng',
        data: expect.objectContaining({ itemCount: 2, subtotal: 31 }),
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });
});
