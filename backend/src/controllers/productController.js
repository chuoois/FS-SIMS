const {
  getProductsWithPagination,
  findProductById,
  getProductMetadata: getProductMetadataModel,
} = require('../models/ProductModel');
const {
  validateProductQueryParams,
  toProductDTO,
} = require('../utils/productValidator');
const { ApiError } = require('../utils/ApiError');
const { buildSuccessResponse } = require('../utils/successResponse');

function getErrorForNext(error, detail) {
  if (error instanceof ApiError) return error;

  const apiError = new ApiError(500, detail);
  apiError.cause = error;
  return apiError;
}

async function getProducts(req, res, next) {
  try {
    const params = validateProductQueryParams(req.query);
    const queryParams = {
      ...params,
      status: params.status || 'ACTIVE',
    };
    const result = await getProductsWithPagination(queryParams);

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Lấy danh sách sản phẩm thành công',
      data: (result.products || []).map(toProductDTO),
      meta: {
        page: result.currentPage,
        limit: result.itemsPerPage,
        total: result.totalItems,
        totalPages: result.totalPages,
      },
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi máy chủ khi lấy danh sách sản phẩm'));
  }
}

async function getProductById(req, res, next) {
  try {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
      throw new ApiError(400, 'Mã sản phẩm không hợp lệ.');
    }

    const product = await findProductById(productId);
    const data = toProductDTO(product);
    if (!data || data.status !== 'ACTIVE') {
      throw new ApiError(404, 'Không tìm thấy sản phẩm yêu cầu.');
    }

    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Lấy chi tiết sản phẩm thành công',
      data,
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi máy chủ khi lấy chi tiết sản phẩm'));
  }
}

async function getProductMetadata(req, res, next) {
  try {
    const metadata = await getProductMetadataModel();
    return res.status(200).json(buildSuccessResponse({
      status: 200,
      message: 'Lấy metadata sản phẩm thành công',
      data: metadata,
      req,
    }));
  } catch (error) {
    return next(getErrorForNext(error, 'Lỗi máy chủ khi lấy metadata sản phẩm'));
  }
}

module.exports = {
  getProducts,
  getProductById,
  getProductMetadata,
};
