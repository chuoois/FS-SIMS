// =========================================================
// materialExportController.js
// Controller Quản lý Phiếu Xuất Kho Nguyên Vật Liệu (Manage Material Export Slips)
// Tuân thủ kiến trúc MVC chuẩn:
// routes/ -> controllers/ -> models/
// Không viết SQL/query Sequelize trực tiếp tại controller
// =========================================================

const {
  findIssueById,
  findIssueByCode,
  getIssuesWithPagination,
  getIssueStatistics,
  generateNextIssueCode,
  createIssueWithItems,
  updateIssueWithItems,
  deleteIssue,
} = require('../models/MaterialIssueModel');

const {
  findProductionOrderById,
  getProductionOrdersForExport,
} = require('../models/ProductionOrderModel');

const { findRawMaterialById } = require('../models/RawMaterialModel');

const {
  validateCreateExportInput,
  validateUpdateExportInput,
  validateExportQueryParams,
  toExportDTO,
  toExportDetailDTO,
} = require('../utils/materialExportValidator');

/**
 * GET /api/material-exports
 * Lấy danh sách phiếu xuất kho có tìm kiếm, lọc trạng thái, lệnh gia công, ngày và phân trang
 */
async function getMaterialExports(req, res) {
  try {
    const params = validateExportQueryParams(req.query);
    const result = await getIssuesWithPagination(params);

    return res.status(200).json({
      message: 'Lấy danh sách phiếu xuất kho thành công',
      data: (result.issues || []).map(toExportDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[materialExportController.getMaterialExports]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách phiếu xuất kho',
      error: error.message,
    });
  }
}

/**
 * GET /api/material-exports/summary
 * Thống kê tổng quan phiếu xuất kho
 */
async function getMaterialExportSummary(req, res) {
  try {
    const summary = await getIssueStatistics();
    return res.status(200).json({
      message: 'Lấy thống kê phiếu xuất kho thành công',
      summary,
    });
  } catch (error) {
    console.error('[materialExportController.getMaterialExportSummary]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy thống kê phiếu xuất kho',
      error: error.message,
    });
  }
}

/**
 * GET /api/material-exports/next-code
 * Tự động tạo mã phiếu xuất tiếp theo cho ngày được chọn (hoặc hôm nay)
 */
async function getNextMaterialExportCode(req, res) {
  try {
    const date = req.query.date;
    const nextCode = await generateNextIssueCode(date);
    return res.status(200).json({
      message: 'Lấy mã phiếu xuất tiếp theo thành công',
      nextCode,
    });
  } catch (error) {
    console.error('[materialExportController.getNextMaterialExportCode]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi tạo mã phiếu xuất',
      error: error.message,
    });
  }
}

/**
 * GET /api/material-exports/production-orders
 * Lấy danh sách lệnh gia công khả dụng để chọn khi lập phiếu xuất kho
 */
async function getProductionOrdersList(req, res) {
  try {
    const orders = await getProductionOrdersForExport();
    return res.status(200).json({
      message: 'Lấy danh sách lệnh gia công thành công',
      data: orders,
    });
  } catch (error) {
    console.error('[materialExportController.getProductionOrdersList]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách lệnh gia công',
      error: error.message,
    });
  }
}

/**
 * GET /api/material-exports/:id
 * Lấy chi tiết 1 phiếu xuất kho kèm lệnh gia công, người xuất và danh sách mặt hàng
 */
async function getMaterialExportById(req, res) {
  const { id } = req.params;
  const issueId = Number(id);

  if (!issueId || isNaN(issueId) || issueId <= 0) {
    return res.status(400).json({ message: 'ID phiếu xuất kho không hợp lệ.' });
  }

  try {
    const issue = await findIssueById(issueId);
    if (!issue) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu xuất kho.' });
    }

    return res.status(200).json({
      message: 'Lấy chi tiết phiếu xuất kho thành công',
      issue: toExportDetailDTO(issue),
    });
  } catch (error) {
    console.error('[materialExportController.getMaterialExportById]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy chi tiết phiếu xuất kho',
      error: error.message,
    });
  }
}

/**
 * POST /api/material-exports
 * Tạo mới phiếu xuất kho nguyên vật liệu
 */
async function createMaterialExport(req, res) {
  try {
    const validation = validateCreateExportInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const {
      issue_code,
      production_id,
      issue_date,
      status,
      issued_by,
      note,
      items,
    } = validation.value;

    // 1. Kiểm tra lệnh gia công có tồn tại
    const prodOrder = await findProductionOrderById(production_id);
    if (!prodOrder) {
      return res.status(400).json({
        message: `Lệnh gia công với ID ${production_id} không tồn tại trong hệ thống.`,
      });
    }

    // 2. Kiểm tra tất cả nguyên vật liệu có tồn tại & đang ACTIVE
    for (const item of items) {
      const raw = await findRawMaterialById(item.raw_material_id);
      if (!raw) {
        return res.status(400).json({
          message: `Nguyên vật liệu với ID ${item.raw_material_id} không tồn tại trong hệ thống.`,
        });
      }
      if (raw.status !== 'ACTIVE') {
        return res.status(400).json({
          message: `Nguyên vật liệu '${raw.raw_name}' đang ở trạng thái ngừng hoạt động (${raw.status}), không thể xuất kho.`,
        });
      }
      // Nếu xác nhận xuất kho ngay (CONFIRMED) -> kiểm tra tồn kho đủ không
      if (status === 'CONFIRMED' && raw.quantity_on_hand < item.quantity) {
        return res.status(400).json({
          message: `Không đủ tồn kho để xuất: '${raw.raw_name}' hiện chỉ còn tồn ${raw.quantity_on_hand} (${raw.unit || 'đơn vị'}), không đủ để xuất ${item.quantity}.`,
        });
      }
    }

    // 3. Xử lý mã phiếu xuất
    let finalIssueCode = issue_code;
    if (finalIssueCode) {
      const existing = await findIssueByCode(finalIssueCode);
      if (existing) {
        return res.status(409).json({
          message: `Mã phiếu xuất kho '${finalIssueCode}' đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`,
        });
      }
    } else {
      finalIssueCode = await generateNextIssueCode(issue_date);
    }

    // 4. Chuẩn bị dữ liệu tạo
    const userSub = req.user ? req.user.sub : null;
    const userEmail = req.user ? req.user.email : null;

    const issueData = {
      issue_code: finalIssueCode,
      production_id,
      issue_date,
      status,
      issued_by: issued_by || userSub,
      note,
      createby: userEmail || 'system',
    };

    const createdIssue = await createIssueWithItems({ issueData, items });

    return res.status(201).json({
      message:
        status === 'CONFIRMED'
          ? 'Tạo phiếu xuất và xác nhận xuất kho thành công. Tồn kho đã được trừ.'
          : 'Tạo phiếu xuất kho nháp thành công.',
      issue: toExportDetailDTO(createdIssue),
    });
  } catch (error) {
    console.error('[materialExportController.createMaterialExport]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi tạo phiếu xuất kho',
      error: error.message,
    });
  }
}

/**
 * PUT /api/material-exports/:id
 * Cập nhật thông tin phiếu xuất kho (chỉ cho phép khi ở trạng thái DRAFT)
 */
async function updateMaterialExport(req, res) {
  const { id } = req.params;
  const issueId = Number(id);

  if (!issueId || isNaN(issueId) || issueId <= 0) {
    return res.status(400).json({ message: 'ID phiếu xuất kho không hợp lệ.' });
  }

  try {
    const existing = await findIssueById(issueId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu xuất kho.' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({
        message: 'Chỉ được phép chỉnh sửa phiếu xuất kho khi ở trạng thái nháp (DRAFT).',
      });
    }

    const validation = validateUpdateExportInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const {
      production_id,
      issue_date,
      status,
      issued_by,
      note,
      items,
    } = validation.value;

    // 1. Kiểm tra lệnh gia công nếu có thay đổi
    if (production_id !== undefined && production_id !== existing.production_id) {
      const prodOrder = await findProductionOrderById(production_id);
      if (!prodOrder) {
        return res.status(400).json({
          message: `Lệnh gia công với ID ${production_id} không tồn tại trong hệ thống.`,
        });
      }
    }

    // 2. Kiểm tra nguyên vật liệu nếu có cập nhật danh sách mặt hàng
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const raw = await findRawMaterialById(item.raw_material_id);
        if (!raw) {
          return res.status(400).json({
            message: `Nguyên vật liệu với ID ${item.raw_material_id} không tồn tại trong hệ thống.`,
          });
        }
        if (raw.status !== 'ACTIVE') {
          return res.status(400).json({
            message: `Nguyên vật liệu '${raw.raw_name}' đang ở trạng thái ngừng hoạt động (${raw.status}), không thể xuất kho.`,
          });
        }
        if (status === 'CONFIRMED' && raw.quantity_on_hand < item.quantity) {
          return res.status(400).json({
            message: `Không đủ tồn kho để xuất: '${raw.raw_name}' hiện chỉ còn tồn ${raw.quantity_on_hand} (${raw.unit || 'đơn vị'}), không đủ để xuất ${item.quantity}.`,
          });
        }
      }
    }

    const userEmail = req.user ? req.user.email : null;
    const issueData = {
      production_id,
      issue_date,
      status,
      issued_by,
      note,
      modifieby: userEmail || 'system',
    };

    const updated = await updateIssueWithItems(issueId, {
      issueData,
      items,
    });

    return res.status(200).json({
      message:
        status === 'CONFIRMED'
          ? 'Cập nhật và xác nhận xuất kho thành công. Số lượng tồn kho đã được trừ.'
          : 'Cập nhật phiếu xuất kho nháp thành công.',
      issue: toExportDetailDTO(updated),
    });
  } catch (error) {
    console.error('[materialExportController.updateMaterialExport]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi cập nhật phiếu xuất kho',
      error: error.message,
    });
  }
}

/**
 * POST /api/material-exports/:id/confirm
 * Xác nhận xuất kho phiếu nháp (DRAFT -> CONFIRMED), trừ tồn kho nguyên vật liệu
 */
async function confirmMaterialExport(req, res) {
  const { id } = req.params;
  const issueId = Number(id);

  if (!issueId || isNaN(issueId) || issueId <= 0) {
    return res.status(400).json({ message: 'ID phiếu xuất kho không hợp lệ.' });
  }

  try {
    const existing = await findIssueById(issueId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu xuất kho.' });
    }

    if (existing.status === 'CONFIRMED') {
      return res.status(400).json({ message: 'Phiếu xuất kho đã được xác nhận trước đó.' });
    }

    if (existing.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Không thể xác nhận phiếu xuất kho đã hủy.' });
    }

    // Kiểm tra tồn kho của tất cả mặt hàng trước khi gọi update
    for (const item of (existing.items || [])) {
      const raw = await findRawMaterialById(item.raw_material_id);
      if (!raw || raw.quantity_on_hand < item.quantity) {
        return res.status(400).json({
          message: `Không đủ tồn kho để xuất: '${raw ? raw.raw_name : item.raw_material_id}' hiện chỉ còn tồn ${raw ? raw.quantity_on_hand : 0}, không đủ để xuất ${item.quantity}.`,
        });
      }
    }

    const userEmail = req.user ? req.user.email : null;
    const updated = await updateIssueWithItems(issueId, {
      issueData: {
        status: 'CONFIRMED',
        modifieby: userEmail || 'system',
      },
    });

    return res.status(200).json({
      message: 'Xác nhận xuất kho thành công. Số lượng tồn kho nguyên vật liệu đã được trừ.',
      issue: toExportDetailDTO(updated),
    });
  } catch (error) {
    console.error('[materialExportController.confirmMaterialExport]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi xác nhận phiếu xuất kho',
      error: error.message,
    });
  }
}

/**
 * POST /api/material-exports/:id/cancel
 * Hủy phiếu xuất kho (chỉ cho phép khi ở trạng thái DRAFT)
 */
async function cancelMaterialExport(req, res) {
  const { id } = req.params;
  const issueId = Number(id);

  if (!issueId || isNaN(issueId) || issueId <= 0) {
    return res.status(400).json({ message: 'ID phiếu xuất kho không hợp lệ.' });
  }

  try {
    const existing = await findIssueById(issueId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu xuất kho.' });
    }

    if (existing.status === 'CONFIRMED') {
      return res.status(400).json({
        message: 'Phiếu xuất kho đã xác nhận (CONFIRMED) không thể hủy.',
      });
    }

    if (existing.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Phiếu xuất kho đã ở trạng thái hủy.' });
    }

    const userEmail = req.user ? req.user.email : null;
    const updated = await updateIssueWithItems(issueId, {
      issueData: {
        status: 'CANCELLED',
        note: req.body.note !== undefined ? req.body.note : existing.note,
        modifieby: userEmail || 'system',
      },
    });

    return res.status(200).json({
      message: 'Hủy phiếu xuất kho thành công.',
      issue: toExportDetailDTO(updated),
    });
  } catch (error) {
    console.error('[materialExportController.cancelMaterialExport]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi hủy phiếu xuất kho',
      error: error.message,
    });
  }
}

/**
 * DELETE /api/material-exports/:id
 * Xóa phiếu xuất kho (chỉ cho phép khi ở trạng thái DRAFT hoặc CANCELLED)
 */
async function deleteMaterialExport(req, res) {
  const { id } = req.params;
  const issueId = Number(id);

  if (!issueId || isNaN(issueId) || issueId <= 0) {
    return res.status(400).json({ message: 'ID phiếu xuất kho không hợp lệ.' });
  }

  try {
    const existing = await findIssueById(issueId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu xuất kho.' });
    }

    if (existing.status === 'CONFIRMED') {
      return res.status(400).json({
        message: 'Không thể xóa phiếu xuất kho đã xác nhận (CONFIRMED).',
      });
    }

    await deleteIssue(issueId);

    return res.status(200).json({
      message: 'Xóa phiếu xuất kho thành công.',
    });
  } catch (error) {
    console.error('[materialExportController.deleteMaterialExport]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi xóa phiếu xuất kho',
      error: error.message,
    });
  }
}

module.exports = {
  getMaterialExports,
  getMaterialExportSummary,
  getNextMaterialExportCode,
  getProductionOrdersList,
  getMaterialExportById,
  createMaterialExport,
  updateMaterialExport,
  confirmMaterialExport,
  cancelMaterialExport,
  deleteMaterialExport,
};
