// =========================================================
// purchaseReceiptController.js
// Controller Quản lý Phiếu Nhập Kho (Manage Purchase Receipts)
// Tuân thủ kiến trúc MVC chuẩn:
// routes/ -> controllers/ -> models/
// Không viết SQL/query Sequelize trực tiếp tại controller
// =========================================================

const {
  findReceiptById,
  findReceiptByCode,
  getReceiptsWithPagination,
  getReceiptStatistics,
  generateNextReceiptCode,
  createReceiptWithItems,
  updateReceiptWithItems,
  deleteReceipt: deleteReceiptModel,
} = require('../models/MaterialReceiptModel');

const { validateSupplierForReceipt } = require('../models/SupplierModel');
const { findRawMaterialById } = require('../models/RawMaterialModel');

const {
  validateCreateReceiptInput,
  validateUpdateReceiptInput,
  validateReceiptQueryParams,
  toReceiptDTO,
  toReceiptDetailDTO,
} = require('../utils/purchaseReceiptValidator');

/**
 * GET /api/purchase-receipts
 * Lấy danh sách phiếu nhập có tìm kiếm, lọc trạng thái, nhà cung cấp, ngày và phân trang
 */
async function getReceipts(req, res) {
  try {
    const params = validateReceiptQueryParams(req.query);
    const result = await getReceiptsWithPagination(params);

    return res.status(200).json({
      message: 'Lấy danh sách phiếu nhập thành công',
      data: (result.receipts || []).map(toReceiptDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[purchaseReceiptController.getReceipts]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách phiếu nhập',
      error: error.message,
    });
  }
}

/**
 * GET /api/purchase-receipts/summary
 * Thống kê tổng quan phiếu nhập (tổng số lượng, số phiếu nháp, đã xác nhận, đã hủy, tổng tiền đã nhập)
 */
async function getReceiptSummary(req, res) {
  try {
    const summary = await getReceiptStatistics();
    return res.status(200).json({
      message: 'Lấy thống kê phiếu nhập thành công',
      summary,
    });
  } catch (error) {
    console.error('[purchaseReceiptController.getReceiptSummary]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy thống kê phiếu nhập',
      error: error.message,
    });
  }
}

/**
 * GET /api/purchase-receipts/next-code
 * Tự động tạo mã phiếu nhập tiếp theo cho ngày được chọn (hoặc hôm nay)
 */
async function getNextReceiptCode(req, res) {
  try {
    const date = req.query.date;
    const nextCode = await generateNextReceiptCode(date);
    return res.status(200).json({
      message: 'Lấy mã phiếu nhập tiếp theo thành công',
      nextCode,
    });
  } catch (error) {
    console.error('[purchaseReceiptController.getNextReceiptCode]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi tạo mã phiếu nhập',
      error: error.message,
    });
  }
}

/**
 * GET /api/purchase-receipts/:id
 * Lấy chi tiết 1 phiếu nhập kèm nhà cung cấp, người lập/nhận và danh sách các mặt hàng
 */
async function getReceiptById(req, res) {
  const { id } = req.params;
  const receiptId = Number(id);

  if (!receiptId || isNaN(receiptId) || receiptId <= 0) {
    return res.status(400).json({ message: 'ID phiếu nhập không hợp lệ.' });
  }

  try {
    const receipt = await findReceiptById(receiptId);
    if (!receipt) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu nhập.' });
    }

    return res.status(200).json({
      message: 'Lấy chi tiết phiếu nhập thành công',
      receipt: toReceiptDetailDTO(receipt),
    });
  } catch (error) {
    console.error('[purchaseReceiptController.getReceiptById]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy chi tiết phiếu nhập',
      error: error.message,
    });
  }
}

/**
 * POST /api/purchase-receipts
 * Tạo mới phiếu nhập nguyên vật liệu
 */
async function createReceipt(req, res) {
  try {
    const validation = validateCreateReceiptInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const {
      receipt_code,
      supplier_id,
      receipt_date,
      status,
      received_by,
      note,
      items,
    } = validation.value;

    // 1. Kiểm tra nhà cung cấp hợp lệ & đang ACTIVE
    const supplierCheck = await validateSupplierForReceipt(supplier_id);
    if (!supplierCheck.isValid) {
      return res.status(400).json({ message: supplierCheck.message });
    }

    // 2. Kiểm tra tất cả nguyên vật liệu có tồn tại trong hệ thống
    for (const item of items) {
      const raw = await findRawMaterialById(item.raw_material_id);
      if (!raw) {
        return res.status(400).json({
          message: `Nguyên vật liệu với ID ${item.raw_material_id} không tồn tại trong hệ thống.`,
        });
      }
      if (raw.status !== 'ACTIVE') {
        return res.status(400).json({
          message: `Nguyên vật liệu '${raw.raw_name}' đang ở trạng thái ngừng hoạt động (${raw.status}), không thể nhập kho.`,
        });
      }
    }

    // 3. Xử lý mã phiếu nhập
    let finalReceiptCode = receipt_code;
    if (finalReceiptCode) {
      const existing = await findReceiptByCode(finalReceiptCode);
      if (existing) {
        return res.status(409).json({
          message: `Mã phiếu nhập '${finalReceiptCode}' đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`,
        });
      }
    } else {
      finalReceiptCode = await generateNextReceiptCode(receipt_date);
    }

    // 4. Chuẩn bị dữ liệu tạo
    const userSub = req.user ? req.user.sub : null;
    const userEmail = req.user ? req.user.email : null;

    const receiptData = {
      receipt_code: finalReceiptCode,
      supplier_id,
      receipt_date,
      status,
      received_by: received_by || userSub,
      note,
      createby: userEmail || 'system',
    };

    const createdReceipt = await createReceiptWithItems({ receiptData, items });

    return res.status(201).json({
      message:
        status === 'CONFIRMED'
          ? 'Tạo phiếu nhập và xác nhận nhập kho thành công. Tồn kho đã được cộng.'
          : 'Tạo phiếu nhập nháp thành công.',
      receipt: toReceiptDetailDTO(createdReceipt),
    });
  } catch (error) {
    console.error('[purchaseReceiptController.createReceipt]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi tạo phiếu nhập',
      error: error.message,
    });
  }
}

/**
 * PUT /api/purchase-receipts/:id
 * Cập nhật thông tin phiếu nhập kho (chỉ cho phép khi ở trạng thái DRAFT)
 */
async function updateReceipt(req, res) {
  const { id } = req.params;
  const receiptId = Number(id);

  if (!receiptId || isNaN(receiptId) || receiptId <= 0) {
    return res.status(400).json({ message: 'ID phiếu nhập không hợp lệ.' });
  }

  try {
    const existing = await findReceiptById(receiptId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu nhập.' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({
        message: 'Chỉ được phép chỉnh sửa phiếu nhập khi ở trạng thái nháp (DRAFT).',
      });
    }

    const validation = validateUpdateReceiptInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const {
      supplier_id,
      receipt_date,
      status,
      received_by,
      note,
      items,
    } = validation.value;

    // 1. Kiểm tra nhà cung cấp nếu có thay đổi
    if (supplier_id !== undefined && supplier_id !== existing.supplier_id) {
      const supplierCheck = await validateSupplierForReceipt(supplier_id);
      if (!supplierCheck.isValid) {
        return res.status(400).json({ message: supplierCheck.message });
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
            message: `Nguyên vật liệu '${raw.raw_name}' đang ở trạng thái ngừng hoạt động (${raw.status}), không thể nhập kho.`,
          });
        }
      }
    }

    const userEmail = req.user ? req.user.email : null;
    const receiptData = {
      supplier_id,
      receipt_date,
      status,
      received_by,
      note,
      modifieby: userEmail || 'system',
    };

    const updated = await updateReceiptWithItems(receiptId, {
      receiptData,
      items,
    });

    return res.status(200).json({
      message:
        status === 'CONFIRMED'
          ? 'Cập nhật và xác nhận nhập kho thành công. Số lượng tồn kho đã được cộng.'
          : 'Cập nhật phiếu nhập nháp thành công.',
      receipt: toReceiptDetailDTO(updated),
    });
  } catch (error) {
    console.error('[purchaseReceiptController.updateReceipt]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi cập nhật phiếu nhập',
      error: error.message,
    });
  }
}

/**
 * POST /api/purchase-receipts/:id/confirm
 * Xác nhận nhập kho phiếu nháp (DRAFT -> CONFIRMED), cộng tồn kho nguyên vật liệu
 */
async function confirmReceipt(req, res) {
  const { id } = req.params;
  const receiptId = Number(id);

  if (!receiptId || isNaN(receiptId) || receiptId <= 0) {
    return res.status(400).json({ message: 'ID phiếu nhập không hợp lệ.' });
  }

  try {
    const existing = await findReceiptById(receiptId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu nhập.' });
    }

    if (existing.status === 'CONFIRMED') {
      return res.status(400).json({ message: 'Phiếu nhập đã được xác nhận nhập kho trước đó.' });
    }

    if (existing.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Không thể xác nhận phiếu nhập đã hủy.' });
    }

    const userEmail = req.user ? req.user.email : null;
    const updated = await updateReceiptWithItems(receiptId, {
      receiptData: {
        status: 'CONFIRMED',
        modifieby: userEmail || 'system',
      },
    });

    return res.status(200).json({
      message: 'Xác nhận nhập kho thành công. Số lượng tồn kho nguyên vật liệu đã được cập nhật.',
      receipt: toReceiptDetailDTO(updated),
    });
  } catch (error) {
    console.error('[purchaseReceiptController.confirmReceipt]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi xác nhận phiếu nhập',
      error: error.message,
    });
  }
}

/**
 * POST /api/purchase-receipts/:id/cancel
 * Hủy phiếu nhập (chuyển sang CANCELLED, nếu trước đó là CONFIRMED thì trừ lại tồn kho)
 */
async function cancelReceipt(req, res) {
  const { id } = req.params;
  const receiptId = Number(id);

  if (!receiptId || isNaN(receiptId) || receiptId <= 0) {
    return res.status(400).json({ message: 'ID phiếu nhập không hợp lệ.' });
  }

  try {
    const existing = await findReceiptById(receiptId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu nhập.' });
    }

    if (existing.status === 'CONFIRMED') {
      return res.status(400).json({
        message: 'Phiếu nhập đã xác nhận nhập kho (CONFIRMED) không thể hủy.',
      });
    }

    if (existing.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Phiếu nhập đã ở trạng thái hủy.' });
    }

    const userEmail = req.user ? req.user.email : null;
    const updated = await updateReceiptWithItems(receiptId, {
      receiptData: {
        status: 'CANCELLED',
        note: req.body.note !== undefined ? req.body.note : existing.note,
        modifieby: userEmail || 'system',
      },
    });

    return res.status(200).json({
      message: 'Hủy phiếu nhập thành công.',
      receipt: toReceiptDetailDTO(updated),
    });
  } catch (error) {
    console.error('[purchaseReceiptController.cancelReceipt]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi hủy phiếu nhập',
      error: error.message,
    });
  }
}

/**
 * DELETE /api/purchase-receipts/:id
 * Xóa phiếu nhập (chỉ cho phép khi ở trạng thái DRAFT hoặc CANCELLED)
 */
async function deleteReceipt(req, res) {
  const { id } = req.params;
  const receiptId = Number(id);

  if (!receiptId || isNaN(receiptId) || receiptId <= 0) {
    return res.status(400).json({ message: 'ID phiếu nhập không hợp lệ.' });
  }

  try {
    const existing = await findReceiptById(receiptId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu nhập.' });
    }

    if (existing.status === 'CONFIRMED') {
      return res.status(400).json({
        message: 'Không thể xóa phiếu nhập đã xác nhận (CONFIRMED). Vui lòng hủy phiếu trước nếu muốn xóa.',
      });
    }

    await deleteReceiptModel(receiptId);

    return res.status(200).json({
      message: 'Xóa phiếu nhập thành công.',
    });
  } catch (error) {
    console.error('[purchaseReceiptController.deleteReceipt]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi xóa phiếu nhập',
      error: error.message,
    });
  }
}

module.exports = {
  getReceipts,
  getReceiptSummary,
  getNextReceiptCode,
  getReceiptById,
  createReceipt,
  updateReceipt,
  confirmReceipt,
  cancelReceipt,
  deleteReceipt,
};
