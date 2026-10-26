
const {
  findProductById,
  findProductByCode,
  getProductsWithPagination,
  countProductUsage,
  createProduct: createProductModel,
  updateProduct: updateProductModel,
  updateProductSetItems,
  deleteProduct: deleteProductModel,
  generateNextProductCode,
  getProductMetadata: getProductMetadataModel,
  getProductStockSummary: getProductStockSummaryModel,
} = require('../models/ProductModel');
const { createProductMaterial: createProductMaterialModel } = require('../models/ProductMaterialModel');
const { createProductColor: createProductColorModel } = require('../models/ProductColorModel');

const {
  validateCreateProductInput,
  validateUpdateProductInput,
  validateProductQueryParams,
  validateCreateMaterialInput,
  validateCreateColorInput,
  toProductDTO,
} = require('../utils/productValidator');

const { deleteImage, getPublicIdFromUrl } = require('../services/cloudinaryService');

/**
 * GET /api/products
 * Lấy danh sách sản phẩm (tìm kiếm, lọc theo danh mục, phòng, chất liệu, màu sắc, tồn kho, phân trang)
 */
async function getProducts(req, res) {
  try {
    const params = validateProductQueryParams(req.query);
    const result = await getProductsWithPagination(params);

    return res.status(200).json({
      message: 'Lấy danh sách sản phẩm thành công',
      data: (result.products || []).map(toProductDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[productController.getProducts]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách sản phẩm',
      error: error.message,
    });
  }
}

/**
 * GET /api/products/metadata
 * Lấy metadata danh mục, phòng, chất liệu, màu sắc phục vụ form tạo/sửa
 */
async function getProductMetadata(req, res) {
  try {
    const metadata = await getProductMetadataModel();
    return res.status(200).json({
      message: 'Lấy thông tin danh mục thành công',
      data: metadata,
    });
  } catch (error) {
    console.error('[productController.getProductMetadata]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy metadata sản phẩm',
      error: error.message,
    });
  }
}

/**
 * GET /api/products/stock-summary
 * Xem tổng quan tồn kho sản phẩm
 */
async function getProductStockSummary(req, res) {
  try {
    const summary = await getProductStockSummaryModel();
    return res.status(200).json({
      message: 'Lấy thống kê tồn kho sản phẩm thành công',
      data: summary,
    });
  } catch (error) {
    console.error('[productController.getProductStockSummary]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy thống kê tồn kho sản phẩm',
      error: error.message,
    });
  }
}

/**
 * GET /api/products/next-code
 * Lấy mã sản phẩm tự sinh tiếp theo
 */
async function getNextProductCode(req, res) {
  try {
    const nextCode = await generateNextProductCode();
    return res.status(200).json({
      message: 'Lấy mã sản phẩm tiếp theo thành công',
      data: { nextCode },
    });
  } catch (error) {
    console.error('[productController.getNextProductCode]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi sinh mã sản phẩm',
      error: error.message,
    });
  }
}

/**
 * GET /api/products/:id
 * Xem chi tiết 1 sản phẩm
 */
async function getProductById(req, res) {
  try {
    const productId = req.params.id;
    const product = await findProductById(productId);

    if (!product) {
      return res.status(404).json({
        message: 'Không tìm thấy sản phẩm yêu cầu',
      });
    }

    const usage = await countProductUsage(productId);

    return res.status(200).json({
      message: 'Lấy chi tiết sản phẩm thành công',
      data: toProductDTO(product),
      usage,
    });
  } catch (error) {
    console.error('[productController.getProductById]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy chi tiết sản phẩm',
      error: error.message,
    });
  }
}

/**
 * POST /api/products
 * Thêm mới sản phẩm (hỗ trợ upload 1 ảnh lên Cloudinary)
 */
async function createProduct(req, res) {
  try {
    // Nếu có file upload từ multer-cloudinary
    const imageUrl = req.file ? (req.file.path || req.file.secure_url) : (req.body.image_url || null);

    // Tự động tạo chất liệu mới nếu truyền material_name mà chưa có material_id hợp lệ
    if ((!req.body.material_id || isNaN(parseInt(req.body.material_id, 10))) && req.body.material_name) {
      const newMat = await createProductMaterialModel({
        material_name: req.body.material_name,
        createby: req.user?.email || 'SYSTEM',
      });
      req.body.material_id = newMat.material_id;
    }

    // Tự động tạo màu sắc mới nếu truyền color_name mà chưa có color_id hợp lệ
    if ((!req.body.color_id || isNaN(parseInt(req.body.color_id, 10))) && req.body.color_name) {
      const newCol = await createProductColorModel({
        color_name: req.body.color_name,
        hex_value: req.body.hex_value,
        createby: req.user?.email || 'SYSTEM',
      });
      req.body.color_id = newCol.color_id;
    }

    const validation = validateCreateProductInput({
      ...req.body,
      image_url: imageUrl,
    });

    if (!validation.isValid) {
      // Nếu có upload ảnh mà validation fail, xóa ảnh vừa up trên Cloudinary
      if (req.file) {
        const publicId = getPublicIdFromUrl(imageUrl);
        await deleteImage(publicId).catch(() => null);
      }
      return res.status(400).json({
        message: validation.error,
      });
    }

    let productData = { ...validation.value };

    // Tự sinh mã nếu chưa có
    if (!productData.product_code) {
      productData.product_code = await generateNextProductCode();
    } else {
      // Kiểm tra trùng mã
      const existing = await findProductByCode(productData.product_code);
      if (existing) {
        if (req.file) {
          const publicId = getPublicIdFromUrl(imageUrl);
          await deleteImage(publicId).catch(() => null);
        }
        return res.status(409).json({
          message: `Mã sản phẩm "${productData.product_code}" đã tồn tại trên hệ thống`,
        });
      }
    }

    productData.createby = req.user?.email || 'SYSTEM';

    const newProduct = await createProductModel(productData);
    if (productData.set_items && productData.product_type === 'SET') {
      await updateProductSetItems(newProduct.product_id, productData.set_items, productData.createby);
    }
    const createdWithAssociations = await findProductById(newProduct.product_id);

    return res.status(201).json({
      message: 'Thêm mới sản phẩm thành công',
      data: toProductDTO(createdWithAssociations || newProduct),
    });
  } catch (error) {
    console.error('[productController.createProduct]', error);
    if (req.file) {
      const publicId = getPublicIdFromUrl(req.file.path || req.file.secure_url);
      await deleteImage(publicId).catch(() => null);
    }
    return res.status(500).json({
      message: 'Lỗi máy chủ khi thêm sản phẩm',
      error: error.message,
    });
  }
}

/**
 * PUT /api/products/:id
 * Cập nhật thông tin sản phẩm (có thể upload ảnh mới thay thế)
 */
async function updateProduct(req, res) {
  try {
    const productId = req.params.id;
    const currentProduct = await findProductById(productId);

    if (!currentProduct) {
      if (req.file) {
        const publicId = getPublicIdFromUrl(req.file.path || req.file.secure_url);
        await deleteImage(publicId).catch(() => null);
      }
      return res.status(404).json({
        message: 'Không tìm thấy sản phẩm cần cập nhật',
      });
    }

    let imageUrl = currentProduct.image_url;
    let oldImageUrl = currentProduct.image_url;

    if (req.file) {
      imageUrl = req.file.path || req.file.secure_url;
    } else if (req.body.image_url !== undefined) {
      imageUrl = req.body.image_url;
    }

    // Tự động tạo chất liệu mới nếu truyền material_name khi update
    if ((!req.body.material_id || isNaN(parseInt(req.body.material_id, 10))) && req.body.material_name) {
      const newMat = await createProductMaterialModel({
        material_name: req.body.material_name,
        createby: req.user?.email || 'SYSTEM',
      });
      req.body.material_id = newMat.material_id;
    }

    // Tự động tạo màu sắc mới nếu truyền color_name khi update
    if ((!req.body.color_id || isNaN(parseInt(req.body.color_id, 10))) && req.body.color_name) {
      const newCol = await createProductColorModel({
        color_name: req.body.color_name,
        hex_value: req.body.hex_value,
        createby: req.user?.email || 'SYSTEM',
      });
      req.body.color_id = newCol.color_id;
    }

    const validation = validateUpdateProductInput({
      ...req.body,
      image_url: imageUrl,
    });

    if (!validation.isValid) {
      if (req.file) {
        const publicId = getPublicIdFromUrl(imageUrl);
        await deleteImage(publicId).catch(() => null);
      }
      return res.status(400).json({
        message: validation.error,
      });
    }

    const updateData = {
      ...validation.value,
      modifieby: req.user?.email || 'SYSTEM',
    };

    await updateProductModel(productId, updateData);

    if (updateData.set_items !== undefined) {
      await updateProductSetItems(productId, updateData.set_items, updateData.modifieby);
    }

    // Nếu upload ảnh mới thành công và có ảnh cũ trên Cloudinary, xóa ảnh cũ
    if (req.file && oldImageUrl && oldImageUrl !== imageUrl) {
      const oldPublicId = getPublicIdFromUrl(oldImageUrl);
      await deleteImage(oldPublicId).catch(() => null);
    }

    const updated = await findProductById(productId);

    return res.status(200).json({
      message: 'Cập nhật thông tin sản phẩm thành công',
      data: toProductDTO(updated),
    });
  } catch (error) {
    console.error('[productController.updateProduct]', error);
    if (req.file) {
      const publicId = getPublicIdFromUrl(req.file.path || req.file.secure_url);
      await deleteImage(publicId).catch(() => null);
    }
    return res.status(500).json({
      message: 'Lỗi máy chủ khi cập nhật sản phẩm',
      error: error.message,
    });
  }
}

/**
 * DELETE /api/products/:id
 * Xóa sản phẩm (chỉ cho phép khi sản phẩm chưa được sử dụng trong đơn hàng, hợp đồng, giỏ hàng...)
 */
async function deleteProduct(req, res) {
  try {
    const productId = req.params.id;
    const currentProduct = await findProductById(productId);

    if (!currentProduct) {
      return res.status(404).json({
        message: 'Không tìm thấy sản phẩm cần xóa',
      });
    }

    // Kiểm tra ràng buộc sử dụng
    const usage = await countProductUsage(productId);
    if (usage.totalUsage > 0) {
      return res.status(400).json({
        message:
          'Không thể xóa sản phẩm do đã có đơn hàng, hợp đồng hoặc giao dịch liên quan. Bạn có thể chuyển trạng thái sang "Ngừng kinh doanh" (INACTIVE).',
        usage,
      });
    }

    // Xóa ảnh trên Cloudinary nếu có
    if (currentProduct.image_url) {
      const publicId = getPublicIdFromUrl(currentProduct.image_url);
      await deleteImage(publicId).catch(() => null);
    }

    await deleteProductModel(productId);

    return res.status(200).json({
      message: 'Xóa sản phẩm thành công',
    });
  } catch (error) {
    console.error('[productController.deleteProduct]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi xóa sản phẩm',
      error: error.message,
    });
  }
}

/**
 * POST /api/products/materials
 * Thêm mới chất liệu
 */
async function createProductMaterial(req, res) {
  try {
    const validation = validateCreateMaterialInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }
    const createby = req.user?.email || 'SYSTEM';
    const material = await createProductMaterialModel({
      ...validation.value,
      createby,
    });
    return res.status(201).json({
      message: 'Thêm mới chất liệu thành công',
      data: material,
    });
  } catch (error) {
    console.error('[productController.createProductMaterial]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi tạo chất liệu mới',
      error: error.message,
    });
  }
}

/**
 * POST /api/products/colors
 * Thêm mới màu sắc
 */
async function createProductColor(req, res) {
  try {
    const validation = validateCreateColorInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }
    const createby = req.user?.email || 'SYSTEM';
    const color = await createProductColorModel({
      ...validation.value,
      createby,
    });
    return res.status(201).json({
      message: 'Thêm mới màu sắc thành công',
      data: color,
    });
  } catch (error) {
    console.error('[productController.createProductColor]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi tạo màu sắc mới',
      error: error.message,
    });
  }
}

module.exports = {
  getProducts,
  getProductMetadata,
  getProductStockSummary,
  getNextProductCode,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductMaterial,
  createProductColor,
};
