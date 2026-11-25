# CLASS DIAGRAM — CẤU TRÚC THỰC TẾ FS-SIMS

> Các sơ đồ lấy tên controller, hàm export, model và service từ mã nguồn hiện tại. Backend chạy theo luồng Express route → controller → Sequelize model/model module; schema nằm trong `database/init.sql`. Không thêm DTO hay repository nếu code không có các lớp đó.


## 2.1: Xác thực & Phân quyền

> Lưu ý đối chiếu code: `authRoutes.js` đang dùng `register`, nhưng `authController.js` hiện không khai báo hàm này. Luồng đăng ký trong sequence mô tả use case dự kiến; endpoint hiện chưa chạy được cho đến khi handler có lại.

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.1: Xác thực & Phân quyền — MVC theo code

class authController <<Express Controller>> {
  +login()
  +refreshToken()
  +logout()
  +forgotPassword()
}

class staffAuthController <<Express Controller>> {
  +staffLogin()
}

class UserAccount <<Sequelize Model / Model module>>

class UserRole <<Sequelize Model / Model module>>

class RefreshToken <<Sequelize Model / Model module>>

class mailService <<Service>>
authController --> UserAccount : gọi model
authController --> UserRole : gọi model
authController --> RefreshToken : gọi model
authController --> mailService : dùng service
staffAuthController --> UserAccount : gọi model
staffAuthController --> UserRole : gọi model
staffAuthController --> RefreshToken : gọi model
@enduml
```

## 2.2: Hồ sơ & Nhân sự

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.2: Hồ sơ & Nhân sự — MVC theo code

class userController <<Express Controller>> {
  +getProfile()
  +updateProfile()
  +changePassword()
}

class staffAccountController <<Express Controller>> {
  +listStaffAccounts()
  +listStaffRoles()
  +getStaffAccountDetail()
  +createStaffAccount()
  +updateStaffAccount()
  +changeStaffAccountStatus()
  +removeStaffAccount()
}

class UserAccount <<Sequelize Model / Model module>>

class UserRole <<Sequelize Model / Model module>>

class cloudinaryService <<Service>>
userController --> UserAccount : gọi model
userController --> cloudinaryService : dùng service
staffAccountController --> UserAccount : gọi model
staffAccountController --> UserRole : gọi model
@enduml
```

## 2.3: Sản phẩm & Danh mục

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.3: Sản phẩm & Danh mục — MVC theo code

class productController <<Express Controller>> {
  +getProducts()
  +getProductById()
  +getProductMetadata()
}

class productManagerController <<Express Controller>> {
  +getProducts()
  +getProductMetadata()
  +getProductStockSummary()
  +getNextProductCode()
  +getProductById()
  +createProduct()
  +updateProduct()
  +deleteProduct()
  +createProductMaterial()
  +createProductColor()
}

class Product <<Sequelize Model / Model module>>

class ProductCategory <<Sequelize Model / Model module>>

class ProductRoom <<Sequelize Model / Model module>>

class ProductMaterial <<Sequelize Model / Model module>>

class ProductColor <<Sequelize Model / Model module>>

class ProductSetItem <<Sequelize Model / Model module>>

class cloudinaryService <<Service>>
productController --> Product : gọi model
productManagerController --> Product : gọi model
productManagerController --> ProductMaterial : gọi model
productManagerController --> ProductColor : gọi model
productManagerController --> cloudinaryService : dùng service
@enduml
```

## 2.4: Giỏ hàng

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.4: Giỏ hàng — MVC theo code

class cartController <<Express Controller>> {
  +getCart()
  +addItem()
  +updateItem()
  +deleteItem()
}

class Cart <<Sequelize Model / Model module>>

class CartItem <<Sequelize Model / Model module>>

class Product <<Sequelize Model / Model module>>
cartController --> Cart : gọi model
@enduml
```

## 2.5: Yêu cầu Đặt hàng & Thiết kế

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.5: Yêu cầu Đặt hàng & Thiết kế — MVC theo code

class saleOrderController <<Express Controller>> {
  +getWarehouseProducts()
  +getProductDetail()
  +getProductMetadata()
  +createOfflineContract()
  +signContract()
  +getContracts()
  +getContractById()
  +createOrderFromContract()
  +getOrders()
  +getOrderById()
  +getRequests()
  +getRequestById()
  +convertRequestToContract()
  +createSalesRequest()
  +updateSalesRequest()
  +deliverOrder()
  +completeOrder()
  +updateDesignFile()
  +deleteDesignImage()
  +getSaleCustomers()
  +getSaleCustomerById()
  +getCustomers()
  +getCustomerById()
}

class orderManagementController <<Express Controller>> {
  +getOrders()
  +getOrderDetail()
  +cancelOrder()
  +updateOrderStatus()
  +getOwnerRequests()
  +getOwnerRequestDetail()
  +reviewRequest()
  +getStaffLeaders()
  +assignLeader()
  +inspectOrder()
}

class orderRequestController <<Express Controller>> {
  +createCartOrderRequest()
}

class customerOrderController <<Express Controller>> {
  +getMyOrders()
  +getMyOrderById()
  +getMyOrderRequestById()
}

class OrderRequest <<Sequelize Model / Model module>>

class OrderRequestItem <<Sequelize Model / Model module>>

class OrderRequestImage <<Sequelize Model / Model module>>

class SaleRequestModel <<Sequelize Model / Model module>>

class Contract <<Sequelize Model / Model module>>

class UserAccount <<Sequelize Model / Model module>>
saleOrderController --> Contract : gọi model
orderManagementController --> UserAccount : gọi model
orderRequestController --> OrderRequest : gọi model
@enduml
```

## 2.6: Hợp đồng Bán hàng

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.6: Hợp đồng Bán hàng — MVC theo code

class saleOrderController <<Express Controller>> {
  +getWarehouseProducts()
  +getProductDetail()
  +getProductMetadata()
  +createOfflineContract()
  +signContract()
  +getContracts()
  +getContractById()
  +createOrderFromContract()
  +getOrders()
  +getOrderById()
  +getRequests()
  +getRequestById()
  +convertRequestToContract()
  +createSalesRequest()
  +updateSalesRequest()
  +deliverOrder()
  +completeOrder()
  +updateDesignFile()
  +deleteDesignImage()
  +getSaleCustomers()
  +getSaleCustomerById()
  +getCustomers()
  +getCustomerById()
}

class Contract <<Sequelize Model / Model module>>

class ContractItem <<Sequelize Model / Model module>>

class Product <<Sequelize Model / Model module>>

class OrderRequest <<Sequelize Model / Model module>>
saleOrderController --> Contract : gọi model
saleOrderController --> Product : gọi model
@enduml
```

## 2.7: Đơn hàng Bán

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.7: Đơn hàng Bán — MVC theo code

class saleOrderController <<Express Controller>> {
  +getWarehouseProducts()
  +getProductDetail()
  +getProductMetadata()
  +createOfflineContract()
  +signContract()
  +getContracts()
  +getContractById()
  +createOrderFromContract()
  +getOrders()
  +getOrderById()
  +getRequests()
  +getRequestById()
  +convertRequestToContract()
  +createSalesRequest()
  +updateSalesRequest()
  +deliverOrder()
  +completeOrder()
  +updateDesignFile()
  +deleteDesignImage()
  +getSaleCustomers()
  +getSaleCustomerById()
  +getCustomers()
  +getCustomerById()
}

class customerOrderController <<Express Controller>> {
  +getMyOrders()
  +getMyOrderById()
  +getMyOrderRequestById()
}

class orderManagementController <<Express Controller>> {
  +getOrders()
  +getOrderDetail()
  +cancelOrder()
  +updateOrderStatus()
  +getOwnerRequests()
  +getOwnerRequestDetail()
  +reviewRequest()
  +getStaffLeaders()
  +assignLeader()
  +inspectOrder()
}

class leaderStaffController <<Express Controller>> {
  +getLeaderOrders()
  +getLeaderOrderDetail()
  +leaderAccept()
  +leaderProgress()
  +leaderSubmit()
}

class CustomerOrder <<Sequelize Model / Model module>>

class CustomerOrderItem <<Sequelize Model / Model module>>

class CustomerOrderImage <<Sequelize Model / Model module>>

class Contract <<Sequelize Model / Model module>>

class ProductionOrder <<Sequelize Model / Model module>>
saleOrderController --> CustomerOrder : gọi model
saleOrderController --> Contract : gọi model
customerOrderController --> CustomerOrder : gọi model
orderManagementController --> CustomerOrder : gọi model
leaderStaffController --> CustomerOrder : gọi model
@enduml
```

## 2.8: Nhà cung cấp

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.8: Nhà cung cấp — MVC theo code

class supplierController <<Express Controller>> {
  +getSuppliers()
  +getActiveSuppliers()
  +getNextSupplierCode()
  +getSupplierById()
  +createSupplier()
  +updateSupplier()
  +deleteSupplier()
}

class Supplier <<Sequelize Model / Model module>>
supplierController --> Supplier : gọi model
@enduml
```

## 2.9: Nguyên vật liệu

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.9: Nguyên vật liệu — MVC theo code

class rawMaterialController <<Express Controller>> {
  +getRawMaterials()
  +getRawMaterialStockSummary()
  +getNextRawMaterialCode()
  +getRawMaterialById()
  +createRawMaterial()
  +updateRawMaterial()
  +deleteRawMaterial()
}

class RawMaterial <<Sequelize Model / Model module>>

class ProductMaterial <<Sequelize Model / Model module>>
rawMaterialController --> RawMaterial : gọi model
@enduml
```

## 2.10: Nhập kho Nguyên vật liệu

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.10: Nhập kho Nguyên vật liệu — MVC theo code

class purchaseReceiptController <<Express Controller>> {
  +getReceipts()
  +getReceiptSummary()
  +getNextReceiptCode()
  +getReceiptById()
  +createReceipt()
  +updateReceipt()
  +confirmReceipt()
  +cancelReceipt()
  +deleteReceipt()
}

class MaterialReceipt <<Sequelize Model / Model module>>

class MaterialReceiptItem <<Sequelize Model / Model module>>

class Supplier <<Sequelize Model / Model module>>

class RawMaterial <<Sequelize Model / Model module>>
purchaseReceiptController --> MaterialReceipt : gọi model
purchaseReceiptController --> Supplier : gọi model
purchaseReceiptController --> RawMaterial : gọi model
@enduml
```

## 2.11: Lệnh Sản xuất

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.11: Lệnh Sản xuất — MVC theo code

class productionOrderController <<Express Controller>> {
  +getProductionOrders()
  +getEligibleOrders()
  +getStaffLeadersList()
  +createProductionOrderHandler()
  +assignLeader()
  +cancelProductionOrderHandler()
}

class leaderStaffController <<Express Controller>> {
  +getLeaderOrders()
  +getLeaderOrderDetail()
  +leaderAccept()
  +leaderProgress()
  +leaderSubmit()
}

class ProductionOrder <<Sequelize Model / Model module>>

class ProductionOrderItem <<Sequelize Model / Model module>>

class CustomerOrder <<Sequelize Model / Model module>>

class UserAccount <<Sequelize Model / Model module>>
productionOrderController --> ProductionOrder : gọi model
productionOrderController --> UserAccount : gọi model
leaderStaffController --> CustomerOrder : gọi model
@enduml
```

## 2.12: Xuất kho Nguyên vật liệu

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.12: Xuất kho Nguyên vật liệu — MVC theo code

class materialExportController <<Express Controller>> {
  +getMaterialExports()
  +getMaterialExportSummary()
  +getNextMaterialExportCode()
  +getProductionOrdersList()
  +getMaterialExportById()
  +createMaterialExport()
  +updateMaterialExport()
  +confirmMaterialExport()
  +cancelMaterialExport()
  +deleteMaterialExport()
}

class MaterialIssue <<Sequelize Model / Model module>>

class MaterialIssueItem <<Sequelize Model / Model module>>

class ProductionOrder <<Sequelize Model / Model module>>

class RawMaterial <<Sequelize Model / Model module>>
materialExportController --> MaterialIssue : gọi model
materialExportController --> ProductionOrder : gọi model
materialExportController --> RawMaterial : gọi model
@enduml
```

## 2.13: Nghiệm thu Thành phẩm

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.13: Nghiệm thu Thành phẩm — MVC theo code

class leaderStaffController <<Express Controller>> {
  +getLeaderOrders()
  +getLeaderOrderDetail()
  +leaderAccept()
  +leaderProgress()
  +leaderSubmit()
}

class orderManagementController <<Express Controller>> {
  +getOrders()
  +getOrderDetail()
  +cancelOrder()
  +updateOrderStatus()
  +getOwnerRequests()
  +getOwnerRequestDetail()
  +reviewRequest()
  +getStaffLeaders()
  +assignLeader()
  +inspectOrder()
}

class FinishedGoodsReceipt <<Sequelize Model / Model module>>

class FinishedGoodsReceiptItem <<Sequelize Model / Model module>>

class ProductionOrder <<Sequelize Model / Model module>>

class Product <<Sequelize Model / Model module>>
@enduml
```

## 2.14: Báo cáo Tài chính

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title 2.14: Báo cáo Tài chính — MVC theo code

class financialReportController <<Express Controller>> {
  +getFinancialSummary()
  +getFinancialOrders()
  +getFinancialReceipts()
  +exportFinancialReport()
}

class financialReportModel <<Sequelize Model / Model module>>

class CustomerOrder <<Sequelize Model / Model module>>

class MaterialReceipt <<Sequelize Model / Model module>>

class MaterialIssue <<Sequelize Model / Model module>>
financialReportController --> financialReportModel : gọi model
@enduml
```
