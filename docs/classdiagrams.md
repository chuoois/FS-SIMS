# CLASS DIAGRAMS FS-SIMS

## 1 Authentication & Account Access

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 1 Authentication & Account Access

class "authController" as C0 {
  +login(req, res, next)
  +refreshToken(req, res, next)
  +logout(req, res, next)
  +forgotPassword(req, res, next)
}

class "staffAuthController" as C1 {
  +staffLogin(req, res)
}

class "UserAccountModel" as M0 {
  +user_account_id: bigint
  +role_id: bigint
  +email: string
  +password_hash: string
  +status: string
  +full_name: string
  +phone_number: string
  +dob: date
  +gender: string
  +address: string
  +avatar_url: string
  +note: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
}

class "UserRoleModel" as M1 {
  +role_id: bigint
  +role_code: string
  +role_name: string
  +description: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
  +findUserRoleByCode(roleCode)
}

class "RefreshTokenModel" as M2 {
  +refresh_token_id: bigint
  +user_account_id: bigint
  +token: string
  +expires_at: datetime
  +modifiedate: datetime
  +createby: string
  +modifieby: string
  +createRefreshToken(data)
}

class "MailService" as S0 {
  +sendWelcomeEmail(toEmail, userName)
  +sendNewPasswordEmail(toEmail, userName, newPassword)
  +sendMail(data)
}

C0 --> M0 : uses
C0 --> M1 : uses
C0 --> M2 : uses
C0 --> S0 : uses
C1 --> M0 : uses
C1 --> M1 : uses
C1 --> M2 : uses
M0 --> M1 : belongs to
M2 --> M0 : belongs to
@enduml
```

## 2 Manage Profile

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 2 Manage Profile

class "userController" as C0 {
  +getProfile(req, res, next)
  +updateProfile(req, res, next)
  +changePassword(req, res, next)
}

class "UserAccountModel" as M0 {
  +user_account_id: bigint
  +role_id: bigint
  +email: string
  +password_hash: string
  +status: string
  +full_name: string
  +phone_number: string
  +dob: date
  +gender: string
  +address: string
  +avatar_url: string
  +note: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
  +findUserAccountById(userAccountId)
  +findUserAccountByEmail(email)
  +updateUserProfile(userAccountId, data, modifiedBy)
  +updateUserPassword(userAccountId, passwordHash)
}

class "CloudinaryService" as S0 {
  +deleteImage(publicId)
  +getPublicIdFromUrl(url)
}

C0 --> M0 : uses
C0 --> S0 : uses
@enduml
```

## 3 View Products

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 3 View Products

class "productController" as C0 {
  +getProducts(req, res, next)
  +getProductById(req, res, next)
  +getProductMetadata(req, res, next)
}

class "productManagerController" as C1 {
  +getProducts(req, res)
  +getProductMetadata(req, res)
  +getProductStockSummary(req, res)
  +getNextProductCode(req, res)
  +getProductById(req, res)
  +createProduct(req, res)
  +updateProduct(req, res)
  +deleteProduct(req, res)
  +createProductMaterial(req, res)
  +createProductColor(req, res)
}

class "ProductModel" as M0 {
  +product_id: bigint
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +product_code: string
  +product_name: string
  +product_type: string
  +description: string
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +price: integer
  +stock_quantity: integer
  +hold_quantity: integer
  +image_url: string
  +status: string
  +createby: string
  +modifieby: string
  +findProductById(productId)
  +findProductByCode(productCode)
  +getProductsWithPagination(data)
  +countProductUsage(productId)
  +createProduct(productData)
  +updateProduct(productId, updateData)
  +updateProductSetItems(setProductId, setItems, modifieby)
  +deleteProduct(productId)
  +generateNextProductCode()
  +getProductMetadata()
  +getProductStockSummary()
}

class "ProductMaterialModel" as M1 {
  +material_id: bigint
  +material_code: string
  +material_name: string
  +description: string
  +createby: string
  +modifieby: string
  +createProductMaterial(data)
}

class "ProductColorModel" as M2 {
  +color_id: bigint
  +color_code: string
  +color_name: string
  +hex_value: string
  +createby: string
  +modifieby: string
  +createProductColor(data)
}

class "ProductCategoryModel" as M3 {
  +category_id: bigint
  +category_code: string
  +category_name: string
  +description: string
  +createby: string
  +modifieby: string
}

class "ProductRoomModel" as M4 {
  +room_id: bigint
  +room_code: string
  +room_name: string
  +description: string
  +createby: string
  +modifieby: string
}

class "ProductSetItemModel" as M5 {
  +set_item_id: bigint
  +set_product_id: bigint
  +item_product_id: bigint
  +quantity: integer
  +createby: string
  +modifieby: string
}

class "CloudinaryService" as S0 {
  +deleteImage(publicId)
  +getPublicIdFromUrl(url)
}

C0 --> M0 : uses
C1 --> M0 : uses
C1 --> M1 : uses
C1 --> M2 : uses
C1 --> S0 : uses
M0 --> M3 : belongs to
M0 --> M4 : belongs to
M0 --> M1 : belongs to
M0 --> M2 : belongs to
M5 --> M0 : belongs to
@enduml
```

## 4 Manage Cart

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 4 Manage Cart

class "cartController" as C0 {
  +getCart(req, res, next)
  +addItem(req, res, next)
  +updateItem(req, res, next)
  +deleteItem(req, res, next)
}

class "CartModel" as M0 {
  +cart_id: bigint
  +customer_account_id: bigint
  +createby: string
  +modifieby: string
  +findOrCreateCart(customerAccountId, actor)
  +getCartItems(cartId)
  +addProductToCart(customerAccountId, productId, quantity, actor)
  +updateCartItemQuantity(customerAccountId, productId, quantity, actor)
  +removeCartItem(customerAccountId, productId, actor)
}

class "CartItemModel" as M1 {
  +cart_item_id: bigint
  +cart_id: bigint
  +product_id: bigint
  +quantity: integer
  +createby: string
  +modifieby: string
}

class "ProductModel" as M2 {
  +product_id: bigint
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +product_code: string
  +product_name: string
  +product_type: string
  +description: string
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +price: integer
  +stock_quantity: integer
  +hold_quantity: integer
  +image_url: string
  +status: string
  +createby: string
  +modifieby: string
}

C0 --> M0 : uses
M1 --> M0 : belongs to
M1 --> M2 : belongs to
@enduml
```

## 5 Manage Order

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 5 Manage Order

class "saleOrderController" as C0 {
  +getProductDetail(req, res)
  +getProductMetadata(req, res)
  +createOrderFromContract(req, res)
  +getOrders(req, res)
  +getOrderById(req, res)
  +deliverOrder(req, res)
  +completeOrder(req, res)
}

class "customerOrderController" as C1 {
  +getMyOrders(req, res, next)
  +getMyOrderById(req, res, next)
  +getMyOrderRequestById(req, res, next)
}

class "orderManagementController" as C2 {
  +getOrders(req, res)
  +getOrderDetail(req, res)
  +cancelOrder(req, res)
  +updateOrderStatus(req, res)
  +getOwnerRequests(req, res)
  +getOwnerRequestDetail(req, res)
  +reviewRequest(req, res)
  +getStaffLeaders(req, res)
  +assignLeader(req, res)
  +inspectOrder(req, res)
}

class "ProductModel" as M0 {
  +product_id: bigint
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +product_code: string
  +product_name: string
  +product_type: string
  +description: string
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +price: integer
  +stock_quantity: integer
  +hold_quantity: integer
  +image_url: string
  +status: string
  +createby: string
  +modifieby: string
  +getProductsWithPagination(data)
  +getProductMetadata()
  +findProductById(productId)
}

class "CustomerOrderModel" as M1 {
  +order_id: bigint
  +order_code: string
  +order_type: string
  +contract_id: bigint
  +customer_account_id: bigint
  +contact_name: string
  +contact_phone: string
  +delivery_address: string
  +total_amount: bigint
  +deposit_amount: bigint
  +paid_amount: bigint
  +status: string
  +expected_date: date
  +delivered_date: date
  +assigned_to: bigint
  +note: string
  +createby: string
  +modifieby: string
  +getOrdersWithPagination(data)
  +findOrderById(orderId)
  +cancelOrder(orderId, data)
  +updateOrderStatus(orderId, newStatus, data)
  +assignLeaderToCustomerOrder(orderId, leaderId, data)
  +ownerInspectOrder(orderId, data)
}

class "SaleRequestModel" as M2 {
  +getRequestsWithPagination(data)
  +findRequestById(requestId)
  +reviewOrderRequest(requestId, action, data)
}

class "UserAccountModel" as M3 {
  +user_account_id: bigint
  +role_id: bigint
  +email: string
  +password_hash: string
  +status: string
  +full_name: string
  +phone_number: string
  +dob: date
  +gender: string
  +address: string
  +avatar_url: string
  +note: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
}

class "UserRoleModel" as M4 {
  +role_id: bigint
  +role_code: string
  +role_name: string
  +description: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
}

class "ContractModel" as M5 {
  +contract_id: bigint
  +contract_code: string
  +contract_type: string
  +request_id: bigint
  +customer_account_id: bigint
  +customer_name: string
  +customer_phone: string
  +customer_address: string
  +total_amount: bigint
  +deposit_amount: bigint
  +status: string
  +signed_date: date
  +signed_place: string
  +delivery_date: date
  +contract_file_url: string
  +terms: string
  +signed_by: bigint
  +note: string
  +createby: string
  +modifieby: string
}

class "ContractItemModel" as M6 {
  +contract_item_id: bigint
  +contract_id: bigint
  +product_id: bigint
  +request_item_id: bigint
  +item_name: string
  +description: string
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +quantity: integer
  +unit_price: integer
  +createby: string
  +modifieby: string
}

class "CustomerOrderItemModel" as M7 {
  +order_item_id: bigint
  +order_id: bigint
  +contract_item_id: bigint
  +product_id: bigint
  +item_name: string
  +description: string
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +quantity: integer
  +unit_price: integer
  +createby: string
  +modifieby: string
}

class "CustomerOrderImageModel" as M8 {
  +order_image_id: bigint
  +order_id: bigint
  +order_item_id: bigint
  +image_url: string
  +image_type: string
  +sort_order: integer
  +createby: string
  +modifieby: string
}

C0 --> M0 : uses
C0 --> M1 : uses
C1 --> M1 : uses
C2 --> M1 : uses
C2 --> M2 : uses
C2 --> M3 : uses
C2 --> M4 : uses
M1 --> M5 : belongs to
M1 --> M3 : belongs to
M3 --> M4 : belongs to
M5 --> M3 : belongs to
M6 --> M5 : belongs to
M6 --> M0 : belongs to
M7 --> M1 : belongs to
M7 --> M6 : belongs to
M7 --> M0 : belongs to
M8 --> M1 : belongs to
M8 --> M7 : belongs to
@enduml
```

## 7 Submit Purchase Request

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 7 Submit Purchase Request

class "orderRequestController" as C0 {
  +createCartOrderRequest(req, res)
}

class "OrderRequestModel" as M0 {
  +request_id: bigint
  +request_code: string
  +order_type: string
  +request_type: string
  +customer_account_id: bigint
  +contact_name: string
  +contact_phone: string
  +contact_email: string
  +delivery_address: string
  +title: string
  +description: string
  +budget_min: integer
  +budget_max: integer
  +expected_date: date
  +status: string
  +assigned_to: bigint
  +quoted_price: integer
  +quoted_at: datetime
  +approved_at: datetime
  +staff_note: string
  +reject_reason: string
  +createby: string
  +modifieby: string
  +createReadyOrderRequestFromCart(data)
}

class "OrderRequestItemModel" as M1 {
  +request_item_id: bigint
  +request_id: bigint
  +product_id: bigint
  +item_name: string
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +quantity: integer
  +unit_price: integer
  +description: string
  +createby: string
  +modifieby: string
}

class "OrderRequestImageModel" as M2 {
  +request_image_id: bigint
  +request_id: bigint
  +request_item_id: bigint
  +image_url: string
  +sort_order: integer
  +createby: string
  +modifieby: string
}

class "CartModel" as M3 {
  +cart_id: bigint
  +customer_account_id: bigint
  +createby: string
  +modifieby: string
}

class "CartItemModel" as M4 {
  +cart_item_id: bigint
  +cart_id: bigint
  +product_id: bigint
  +quantity: integer
  +createby: string
  +modifieby: string
}

class "ProductModel" as M5 {
  +product_id: bigint
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +product_code: string
  +product_name: string
  +product_type: string
  +description: string
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +price: integer
  +stock_quantity: integer
  +hold_quantity: integer
  +image_url: string
  +status: string
  +createby: string
  +modifieby: string
}

C0 --> M0 : uses
M1 --> M0 : belongs to
M1 --> M5 : belongs to
M2 --> M0 : belongs to
M2 --> M1 : belongs to
M4 --> M3 : belongs to
M4 --> M5 : belongs to
@enduml
```

## 8 Manage Customer

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 8 Manage Customer

class "saleCustomerController" as C0 {
  +getSaleCustomers(req, res)
  +getSaleCustomerById(req, res)
  +createSaleCustomer(req, res)
}

class "SaleCustomerModel" as M0 {
  +getCustomersWithPagination(data)
  +findCustomerById(customerId)
  +createCustomerBySales(data)
}

class "SaleRequestModel" as M1 {
  +getCustomersForSales(data)
}

class "UserAccountModel" as M2 {
  +user_account_id: bigint
  +role_id: bigint
  +email: string
  +password_hash: string
  +status: string
  +full_name: string
  +phone_number: string
  +dob: date
  +gender: string
  +address: string
  +avatar_url: string
  +note: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
}

class "UserRoleModel" as M3 {
  +role_id: bigint
  +role_code: string
  +role_name: string
  +description: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
}

class "CustomerOrderModel" as M4 {
  +order_id: bigint
  +order_code: string
  +order_type: string
  +contract_id: bigint
  +customer_account_id: bigint
  +contact_name: string
  +contact_phone: string
  +delivery_address: string
  +total_amount: bigint
  +deposit_amount: bigint
  +paid_amount: bigint
  +status: string
  +expected_date: date
  +delivered_date: date
  +assigned_to: bigint
  +note: string
  +createby: string
  +modifieby: string
}

class "ContractModel" as M5 {
  +contract_id: bigint
  +contract_code: string
  +contract_type: string
  +request_id: bigint
  +customer_account_id: bigint
  +customer_name: string
  +customer_phone: string
  +customer_address: string
  +total_amount: bigint
  +deposit_amount: bigint
  +status: string
  +signed_date: date
  +signed_place: string
  +delivery_date: date
  +contract_file_url: string
  +terms: string
  +signed_by: bigint
  +note: string
  +createby: string
  +modifieby: string
}

C0 --> M0 : uses
C0 --> M1 : uses
M2 --> M3 : belongs to
M4 --> M5 : belongs to
M4 --> M2 : belongs to
M5 --> M2 : belongs to
@enduml
```

## 9 Manage Order Requirement

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 9 Manage Order Requirement

class "saleContractController" as C0 {
  +getRequests(req, res)
  +getRequestById(req, res)
  +createSalesRequest(req, res)
  +updateSalesRequest(req, res)
}

class "SaleRequestModel" as M1 {
  +getRequestsWithPagination(data)
  +findRequestById(requestId)
  +convertRequestToContract(data)
  +updateDesignFile(requestId, data)
  +deleteDesignImage(requestId, imageId, deletedBy)
  +createSalesOrderRequest(data)
  +updateSalesOrderRequest(requestId, data)
}

class "OrderRequestModel" as M2 {
  +request_id: bigint
  +request_code: string
  +order_type: string
  +request_type: string
  +customer_account_id: bigint
  +contact_name: string
  +contact_phone: string
  +contact_email: string
  +delivery_address: string
  +title: string
  +description: string
  +budget_min: integer
  +budget_max: integer
  +expected_date: date
  +status: string
  +assigned_to: bigint
  +quoted_price: integer
  +quoted_at: datetime
  +approved_at: datetime
  +staff_note: string
  +reject_reason: string
  +createby: string
  +modifieby: string
}

class "OrderRequestItemModel" as M3 {
  +request_item_id: bigint
  +request_id: bigint
  +product_id: bigint
  +item_name: string
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +quantity: integer
  +unit_price: integer
  +description: string
  +createby: string
  +modifieby: string
}

class "OrderRequestImageModel" as M4 {
  +request_image_id: bigint
  +request_id: bigint
  +request_item_id: bigint
  +image_url: string
  +sort_order: integer
  +createby: string
  +modifieby: string
}

class "UserAccountModel" as M5 {
  +user_account_id: bigint
  +role_id: bigint
  +email: string
  +password_hash: string
  +status: string
  +full_name: string
  +phone_number: string
  +dob: date
  +gender: string
  +address: string
  +avatar_url: string
  +note: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
}

C0 --> M1 : uses
C0 --> M2 : uses
M2 --> M5 : belongs to
M3 --> M2 : belongs to
M4 --> M2 : belongs to
M4 --> M3 : belongs to
@enduml
```

## 10 Manage Customer Requests

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 10 Manage Customer Requests

class "saleContractController" as C0 {
  +getRequestById(req, res)
  +updateDesignFile(req, res)
  +deleteDesignImage(req, res)
}

class "orderManagementController" as C1 {
  +getOwnerRequests(req, res)
  +getOwnerRequestDetail(req, res)
  +reviewRequest(req, res)
}

class "SaleRequestModel" as M1 {
  +getRequestsWithPagination(data)
  +findRequestById(requestId)
  +reviewOrderRequest(requestId, action, data)
}

class "OrderRequestModel" as M2 {
  +request_id: bigint
  +request_code: string
  +order_type: string
  +request_type: string
  +customer_account_id: bigint
  +contact_name: string
  +contact_phone: string
  +contact_email: string
  +delivery_address: string
  +title: string
  +description: string
  +budget_min: integer
  +budget_max: integer
  +expected_date: date
  +status: string
  +assigned_to: bigint
  +quoted_price: integer
  +quoted_at: datetime
  +approved_at: datetime
  +staff_note: string
  +reject_reason: string
  +createby: string
  +modifieby: string
}

class "UserAccountModel" as M4 {
  +user_account_id: bigint
  +role_id: bigint
  +email: string
  +password_hash: string
  +status: string
  +full_name: string
  +phone_number: string
  +dob: date
  +gender: string
  +address: string
  +avatar_url: string
  +note: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
}

class "OrderRequestItemModel" as M6 {
  +request_item_id: bigint
  +request_id: bigint
  +product_id: bigint
  +item_name: string
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +quantity: integer
  +unit_price: integer
  +description: string
  +createby: string
  +modifieby: string
}

class "OrderRequestImageModel" as M7 {
  +request_image_id: bigint
  +request_id: bigint
  +request_item_id: bigint
  +image_url: string
  +sort_order: integer
  +createby: string
  +modifieby: string
}

C0 --> M1 : uses
C0 --> M2 : uses
C1 --> M1 : uses
C1 --> M4 : uses
M2 --> M4 : belongs to
M6 --> M2 : belongs to
M7 --> M2 : belongs to
M7 --> M6 : belongs to
@enduml
```

## 11 Manage Contract

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 11 Manage Contract

class "saleContractController" as C0 {
  +createOfflineContract(req, res)
  +signContract(req, res)
  +getContracts(req, res)
  +getContractById(req, res)
  +convertRequestToContract(req, res)
}

class "saleOrderController" as C1 {
  +createOrderFromContract(req, res)
}

class "ContractModel" as M0 {
  +contract_id: bigint
  +contract_code: string
  +contract_type: string
  +request_id: bigint
  +customer_account_id: bigint
  +customer_name: string
  +customer_phone: string
  +customer_address: string
  +total_amount: bigint
  +deposit_amount: bigint
  +status: string
  +signed_date: date
  +signed_place: string
  +delivery_date: date
  +contract_file_url: string
  +terms: string
  +signed_by: bigint
  +note: string
  +createby: string
  +modifieby: string
  +createOfflineContract(data)
  +signContract(contractId, data)
  +findContractById(contractId)
  +getContractsWithPagination(data)
}

class "SaleRequestModel" as M1 {
  +getRequestsWithPagination(data)
  +findRequestById(requestId)
  +convertRequestToContract(data)
  +updateDesignFile(requestId, data)
  +deleteDesignImage(requestId, imageId, deletedBy)
  +createSalesOrderRequest(data)
  +updateSalesOrderRequest(requestId, data)
}

class "OrderRequestModel" as M2 {
  +request_id: bigint
  +request_code: string
  +order_type: string
  +request_type: string
  +customer_account_id: bigint
  +contact_name: string
  +contact_phone: string
  +contact_email: string
  +delivery_address: string
  +title: string
  +description: string
  +budget_min: integer
  +budget_max: integer
  +expected_date: date
  +status: string
  +assigned_to: bigint
  +quoted_price: integer
  +quoted_at: datetime
  +approved_at: datetime
  +staff_note: string
  +reject_reason: string
  +createby: string
  +modifieby: string
}

class "ProductModel" as M3 {
  +product_id: bigint
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +product_code: string
  +product_name: string
  +product_type: string
  +description: string
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +price: integer
  +stock_quantity: integer
  +hold_quantity: integer
  +image_url: string
  +status: string
  +createby: string
  +modifieby: string
  +getProductsWithPagination(data)
  +getProductMetadata()
  +findProductById(productId)
}

class "ContractItemModel" as M5 {
  +contract_item_id: bigint
  +contract_id: bigint
  +product_id: bigint
  +request_item_id: bigint
  +item_name: string
  +description: string
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +quantity: integer
  +unit_price: integer
  +createby: string
  +modifieby: string
}

class "UserAccountModel" as M6 {
  +user_account_id: bigint
  +role_id: bigint
  +email: string
  +password_hash: string
  +status: string
  +full_name: string
  +phone_number: string
  +dob: date
  +gender: string
  +address: string
  +avatar_url: string
  +note: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
}

C0 --> M0 : uses
C0 --> M1 : uses
C0 --> M2 : uses
C1 --> M3 : uses
M0 --> M2 : belongs to
M0 --> M6 : belongs to
M2 --> M6 : belongs to
M5 --> M0 : belongs to
M5 --> M3 : belongs to
@enduml
```

## 12 Manage Accounts

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 12 Manage Accounts

class "staffAccountController" as C0 {
  +listStaffAccounts(req, res)
  +listStaffRoles(req, res)
  +getStaffAccountDetail(req, res)
  +createStaffAccount(req, res)
  +updateStaffAccount(req, res)
  +changeStaffAccountStatus(req, res)
  +removeStaffAccount(req, res)
}

class "UserAccountModel" as M0 {
  +user_account_id: bigint
  +role_id: bigint
  +email: string
  +password_hash: string
  +status: string
  +full_name: string
  +phone_number: string
  +dob: date
  +gender: string
  +address: string
  +avatar_url: string
  +note: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
  +createUserAccount(data)
  +findUserAccountByEmail(email)
  +updateUserAccountStatus(userAccountId, status, modifiedBy)
  +getStaffAccounts(staffRoleIds, queryParams)
  +getStaffAccountById(userAccountId, staffRoleIds)
  +updateStaffAccount(userAccountId, data, modifiedBy)
  +deleteStaffAccount(userAccountId)
}

class "UserRoleModel" as M1 {
  +role_id: bigint
  +role_code: string
  +role_name: string
  +description: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
  +findUserRoleByCode(roleCode)
  +findUserRoleById(roleId)
  +getStaffRoles()
}

C0 --> M0 : uses
C0 --> M1 : uses
M0 --> M1 : belongs to
@enduml
```

## 13 Manage Warehouse

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 13 Manage Warehouse

class "productManagerController" as C0 {
  +getProducts(req, res)
  +getProductMetadata(req, res)
  +getProductStockSummary(req, res)
  +getNextProductCode(req, res)
  +getProductById(req, res)
  +createProduct(req, res)
  +updateProduct(req, res)
  +deleteProduct(req, res)
  +createProductMaterial(req, res)
  +createProductColor(req, res)
}

class "rawMaterialController" as C1 {
  +getRawMaterials(req, res)
  +getRawMaterialStockSummary(req, res)
  +getNextRawMaterialCode(req, res)
  +getRawMaterialById(req, res)
  +createRawMaterial(req, res)
  +updateRawMaterial(req, res)
  +deleteRawMaterial(req, res)
}

class "ProductModel" as M0 {
  +product_id: bigint
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +product_code: string
  +product_name: string
  +product_type: string
  +description: string
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +price: integer
  +stock_quantity: integer
  +hold_quantity: integer
  +image_url: string
  +status: string
  +createby: string
  +modifieby: string
  +findProductById(productId)
  +findProductByCode(productCode)
  +getProductsWithPagination(data)
  +countProductUsage(productId)
  +createProduct(productData)
  +updateProduct(productId, updateData)
  +updateProductSetItems(setProductId, setItems, modifieby)
  +deleteProduct(productId)
  +generateNextProductCode()
  +getProductMetadata()
  +getProductStockSummary()
}

class "ProductMaterialModel" as M1 {
  +material_id: bigint
  +material_code: string
  +material_name: string
  +description: string
  +createby: string
  +modifieby: string
  +createProductMaterial(data)
}

class "ProductColorModel" as M2 {
  +color_id: bigint
  +color_code: string
  +color_name: string
  +hex_value: string
  +createby: string
  +modifieby: string
  +createProductColor(data)
}

class "RawMaterialModel" as M3 {
  +raw_material_id: bigint
  +raw_code: string
  +raw_name: string
  +material_id: bigint
  +unit: string
  +quantity_on_hand: integer
  +min_quantity: integer
  +description: string
  +status: string
  +createby: string
  +modifieby: string
  +findRawMaterialById(rawMaterialId)
  +findRawMaterialByCode(rawCode)
  +getRawMaterialsWithPagination(data)
  +countRawMaterialUsage(rawMaterialId)
  +createRawMaterial(data)
  +updateRawMaterial(rawMaterialId, updateData)
  +deleteRawMaterial(rawMaterialId)
  +generateNextRawMaterialCode()
  +getRawMaterialStockSummary()
}

class "ProductCategoryModel" as M4 {
  +category_id: bigint
  +category_code: string
  +category_name: string
  +description: string
  +createby: string
  +modifieby: string
}

class "ProductRoomModel" as M5 {
  +room_id: bigint
  +room_code: string
  +room_name: string
  +description: string
  +createby: string
  +modifieby: string
}

class "ProductSetItemModel" as M6 {
  +set_item_id: bigint
  +set_product_id: bigint
  +item_product_id: bigint
  +quantity: integer
  +createby: string
  +modifieby: string
}

class "CloudinaryService" as S0 {
  +deleteImage(publicId)
  +getPublicIdFromUrl(url)
}

C0 --> M0 : uses
C0 --> M1 : uses
C0 --> M2 : uses
C0 --> S0 : uses
C1 --> M3 : uses
M0 --> M4 : belongs to
M0 --> M5 : belongs to
M0 --> M1 : belongs to
M0 --> M2 : belongs to
M3 --> M1 : belongs to
M6 --> M0 : belongs to
@enduml
```

## 14 Manage Suppliers

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 14 Manage Suppliers

class "supplierController" as C0 {
  +getSuppliers(req, res)
  +getActiveSuppliers(req, res)
  +getNextSupplierCode(req, res)
  +getSupplierById(req, res)
  +createSupplier(req, res)
  +updateSupplier(req, res)
  +deleteSupplier(req, res)
}

class "SupplierModel" as M0 {
  +supplier_id: bigint
  +supplier_code: string
  +supplier_name: string
  +phone_number: string
  +address: string
  +note: string
  +status: string
  +createby: string
  +modifieby: string
  +findSupplierById(supplierId)
  +findSupplierByCode(supplierCode)
  +findSupplierByPhone(phoneNumber, excludeSupplierId)
  +getSuppliersWithPagination(data)
  +getSupplierWithReceiptHistory(supplierId)
  +countMaterialReceiptsBySupplierId(supplierId)
  +createSupplier(data)
  +updateSupplier(supplierId, data)
  +deleteSupplier(supplierId)
  +getActiveSuppliers()
  +generateNextSupplierCode()
}

C0 --> M0 : uses
@enduml
```

## 15 Manage Purchase Receipts

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 15 Manage Purchase Receipts

class "supplierController" as C0 {
  +getSuppliers(req, res)
  +getActiveSuppliers(req, res)
  +getNextSupplierCode(req, res)
  +getSupplierById(req, res)
  +createSupplier(req, res)
  +updateSupplier(req, res)
  +deleteSupplier(req, res)
}

class "purchaseReceiptController" as C1 {
  +getReceipts(req, res)
  +getReceiptSummary(req, res)
  +getNextReceiptCode(req, res)
  +getReceiptById(req, res)
  +createReceipt(req, res)
  +updateReceipt(req, res)
  +confirmReceipt(req, res)
  +cancelReceipt(req, res)
  +deleteReceipt(req, res)
}

class "SupplierModel" as M0 {
  +supplier_id: bigint
  +supplier_code: string
  +supplier_name: string
  +phone_number: string
  +address: string
  +note: string
  +status: string
  +createby: string
  +modifieby: string
  +validateSupplierForReceipt(supplierId)
}

class "MaterialReceiptModel" as M1 {
  +receipt_id: bigint
  +receipt_code: string
  +supplier_id: bigint
  +receipt_date: date
  +total_amount: bigint
  +status: string
  +received_by: bigint
  +note: string
  +createby: string
  +modifieby: string
  +findReceiptById(receiptId)
  +findReceiptByCode(receiptCode)
  +getReceiptsWithPagination(data)
  +getReceiptStatistics()
  +generateNextReceiptCode(receiptDate)
  +createReceiptWithItems(data, customTransaction)
  +updateReceiptWithItems(receiptId, data, customTransaction)
  +deleteReceipt(receiptId, customTransaction)
}

class "RawMaterialModel" as M2 {
  +raw_material_id: bigint
  +raw_code: string
  +raw_name: string
  +material_id: bigint
  +unit: string
  +quantity_on_hand: integer
  +min_quantity: integer
  +description: string
  +status: string
  +createby: string
  +modifieby: string
  +findRawMaterialById(rawMaterialId)
}

class "MaterialReceiptItemModel" as M3 {
  +receipt_item_id: bigint
  +receipt_id: bigint
  +raw_material_id: bigint
  +quantity: integer
  +unit_price: integer
  +note: string
  +createby: string
  +modifieby: string
}

class "UserAccountModel" as M4 {
  +user_account_id: bigint
  +role_id: bigint
  +email: string
  +password_hash: string
  +status: string
  +full_name: string
  +phone_number: string
  +dob: date
  +gender: string
  +address: string
  +avatar_url: string
  +note: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
}

C0 --> M0 : uses
C1 --> M1 : uses
C1 --> M0 : uses
C1 --> M2 : uses
M1 --> M0 : belongs to
M1 --> M4 : belongs to
M3 --> M1 : belongs to
M3 --> M2 : belongs to
@enduml
```

## 16 Manage Material Export

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 16 Manage Material Export

class "materialExportController" as C0 {
  +getMaterialExports(req, res)
  +getMaterialExportSummary(req, res)
  +getNextMaterialExportCode(req, res)
  +getProductionOrdersList(req, res)
  +getMaterialExportById(req, res)
  +createMaterialExport(req, res)
  +updateMaterialExport(req, res)
  +confirmMaterialExport(req, res)
  +cancelMaterialExport(req, res)
  +deleteMaterialExport(req, res)
}

class "MaterialIssueModel" as M0 {
  +issue_id: bigint
  +issue_code: string
  +production_id: bigint
  +issue_date: date
  +status: string
  +issued_by: bigint
  +note: string
  +createby: string
  +modifieby: string
  +findIssueById(issueId)
  +findIssueByCode(issueCode)
  +getIssuesWithPagination(data)
  +getIssueStatistics()
  +generateNextIssueCode(dateStr)
  +createIssueWithItems(data, customTransaction)
  +updateIssueWithItems(issueId, data, customTransaction)
  +deleteIssue(issueId)
}

class "ProductionOrderModel" as M1 {
  +production_id: bigint
  +production_code: string
  +production_type: string
  +order_id: bigint
  +status: string
  +planned_start: date
  +planned_end: date
  +completed_date: date
  +assigned_to: bigint
  +note: string
  +createby: string
  +modifieby: string
  +findProductionOrderById(productionId)
  +getProductionOrdersForExport(statusFilter)
}

class "RawMaterialModel" as M2 {
  +raw_material_id: bigint
  +raw_code: string
  +raw_name: string
  +material_id: bigint
  +unit: string
  +quantity_on_hand: integer
  +min_quantity: integer
  +description: string
  +status: string
  +createby: string
  +modifieby: string
  +findRawMaterialById(rawMaterialId)
}

class "MaterialIssueItemModel" as M3 {
  +issue_item_id: bigint
  +issue_id: bigint
  +raw_material_id: bigint
  +quantity: integer
  +note: string
  +createby: string
  +modifieby: string
}

class "UserAccountModel" as M4 {
  +user_account_id: bigint
  +role_id: bigint
  +email: string
  +password_hash: string
  +status: string
  +full_name: string
  +phone_number: string
  +dob: date
  +gender: string
  +address: string
  +avatar_url: string
  +note: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
}

C0 --> M0 : uses
C0 --> M1 : uses
C0 --> M2 : uses
M0 --> M1 : belongs to
M0 --> M4 : belongs to
M1 --> M4 : belongs to
M3 --> M0 : belongs to
M3 --> M2 : belongs to
@enduml
```

## 18 Manage Production Jobs

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 18 Manage Production Jobs

class "productionOrderController" as C0 {
  +getProductionOrders(req, res)
  +getEligibleOrders(req, res)
  +getStaffLeadersList(req, res)
  +createProductionOrderHandler(req, res)
  +assignLeader(req, res)
  +cancelProductionOrderHandler(req, res)
  +getProductionOrderDetail(req, res)
  +uploadDesignImages(req, res)
  +ownerInspectProductionOrder(req, res)
}

class "leaderStaffController" as C1 {
  +getLeaderOrders(req, res)
  +getLeaderOrderDetail(req, res)
  +leaderAccept(req, res)
  +leaderProgress(req, res)
  +leaderSubmit(req, res)
}

class "orderManagementController" as C2 {
  +getOrders(req, res)
  +getOrderDetail(req, res)
  +inspectOrder(req, res)
}

class "ProductionOrderModel" as M0 {
  +production_id: bigint
  +production_code: string
  +production_type: string
  +order_id: bigint
  +status: string
  +planned_start: date
  +planned_end: date
  +completed_date: date
  +assigned_to: bigint
  +note: string
  +createby: string
  +modifieby: string
  +findProductionOrderById(productionId)
  +getAllProductionOrders(data)
  +createProductionOrder(data)
  +assignLeaderToOrder(productionId, assignedTo, modifieBy)
  +cancelProductionOrder(productionId, modifieBy)
  +getEligibleCustomerOrders()
}

class "UserAccountModel" as M1 {
  +user_account_id: bigint
  +role_id: bigint
  +email: string
  +password_hash: string
  +status: string
  +full_name: string
  +phone_number: string
  +dob: date
  +gender: string
  +address: string
  +avatar_url: string
  +note: string
  +modifiedate: datetime
  +createby: string
  +modifieby: string
}

class "CustomerOrderModel" as M2 {
  +order_id: bigint
  +order_code: string
  +order_type: string
  +contract_id: bigint
  +customer_account_id: bigint
  +contact_name: string
  +contact_phone: string
  +delivery_address: string
  +total_amount: bigint
  +deposit_amount: bigint
  +paid_amount: bigint
  +status: string
  +expected_date: date
  +delivered_date: date
  +assigned_to: bigint
  +note: string
  +createby: string
  +modifieby: string
  +getOrdersWithPagination(data)
  +findOrderById(orderId)
  +cancelOrder(orderId, data)
  +updateOrderStatus(orderId, newStatus, data)
  +assignLeaderToCustomerOrder(orderId, leaderId, data)
  +ownerInspectOrder(orderId, data)
}

class "ProductionOrderItemModel" as M6 {
  +production_item_id: bigint
  +production_id: bigint
  +product_id: bigint
  +order_item_id: bigint
  +quantity_planned: integer
  +quantity_done: integer
  +note: string
  +createby: string
  +modifieby: string
}

class "CustomerOrderItemModel" as M8 {
  +order_item_id: bigint
  +order_id: bigint
  +contract_item_id: bigint
  +product_id: bigint
  +item_name: string
  +description: string
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +quantity: integer
  +unit_price: integer
  +createby: string
  +modifieby: string
}

class "FinishedGoodsReceiptModel" as M9 {
  +fg_receipt_id: bigint
  +receipt_code: string
  +production_id: bigint
  +receipt_date: date
  +status: string
  +received_by: bigint
  +note: string
  +createby: string
  +modifieby: string
}

class "FinishedGoodsReceiptItemModel" as M10 {
  +fg_item_id: bigint
  +fg_receipt_id: bigint
  +product_id: bigint
  +quantity: integer
  +note: string
  +createby: string
  +modifieby: string
}

class "ProductModel" as M11 {
  +product_id: bigint
  +category_id: bigint
  +room_id: bigint
  +material_id: bigint
  +color_id: bigint
  +product_code: string
  +product_name: string
  +product_type: string
  +description: string
  +length_cm: integer
  +width_cm: integer
  +height_cm: integer
  +price: integer
  +stock_quantity: integer
  +hold_quantity: integer
  +image_url: string
  +status: string
  +createby: string
  +modifieby: string
}

C0 --> M0 : uses
C0 --> M1 : uses
C0 --> M2 : uses
C1 --> M2 : uses
C2 --> M2 : uses
C2 --> M1 : uses
M0 --> M2 : belongs to
M0 --> M1 : belongs to
M2 --> M1 : belongs to
M6 --> M0 : belongs to
M6 --> M11 : belongs to
M6 --> M8 : belongs to
M8 --> M2 : belongs to
M8 --> M11 : belongs to
M9 --> M0 : belongs to
M9 --> M1 : belongs to
M10 --> M9 : belongs to
M10 --> M11 : belongs to
@enduml
```

## 19 Manage Financial Reports

```plantuml
@startuml
top to bottom direction
hide circle
skinparam linetype ortho
skinparam classAttributeIconSize 0
skinparam nodesep 45
skinparam ranksep 50
skinparam class {
  BackgroundColor White
  BorderColor #475569
  ArrowColor #475569
  HeaderBackgroundColor #FDEBD0
}
title Class Diagram: 19 Manage Financial Reports

class "financialReportController" as C0 {
  +getFinancialSummary(req, res)
  +getFinancialOrders(req, res)
  +getFinancialReceipts(req, res)
  +exportFinancialReport(req, res)
}

class "FinancialReportModel" as M0 {
  +toDateString(dateVal)
  +getFinancialSummaryData(data)
  +getFinancialOrdersList(data)
  +getFinancialReceiptsList(data)
  +getFinancialExportData(data)
}

class "CustomerOrderModel" as M1 {
  +order_id: bigint
  +order_code: string
  +order_type: string
  +contract_id: bigint
  +customer_account_id: bigint
  +contact_name: string
  +contact_phone: string
  +delivery_address: string
  +total_amount: bigint
  +deposit_amount: bigint
  +paid_amount: bigint
  +status: string
  +expected_date: date
  +delivered_date: date
  +assigned_to: bigint
  +note: string
  +createby: string
  +modifieby: string
}

class "MaterialReceiptModel" as M2 {
  +receipt_id: bigint
  +receipt_code: string
  +supplier_id: bigint
  +receipt_date: date
  +total_amount: bigint
  +status: string
  +received_by: bigint
  +note: string
  +createby: string
  +modifieby: string
}

class "MaterialIssueModel" as M3 {
  +issue_id: bigint
  +issue_code: string
  +production_id: bigint
  +issue_date: date
  +status: string
  +issued_by: bigint
  +note: string
  +createby: string
  +modifieby: string
}

C0 --> M0 : uses
@enduml
```
