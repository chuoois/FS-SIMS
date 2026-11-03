const { createReadyOrderRequestFromCart } = require('../models/orderRequestRepository');
const { validateCreateCartRequestInput } = require('../utils/orderRequestValidator');

async function createCartOrderRequest(req, res) {
  const validation = validateCreateCartRequestInput(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ message: validation.error });
  }

  try {
    const request = await createReadyOrderRequestFromCart({
      customerAccountId: Number(req.user.sub),
      contactEmail: req.user.email || null,
      createBy: req.user.email || `USER:${req.user.sub}`,
      ...validation.value,
    });

    return res.status(201).json({
      message: 'Đã gửi yêu cầu mua hàng cho nhân viên bán hàng.',
      data: request,
    });
  } catch (error) {
    console.error('[orderRequestController.createCartOrderRequest]', error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : 'Lỗi máy chủ khi gửi yêu cầu mua hàng.',
    });
  }
}

module.exports = { createCartOrderRequest };
