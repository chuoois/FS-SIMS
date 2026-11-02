const {
  findOrCreateCart,
  getCartItems,
  addProductToCart,
  updateCartItemQuantity,
  removeCartItem,
} = require('../models/cartRepository');
const { toProductDTO } = require('../utils/productValidator');

function getCustomerAccountId(req) {
  const customerAccountId = Number(req.user?.sub);
  if (!Number.isInteger(customerAccountId) || customerAccountId <= 0) {
    const error = new Error('Tài khoản khách hàng không hợp lệ.');
    error.statusCode = 401;
    throw error;
  }
  return customerAccountId;
}

function getActor(req) {
  return req.user?.email || `USER:${req.user.sub}`;
}

async function buildCartResponse(cart) {
  const items = await getCartItems(cart.cart_id);
  const data = items
    .filter(({ product }) => product)
    .map(({ cartItem, product }) => {
      const productData = toProductDTO(product);
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

async function getCart(req, res) {
  try {
    const cart = await findOrCreateCart(getCustomerAccountId(req), getActor(req));
    return res.status(200).json({
      message: 'Lấy giỏ hàng thành công',
      data: await buildCartResponse(cart),
    });
  } catch (error) {
    console.error('[cartController.getCart]', error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : 'Lỗi máy chủ khi lấy giỏ hàng',
    });
  }
}

async function addItem(req, res) {
  try {
    const productId = Number(req.body.productId);
    const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: 'Mã sản phẩm không hợp lệ.' });
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
      return res.status(400).json({ message: 'Số lượng phải là số nguyên từ 1 đến 99.' });
    }

    const customerAccountId = getCustomerAccountId(req);
    const cart = await addProductToCart(
      customerAccountId,
      productId,
      quantity,
      getActor(req)
    );
    return res.status(200).json({
      message: 'Đã thêm sản phẩm vào giỏ hàng',
      data: await buildCartResponse(cart),
    });
  } catch (error) {
    console.error('[cartController.addItem]', error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : 'Lỗi máy chủ khi thêm sản phẩm vào giỏ hàng',
    });
  }
}

async function updateItem(req, res) {
  try {
    const productId = Number(req.params.productId);
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: 'Mã sản phẩm không hợp lệ.' });
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
      return res.status(400).json({ message: 'Số lượng phải là số nguyên từ 1 đến 99.' });
    }

    const cart = await updateCartItemQuantity(
      getCustomerAccountId(req),
      productId,
      quantity,
      getActor(req)
    );
    if (!cart) {
      return res.status(404).json({ message: 'Sản phẩm không có trong giỏ hàng.' });
    }

    return res.status(200).json({
      message: 'Cập nhật số lượng thành công',
      data: await buildCartResponse(cart),
    });
  } catch (error) {
    console.error('[cartController.updateItem]', error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : 'Lỗi máy chủ khi cập nhật giỏ hàng',
    });
  }
}

async function deleteItem(req, res) {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: 'Mã sản phẩm không hợp lệ.' });
    }

    const cart = await removeCartItem(
      getCustomerAccountId(req),
      productId,
      getActor(req)
    );
    if (!cart) {
      return res.status(404).json({ message: 'Sản phẩm không có trong giỏ hàng.' });
    }

    return res.status(200).json({
      message: 'Đã xóa sản phẩm khỏi giỏ hàng',
      data: await buildCartResponse(cart),
    });
  } catch (error) {
    console.error('[cartController.deleteItem]', error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : 'Lỗi máy chủ khi xóa sản phẩm khỏi giỏ hàng',
    });
  }
}

module.exports = { getCart, addItem, updateItem, deleteItem };
