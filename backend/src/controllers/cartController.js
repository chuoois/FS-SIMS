const {
  findOrCreateCart,
  getCartItems,
  addProductToCart,
  updateCartItemQuantity,
  removeCartItem,
} = require('../models/CartModel');
const { toProductDTO } = require('../utils/productValidator');
const { ApiError } = require('../utils/ApiError');
const { buildSuccessResponse } = require('../utils/successResponse');

function getCustomerAccountId(req) {
  const customerAccountId = Number(req.user?.sub);
  if (!Number.isInteger(customerAccountId) || customerAccountId <= 0) {
    throw new ApiError(401, 'Tài khoản khách hàng không hợp lệ.');
  }
  return customerAccountId;
}

function getActor(req) {
  return req.user?.email || `USER:${req.user.sub}`;
}

function getErrorForNext(error, detail) {
  if (error instanceof ApiError) return error;

  if (Number.isInteger(error?.statusCode) && error.statusCode >= 400 && error.statusCode < 500) {
    return new ApiError(error.statusCode, error.message);
  }

  const apiError = new ApiError(500, detail);
  apiError.cause = error;
  return apiError;
}

async function buildCartResponse(cart) {
  const items = await getCartItems(cart.cart_id);
  const data = items
    .filter(({ product }) => product)
    .map(({ cartItem, product }) => {
      const productData = toProductDTO(product, { showAvailableStock: true });
      return {
        cartItemId: cartItem.cart_item_id,
        quantity: Number(cartItem.quantity),
        product: productData,
        lineTotal: Number(productData.price) * Number(cartItem.quantity),
      };
    });

  return {
    items: data,
    itemCount: data.reduce((count, item) => count + item.quantity, 0),
    subtotal: data.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}

async function getCart(req, res, next) {
  try {
    const cart = await findOrCreateCart(getCustomerAccountId(req), getActor(req));
    const data = await buildCartResponse(cart);
    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Lấy giỏ hàng thành công',
      data,
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi máy chủ khi lấy giỏ hàng'));
  }
}

async function addItem(req, res, next) {
  try {
    const productId = Number(req.body?.productId);
    const quantity = req.body?.quantity === undefined ? 1 : Number(req.body.quantity);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new ApiError(400, 'Mã sản phẩm không hợp lệ.');
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
      throw new ApiError(400, 'Số lượng phải là số nguyên từ 1 đến 99.');
    }

    const customerAccountId = getCustomerAccountId(req);
    const cart = await addProductToCart(
      customerAccountId,
      productId,
      quantity,
      getActor(req),
    );
    const data = await buildCartResponse(cart);
    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Đã thêm sản phẩm vào giỏ hàng',
      data,
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi máy chủ khi thêm sản phẩm vào giỏ hàng'));
  }
}

async function updateItem(req, res, next) {
  try {
    const productId = Number(req.params.productId);
    const quantity = Number(req.body?.quantity);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new ApiError(400, 'Mã sản phẩm không hợp lệ.');
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
      throw new ApiError(400, 'Số lượng phải là số nguyên từ 1 đến 99.');
    }

    const cart = await updateCartItemQuantity(
      getCustomerAccountId(req),
      productId,
      quantity,
      getActor(req),
    );
    if (!cart) {
      throw new ApiError(404, 'Sản phẩm không có trong giỏ hàng.');
    }

    const data = await buildCartResponse(cart);
    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Cập nhật số lượng thành công',
      data,
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi máy chủ khi cập nhật giỏ hàng'));
  }
}

async function deleteItem(req, res, next) {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new ApiError(400, 'Mã sản phẩm không hợp lệ.');
    }

    const cart = await removeCartItem(
      getCustomerAccountId(req),
      productId,
      getActor(req),
    );
    if (!cart) {
      throw new ApiError(404, 'Sản phẩm không có trong giỏ hàng.');
    }

    const data = await buildCartResponse(cart);
    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Đã xóa sản phẩm khỏi giỏ hàng',
      data,
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi máy chủ khi xóa sản phẩm khỏi giỏ hàng'));
  }
}

module.exports = { getCart, addItem, updateItem, deleteItem };
