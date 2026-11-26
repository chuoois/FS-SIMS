// =========================================================
// saleContractController.js
// Bộ điều khiển quản lý Hợp Đồng & Yêu cầu Đặt may đo dành cho Role Bán hàng (Sale)
// Chức năng: Tạo hợp đồng tại quầy, Ký hợp đồng bản giấy kèm ảnh bằng chứng,
// Tra cứu danh sách, chi tiết hợp đồng, chuyển đổi yêu cầu may đo sang hợp đồng
// =========================================================

const {
  createOfflineContract: createOfflineContractModel,
  signContract: signContractModel,
  findContractById: findContractByIdModel,
  getContractsWithPagination: getContractsModel,
} = require('../models/ContractModel');

const {
  getRequestsWithPagination: getRequestsModel,
  findRequestById: findRequestByIdModel,
  convertRequestToContract: convertRequestToContractModel,
  updateDesignFile: updateDesignFileModel,
  deleteDesignImage: deleteDesignImageModel,
  createSalesOrderRequest,
  updateSalesOrderRequest,
} = require('../models/SaleRequestModel');

const { OrderRequest } = require('../models/OrderRequestModel');

const {
  validateCreateOfflineContractInput,
  validateSignContractInput,
  validateCreateSalesRequestInput,
  toContractDTO,
} = require('../utils/saleOrderValidator');
const { buildSuccessResponse } = require('../utils/successResponse');

/**
 * DTO chuyển đổi OrderRequest sang JSON trả về FE
 */
function toRequestDTO(raw) {
  if (!raw) return null;
  const r = raw.toJSON ? raw.toJSON() : raw;
  return {
    requestId: r.request_id,
    requestCode: r.request_code,
    orderType: r.order_type,
    requestType: r.request_type,
    customerAccountId: r.customer_account_id,
    customerName: r.contact_name,
    customerPhone: r.contact_phone,
    customerEmail: r.contact_email,
    contactName: r.contact_name,
    contactPhone: r.contact_phone,
    contactEmail: r.contact_email,
    deliveryAddress: r.delivery_address,
    title: r.title,
    description: r.description,
    budgetMin: r.budget_min ? Number(r.budget_min) : null,
    budgetMax: r.budget_max ? Number(r.budget_max) : null,
    expectedDate: r.expected_date,
    status: r.status,
    quotedPrice: r.quoted_price ? Number(r.quoted_price) : null,
    quotedAt: r.quoted_at,
    approvedAt: r.approved_at,
    staffNote: r.staff_note,
    rejectReason: r.reject_reason,
    assignedTo: r.assigned_to,
    assigneeName: r.assignee?.full_name || null,
    customerFullName: r.customer?.full_name || r.contact_name,
    createdAt: r.createdate,
    updatedAt: r.modifiedate,
    contract: r.contract ? {
      contractId: r.contract.contract_id,
      contractCode: r.contract.contract_code,
      status: r.contract.status,
    } : null,
    items: (r.items || []).map((it) => {
      const itRawImages = (it.images && Array.isArray(it.images) && it.images.length > 0)
        ? it.images
        : (r.images || []).filter((img) => {
          const rId = img.request_item_id || img.requestItemId;
          const itId = it.request_item_id || it.requestItemId;
          return rId && itId && Number(rId) === Number(itId);
        });

      return {
        requestItemId: it.request_item_id,
        productId: it.product_id,
        itemName: it.item_name,
        categoryId: it.category_id,
        roomId: it.room_id,
        materialId: it.material_id,
        colorId: it.color_id,
        quantity: it.quantity,
        unitPrice: it.unit_price ? Number(it.unit_price) : null,
        description: it.description,
        technicalNotes: it.description,
        lengthCm: it.length_cm,
        widthCm: it.width_cm,
        heightCm: it.height_cm,
        images: (itRawImages || []).map((img) => {
          const url = typeof img === 'string' ? img : (img.image_url || img.imageUrl);
          const createdBy = typeof img === 'object' ? (img.createby || img.createBy || img.createdBy || null) : null;
          const isOwner = Boolean(
            (createdBy && String(createdBy).toUpperCase().includes('OWNER')) ||
            (typeof url === 'string' && url.includes('design_files')) ||
            (typeof img === 'object' && (img.imageType === 'OWNER_DESIGN' || img.isOwnerDesign))
          );

          return {
            imageId: img.request_image_id || img.requestImageId || img.imageId,
            requestImageId: img.request_image_id || img.requestImageId || img.imageId,
            imageUrl: url,
            requestItemId: img.request_item_id || img.requestItemId || it.request_item_id,
            sortOrder: img.sort_order ?? img.sortOrder ?? 0,
            createdBy,
            imageType: isOwner ? 'OWNER_DESIGN' : 'CUSTOMER_REF',
            isOwnerDesign: isOwner,
          };
        }),
      };
    }),
    images: (r.images || []).map((img) => {
      const url = typeof img === 'string' ? img : (img.image_url || img.imageUrl);
      const createdBy = typeof img === 'object' ? (img.createby || img.createBy || img.createdBy || null) : null;
      const isOwner = Boolean(
        (createdBy && String(createdBy).toUpperCase().includes('OWNER')) ||
        (typeof url === 'string' && url.includes('design_files')) ||
        (typeof img === 'object' && (img.imageType === 'OWNER_DESIGN' || img.isOwnerDesign))
      );

      return {
        imageId: img.request_image_id || img.requestImageId || img.imageId,
        requestImageId: img.request_image_id || img.requestImageId || img.imageId,
        imageUrl: url,
        requestItemId: img.request_item_id || img.requestItemId || null,
        sortOrder: img.sort_order ?? img.sortOrder ?? 0,
        createdBy,
        imageType: isOwner ? 'OWNER_DESIGN' : 'CUSTOMER_REF',
        isOwnerDesign: isOwner,
      };
    }),
  };
}

/**
 * POST /api/sale-orders/contracts
 * Bước 1: Lập biên bản hợp đồng bán hàng tại quầy (Trạng thái DRAFT)
 */
async function createOfflineContract(req, res) {
  try {
    const validation = validateCreateOfflineContractInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const {
      customer_name,
      customer_phone,
      customer_address,
      customer_account_id,
      deposit_amount,
      delivery_date,
      signed_place,
      terms,
      note,
      items,
    } = validation.value;

    const contract = await createOfflineContractModel({
      customerAccountId: customer_account_id,
      customerName: customer_name,
      customerPhone: customer_phone,
      customerAddress: customer_address,
      depositAmount: deposit_amount,
      deliveryDate: delivery_date,
      signedPlace: signed_place,
      terms,
      note,
      signedBy: req.user?.sub,
      createBy: req.user?.email || 'STAFF',
      items,
    });

    const contractDTO = toContractDTO(contract);
    const responsePayload = buildSuccessResponse({
      status: 201,
      message: 'Lập biên bản hợp đồng thành công',
      data: contractDTO,
      req,
    });
    responsePayload.contract = contractDTO;
    return res.status(201).json(responsePayload);
  } catch (error) {
    console.error('[saleContractController.createOfflineContract]', error);
    const isClientError = error.message && (
      error.message.includes('chỉ còn') ||
      error.message.includes('không tồn tại') ||
      error.message.includes('không còn kinh doanh')
    );
    return res.status(isClientError ? 400 : 500).json({
      message: error.message || 'Lỗi hệ thống khi tạo hợp đồng',
      error: error.message,
    });
  }
}

/**
 * POST /api/sale-orders/contracts/:id/sign
 * Bước 2: Chốt và ký hợp đồng tại quầy (Chuyển trạng thái sang SIGNED)
 */
async function signContract(req, res) {
  try {
    const { id } = req.params;
    const contractId = parseInt(id, 10);
    if (!contractId || isNaN(contractId) || contractId <= 0) {
      return res.status(400).json({ message: 'Mã hợp đồng không hợp lệ.' });
    }

    const uploadedFileUrl = req.file?.path || req.file?.url || req.file?.secure_url;
    const rawContractFileUrl = uploadedFileUrl || req.body.contract_file_url || req.body.contractFileUrl;

    const validation = validateSignContractInput({
      ...req.body,
      contract_file_url: rawContractFileUrl,
    });
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const { signed_place, contract_file_url } = validation.value;

    const contract = await signContractModel(contractId, {
      signedPlace: signed_place,
      contractFileUrl: contract_file_url,
      signedBy: req.user?.sub,
      modifieBy: req.user?.email || 'STAFF',
    });

    if (!contract) {
      return res.status(404).json({ message: 'Không tìm thấy hợp đồng.' });
    }

    if (contract.request_id) {
      const { OrderRequest } = require('../models/OrderRequestModel');
      await OrderRequest.update(
        { status: 'CONVERTED', modifieby: req.user?.email || 'STAFF' },
        { where: { request_id: contract.request_id } }
      );
    }

    const contractDTO = toContractDTO(contract);
    const responsePayload = buildSuccessResponse({
      status: 200,
      message: 'Chốt và ký hợp đồng thành công',
      data: contractDTO,
      req,
    });
    responsePayload.contract = contractDTO;
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[saleContractController.signContract]', error);
    return res.status(400).json({
      message: error.message || 'Lỗi khi ký hợp đồng',
      error: error.message,
    });
  }
}

/**
 * GET /api/sale-orders/contracts
 * Lấy danh sách hợp đồng bán hàng
 */
async function getContracts(req, res) {
  try {
    const {
      search,
      search_by,
      customer_name,
      contract_code,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const result = await getContractsModel({
      search: typeof search === 'string' ? search.trim() : '',
      search_by: typeof search_by === 'string' ? search_by.trim().toUpperCase() : 'ALL',
      customer_name: typeof customer_name === 'string' ? customer_name.trim() : '',
      contract_code: typeof contract_code === 'string' ? contract_code.trim() : '',
      status: typeof status === 'string' ? status.trim().toUpperCase() : 'ALL',
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
    });

    const contractsDTO = (result.contracts || []).map(toContractDTO);
    const responsePayload = buildSuccessResponse({
      status: 200,
      message: 'Lấy danh sách hợp đồng thành công',
      data: contractsDTO,
      meta: {
        page: result.currentPage,
        limit: result.itemsPerPage,
        total: result.totalItems,
        totalPages: result.totalPages,
      },
      req,
    });
    responsePayload.contracts = contractsDTO;
    responsePayload.pagination = {
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      itemsPerPage: result.itemsPerPage,
    };
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[saleContractController.getContracts]', error);
    return res.status(500).json({
      message: 'Lỗi khi lấy danh sách hợp đồng',
      error: error.message,
    });
  }
}

/**
 * GET /api/sale-orders/contracts/:id
 * Lấy chi tiết 1 hợp đồng
 */
async function getContractById(req, res) {
  try {
    const { id } = req.params;
    const contractId = parseInt(id, 10);
    if (!contractId || isNaN(contractId) || contractId <= 0) {
      return res.status(400).json({ message: 'Mã hợp đồng không hợp lệ.' });
    }

    const contract = await findContractByIdModel(contractId);
    if (!contract) {
      return res.status(404).json({ message: 'Không tìm thấy hợp đồng.' });
    }

    const contractDTO = toContractDTO(contract);
    const responsePayload = buildSuccessResponse({
      status: 200,
      message: 'Lấy thông tin hợp đồng thành công',
      data: contractDTO,
      req,
    });
    responsePayload.contract = contractDTO;
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[saleContractController.getContractById]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy chi tiết hợp đồng',
      error: error.message,
    });
  }
}

/**
 * GET /api/sale-orders/requests
 * Lấy danh sách yêu cầu may đo đặt hàng
 */
async function getRequests(req, res) {
  try {
    const {
      search,
      search_by,
      status,
      order_type,
      sort,
      page = 1,
      limit = 10,
    } = req.query;

    const result = await getRequestsModel({
      search: typeof search === 'string' ? search.trim() : '',
      search_by: typeof search_by === 'string' ? search_by.trim().toUpperCase() : 'ALL',
      status: typeof status === 'string' ? status.trim().toUpperCase() : 'ALL',
      order_type: typeof order_type === 'string' ? order_type.trim().toUpperCase() : 'ALL',
      sort: typeof sort === 'string' ? sort.trim().toUpperCase() : 'NEWEST',
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
    });

    const requestsDTO = (result.requests || []).map(toRequestDTO);
    const responsePayload = buildSuccessResponse({
      status: 200,
      message: 'Lấy danh sách yêu cầu thành công',
      data: requestsDTO,
      meta: {
        page: result.currentPage,
        limit: result.itemsPerPage,
        total: result.totalItems,
        totalPages: result.totalPages,
      },
      req,
    });
    responsePayload.requests = requestsDTO;
    responsePayload.pagination = {
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      itemsPerPage: result.itemsPerPage,
    };
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[saleContractController.getRequests]', error);
    return res.status(500).json({
      message: 'Lỗi khi lấy danh sách yêu cầu',
      error: error.message,
    });
  }
}

/**
 * GET /api/sale-orders/requests/:id
 * Lấy chi tiết 1 yêu cầu
 */
async function getRequestById(req, res) {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }

    const request = await findRequestByIdModel(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu.' });
    }

    const requestDTO = toRequestDTO(request);
    const responsePayload = buildSuccessResponse({
      status: 200,
      message: 'Lấy chi tiết yêu cầu thành công',
      data: requestDTO,
      req,
    });
    responsePayload.request = requestDTO;
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[saleContractController.getRequestById]', error);
    return res.status(500).json({
      message: 'Lỗi máy chủ khi lấy chi tiết yêu cầu',
      error: error.message,
    });
  }
}

/**
 * POST /api/sale-orders/requests/:id/convert-to-contract
 * Chuyển yêu cầu thành hợp đồng DRAFT
 */
async function convertRequestToContract(req, res) {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }

    const {
      customer_name,
      customer_phone,
      customer_address,
      items,
      deposit_amount,
      delivery_date,
      signed_place,
      terms,
      note,
    } = req.body;

    if (delivery_date && String(delivery_date).trim()) {
      const delDateObj = new Date(String(delivery_date).trim());
      if (isNaN(delDateObj.getTime())) {
        return res.status(400).json({ message: 'Ngày hẹn giao hàng không đúng định dạng.' });
      }
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const targetDelDate = new Date(delDateObj.getFullYear(), delDateObj.getMonth(), delDateObj.getDate());
      const diffDays = Math.round((targetDelDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        return res.status(400).json({ message: 'Ngày hẹn giao hàng không thể ở trong quá khứ.' });
      }
      if (diffDays < 10) {
        return res.status(400).json({ message: 'Ngày hẹn giao hàng phải cách thời điểm tạo hợp đồng ít nhất 10 ngày.' });
      }
    }

    const result = await convertRequestToContractModel({
      requestId,
      customerName: customer_name,
      customerPhone: customer_phone,
      customerAddress: customer_address,
      items,
      depositAmount: deposit_amount !== undefined && deposit_amount !== '' ? Number(deposit_amount) : null,
      deliveryDate: delivery_date || null,
      signedPlace: signed_place || null,
      terms: terms || null,
      note: note || null,
      signedBy: req.user?.sub,
      createBy: req.user?.email || 'STAFF',
    });

    const responsePayload = buildSuccessResponse({
      status: 201,
      message: 'Chuyển yêu cầu thành hợp đồng thành công',
      data: result,
      req,
    });
    responsePayload.contract = result;
    return res.status(201).json(responsePayload);
  } catch (error) {
    console.error('[saleContractController.convertRequestToContract]', error);
    const statusCode = error.statusCode || (
      error.message && (
        error.message.includes('đã được chuyển') ? 409 :
          error.message.includes('không tìm thấy') || error.message.includes('Không tìm thấy') ? 404 :
            400
      )
    ) || 500;
    return res.status(statusCode).json({
      message: error.message || 'Lỗi hệ thống khi chuyển yêu cầu thành hợp đồng',
      error: error.message,
    });
  }
}

/**
 * PATCH /api/sale-orders/requests/:id/design
 * Upload ảnh bản vẽ thiết kế bổ sung cho yêu cầu
 */
async function updateDesignFile(req, res) {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn file bản vẽ thiết kế để tải lên.' });
    }

    const requestItemId = req.body.request_item_id ? parseInt(req.body.request_item_id, 10) : null;
    const uploadedUrl = req.file.path || req.file.url || req.file.secure_url;
    const description = req.body.description || req.body.staff_note || null;
    const designedBy = req.user?.user_account_id || req.user?.id || req.user?.sub;
    const updatedBy = req.user?.email || req.user?.full_name || 'OWNER';

    const result = await updateDesignFileModel(requestId, {
      fileUrl: uploadedUrl,
      imageUrl: uploadedUrl,
      description,
      requestItemId,
      designedBy,
      updatedBy,
      createBy: updatedBy,
    });

    return res.status(200).json({
      message: 'Tải lên bản vẽ thiết kế thành công và đã cập nhật trạng thái yêu cầu sang DESIGNED',
      data: result,
    });
  } catch (error) {
    console.error('[saleContractController.updateDesignFile]', error);
    return res.status(500).json({
      message: error.message || 'Lỗi máy chủ khi cập nhật file thiết kế',
      error: error.message,
    });
  }
}

/**
 * DELETE /api/sale-orders/requests/:id/design/:imageId
 * Xóa ảnh bản vẽ thiết kế
 */
async function deleteDesignImage(req, res) {
  try {
    const { id, imageId } = req.params;
    const requestId = parseInt(id, 10);
    const imgId = parseInt(imageId, 10);

    if (!requestId || isNaN(requestId) || requestId <= 0 || !imgId || isNaN(imgId) || imgId <= 0) {
      return res.status(400).json({ message: 'Tham số không hợp lệ.' });
    }

    await deleteDesignImageModel(requestId, imgId);

    return res.status(200).json({
      message: 'Xóa ảnh thiết kế thành công',
    });
  } catch (error) {
    console.error('[saleContractController.deleteDesignImage]', error);
    return res.status(500).json({
      message: error.message || 'Lỗi máy chủ khi xóa ảnh thiết kế',
      error: error.message,
    });
  }
}

/**
 * POST /api/sale-orders/requests
 * Sales tạo đơn đặt hàng may đo & thiết kế (Order Request)
 */
async function createSalesRequest(req, res) {
  try {
    const validation = validateCreateSalesRequestInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const result = await createSalesOrderRequest(validation.data, {
      assignedTo: req.user?.sub,
      createBy: req.user?.email || 'STAFF',
    });

    const requestDTO = toRequestDTO(result);
    const responsePayload = buildSuccessResponse({
      status: 201,
      message: 'Tạo yêu cầu đặt hàng thiết kế thành công',
      data: requestDTO,
      req,
    });
    responsePayload.request = requestDTO;
    return res.status(201).json(responsePayload);
  } catch (error) {
    console.error('[saleContractController.createSalesRequest]', error);
    return res.status(500).json({
      message: error.message || 'Lỗi máy chủ khi tạo yêu cầu thiết kế',
      error: error.message,
    });
  }
}

/**
 * PUT /api/sale-orders/requests/:id
 * Sales cập nhật thông tin yêu cầu may đo
 */
async function updateSalesRequest(req, res) {
  try {
    const { id } = req.params;
    const requestId = parseInt(id, 10);
    if (!requestId || isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Mã yêu cầu không hợp lệ.' });
    }

    const validation = validateCreateSalesRequestInput(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.error });
    }

    const result = await updateSalesOrderRequest(requestId, validation.data, {
      modifieBy: req.user?.email || 'STAFF',
    });

    const requestDTO = toRequestDTO(result);
    const responsePayload = buildSuccessResponse({
      status: 200,
      message: 'Cập nhật yêu cầu thiết kế thành công',
      data: requestDTO,
      req,
    });
    responsePayload.request = requestDTO;
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[saleContractController.updateSalesRequest]', error);
    return res.status(500).json({
      message: error.message || 'Lỗi máy chủ khi cập nhật yêu cầu thiết kế',
      error: error.message,
    });
  }
}

module.exports = {
  toRequestDTO,
  createOfflineContract,
  signContract,
  getContracts,
  getContractById,
  getRequests,
  getRequestById,
  convertRequestToContract,
  updateDesignFile,
  deleteDesignImage,
  createSalesRequest,
  updateSalesRequest,
};
