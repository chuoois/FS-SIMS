CREATE DATABASE IF NOT EXISTS db_2026_fssims
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE db_2026_fssims;
SET NAMES utf8mb4;


-- =========================================================
-- 1. user_role
-- =========================================================
CREATE TABLE IF NOT EXISTS user_role (
    role_id      BIGINT       NOT NULL AUTO_INCREMENT,
    role_code    VARCHAR(50)  NOT NULL,
    role_name    VARCHAR(100) NOT NULL,
    description  VARCHAR(255) NULL,
    createdate   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate  DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby     VARCHAR(100) NULL,
    modifieby    VARCHAR(100) NULL,
    PRIMARY KEY (role_id),
    UNIQUE KEY uk_user_role_role_code (role_code)
) ENGINE = InnoDB;


-- =========================================================
-- 2. user_account
-- =========================================================
CREATE TABLE IF NOT EXISTS user_account (
    user_account_id BIGINT       NOT NULL AUTO_INCREMENT,
    role_id         BIGINT       NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    full_name       VARCHAR(150) NOT NULL,
    phone_number    VARCHAR(20)  NULL,
    dob             DATE         NULL,
    gender          VARCHAR(10)  NULL,
    address         VARCHAR(255) NULL,
    avatar_url      VARCHAR(255) NULL,
    note            VARCHAR(255) NULL,
    createdate      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate     DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby        VARCHAR(100) NULL,
    modifieby       VARCHAR(100) NULL,
    PRIMARY KEY (user_account_id),
    UNIQUE KEY uk_user_account_email (email),
    KEY idx_user_account_role_id (role_id),
    CONSTRAINT fk_user_account_role
        FOREIGN KEY (role_id)
        REFERENCES user_role (role_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;


-- =========================================================
-- 3. refresh_token
-- =========================================================
CREATE TABLE IF NOT EXISTS refresh_token (
    refresh_token_id BIGINT       NOT NULL AUTO_INCREMENT,
    user_account_id  BIGINT       NOT NULL,
    token            VARCHAR(512) NOT NULL,
    expires_at       DATETIME     NOT NULL,
    createdate       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate      DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby         VARCHAR(100) NULL,
    modifieby        VARCHAR(100) NULL,
    PRIMARY KEY (refresh_token_id),
    UNIQUE KEY uk_refresh_token_token (token),
    KEY idx_refresh_token_account (user_account_id),
    KEY idx_refresh_token_expires_at (expires_at),
    CONSTRAINT fk_refresh_token_account
        FOREIGN KEY (user_account_id)
        REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 4. product_category  (phân loại: bàn / ghế / tủ / bộ ...)
-- =========================================================
CREATE TABLE IF NOT EXISTS product_category (
    category_id    BIGINT       NOT NULL AUTO_INCREMENT,
    category_code  VARCHAR(50)  NOT NULL,
    category_name  VARCHAR(100) NOT NULL,
    description    VARCHAR(255) NULL,
    createdate     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate    DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby       VARCHAR(100) NULL,
    modifieby      VARCHAR(100) NULL,
    PRIMARY KEY (category_id),
    UNIQUE KEY uk_product_category_code (category_code)
) ENGINE = InnoDB;


-- =========================================================
-- 5. product_room  (sản phẩm thuộc phòng nào)
-- =========================================================
CREATE TABLE IF NOT EXISTS product_room (
    room_id      BIGINT       NOT NULL AUTO_INCREMENT,
    room_code    VARCHAR(50)  NOT NULL,
    room_name    VARCHAR(100) NOT NULL,
    description  VARCHAR(255) NULL,
    createdate   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate  DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby     VARCHAR(100) NULL,
    modifieby    VARCHAR(100) NULL,
    PRIMARY KEY (room_id),
    UNIQUE KEY uk_product_room_code (room_code)
) ENGINE = InnoDB;


-- =========================================================
-- 6. product_material  (chất liệu: các loại gỗ)
-- =========================================================
CREATE TABLE IF NOT EXISTS product_material (
    material_id    BIGINT       NOT NULL AUTO_INCREMENT,
    material_code  VARCHAR(50)  NOT NULL,
    material_name  VARCHAR(100) NOT NULL,
    description    VARCHAR(255) NULL,
    createdate     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate    DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby       VARCHAR(100) NULL,
    modifieby      VARCHAR(100) NULL,
    PRIMARY KEY (material_id),
    UNIQUE KEY uk_product_material_code (material_code)
) ENGINE = InnoDB;


-- =========================================================
-- 7. product_color  (bảng màu)
-- =========================================================
CREATE TABLE IF NOT EXISTS product_color (
    color_id     BIGINT       NOT NULL AUTO_INCREMENT,
    color_code   VARCHAR(50)  NOT NULL,
    color_name   VARCHAR(100) NOT NULL,
    hex_value    VARCHAR(7)   NULL,          -- ví dụ #8B5A2B
    createdate   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate  DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby     VARCHAR(100) NULL,
    modifieby    VARCHAR(100) NULL,
    PRIMARY KEY (color_id),
    UNIQUE KEY uk_product_color_code (color_code)
) ENGINE = InnoDB;


-- =========================================================
-- 8. product  (hàng sẵn của cửa hàng)
-- =========================================================
CREATE TABLE IF NOT EXISTS product (
    product_id    BIGINT         NOT NULL AUTO_INCREMENT,
    category_id   BIGINT         NOT NULL,
    room_id       BIGINT         NOT NULL,
    material_id   BIGINT         NOT NULL,
    color_id      BIGINT         NOT NULL,
    product_code  VARCHAR(50)    NOT NULL,
    product_name  VARCHAR(200)   NOT NULL,
    product_type  VARCHAR(20)    NOT NULL DEFAULT 'SINGLE',  -- SINGLE = sản phẩm lẻ, SET = bộ (bàn + ghế ...)
    description   TEXT           NULL,
    length_cm     INT            NULL,
    width_cm      INT            NULL,
    height_cm     INT            NULL,
    price         INT            NOT NULL DEFAULT 0,
    stock_quantity INT           NOT NULL DEFAULT 0,        -- tồn kho thành phẩm
    hold_quantity  INT           NOT NULL DEFAULT 0,        -- số lượng đang giữ chỗ (đã chốt, chưa giao); khả dụng = stock - hold
    image_url     VARCHAR(255)   NULL,
    status        VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    createdate    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate   DATETIME       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby      VARCHAR(100)   NULL,
    modifieby     VARCHAR(100)   NULL,
    PRIMARY KEY (product_id),
    UNIQUE KEY uk_product_code (product_code),
    KEY idx_product_type (product_type),
    KEY idx_product_category (category_id),
    KEY idx_product_room (room_id),
    KEY idx_product_material (material_id),
    KEY idx_product_color (color_id),
    CONSTRAINT chk_product_stock CHECK (stock_quantity >= 0),
    CONSTRAINT chk_product_hold  CHECK (hold_quantity >= 0 AND hold_quantity <= stock_quantity),
    CONSTRAINT fk_product_category
        FOREIGN KEY (category_id) REFERENCES product_category (category_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_product_room
        FOREIGN KEY (room_id) REFERENCES product_room (room_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_product_material
        FOREIGN KEY (material_id) REFERENCES product_material (material_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_product_color
        FOREIGN KEY (color_id) REFERENCES product_color (color_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;


-- =========================================================
-- 9. product_set_item  (thành phần của một BỘ sản phẩm)
-- =========================================================
CREATE TABLE IF NOT EXISTS product_set_item (
    set_item_id      BIGINT       NOT NULL AUTO_INCREMENT,
    set_product_id   BIGINT       NOT NULL,
    item_product_id  BIGINT       NOT NULL,
    quantity         INT          NOT NULL DEFAULT 1,
    createdate       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate      DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby         VARCHAR(100) NULL,
    modifieby        VARCHAR(100) NULL,
    PRIMARY KEY (set_item_id),
    UNIQUE KEY uk_product_set_item (set_product_id, item_product_id),
    KEY idx_product_set_item_item (item_product_id),
    CONSTRAINT chk_product_set_item_qty CHECK (quantity > 0),
    CONSTRAINT fk_product_set_item_set
        FOREIGN KEY (set_product_id) REFERENCES product (product_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_product_set_item_item
        FOREIGN KEY (item_product_id) REFERENCES product (product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;


-- =========================================================
-- 10. cart  (giỏ hàng - chỉ dành cho khách ONLINE, mỗi khách 1 giỏ)
-- =========================================================
CREATE TABLE IF NOT EXISTS cart (
    cart_id              BIGINT       NOT NULL AUTO_INCREMENT,
    customer_account_id  BIGINT       NOT NULL,
    createdate           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate          DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby             VARCHAR(100) NULL,
    modifieby            VARCHAR(100) NULL,
    PRIMARY KEY (cart_id),
    UNIQUE KEY uk_cart_customer (customer_account_id),
    CONSTRAINT fk_cart_customer
        FOREIGN KEY (customer_account_id) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 11. cart_item  (sản phẩm trong giỏ)
-- =========================================================
CREATE TABLE IF NOT EXISTS cart_item (
    cart_item_id  BIGINT       NOT NULL AUTO_INCREMENT,
    cart_id       BIGINT       NOT NULL,
    product_id    BIGINT       NOT NULL,
    quantity      INT          NOT NULL DEFAULT 1,
    createdate    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate   DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby      VARCHAR(100) NULL,
    modifieby     VARCHAR(100) NULL,
    PRIMARY KEY (cart_item_id),
    UNIQUE KEY uk_cart_item (cart_id, product_id),
    KEY idx_cart_item_product (product_id),
    CONSTRAINT chk_cart_item_qty CHECK (quantity > 0),
    CONSTRAINT fk_cart_item_cart
        FOREIGN KEY (cart_id) REFERENCES cart (cart_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_cart_item_product
        FOREIGN KEY (product_id) REFERENCES product (product_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 12. order_request  (yêu cầu mua hàng)
-- =========================================================

CREATE TABLE IF NOT EXISTS order_request (
    request_id           BIGINT         NOT NULL AUTO_INCREMENT,
    request_code         VARCHAR(30)    NOT NULL,
    order_type           VARCHAR(20)    NOT NULL,                  -- READY / CUSTOM
    request_type         VARCHAR(20)    NOT NULL DEFAULT 'SINGLE', -- SINGLE / SET (CUSTOM)
    customer_account_id  BIGINT         NULL,                      -- OFFLINE: khách có thể chưa có tài khoản
    contact_name         VARCHAR(150)   NOT NULL,
    contact_phone        VARCHAR(20)    NOT NULL,
    contact_email        VARCHAR(255)   NULL,
    delivery_address     VARCHAR(255)   NULL,

    title                VARCHAR(200)   NOT NULL,
    description          TEXT           NULL,           -- mô tả chung của cả yêu cầu
    budget_min           INT            NULL,
    budget_max           INT            NULL,
    expected_date        DATE           NULL,           -- ngày khách muốn nhận

    status               VARCHAR(30)    NOT NULL DEFAULT 'PENDING',
    assigned_to          BIGINT         NULL,           -- sale phụ trách
    designed_by          BIGINT         NULL,           -- chủ làm bản vẽ (OFFLINE)
    designed_at          DATETIME       NULL,
    quoted_price         INT            NULL,
    quoted_at            DATETIME       NULL,
    approved_at          DATETIME       NULL,           -- thời điểm sale xác nhận yêu cầu với khách
    staff_note           VARCHAR(500)   NULL,
    reject_reason        VARCHAR(500)   NULL,

    createdate           DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate          DATETIME       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby             VARCHAR(100)   NULL,
    modifieby            VARCHAR(100)   NULL,
    PRIMARY KEY (request_id),
    UNIQUE KEY uk_order_request_code (request_code),
    KEY idx_order_request_customer (customer_account_id),
    KEY idx_order_request_status (status),
    KEY idx_order_request_order_type (order_type),
    KEY idx_order_request_assigned (assigned_to),
    KEY idx_order_request_designed_by (designed_by),
    CONSTRAINT chk_order_request_order_type CHECK (order_type IN ('READY', 'CUSTOM')),
    CONSTRAINT fk_order_request_customer
        FOREIGN KEY (customer_account_id) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_order_request_assigned
        FOREIGN KEY (assigned_to) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_order_request_designed_by
        FOREIGN KEY (designed_by) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 13. order_request_item  (từng món trong yêu cầu)
-- =========================================================
CREATE TABLE IF NOT EXISTS order_request_item (
    request_item_id  BIGINT        NOT NULL AUTO_INCREMENT,
    request_id       BIGINT        NOT NULL,
    product_id       BIGINT        NULL,
    item_name        VARCHAR(200)  NOT NULL,            -- vd: "Bàn ăn", "Ghế ăn", "Tủ quần áo"
    category_id      BIGINT        NULL,
    room_id          BIGINT        NULL,
    material_id      BIGINT        NULL,
    color_id         BIGINT        NULL,
    length_cm        INT           NULL,
    width_cm         INT           NULL,
    height_cm        INT           NULL,
    quantity         INT           NOT NULL DEFAULT 1,
    unit_price       INT           NULL,                -- READY: giá snapshot; CUSTOM: để trống
    description      VARCHAR(500)  NULL,
    createdate       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate      DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby         VARCHAR(100)  NULL,
    modifieby        VARCHAR(100)  NULL,
    PRIMARY KEY (request_item_id),
    KEY idx_order_request_item_request (request_id),
    KEY idx_order_request_item_product (product_id),
    KEY idx_order_request_item_category (category_id),
    KEY idx_order_request_item_room (room_id),
    KEY idx_order_request_item_material (material_id),
    KEY idx_order_request_item_color (color_id),
    CONSTRAINT chk_order_request_item_qty CHECK (quantity > 0),
    CONSTRAINT fk_order_request_item_request
        FOREIGN KEY (request_id) REFERENCES order_request (request_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_order_request_item_product
        FOREIGN KEY (product_id) REFERENCES product (product_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_order_request_item_category
        FOREIGN KEY (category_id) REFERENCES product_category (category_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_order_request_item_room
        FOREIGN KEY (room_id) REFERENCES product_room (room_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_order_request_item_material
        FOREIGN KEY (material_id) REFERENCES product_material (material_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_order_request_item_color
        FOREIGN KEY (color_id) REFERENCES product_color (color_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 14. order_request_image  (ảnh tham khảo của khách / bản vẽ của chủ)
-- =========================================================
CREATE TABLE IF NOT EXISTS order_request_image (
    request_image_id  BIGINT       NOT NULL AUTO_INCREMENT,
    request_id        BIGINT       NOT NULL,
    request_item_id   BIGINT       NULL,                -- NULL = ảnh chung của cả yêu cầu
    image_url         VARCHAR(255) NOT NULL,
    image_type        VARCHAR(20)  NOT NULL DEFAULT 'REFERENCE',  -- REFERENCE / DESIGN
    sort_order        INT          NOT NULL DEFAULT 0,
    createdate        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate       DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby          VARCHAR(100) NULL,
    modifieby         VARCHAR(100) NULL,
    PRIMARY KEY (request_image_id),
    KEY idx_order_request_image_request (request_id),
    KEY idx_order_request_image_item (request_item_id),
    CONSTRAINT chk_order_request_image_type CHECK (image_type IN ('REFERENCE', 'DESIGN')),
    CONSTRAINT fk_order_request_image_request
        FOREIGN KEY (request_id) REFERENCES order_request (request_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_order_request_image_item
        FOREIGN KEY (request_item_id) REFERENCES order_request_item (request_item_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 15. contract  (hợp đồng)
-- =========================================================
CREATE TABLE IF NOT EXISTS contract (
    contract_id          BIGINT        NOT NULL AUTO_INCREMENT,
    contract_code        VARCHAR(30)   NOT NULL,
    contract_type        VARCHAR(20)   NOT NULL,            -- CUSTOM / READY
    request_id           BIGINT        NULL,
    customer_account_id  BIGINT        NULL,
    customer_name        VARCHAR(150)  NOT NULL,
    customer_phone       VARCHAR(20)   NOT NULL,
    customer_address     VARCHAR(255)  NULL,
    total_amount         BIGINT        NOT NULL,
    deposit_amount       BIGINT        NOT NULL DEFAULT 0,
    status               VARCHAR(30)   NOT NULL DEFAULT 'DRAFT',
    signed_date          DATE          NULL,                -- ngày ký
    signed_place         VARCHAR(255)  NULL,                -- địa điểm ký (cửa hàng / chi nhánh)
    delivery_date        DATE          NULL,                -- ngày cam kết giao
    contract_file_url    VARCHAR(255)  NULL,                -- ảnh/scan bản giấy đã ký (không bắt buộc)
    terms                TEXT          NULL,
    signed_by            BIGINT        NULL,                -- sale lập hợp đồng & đại diện xưởng ký
    note                 VARCHAR(500)  NULL,
    createdate           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate          DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby             VARCHAR(100)  NULL,
    modifieby            VARCHAR(100)  NULL,
    PRIMARY KEY (contract_id),
    UNIQUE KEY uk_contract_code (contract_code),
    UNIQUE KEY uk_contract_request (request_id),
    KEY idx_contract_customer (customer_account_id),
    KEY idx_contract_status (status),
    KEY idx_contract_signed_by (signed_by),
    CONSTRAINT chk_contract_amount CHECK (total_amount > 0 AND deposit_amount >= 0),
    CONSTRAINT chk_contract_type CHECK (contract_type IN ('CUSTOM', 'READY')),
    CONSTRAINT chk_contract_status CHECK (status IN ('DRAFT', 'SIGNED', 'CANCELLED')),
    CONSTRAINT chk_contract_signed CHECK (status <> 'SIGNED' OR signed_date IS NOT NULL),
    CONSTRAINT chk_contract_custom_request CHECK (contract_type <> 'CUSTOM' OR request_id IS NOT NULL),
    CONSTRAINT fk_contract_request
        FOREIGN KEY (request_id) REFERENCES order_request (request_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_contract_customer
        FOREIGN KEY (customer_account_id) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_contract_signed_by
        FOREIGN KEY (signed_by) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 16. contract_item  (các món ghi trong hợp đồng, kèm giá chốt)
-- =========================================================
CREATE TABLE IF NOT EXISTS contract_item (
    contract_item_id  BIGINT        NOT NULL AUTO_INCREMENT,
    contract_id       BIGINT        NOT NULL,
    product_id        BIGINT        NULL,
    request_item_id   BIGINT        NULL,
    item_name         VARCHAR(200)  NOT NULL,
    description       VARCHAR(500)  NULL,
    category_id       BIGINT        NULL,               -- thông số món custom
    room_id           BIGINT        NULL,
    material_id       BIGINT        NULL,
    color_id          BIGINT        NULL,
    length_cm         INT           NULL,
    width_cm          INT           NULL,
    height_cm         INT           NULL,
    quantity          INT           NOT NULL DEFAULT 1,
    unit_price        INT           NOT NULL DEFAULT 0,
    createdate        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate       DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby          VARCHAR(100)  NULL,
    modifieby         VARCHAR(100)  NULL,
    PRIMARY KEY (contract_item_id),
    KEY idx_contract_item_contract (contract_id),
    KEY idx_contract_item_product (product_id),
    KEY idx_contract_item_request_item (request_item_id),
    KEY idx_contract_item_category (category_id),
    KEY idx_contract_item_room (room_id),
    KEY idx_contract_item_material (material_id),
    KEY idx_contract_item_color (color_id),
    CONSTRAINT chk_contract_item_qty CHECK (quantity > 0 AND unit_price >= 0),
    CONSTRAINT chk_contract_item_source CHECK (product_id IS NULL OR request_item_id IS NULL),
    CONSTRAINT fk_contract_item_contract
        FOREIGN KEY (contract_id) REFERENCES contract (contract_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_contract_item_product
        FOREIGN KEY (product_id) REFERENCES product (product_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_contract_item_request_item
        FOREIGN KEY (request_item_id) REFERENCES order_request_item (request_item_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_contract_item_category
        FOREIGN KEY (category_id) REFERENCES product_category (category_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_contract_item_room
        FOREIGN KEY (room_id) REFERENCES product_room (room_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_contract_item_material
        FOREIGN KEY (material_id) REFERENCES product_material (material_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_contract_item_color
        FOREIGN KEY (color_id) REFERENCES product_color (color_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 17. customer_order  (đơn hàng - "order" là từ khóa nên đặt tên customer_order)
-- =========================================================
CREATE TABLE IF NOT EXISTS customer_order (
    order_id             BIGINT        NOT NULL AUTO_INCREMENT,
    order_code           VARCHAR(30)   NOT NULL,
    order_type           VARCHAR(20)   NOT NULL,        -- CUSTOM / READY
    contract_id          BIGINT        NOT NULL,
    customer_account_id  BIGINT        NULL,
    contact_name         VARCHAR(150)  NOT NULL,
    contact_phone        VARCHAR(20)   NOT NULL,
    delivery_address     VARCHAR(255)  NULL,
    total_amount         BIGINT        NOT NULL DEFAULT 0,
    deposit_amount       BIGINT        NOT NULL DEFAULT 0,
    paid_amount          BIGINT        NOT NULL DEFAULT 0,
    status               VARCHAR(30)   NOT NULL DEFAULT 'NEW',
    expected_date        DATE          NULL,
    delivered_date       DATE          NULL,
    assigned_to          BIGINT        NULL,            -- sale phụ trách
    note                 VARCHAR(500)  NULL,
    createdate           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate          DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby             VARCHAR(100)  NULL,
    modifieby            VARCHAR(100)  NULL,
    PRIMARY KEY (order_id),
    UNIQUE KEY uk_customer_order_code (order_code),
    UNIQUE KEY uk_customer_order_contract (contract_id),
    KEY idx_customer_order_type (order_type),
    KEY idx_customer_order_status (status),
    KEY idx_customer_order_customer (customer_account_id),
    KEY idx_customer_order_assigned (assigned_to),
    CONSTRAINT chk_customer_order_type CHECK (order_type IN ('CUSTOM', 'READY')),
    CONSTRAINT fk_customer_order_contract
        FOREIGN KEY (contract_id) REFERENCES contract (contract_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_customer_order_customer
        FOREIGN KEY (customer_account_id) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_customer_order_assigned
        FOREIGN KEY (assigned_to) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 18. customer_order_item  (các món trong đơn hàng, copy từ contract_item)
-- =========================================================
CREATE TABLE IF NOT EXISTS customer_order_item (
    order_item_id     BIGINT        NOT NULL AUTO_INCREMENT,
    order_id          BIGINT        NOT NULL,
    contract_item_id  BIGINT        NULL,
    product_id        BIGINT        NULL,
    item_name         VARCHAR(200)  NOT NULL,
    description       VARCHAR(500)  NULL,
    category_id       BIGINT        NULL,               -- thông số món custom
    room_id           BIGINT        NULL,
    material_id       BIGINT        NULL,
    color_id          BIGINT        NULL,
    length_cm         INT           NULL,
    width_cm          INT           NULL,
    height_cm         INT           NULL,
    quantity          INT           NOT NULL DEFAULT 1,
    unit_price        INT           NOT NULL DEFAULT 0,
    createdate        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate       DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby          VARCHAR(100)  NULL,
    modifieby         VARCHAR(100)  NULL,
    PRIMARY KEY (order_item_id),
    KEY idx_customer_order_item_order (order_id),
    KEY idx_customer_order_item_contract_item (contract_item_id),
    KEY idx_customer_order_item_product (product_id),
    KEY idx_customer_order_item_category (category_id),
    KEY idx_customer_order_item_room (room_id),
    KEY idx_customer_order_item_material (material_id),
    KEY idx_customer_order_item_color (color_id),
    CONSTRAINT chk_customer_order_item_qty CHECK (quantity > 0 AND unit_price >= 0),
    CONSTRAINT fk_customer_order_item_order
        FOREIGN KEY (order_id) REFERENCES customer_order (order_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_customer_order_item_contract_item
        FOREIGN KEY (contract_item_id) REFERENCES contract_item (contract_item_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_customer_order_item_product
        FOREIGN KEY (product_id) REFERENCES product (product_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_customer_order_item_category
        FOREIGN KEY (category_id) REFERENCES product_category (category_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_customer_order_item_room
        FOREIGN KEY (room_id) REFERENCES product_room (room_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_customer_order_item_material
        FOREIGN KEY (material_id) REFERENCES product_material (material_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_customer_order_item_color
        FOREIGN KEY (color_id) REFERENCES product_color (color_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 18b. customer_order_image (ảnh thành phẩm, ảnh nghiệm thu hoặc ảnh đơn hàng)
-- =========================================================
CREATE TABLE IF NOT EXISTS customer_order_image (
    order_image_id    BIGINT        NOT NULL AUTO_INCREMENT,
    order_id          BIGINT        NOT NULL,
    order_item_id     BIGINT        NULL,
    image_url         VARCHAR(500)  NOT NULL,
    image_type        VARCHAR(30)   NOT NULL DEFAULT 'INSPECTION', -- INSPECTION, FINISHED, OTHER
    sort_order        INT           NOT NULL DEFAULT 0,
    createdate        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate       DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby          VARCHAR(100)  NULL,
    modifieby         VARCHAR(100)  NULL,
    PRIMARY KEY (order_image_id),
    KEY idx_customer_order_image_order (order_id),
    KEY idx_customer_order_image_item (order_item_id),
    KEY idx_customer_order_image_type (image_type),
    CONSTRAINT fk_customer_order_image_order
        FOREIGN KEY (order_id) REFERENCES customer_order (order_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_customer_order_image_item
        FOREIGN KEY (order_item_id) REFERENCES customer_order_item (order_item_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 19. supplier  (nhà cung cấp nguyên vật liệu)
-- =========================================================
CREATE TABLE IF NOT EXISTS supplier (
    supplier_id    BIGINT        NOT NULL AUTO_INCREMENT,
    supplier_code  VARCHAR(50)   NOT NULL,
    supplier_name  VARCHAR(200)  NOT NULL,
    phone_number   VARCHAR(20)   NULL,
    address        VARCHAR(255)  NULL,
    note           VARCHAR(255)  NULL,
    status         VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    createdate     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate    DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby       VARCHAR(100)  NULL,
    modifieby      VARCHAR(100)  NULL,
    PRIMARY KEY (supplier_id),
    UNIQUE KEY uk_supplier_code (supplier_code),
    UNIQUE KEY uk_supplier_phone (phone_number)
) ENGINE = InnoDB;


-- =========================================================
-- 20. raw_material  (nguyên vật liệu gỗ trong kho: gỗ sồi, óc chó, thông, xoài, cao su, tếch...)
-- =========================================================
CREATE TABLE IF NOT EXISTS raw_material (
    raw_material_id   BIGINT         NOT NULL AUTO_INCREMENT,
    raw_code          VARCHAR(50)    NOT NULL,
    raw_name          VARCHAR(200)   NOT NULL,
    material_id       BIGINT         NULL,
    unit              VARCHAR(20)    NOT NULL,           -- BOARD (tấm/thanh), M2, KG, L, PCS, BOX ...
    quantity_on_hand  INT            NOT NULL DEFAULT 0,
    min_quantity      INT            NOT NULL DEFAULT 0,
    description       VARCHAR(255)   NULL,
    status            VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    createdate        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate       DATETIME       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby          VARCHAR(100)   NULL,
    modifieby         VARCHAR(100)   NULL,
    PRIMARY KEY (raw_material_id),
    UNIQUE KEY uk_raw_material_code (raw_code),
    KEY idx_raw_material_material (material_id),
    CONSTRAINT chk_raw_material_qty CHECK (quantity_on_hand >= 0 AND min_quantity >= 0),
    CONSTRAINT fk_raw_material_material
        FOREIGN KEY (material_id) REFERENCES product_material (material_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 21. material_receipt  (phiếu nhập nguyên vật liệu vào kho)
-- =========================================================
CREATE TABLE IF NOT EXISTS material_receipt (
    receipt_id     BIGINT        NOT NULL AUTO_INCREMENT,
    receipt_code   VARCHAR(30)   NOT NULL,
    supplier_id    BIGINT        NULL,
    receipt_date   DATE          NOT NULL,
    total_amount   BIGINT        NOT NULL DEFAULT 0,
    status         VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    received_by    BIGINT        NULL,                  -- nhân viên nhập kho
    note           VARCHAR(500)  NULL,
    createdate     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate    DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby       VARCHAR(100)  NULL,
    modifieby      VARCHAR(100)  NULL,
    PRIMARY KEY (receipt_id),
    UNIQUE KEY uk_material_receipt_code (receipt_code),
    KEY idx_material_receipt_supplier (supplier_id),
    KEY idx_material_receipt_status (status),
    KEY idx_material_receipt_received_by (received_by),
    CONSTRAINT fk_material_receipt_supplier
        FOREIGN KEY (supplier_id) REFERENCES supplier (supplier_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_material_receipt_received_by
        FOREIGN KEY (received_by) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 22. material_receipt_item  (từng loại nguyên vật liệu trong phiếu nhập)
-- =========================================================
CREATE TABLE IF NOT EXISTS material_receipt_item (
    receipt_item_id  BIGINT         NOT NULL AUTO_INCREMENT,
    receipt_id       BIGINT         NOT NULL,
    raw_material_id  BIGINT         NOT NULL,
    quantity         INT            NOT NULL,
    unit_price       INT            NOT NULL DEFAULT 0,  -- giá nhập / 1 đơn vị
    note             VARCHAR(255)   NULL,
    createdate       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate      DATETIME       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby         VARCHAR(100)   NULL,
    modifieby        VARCHAR(100)   NULL,
    PRIMARY KEY (receipt_item_id),
    UNIQUE KEY uk_material_receipt_item (receipt_id, raw_material_id),
    KEY idx_material_receipt_item_raw (raw_material_id),
    CONSTRAINT chk_material_receipt_item CHECK (quantity > 0 AND unit_price >= 0),
    CONSTRAINT fk_material_receipt_item_receipt
        FOREIGN KEY (receipt_id) REFERENCES material_receipt (receipt_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_material_receipt_item_raw
        FOREIGN KEY (raw_material_id) REFERENCES raw_material (raw_material_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB;


-- =========================================================
-- 23. production_order  (lệnh gia công)
-- =========================================================
CREATE TABLE IF NOT EXISTS production_order (
    production_id    BIGINT        NOT NULL AUTO_INCREMENT,
    production_code  VARCHAR(30)   NOT NULL,
    production_type  VARCHAR(20)   NOT NULL,            -- CUSTOM / READY / STOCK
    order_id         BIGINT        NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'ASSIGNED',
    planned_start    DATE          NULL,
    planned_end      DATE          NULL,
    completed_date   DATE          NULL,
    assigned_to      BIGINT        NULL,                -- thợ được giao
    note             VARCHAR(500)  NULL,
    createdate       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate      DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby         VARCHAR(100)  NULL,
    modifieby        VARCHAR(100)  NULL,
    PRIMARY KEY (production_id),
    UNIQUE KEY uk_production_order_code (production_code),
    KEY idx_production_order_order (order_id),
    KEY idx_production_order_status (status),
    KEY idx_production_order_assigned (assigned_to),
    CONSTRAINT chk_production_order_type CHECK (production_type IN ('CUSTOM', 'READY', 'STOCK')),
    CONSTRAINT chk_production_order_source CHECK (
        (production_type IN ('CUSTOM', 'READY') AND order_id IS NOT NULL)
        OR
        (production_type = 'STOCK' AND order_id IS NULL)
    ),
    CONSTRAINT chk_production_order_status CHECK (status IN (
        'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED'
    )),
    CONSTRAINT fk_production_order_order
        FOREIGN KEY (order_id) REFERENCES customer_order (order_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_production_order_assigned
        FOREIGN KEY (assigned_to) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 24. production_order_item  (món cần gia công trong lệnh)
-- =========================================================
CREATE TABLE IF NOT EXISTS production_order_item (
    production_item_id  BIGINT        NOT NULL AUTO_INCREMENT,
    production_id       BIGINT        NOT NULL,
    product_id          BIGINT        NULL,
    order_item_id       BIGINT        NULL,
    quantity_planned    INT           NOT NULL,
    quantity_done       INT           NOT NULL DEFAULT 0,
    note                VARCHAR(255)  NULL,
    createdate          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate         DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby            VARCHAR(100)  NULL,
    modifieby           VARCHAR(100)  NULL,
    PRIMARY KEY (production_item_id),
    KEY idx_production_item_production (production_id),
    KEY idx_production_item_product (product_id),
    KEY idx_production_item_order_item (order_item_id),
    CONSTRAINT chk_production_item_qty CHECK (quantity_planned > 0 AND quantity_done >= 0),
    CONSTRAINT chk_production_item_source CHECK (
        (product_id IS NOT NULL AND order_item_id IS NULL)
        OR
        (product_id IS NULL AND order_item_id IS NOT NULL)
    ),
    CONSTRAINT fk_production_item_production
        FOREIGN KEY (production_id) REFERENCES production_order (production_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_production_item_product
        FOREIGN KEY (product_id) REFERENCES product (product_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_production_item_order_item
        FOREIGN KEY (order_item_id) REFERENCES customer_order_item (order_item_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB;


-- =========================================================
-- 25. material_issue  (phiếu xuất nguyên vật liệu khỏi kho cho gia công)
-- =========================================================
CREATE TABLE IF NOT EXISTS material_issue (
    issue_id       BIGINT        NOT NULL AUTO_INCREMENT,
    issue_code     VARCHAR(30)   NOT NULL,
    production_id  BIGINT        NULL,
    issue_date     DATE          NOT NULL,
    status         VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    issued_by      BIGINT        NULL,                  -- nhân viên xuất kho
    note           VARCHAR(500)  NULL,
    createdate     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate    DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby       VARCHAR(100)  NULL,
    modifieby      VARCHAR(100)  NULL,
    PRIMARY KEY (issue_id),
    UNIQUE KEY uk_material_issue_code (issue_code),
    KEY idx_material_issue_production (production_id),
    KEY idx_material_issue_status (status),
    KEY idx_material_issue_issued_by (issued_by),
    CONSTRAINT fk_material_issue_production
        FOREIGN KEY (production_id) REFERENCES production_order (production_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_material_issue_issued_by
        FOREIGN KEY (issued_by) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 26. material_issue_item  (từng loại nguyên vật liệu trong phiếu xuất)
-- =========================================================
CREATE TABLE IF NOT EXISTS material_issue_item (
    issue_item_id    BIGINT         NOT NULL AUTO_INCREMENT,
    issue_id         BIGINT         NOT NULL,
    raw_material_id  BIGINT         NOT NULL,
    quantity         INT            NOT NULL,
    note             VARCHAR(255)   NULL,
    createdate       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate      DATETIME       NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby         VARCHAR(100)   NULL,
    modifieby        VARCHAR(100)   NULL,
    PRIMARY KEY (issue_item_id),
    UNIQUE KEY uk_material_issue_item (issue_id, raw_material_id),
    KEY idx_material_issue_item_raw (raw_material_id),
    CONSTRAINT chk_material_issue_item_qty CHECK (quantity > 0),
    CONSTRAINT fk_material_issue_item_issue
        FOREIGN KEY (issue_id) REFERENCES material_issue (issue_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_material_issue_item_raw
        FOREIGN KEY (raw_material_id) REFERENCES raw_material (raw_material_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB;


-- =========================================================
-- 27. finished_goods_receipt  (phiếu nhập kho thành phẩm sau gia công)
-- =========================================================
CREATE TABLE IF NOT EXISTS finished_goods_receipt (
    fg_receipt_id  BIGINT        NOT NULL AUTO_INCREMENT,
    receipt_code   VARCHAR(30)   NOT NULL,
    production_id  BIGINT        NOT NULL,
    receipt_date   DATE          NOT NULL,
    status         VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    received_by    BIGINT        NULL,
    note           VARCHAR(500)  NULL,
    createdate     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate    DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby       VARCHAR(100)  NULL,
    modifieby      VARCHAR(100)  NULL,
    PRIMARY KEY (fg_receipt_id),
    UNIQUE KEY uk_finished_goods_receipt_code (receipt_code),
    KEY idx_finished_goods_receipt_production (production_id),
    KEY idx_finished_goods_receipt_status (status),
    KEY idx_finished_goods_receipt_received_by (received_by),
    CONSTRAINT fk_finished_goods_receipt_production
        FOREIGN KEY (production_id) REFERENCES production_order (production_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_finished_goods_receipt_received_by
        FOREIGN KEY (received_by) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 28. finished_goods_receipt_item  (sản phẩm nhập kho)
-- =========================================================
CREATE TABLE IF NOT EXISTS finished_goods_receipt_item (
    fg_item_id     BIGINT        NOT NULL AUTO_INCREMENT,
    fg_receipt_id  BIGINT        NOT NULL,
    product_id     BIGINT        NOT NULL,
    quantity       INT           NOT NULL,
    note           VARCHAR(255)  NULL,
    createdate     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate    DATETIME      NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby       VARCHAR(100)  NULL,
    modifieby      VARCHAR(100)  NULL,
    PRIMARY KEY (fg_item_id),
    UNIQUE KEY uk_finished_goods_receipt_item (fg_receipt_id, product_id),
    KEY idx_finished_goods_receipt_item_product (product_id),
    CONSTRAINT chk_finished_goods_receipt_item_qty CHECK (quantity > 0),
    CONSTRAINT fk_finished_goods_receipt_item_receipt
        FOREIGN KEY (fg_receipt_id) REFERENCES finished_goods_receipt (fg_receipt_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_finished_goods_receipt_item_product
        FOREIGN KEY (product_id) REFERENCES product (product_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB;


INSERT INTO user_role (role_code, role_name, description)
VALUES
('OWNER', 'Chủ cửa hàng', 'Quản lý cửa hàng, thiết kế và duyệt thành phẩm'),
('SALES', 'Nhân viên bán hàng', 'Tiếp nhận khách hàng, lập hợp đồng và quản lý đơn hàng'),
('LEADERSTAFF', 'Thợ trưởng', 'Tiếp nhận và thực hiện lệnh gia công'),
('CUSTOMER', 'Khách hàng', 'Khách hàng mua sản phẩm trực tuyến')
ON DUPLICATE KEY UPDATE
    role_name = VALUES(role_name),
    description = VALUES(description);

-- =========================================================
-- 2. USER ACCOUNT
-- =========================================================

SET @password_hash = '$2a$10$Q6QRFUpuVvp9nNvMIxv2SOBygeu2OX8Thnp5ReJJpZmN3StSCJeIC';

INSERT INTO user_account (
    role_id,
    email,
    password_hash,
    status,
    full_name,
    phone_number,
    dob,
    gender,
    address
)
SELECT
    r.role_id,
    u.email,
    @password_hash,
    'ACTIVE',
    u.full_name,
    u.phone_number,
    u.dob,
    u.gender,
    u.address
FROM (
    SELECT
        'OWNER' AS role_code,
        'owner@fssims.com' AS email,
        'Nguyễn Văn Chủ' AS full_name,
        '0901000001' AS phone_number,
        '1985-05-10' AS dob,
        'MALE' AS gender,
        'Quốc Oai, Hà Nội' AS address

    UNION ALL

    SELECT
        'SALES',
        'sale@fssims.com',
        'Trần Thị Lan',
        '0901000002',
        '1998-08-15',
        'FEMALE',
        'Quốc Oai, Hà Nội'

    UNION ALL

    SELECT
        'LEADERSTAFF',
        'staff@fssims.com',
        'Lê Văn Hùng',
        '0901000003',
        '1990-03-20',
        'MALE',
        'Quốc Oai, Hà Nội'

    UNION ALL

    SELECT
        'CUSTOMER',
        'customer@gmail.com',
        'Phạm Minh Tuấn',
        '0901000004',
        '2000-11-25',
        'MALE',
        'Hà Nội'
) AS u
INNER JOIN user_role r ON r.role_code = u.role_code
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    phone_number = VALUES(phone_number),
    status = 'ACTIVE';

-- =========================================================
-- 3. PRODUCT CATEGORY
-- =========================================================

INSERT INTO product_category (category_code, category_name, description)
VALUES
('TABLE', 'Bàn', 'Các loại bàn nội thất'),
('CHAIR', 'Ghế', 'Các loại ghế nội thất'),
('BED', 'Giường', 'Giường ngủ các loại'),
('WARDROBE', 'Tủ quần áo', 'Tủ đựng quần áo'),
('SOFA', 'Sofa', 'Ghế sofa phòng khách'),
('CABINET', 'Tủ kệ', 'Tủ trang trí và kệ nội thất')
ON DUPLICATE KEY UPDATE
    category_name = VALUES(category_name),
    description = VALUES(description);

-- =========================================================
-- 4. PRODUCT ROOM
-- =========================================================

INSERT INTO product_room (room_code, room_name, description)
VALUES
('LIVING_ROOM', 'Phòng khách', 'Nội thất phòng khách'),
('BEDROOM', 'Phòng ngủ', 'Nội thất phòng ngủ'),
('DINING_ROOM', 'Phòng ăn', 'Nội thất phòng ăn'),
('OFFICE', 'Phòng làm việc', 'Nội thất phòng làm việc')
ON DUPLICATE KEY UPDATE
    room_name = VALUES(room_name),
    description = VALUES(description);

-- =========================================================
-- 5. PRODUCT MATERIAL
-- =========================================================

INSERT INTO product_material (material_code, material_name, description)
VALUES
('OAK', 'Gỗ sồi', 'Gỗ sồi tự nhiên'),
('WALNUT', 'Gỗ óc chó', 'Gỗ óc chó tự nhiên'),
('PINE', 'Gỗ thông', 'Gỗ thông tự nhiên'),
('RUBBER', 'Gỗ cao su', 'Gỗ cao su ghép'),
('MDF', 'Gỗ MDF', 'Gỗ công nghiệp MDF')
ON DUPLICATE KEY UPDATE
    material_name = VALUES(material_name),
    description = VALUES(description);

-- =========================================================
-- 6. PRODUCT COLOR
-- =========================================================

INSERT INTO product_color (color_code, color_name, hex_value)
VALUES
('NATURAL', 'Màu gỗ tự nhiên', '#C19A6B'),
('BROWN', 'Nâu gỗ', '#8B5A2B'),
('DARK_BROWN', 'Nâu đậm', '#4B2E1F'),
('WHITE', 'Trắng', '#FFFFFF'),
('BLACK', 'Đen', '#222222'),
('GRAY', 'Xám', '#808080')
ON DUPLICATE KEY UPDATE
    color_name = VALUES(color_name),
    hex_value = VALUES(hex_value);

-- =========================================================
-- 7. PRODUCT
-- Các sản phẩm mẫu của cửa hàng nội thất
-- Tất cả là SINGLE (sản phẩm đơn)
-- =========================================================

INSERT INTO product (
    category_id,
    room_id,
    material_id,
    color_id,
    product_code,
    product_name,
    product_type,
    description,
    length_cm,
    width_cm,
    height_cm,
    price,
    stock_quantity,
    hold_quantity,
    image_url,
    status
)
SELECT
    c.category_id,
    r.room_id,
    m.material_id,
    cl.color_id,
    p.product_code,
    p.product_name,
    'SINGLE',
    p.description,
    p.length_cm,
    p.width_cm,
    p.height_cm,
    p.price,
    p.stock_quantity,
    0,
    p.image_url,
    'ACTIVE'
FROM (
    SELECT
        'TABLE' AS category_code,
        'DINING_ROOM' AS room_code,
        'OAK' AS material_code,
        'NATURAL' AS color_code,
        'TB001' AS product_code,
        'Bàn ăn gỗ sồi 6 người' AS product_name,
        'Bàn ăn thiết kế hiện đại, phù hợp gia đình 4-6 người' AS description,
        160 AS length_cm,
        80 AS width_cm,
        75 AS height_cm,
        8500000 AS price,
        10 AS stock_quantity,
        '/assets/products/ban-an-go-soi.jpg' AS image_url

    UNION ALL SELECT
        'TABLE', 'LIVING_ROOM', 'WALNUT', 'DARK_BROWN',
        'TB002', 'Bàn trà gỗ óc chó',
        'Bàn trà phòng khách phong cách hiện đại',
        120, 60, 45, 6500000, 5,
        '/assets/products/ban-tra-go-oc-cho.jpg'

    UNION ALL SELECT
        'TABLE', 'OFFICE', 'MDF', 'WHITE',
        'TB003', 'Bàn làm việc MDF',
        'Bàn làm việc đơn giản, tiết kiệm diện tích',
        120, 60, 75, 2500000, 12,
        '/assets/products/ban-lam-viec.jpg'

    UNION ALL SELECT
        'CHAIR', 'DINING_ROOM', 'OAK', 'NATURAL',
        'GH001', 'Ghế ăn gỗ sồi',
        'Ghế ăn gỗ sồi tự nhiên, thiết kế tối giản',
        45, 45, 90, 1800000, 30,
        '/assets/products/ghe-an-go-soi.jpg'

    UNION ALL SELECT
        'CHAIR', 'OFFICE', 'MDF', 'BLACK',
        'GH002', 'Ghế làm việc',
        'Ghế làm việc có đệm ngồi',
        55, 55, 100, 1200000, 15,
        '/assets/products/ghe-lam-viec.jpg'

    UNION ALL SELECT
        'BED', 'BEDROOM', 'WALNUT', 'BROWN',
        'GI001', 'Giường ngủ gỗ óc chó',
        'Giường ngủ đôi bằng gỗ óc chó',
        200, 180, 90, 18000000, 4,
        '/assets/products/giuong-go-oc-cho.jpg'

    UNION ALL SELECT
        'BED', 'BEDROOM', 'RUBBER', 'NATURAL',
        'GI002', 'Giường ngủ gỗ cao su',
        'Giường ngủ gỗ cao su tự nhiên',
        200, 160, 85, 7500000, 8,
        '/assets/products/giuong-go-cao-su.jpg'

    UNION ALL SELECT
        'WARDROBE', 'BEDROOM', 'MDF', 'WHITE',
        'TU001', 'Tủ quần áo 3 cánh',
        'Tủ quần áo MDF phủ Melamine',
        180, 60, 220, 9500000, 6,
        '/assets/products/tu-quan-ao-3-canh.jpg'

    UNION ALL SELECT
        'WARDROBE', 'BEDROOM', 'OAK', 'BROWN',
        'TU002', 'Tủ quần áo gỗ sồi',
        'Tủ quần áo gỗ sồi tự nhiên cao cấp',
        200, 60, 220, 22000000, 3,
        '/assets/products/tu-go-soi.jpg'

    UNION ALL SELECT
        'SOFA', 'LIVING_ROOM', 'PINE', 'GRAY',
        'SF001', 'Sofa phòng khách 3 chỗ',
        'Sofa phòng khách bọc vải màu xám',
        220, 90, 85, 15000000, 5,
        '/assets/products/sofa-3-cho.jpg'

    UNION ALL SELECT
        'CABINET', 'LIVING_ROOM', 'MDF', 'BROWN',
        'KE001', 'Kệ tivi hiện đại',
        'Kệ tivi gỗ MDF thiết kế hiện đại',
        180, 40, 50, 4500000, 7,
        '/assets/products/ke-tivi.jpg'

    UNION ALL SELECT
        'CABINET', 'LIVING_ROOM', 'OAK', 'NATURAL',
        'KE002', 'Kệ trang trí gỗ sồi',
        'Kệ trang trí phòng khách bằng gỗ sồi',
        100, 35, 180, 5500000, 4,
        '/assets/products/ke-trang-tri.jpg'
) AS p
INNER JOIN product_category c
    ON c.category_code = p.category_code
INNER JOIN product_room r
    ON r.room_code = p.room_code
INNER JOIN product_material m
    ON m.material_code = p.material_code
INNER JOIN product_color cl
    ON cl.color_code = p.color_code
ON DUPLICATE KEY UPDATE
    product_name = VALUES(product_name),
    description = VALUES(description),
    price = VALUES(price),
    image_url = VALUES(image_url),
    status = VALUES(status);
