// =========================================================
// rawMaterialController.js
// Controller Quản lý Nguyên Vật Liệu (Manage Raw Materials)
// Kiến trúc MVC: routes/ -> controllers/ -> models/
// Controller nhận req/res, gọi model, KHÔNG viết query SQL tại đây
// =========================================================

const {
  findRawMaterialById,
  findRawMaterialByCode,
  getRawMaterialsWithPagination,
  countRawMaterialUsage,
  createRawMaterial: createRawMaterialModel,
  updateRawMaterial: updateRawMaterialModel,
  deleteRawMaterial: deleteRawMaterialModel,
  generateNextRawMaterialCode,
  getRawMaterialStockSummary: getRawMaterialStockSummaryModel,
} = require('../models/RawMaterialModel');

const {
  validateCreateRawMaterialInput,
  validateUpdateRawMaterialInput,
  validateRawMaterialQueryParams,
  toRawMaterialDTO,
} = require('../utils/rawMaterialValidator');

/**
 * GET /api/raw-materials
 * Lấy danh sách nguyên vật liệu (tìm kiếm, lọc theo chất liệu, trạng thái, cảnh báo tồn kho, phân trang)
 */
async function getRawMaterials(req, res) {
  try {
    const params = validateRawMaterialQueryParams(req.query);
    const result = await getRawMaterialsWithPagination(params);

    return res.status(200).json({
      message: 'Lấy danh sách nguyên vật liệu thành công',
      data: (result.materials || []).map(toRawMaterialDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[rawMaterialController.getRawMaterials]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách nguyên vật liệu',
      error: error.message,
    });
  }
}

/**
 * GET /api/raw-materials/stock-summary
 * Xem tổng quan tồn kho và cảnh báo tồn thấp của nguyên vật liệu
 */
async function getRawMaterialStockSummary(req, res) {
  try {
    const summary = await getRawMaterialStockSummaryModel();
    return res.status(200).json({
      message: 'Lấy thống kê tồn kho nguyên vật liệu thành công',
      data: summary,
    });
  } catch (error) {
    console.error('[rawMaterialController.getRawMaterialStockSummary]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy thống kê tồn kho nguyên vật liệu',
      error: error.message,
    });
  }
}

/**
 * GET /api/raw-materials/next-code
 * Lấy mã nguyên vật liệu tự sinh tiếp theo
 */
async function getNextRawMaterialCode(req, res) {
  try {
    const nextCode = await generateNextRawMaterialCode();
    return res.status(200).json({
      message: 'Lấy mã nguyên vật liệu tiếp theo thành công',
      data: { nextCode },
    });
  } catch (error) {
    console.error('[rawMaterialController.getNextRawMaterialCode]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi sinh mã nguyên vật liệu',
      error: error.message,
    });
  }
}

/**
 * GET /api/raw-materials/:id
 * Xem chi tiết 1 nguyên vật liệu
 */
async function getRawMaterialById(req, res) {
  try {
    const rawMaterialId = req.params.id;
    const material = await findRawMaterialById(rawMaterialId);

    if (!material) {
      return res.status(404).json({
        message: 'Không tìm thấy nguyên vật liệu yêu cầu',
      });
    }

    const usage = await countRawMaterialUsage(rawMaterialId);

    return res.status(200).json({
      message: 'Lấy chi tiết nguyên vật liệu thành công',
      data: toRawMaterialDTO(material),
      usage,
    });
  } catch (error) {
    console.error('[rawMaterialController.getRawMaterialById]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy chi tiết nguyên vật liệu',
      error: error.message,
    });
  }
}

/**
 * POST /api/raw-materials
 * Thêm mới nguyên vật liệu
 */
async function createRawMaterial(req, res) {
  try {
    const validation = validateCreateRawMaterialInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.error,
      });
    }

    let materialData = { ...validation.value };

    // Tự sinh mã nếu chưa có
    if (!materialData.raw_code) {
      materialData.raw_code = await generateNextRawMaterialCode();
    } else {
      // Kiểm tra trùng mã
      const existing = await findRawMaterialByCode(materialData.raw_code);
      if (existing) {
        return res.status(409).json({
          message: `Mã nguyên vật liệu "${materialData.raw_code}" đã tồn tại trên hệ thống`,
        });
      }
    }

    materialData.createby = req.user?.email || 'SYSTEM';

    const newMaterial = await createRawMaterialModel(materialData);
    const createdWithAssociations = await findRawMaterialById(newMaterial.raw_material_id);

    return res.status(201).json({
      message: 'Thêm mới nguyên vật liệu thành công',
      data: toRawMaterialDTO(createdWithAssociations || newMaterial),
    });
  } catch (error) {
    console.error('[rawMaterialController.createRawMaterial]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi thêm nguyên vật liệu',
      error: error.message,
    });
  }
}

/**
 * PUT /api/raw-materials/:id
 * Cập nhật thông tin nguyên vật liệu
 */
async function updateRawMaterial(req, res) {
  try {
    const rawMaterialId = req.params.id;
    const currentMaterial = await findRawMaterialById(rawMaterialId);

    if (!currentMaterial) {
      return res.status(404).json({
        message: 'Không tìm thấy nguyên vật liệu cần cập nhật',
      });
    }

    const validation = validateUpdateRawMaterialInput(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        message: validation.error,
      });
    }

    const updateData = {
      ...validation.value,
      modifieby: req.user?.email || 'SYSTEM',
    };

    await updateRawMaterialModel(rawMaterialId, updateData);
    const updated = await findRawMaterialById(rawMaterialId);

    return res.status(200).json({
      message: 'Cập nhật thông tin nguyên vật liệu thành công',
      data: toRawMaterialDTO(updated),
    });
  } catch (error) {
    console.error('[rawMaterialController.updateRawMaterial]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi cập nhật nguyên vật liệu',
      error: error.message,
    });
  }
}

/**
 * DELETE /api/raw-materials/:id
 * Xóa nguyên vật liệu (chỉ cho phép khi chưa phát sinh phiếu nhập/xuất kho)
 */
async function deleteRawMaterial(req, res) {
  try {
    const rawMaterialId = req.params.id;
    const currentMaterial = await findRawMaterialById(rawMaterialId);

    if (!currentMaterial) {
      return res.status(404).json({
        message: 'Không tìm thấy nguyên vật liệu cần xóa',
      });
    }

    // Kiểm tra ràng buộc sử dụng
    const usage = await countRawMaterialUsage(rawMaterialId);
    if (usage.totalUsage > 0) {
      return res.status(400).json({
        message:
          'Không thể xóa nguyên vật liệu do đã có phiếu nhập kho hoặc phiếu xuất kho liên quan. Bạn có thể chuyển trạng thái sang "INACTIVE".',
        usage,
      });
    }

    await deleteRawMaterialModel(rawMaterialId);

    return res.status(200).json({
      message: 'Xóa nguyên vật liệu thành công',
    });
  } catch (error) {
    console.error('[rawMaterialController.deleteRawMaterial]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi xóa nguyên vật liệu',
      error: error.message,
    });
  }
}

module.exports = {
  getRawMaterials,
  getRawMaterialStockSummary,
  getNextRawMaterialCode,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
};
