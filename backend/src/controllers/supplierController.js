// =========================================================
// supplierController.js
// Controller Quản lý Nhà Cung Cấp (Manage Suppliers)
// Tuân thủ đúng kiến trúc MVC chuẩn của dự án:
// routes/ -> controllers/ -> models/
// Controller trực tiếp nhận req/res, gọi model & validator, KHÔNG viết query SQL tại đây
// =========================================================

const {
  findSupplierById,
  findSupplierByCode,
  getSuppliersWithPagination,
  getSupplierWithReceiptHistory,
  countMaterialReceiptsBySupplierId,
  createSupplier: createSupplierModel,
  updateSupplier: updateSupplierModel,
  deleteSupplier: deleteSupplierModel,
  getActiveSuppliers: getActiveSuppliersModel,
  generateNextSupplierCode,
} = require('../models/SupplierModel');

const {
  validateCreateSupplierInput,
  validateUpdateSupplierInput,
  validateSupplierQueryParams,
  toSupplierDTO,
  toSupplierDetailDTO,
} = require('../utils/supplierValidator');

/**
 * GET /api/suppliers
 * Xem danh sách nhà cung cấp (tìm theo mã/tên/sđt, lọc theo trạng thái, phân trang)
 */
async function getSuppliers(req, res) {
  try {
    const params = validateSupplierQueryParams(req.query);
    const result = await getSuppliersWithPagination(params);

    return res.status(200).json({
      message: 'Lấy danh sách nhà cung cấp thành công',
      data: (result.suppliers || []).map(toSupplierDTO),
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        itemsPerPage: result.itemsPerPage,
      },
    });
  } catch (error) {
    console.error('[supplierController.getSuppliers]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách nhà cung cấp',
      error: error.message,
    });
  }
}

/**
 * GET /api/suppliers/active
 * Lấy danh sách các nhà cung cấp đang ACTIVE (phục vụ chọn NCC khi tạo phiếu nhập kho)
 */
async function getActiveSuppliers(req, res) {
  try {
    const list = await getActiveSuppliersModel();
    return res.status(200).json({
      message: 'Lấy danh sách nhà cung cấp khả dụng thành công',
      suppliers: (list || []).map(toSupplierDTO),
    });
  } catch (error) {
    console.error('[supplierController.getActiveSuppliers]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy danh sách nhà cung cấp khả dụng',
      error: error.message,
    });
  }
}

/**
 * GET /api/suppliers/:id
 * Xem chi tiết nhà cung cấp và toàn bộ lịch sử phiếu nhập kho của NCC đó
 */
async function getSupplierById(req, res) {
  const { id } = req.params;
  const supplierId = Number(id);

  if (!supplierId || isNaN(supplierId) || supplierId <= 0) {
    return res.status(400).json({ message: 'ID nhà cung cấp không hợp lệ' });
  }

  try {
    const supplier = await getSupplierWithReceiptHistory(supplierId);

    if (!supplier) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin nhà cung cấp' });
    }

    return res.status(200).json({
      message: 'Lấy thông tin chi tiết nhà cung cấp thành công',
      supplier: toSupplierDetailDTO(supplier),
    });
  } catch (error) {
    console.error('[supplierController.getSupplierById]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy thông tin nhà cung cấp',
      error: error.message,
    });
  }
}

/**
 * GET /api/suppliers/next-code
 * Lấy mã nhà cung cấp tiếp theo được tự động sinh (VD: NCC001)
 */
async function getNextSupplierCode(req, res) {
  try {
    const nextCode = await generateNextSupplierCode();
    return res.status(200).json({
      message: 'Lấy mã nhà cung cấp tiếp theo thành công',
      nextCode,
    });
  } catch (error) {
    console.error('[supplierController.getNextSupplierCode]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi tạo mã nhà cung cấp',
      error: error.message,
    });
  }
}

/**
 * POST /api/suppliers
 * Tạo mới nhà cung cấp
 * supplier_code tự động sinh nếu để trống; supplier_name là bắt buộc; trùng mã trả về 409 Conflict; status mặc định ACTIVE
 */
async function createSupplier(req, res) {
  try {
    // 1. Validate dữ liệu đầu vào
    const validation = validateCreateSupplierInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    let finalCode = validation.value.supplier_code;

    // 2. Nếu không truyền mã (hoặc để trống), tự động sinh mã theo quy tắc (NCC001, NCC002...)
    if (!finalCode) {
      finalCode = await generateNextSupplierCode();
    } else {
      // Nếu có truyền mã tự chọn, kiểm tra trùng mã nhà cung cấp
      const existing = await findSupplierByCode(finalCode);
      if (existing) {
        return res.status(409).json({
          message: `Mã nhà cung cấp '${finalCode}' đã tồn tại trên hệ thống`,
        });
      }
    }

    const createBy = req.user?.email || req.user?.full_name || 'SYSTEM';

    // 3. Tạo mới vào database
    const created = await createSupplierModel({
      ...validation.value,
      supplier_code: finalCode,
      createby: createBy,
    });

    return res.status(201).json({
      message: 'Tạo nhà cung cấp mới thành công',
      supplier: toSupplierDTO(created),
    });
  } catch (error) {
    console.error('[supplierController.createSupplier]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi tạo nhà cung cấp',
      error: error.message,
    });
  }
}

/**
 * PUT /api/suppliers/:id
 * Cập nhật nhà cung cấp: cho phép sửa name, phone, address, note, status; cấm sửa code
 */
async function updateSupplier(req, res) {
  const { id } = req.params;
  const supplierId = Number(id);

  if (!supplierId || isNaN(supplierId) || supplierId <= 0) {
    return res.status(400).json({ message: 'ID nhà cung cấp không hợp lệ' });
  }

  try {
    // 1. Validate dữ liệu cập nhật (chặn nếu client cố truyền supplier_code)
    const validation = validateUpdateSupplierInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    // 2. Kiểm tra tồn tại
    const existing = await findSupplierById(supplierId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin nhà cung cấp' });
    }

    const modifieBy = req.user?.email || req.user?.full_name || 'SYSTEM';

    // 3. Cập nhật vào database
    const updated = await updateSupplierModel(supplierId, {
      ...validation.value,
      modifieby: modifieBy,
    });

    return res.status(200).json({
      message: 'Cập nhật thông tin nhà cung cấp thành công',
      supplier: toSupplierDTO(updated),
    });
  } catch (error) {
    console.error('[supplierController.updateSupplier]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi cập nhật nhà cung cấp',
      error: error.message,
    });
  }
}

/**
 * DELETE /api/suppliers/:id
 * Xóa nhà cung cấp: chỉ xóa khi chưa có phiếu nhập nào.
 * Nếu đã có phiếu nhập, trả về 409 Conflict kèm gợi ý chuyển sang INACTIVE.
 * Phải kiểm tra trước vì FK fk_material_receipt_supplier là ON DELETE SET NULL.
 */
async function deleteSupplier(req, res) {
  const { id } = req.params;
  const supplierId = Number(id);

  if (!supplierId || isNaN(supplierId) || supplierId <= 0) {
    return res.status(400).json({ message: 'ID nhà cung cấp không hợp lệ' });
  }

  try {
    // 1. Kiểm tra tồn tại
    const existing = await findSupplierById(supplierId);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin nhà cung cấp' });
    }

    // 2. Kiểm tra số lượng phiếu nhập kho liên quan
    const receiptCount = await countMaterialReceiptsBySupplierId(supplierId);
    if (receiptCount > 0) {
      return res.status(409).json({
        message: `Không thể xóa vì nhà cung cấp '${existing.supplier_name}' đã phát sinh ${receiptCount} phiếu nhập kho trong hệ thống. Để bảo toàn lịch sử dữ liệu, vui lòng chuyển trạng thái sang INACTIVE (Ngừng hoạt động).`,
        receiptCount,
        suggestAction: 'INACTIVE',
      });
    }

    // 3. Xóa khi chưa có phiếu nhập nào
    await deleteSupplierModel(supplierId);

    return res.status(200).json({
      message: 'Xóa nhà cung cấp thành công',
    });
  } catch (error) {
    console.error('[supplierController.deleteSupplier]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi xóa nhà cung cấp',
      error: error.message,
    });
  }
}

module.exports = {
  getSuppliers,
  getActiveSuppliers,
  getNextSupplierCode,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
