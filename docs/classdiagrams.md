# TỔNG HỢP CLASS DIAGRAM TINH GỌN HỆ THỐNG FS-SIMS (NHÓM 2.1 ĐẾN 2.14)
> **Dự án**: FS-SIMS (Furniture Sales & Inventory Management System)  
> **Kiến trúc thực tế**: Node.js + Express + Sequelize ORM + MySQL 8  
> **Phong cách**: Tinh gọn (Concise), tập trung vào các lớp chính, thuộc tính và phương thức trọng tâm của từng ca sử dụng.

---

### 2.1: Xác thực & Phân quyền (Auth)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.1 Xác thực & Phân quyền (Auth)

class AuthController {
  +register(req, res)
  +login(req, res)
  +refreshToken(req, res)
  +forgotPassword(req, res)
}

class MailService {
  +sendNewPasswordEmail(to, name, pass)
}

class UserAccountModel {
  +user_account_id: bigint
  +email: string
  +password_hash: string
  +status: string
  +createUserAccount(data)
  +findUserAccountByEmail(email)
  +updateUserPassword(id, hash)
}

class RefreshTokenModel {
  +refresh_token_id: bigint
  +token: string
  +expires_at: datetime
  +createRefreshToken(userId, token)
  +deleteRefreshToken(token)
}

class AuthDto {
  +email: string
  +password: string
  +accessToken: string
  +role: string
}

AuthController --> MailService : calls
AuthController --> UserAccountModel : queries & creates
AuthController --> RefreshTokenModel : manages
AuthController ..> AuthDto : <<use>>
UserAccountModel "1" -- "0..*" RefreshTokenModel : has
@enduml
```

---

### 2.2: Quản lý Hồ sơ & Nhân sự (User & Staff)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.2 Quản lý Hồ sơ & Nhân sự (User & Staff)

class StaffAccountController {
  +listStaffAccounts(req, res)
  +createStaffAccount(req, res)
  +updateStaffAccount(req, res)
  +changeStaffAccountStatus(req, res)
}

class UserController {
  +getProfile(req, res)
  +updateProfile(req, res)
}

class CloudinaryService {
  +deleteImage(publicId)
}

class UserAccountModel {
  +user_account_id: bigint
  +role_id: bigint
  +full_name: string
  +email: string
  +status: string
  +getStaffAccounts(options)
  +updateStaffAccount(id, data)
  +updateUserProfile(id, data)
}

class UserRoleModel {
  +role_id: bigint
  +role_code: string
  +role_name: string
}

class StaffAccountDto {
  +user_account_id: bigint
  +full_name: string
  +email: string
  +role_code: string
  +status: string
}

StaffAccountController --> UserAccountModel : manages staff
UserController --> UserAccountModel : updates profile
UserController --> CloudinaryService : uploads avatar
StaffAccountController ..> StaffAccountDto : <<use>>
UserAccountModel --> UserRoleModel : belongsTo
@enduml
```

---

### 2.3: Quản lý Sản phẩm & Danh mục (Product & Catalog)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.3 Quản lý Sản phẩm & Danh mục (Product & Catalog)

class ProductManagerController {
  +getProducts(req, res)
  +getProductById(req, res)
  +createProduct(req, res)
  +updateProduct(req, res)
  +deleteProduct(req, res)
}

class ProductController {
  +getProducts(req, res)
  +getProductMetadata(req, res)
}

class ProductModel {
  +product_id: bigint
  +category_id: bigint
  +product_code: string
  +product_name: string
  +unit_price: decimal
  +stock_quantity: int
  +findAndCountAll(options)
  +create(data)
  +update(data, options)
}

class ProductCategoryModel {
  +category_id: bigint
  +category_name: string
  +findAll()
}

class ProductDto {
  +product_id: bigint
  +product_code: string
  +product_name: string
  +category_name: string
  +unit_price: decimal
}

ProductManagerController --> ProductModel : CRUD
ProductController --> ProductModel : queries public
ProductModel --> ProductCategoryModel : belongsTo
ProductManagerController ..> ProductDto : <<use>>
@enduml
```

---

### 2.4: Giỏ hàng trực tuyến (Shopping Cart)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.4 Giỏ hàng trực tuyến (Shopping Cart)

class CartController {
  +getCart(req, res)
  +addItem(req, res)
  +updateItem(req, res)
  +deleteItem(req, res)
}

class CartModel {
  +cart_id: bigint
  +customer_account_id: bigint
  +findOne(options)
  +create(data)
}

class CartItemModel {
  +cart_item_id: bigint
  +cart_id: bigint
  +product_id: bigint
  +quantity: int
  +unit_price: decimal
  +upsert(data)
  +destroy(options)
}

class ProductModel {
  +product_id: bigint
  +product_name: string
  +stock_quantity: int
  +unit_price: decimal
}

class CartDto {
  +cart_id: bigint
  +total_amount: decimal
  +total_items: int
}

CartController --> CartModel : gets or creates
CartController --> CartItemModel : adds / removes items
CartItemModel --> ProductModel : references
CartModel "1" -- "0..*" CartItemModel : hasMany
CartController ..> CartDto : <<use>>
@enduml
```

---

### 2.5: Yêu cầu Đặt hàng & Thiết kế (Order Requests)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.5 Yêu cầu Đặt hàng & Thiết kế (Order Requests)

class SaleOrderController {
  +getRequests(req, res)
  +createSalesRequest(req, res)
  +updateSalesRequest(req, res)
  +convertRequestToContract(req, res)
}

class OrderManagementController {
  +getOwnerRequests(req, res)
  +reviewRequest(req, res)
}

class OrderRequestModel {
  +request_id: bigint
  +request_code: string
  +order_type: string
  +status: string
  +total_estimated_price: decimal
  +create(data)
  +update(data, options)
}

class OrderRequestItemModel {
  +request_item_id: bigint
  +request_id: bigint
  +custom_item_name: string
  +quantity: int
  +estimated_unit_price: decimal
}

class OrderRequestDto {
  +request_id: bigint
  +request_code: string
  +order_type: string
  +status: string
}

SaleOrderController --> OrderRequestModel : creates & converts
OrderManagementController --> OrderRequestModel : reviews & approves
OrderRequestModel "1" -- "1..*" OrderRequestItemModel : hasMany
SaleOrderController ..> OrderRequestDto : <<use>>
@enduml
```

---

### 2.6: Quản lý Hợp đồng Bán hàng (Sales Contract)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.6 Quản lý Hợp đồng Bán hàng (Sales Contract)

class SaleOrderController {
  +getContracts(req, res)
  +getContractById(req, res)
  +createOfflineContract(req, res)
  +signContract(req, res)
}

class ContractModel {
  +contract_id: bigint
  +customer_account_id: bigint
  +contract_code: string
  +status: string
  +total_amount: decimal
  +deposit_amount: decimal
  +create(data)
  +update(data, options)
}

class ContractItemModel {
  +contract_item_id: bigint
  +contract_id: bigint
  +product_id: bigint
  +quantity: int
  +unit_price: decimal
}

class ContractDto {
  +contract_id: bigint
  +contract_code: string
  +status: string
  +total_amount: decimal
}

SaleOrderController --> ContractModel : creates & signs
ContractModel "1" -- "1..*" ContractItemModel : hasMany
SaleOrderController ..> ContractDto : <<use>>
@enduml
```

---

### 2.7: Quản lý Đơn hàng Bán (Customer Orders)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.7 Quản lý Đơn hàng Bán (Customer Orders)

class OrderManagementController {
  +getOrders(req, res)
  +getOrderDetail(req, res)
  +updateOrderStatus(req, res)
  +assignLeader(req, res)
}

class SaleOrderController {
  +createOrderFromContract(req, res)
  +deliverOrder(req, res)
  +completeOrder(req, res)
}

class CustomerOrderModel {
  +order_id: bigint
  +contract_id: bigint
  +order_code: string
  +order_status: string
  +total_amount: decimal
  +create(data)
  +update(data, options)
}

class CustomerOrderItemModel {
  +order_item_id: bigint
  +order_id: bigint
  +product_id: bigint
  +quantity: int
  +unit_price: decimal
}

class CustomerOrderDto {
  +order_id: bigint
  +order_code: string
  +order_status: string
  +total_amount: decimal
}

OrderManagementController --> CustomerOrderModel : manages & assigns
SaleOrderController --> CustomerOrderModel : converts from contract
CustomerOrderModel "1" -- "1..*" CustomerOrderItemModel : hasMany
OrderManagementController ..> CustomerOrderDto : <<use>>
@enduml
```

---

### 2.8: Quản lý Nhà cung cấp (Supplier)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.8 Quản lý Nhà cung cấp (Supplier)

class SupplierController {
  +getSuppliers(req, res)
  +getSupplierById(req, res)
  +createSupplier(req, res)
  +updateSupplier(req, res)
  +deleteSupplier(req, res)
}

class SupplierModel {
  +supplier_id: bigint
  +supplier_code: string
  +supplier_name: string
  +phone_number: string
  +status: string
  +findAndCountAll(options)
  +create(data)
  +update(data, options)
  +destroy(options)
}

class SupplierDto {
  +supplier_id: bigint
  +supplier_code: string
  +supplier_name: string
  +phone_number: string
  +status: string
}

SupplierController --> SupplierModel : CRUD
SupplierController ..> SupplierDto : <<use>>
@enduml
```

---

### 2.9: Quản lý Nguyên vật liệu & Tồn kho (Raw Material)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.9 Quản lý Nguyên vật liệu & Tồn kho (Raw Material)

class RawMaterialController {
  +getRawMaterials(req, res)
  +getRawMaterialStockSummary(req, res)
  +createRawMaterial(req, res)
  +updateRawMaterial(req, res)
  +deleteRawMaterial(req, res)
}

class RawMaterialModel {
  +material_id: bigint
  +material_code: string
  +material_name: string
  +unit: string
  +quantity_on_hand: decimal
  +minimum_stock_level: decimal
  +findAndCountAll(options)
  +create(data)
  +update(data, options)
}

class RawMaterialDto {
  +material_id: bigint
  +material_code: string
  +material_name: string
  +quantity_on_hand: decimal
  +unit: string
}

RawMaterialController --> RawMaterialModel : CRUD & checks stock
RawMaterialController ..> RawMaterialDto : <<use>>
@enduml
```

---

### 2.10: Nhập kho Nguyên vật liệu (Material Receipt)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.10 Nhập kho Nguyên vật liệu (Material Receipt)

class PurchaseReceiptController {
  +getReceipts(req, res)
  +createReceipt(req, res)
  +confirmReceipt(req, res)
  +cancelReceipt(req, res)
}

class MaterialReceiptModel {
  +receipt_id: bigint
  +supplier_id: bigint
  +receipt_code: string
  +status: string
  +total_amount: decimal
  +create(data)
  +update(data, options)
}

class MaterialReceiptItemModel {
  +receipt_item_id: bigint
  +receipt_id: bigint
  +material_id: bigint
  +quantity: decimal
  +unit_price: decimal
}

class RawMaterialModel {
  +material_id: bigint
  +quantity_on_hand: decimal
  +increment(fields, options)
}

class PurchaseReceiptDto {
  +receipt_id: bigint
  +receipt_code: string
  +status: string
  +total_amount: decimal
}

PurchaseReceiptController --> MaterialReceiptModel : creates & confirms
PurchaseReceiptController --> RawMaterialModel : increases stock
MaterialReceiptModel "1" -- "1..*" MaterialReceiptItemModel : hasMany
PurchaseReceiptController ..> PurchaseReceiptDto : <<use>>
@enduml
```

---

### 2.11: Lệnh Sản xuất & Gia công (Production Order)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.11 Lệnh Sản xuất & Gia công (Production Order)

class ProductionOrderController {
  +getProductionOrders(req, res)
  +createProductionOrderHandler(req, res)
  +assignLeader(req, res)
}

class LeaderStaffController {
  +getLeaderOrders(req, res)
  +leaderAccept(req, res)
  +leaderProgress(req, res)
}

class ProductionOrderModel {
  +production_order_id: bigint
  +customer_order_id: bigint
  +leader_account_id: bigint
  +production_order_code: string
  +status: string
  +progress_percent: int
  +create(data)
  +update(data, options)
}

class ProductionOrderItemModel {
  +production_order_item_id: bigint
  +production_order_id: bigint
  +custom_item_name: string
  +quantity: int
}

class ProductionOrderDto {
  +production_order_id: bigint
  +production_order_code: string
  +status: string
  +progress_percent: int
}

ProductionOrderController --> ProductionOrderModel : creates & assigns
LeaderStaffController --> ProductionOrderModel : accepts & updates progress
ProductionOrderModel "1" -- "1..*" ProductionOrderItemModel : hasMany
ProductionOrderController ..> ProductionOrderDto : <<use>>
@enduml
```

---

### 2.12: Xuất kho Nguyên vật liệu (Material Issue)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.12 Xuất kho Nguyên vật liệu (Material Issue)

class MaterialExportController {
  +getMaterialExports(req, res)
  +createMaterialExport(req, res)
  +confirmMaterialExport(req, res)
  +cancelMaterialExport(req, res)
}

class MaterialIssueModel {
  +issue_id: bigint
  +production_order_id: bigint
  +issue_code: string
  +status: string
  +total_cost: decimal
  +create(data)
  +update(data, options)
}

class MaterialIssueItemModel {
  +issue_item_id: bigint
  +issue_id: bigint
  +material_id: bigint
  +quantity_issued: decimal
}

class RawMaterialModel {
  +material_id: bigint
  +quantity_on_hand: decimal
  +decrement(fields, options)
}

class MaterialExportDto {
  +issue_id: bigint
  +issue_code: string
  +status: string
  +total_cost: decimal
}

MaterialExportController --> MaterialIssueModel : creates & confirms
MaterialExportController --> RawMaterialModel : decrements stock
MaterialIssueModel "1" -- "1..*" MaterialIssueItemModel : hasMany
MaterialExportController ..> MaterialExportDto : <<use>>
@enduml
```

---

### 2.13: Nghiệm thu & Nhập kho Thành phẩm (Finished Goods)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.13 Nghiệm thu & Nhập kho Thành phẩm (Finished Goods)

class LeaderStaffController {
  +leaderSubmit(req, res)
}

class OrderManagementController {
  +inspectOrder(req, res)
}

class FinishedGoodsReceiptModel {
  +receipt_id: bigint
  +customer_order_id: bigint
  +receipt_code: string
  +inspection_status: string
  +create(data)
  +update(data, options)
}

class ProductModel {
  +product_id: bigint
  +stock_quantity: int
  +increment(fields, options)
}

class FinishedGoodsReceiptDto {
  +receipt_id: bigint
  +receipt_code: string
  +inspection_status: string
}

LeaderStaffController --> FinishedGoodsReceiptModel : submits for inspection
OrderManagementController --> FinishedGoodsReceiptModel : reviews inspection
OrderManagementController --> ProductModel : increments finished stock
OrderManagementController ..> FinishedGoodsReceiptDto : <<use>>
@enduml
```

---

### 2.14: Báo cáo Tài chính & Doanh thu (Financial Reports)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
    BackgroundColor White
    BorderColor Black
    ArrowColor Black
    HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2.14 Báo cáo Tài chính & Doanh thu (Financial Reports)

class FinancialReportController {
  +getFinancialSummary(req, res)
  +getFinancialOrders(req, res)
  +getFinancialReceipts(req, res)
  +exportFinancialReport(req, res)
}

class FinancialReportModel {
  +calculateSummary(startDate, endDate)
  +getOrderRevenueList(filter)
  +getMaterialExpenseList(filter)
}

class CustomerOrderModel {
  +order_id: bigint
  +total_amount: decimal
  +findAll(options)
}

class MaterialReceiptModel {
  +receipt_id: bigint
  +total_amount: decimal
  +findAll(options)
}

class FinancialSummaryDto {
  +total_revenue: decimal
  +total_material_cost: decimal
  +gross_profit: decimal
}

FinancialReportController --> FinancialReportModel : generates metrics
FinancialReportModel --> CustomerOrderModel : sums revenue
FinancialReportModel --> MaterialReceiptModel : sums expenses
FinancialReportController ..> FinancialSummaryDto : <<use>>
@enduml
```
