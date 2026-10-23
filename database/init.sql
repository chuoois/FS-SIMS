-- =========================================================
-- FSSIMS - Database Initialization
-- Database: db_2026_fssims
--
-- File này tự động chạy khi container MySQL khởi tạo lần đầu
-- (mount vào /docker-entrypoint-initdb.d)
--
-- LUỒNG NGHIỆP VỤ
--
--  [ONLINE]  khách thêm sản phẩm vào giỏ (cart)
--            -> gửi yêu cầu cho sale (order_request, order_type = READY)
--            (hoặc gửi yêu cầu đặt làm riêng, order_type = CUSTOM)
--            -> sale chấp nhận yêu cầu (APPROVED)
--            -> sale lập biên bản hợp đồng (contract, source = ONLINE)
--            -> khách ký trực tiếp tại cửa hàng (contract SIGNED)
--            -> sale bấm nút chuyển trạng thái yêu cầu (CONVERTED)
--               => hệ thống tạo order (customer_order)
--
--  [OFFLINE] khách đến cửa hàng, KHÔNG qua giỏ hàng và KHÔNG có request
--            -> sale tạo hợp đồng trực tiếp (contract, source = OFFLINE)
--            -> ký tại cửa hàng (contract SIGNED)
--            -> sale tạo order (customer_order)
--
--  Mọi order đều xuất phát từ 1 hợp đồng đã ký.
--  Order có 2 loại: CUSTOM (hàng đặt làm) và READY (hàng sẵn).
--
-- [KHO & GIA CÔNG]
--  nhập nguyên vật liệu (material_receipt)  -> tăng raw_material.quantity_on_hand
--  tạo lệnh gia công (production_order)     -> làm cho đơn CUSTOM hoặc làm hàng nhập kho
--  xuất nguyên vật liệu (material_issue)    -> giảm raw_material.quantity_on_hand
--  nhập kho thành phẩm (finished_goods_receipt) -> tăng product.stock_quantity
--  (số tồn do tầng service cập nhật khi phiếu chuyển sang CONFIRMED)
-- =========================================================

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
    phone_number    VARCHAR(20)  NOT NULL,
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
--     Ví dụ: bộ bàn ăn 6 ghế = 1 x "Bàn ăn A" + 6 x "Ghế ăn B"
--     set_product_id  -> product có product_type = 'SET'
--     item_product_id -> product có product_type = 'SINGLE'
--     (kiểm tra 2 điều kiện này ở tầng service)
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
--     Khi khách bấm "gửi yêu cầu": copy cart_item sang order_request_item
--     rồi xóa các dòng trong giỏ.
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
-- 12. order_request  (yêu cầu khách ONLINE gửi cho sale)
--
--  order_type:
--    READY  -> mua hàng sẵn, tạo từ giỏ hàng
--    CUSTOM -> đặt làm riêng (sản phẩm đơn như tủ, hoặc bộ nhiều món)
--
--  request_type (chỉ có ý nghĩa với CUSTOM):
--    SINGLE = sản phẩm đơn (vd: 1 cái tủ), SET = bộ nhiều món (vd: bàn + ghế)
--
--  status:
--    NEW             -> khách vừa gửi
--    REVIEWING       -> sale đang xem xét
--    QUOTED          -> sale đã báo giá (chỉ CUSTOM, quoted_price)
--    APPROVED        -> sale chấp nhận yêu cầu  => lập biên bản hợp đồng
--    CONTRACT_SIGNED -> khách đã ký hợp đồng tại cửa hàng
--    CONVERTED       -> sale bấm chuyển trạng thái, đã tạo order
--    REJECTED        -> sale từ chối (reject_reason)
--    CANCELLED       -> khách hủy
--
--  Chi tiết từng món nằm ở order_request_item.
-- =========================================================
CREATE TABLE IF NOT EXISTS order_request (
    request_id           BIGINT         NOT NULL AUTO_INCREMENT,
    request_code         VARCHAR(30)    NOT NULL,
    order_type           VARCHAR(20)    NOT NULL,                  -- READY / CUSTOM
    request_type         VARCHAR(20)    NOT NULL DEFAULT 'SINGLE', -- SINGLE / SET (CUSTOM)
    customer_account_id  BIGINT         NOT NULL,
    contact_name         VARCHAR(150)   NOT NULL,
    contact_phone        VARCHAR(20)    NOT NULL,
    contact_email        VARCHAR(255)   NULL,
    delivery_address     VARCHAR(255)   NULL,

    title                VARCHAR(200)   NOT NULL,
    description          TEXT           NULL,           -- mô tả chung của cả yêu cầu
    budget_min           INT            NULL,
    budget_max           INT            NULL,
    expected_date        DATE           NULL,           -- ngày khách muốn nhận

    status               VARCHAR(30)    NOT NULL DEFAULT 'NEW',
    assigned_to          BIGINT         NULL,           -- sale phụ trách
    quoted_price         INT            NULL,
    quoted_at            DATETIME       NULL,
    approved_at          DATETIME       NULL,
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
    CONSTRAINT chk_order_request_order_type CHECK (order_type IN ('READY', 'CUSTOM')),
    CONSTRAINT fk_order_request_customer
        FOREIGN KEY (customer_account_id) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_order_request_assigned
        FOREIGN KEY (assigned_to) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 13. order_request_item  (từng món trong yêu cầu)
--     READY  -> product_id = sản phẩm khách chọn từ giỏ, unit_price = giá lúc gửi
--     CUSTOM -> mô tả món khách muốn đặt; product_id (nếu có) là sản phẩm gốc
--               để tùy chỉnh theo. Các cột category/room/material/color là
--               mong muốn của khách, có thể để trống.
--     CUSTOM SINGLE có 1 dòng, CUSTOM SET có nhiều dòng.
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
-- 14. order_request_image  (ảnh tham khảo / bản vẽ khách đính kèm)
-- =========================================================
CREATE TABLE IF NOT EXISTS order_request_image (
    request_image_id  BIGINT       NOT NULL AUTO_INCREMENT,
    request_id        BIGINT       NOT NULL,
    request_item_id   BIGINT       NULL,                -- NULL = ảnh chung của cả yêu cầu
    image_url         VARCHAR(255) NOT NULL,
    sort_order        INT          NOT NULL DEFAULT 0,
    createdate        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedate       DATETIME     NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    createby          VARCHAR(100) NULL,
    modifieby         VARCHAR(100) NULL,
    PRIMARY KEY (request_image_id),
    KEY idx_order_request_image_request (request_id),
    KEY idx_order_request_image_item (request_item_id),
    CONSTRAINT fk_order_request_image_request
        FOREIGN KEY (request_id) REFERENCES order_request (request_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_order_request_image_item
        FOREIGN KEY (request_item_id) REFERENCES order_request_item (request_item_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;


-- =========================================================
-- 15. contract  (biên bản ký hợp đồng)
--
--  Hợp đồng được KÝ TRỰC TIẾP TẠI CỬA HÀNG (bản giấy), hệ thống KHÔNG ký online.
--  Hệ thống chỉ lập biên bản ký hợp đồng để lưu vết.
--
--  source:
--    ONLINE  -> tạo từ order_request đã được sale chấp nhận (bắt buộc có request_id)
--    OFFLINE -> sale tạo trực tiếp cho khách tại cửa hàng (không có request_id)
--
--  contract_type: CUSTOM / READY  (order tạo ra sẽ mang đúng loại này)
--
--  status:
--    DRAFT     -> biên bản đã lập, chờ khách ký tại cửa hàng
--    SIGNED    -> đã ký (bắt buộc có signed_date)
--    CANCELLED -> hủy, không ký nữa
--
--  Thông tin khách lưu snapshot (khách offline có thể không có tài khoản).
--  Tiền dùng BIGINT vì giá trị hợp đồng có thể vượt 2,1 tỷ.
-- =========================================================
CREATE TABLE IF NOT EXISTS contract (
    contract_id          BIGINT        NOT NULL AUTO_INCREMENT,
    contract_code        VARCHAR(30)   NOT NULL,
    source               VARCHAR(20)   NOT NULL,            -- ONLINE / OFFLINE
    contract_type        VARCHAR(20)   NOT NULL,            -- CUSTOM / READY
    request_id           BIGINT        NULL,
    customer_account_id  BIGINT        NULL,
    customer_name        VARCHAR(150)  NOT NULL,
    customer_phone       VARCHAR(20)   NOT NULL,
    customer_address     VARCHAR(255)  NULL,
    total_amount         BIGINT        NOT NULL,
    deposit_amount       BIGINT        NOT NULL DEFAULT 0,
    status               VARCHAR(30)   NOT NULL DEFAULT 'DRAFT',
    signed_date          DATE          NULL,                -- ngày ký tại cửa hàng
    signed_place         VARCHAR(255)  NULL,                -- địa điểm ký (cửa hàng / chi nhánh)
    delivery_date        DATE          NULL,                -- ngày cam kết giao
    contract_file_url    VARCHAR(255)  NULL,                -- ảnh/scan bản giấy đã ký (không bắt buộc)
    terms                TEXT          NULL,
    signed_by            BIGINT        NULL,                -- sale lập biên bản & đại diện xưởng ký
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
    CONSTRAINT chk_contract_signed CHECK (status <> 'SIGNED' OR signed_date IS NOT NULL),
    CONSTRAINT chk_contract_source CHECK (
        (source = 'ONLINE'  AND request_id IS NOT NULL)
        OR
        (source = 'OFFLINE' AND request_id IS NULL)
    ),
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
--     ONLINE : copy từ order_request_item (request_item_id có giá trị)
--     OFFLINE: sale nhập trực tiếp
--              - hàng sẵn  -> product_id
--              - hàng custom -> product_id và request_item_id để trống,
--                nhập đủ thông số món: loại, phòng, chất liệu, màu,
--                kích thước + mô tả (xưởng dựa vào đây để sản xuất)
--     Một dòng không được vừa có product_id vừa có request_item_id.
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
--
--  Order luôn được tạo từ 1 hợp đồng đã ký (mỗi hợp đồng tối đa 1 order):
--    ONLINE : sale bấm nút chuyển trạng thái request (CONTRACT_SIGNED -> CONVERTED)
--    OFFLINE: sale tạo order trực tiếp từ hợp đồng đã ký
--
--  order_type:
--    CUSTOM -> hàng đặt làm riêng (có công đoạn sản xuất)
--    READY  -> hàng sẵn
--
--  status: NEW -> CONFIRMED -> IN_PRODUCTION (chỉ CUSTOM) -> READY_TO_DELIVER
--          -> DELIVERING -> COMPLETED | CANCELLED
--  Tiền dùng BIGINT vì đơn custom có thể vượt 2,1 tỷ.
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
    assigned_to          BIGINT        NULL,            -- nhân viên phụ trách
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
--     item_name, unit_price là snapshot tại thời điểm tạo order.
--     product_id có giá trị với hàng sẵn.
--     Hàng custom: copy thông số (loại, phòng, chất liệu, màu, kích thước)
--     từ contract_item để xưởng sản xuất đúng yêu cầu khách.
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
    UNIQUE KEY uk_supplier_code (supplier_code)
) ENGINE = InnoDB;


-- =========================================================
-- 20. raw_material  (nguyên vật liệu trong kho: gỗ, ván, sơn, keo, ốc vít...)
--     Khác với product_material (chất liệu của sản phẩm thành phẩm).
--     material_id: nếu là gỗ thì trỏ tới loại gỗ tương ứng, còn lại để trống.
--     Số lượng dùng INT nên chọn đơn vị đủ nhỏ để không bị lẻ (kg, tấm, thanh, cái...).
--     quantity_on_hand: tồn kho hiện tại, do service cập nhật khi phiếu nhập/xuất
--     được CONFIRMED. min_quantity: mức tồn tối thiểu để cảnh báo sắp hết.
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
--     status: DRAFT -> CONFIRMED (cộng tồn kho) | CANCELLED
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
--
--  production_type:
--    CUSTOM -> làm cho đơn hàng đặt riêng (bắt buộc có order_id)
--              thành phẩm giao thẳng cho khách, không nhập kho
--    STOCK  -> làm hàng sẵn để nhập kho (order_id để trống)
--
--  status: DRAFT -> IN_PROGRESS -> COMPLETED | CANCELLED
-- =========================================================
CREATE TABLE IF NOT EXISTS production_order (
    production_id    BIGINT        NOT NULL AUTO_INCREMENT,
    production_code  VARCHAR(30)   NOT NULL,
    production_type  VARCHAR(20)   NOT NULL,            -- CUSTOM / STOCK
    order_id         BIGINT        NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    planned_start    DATE          NULL,
    planned_end      DATE          NULL,
    completed_date   DATE          NULL,
    assigned_to      BIGINT        NULL,                -- người phụ trách (tổ trưởng)
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
    CONSTRAINT chk_production_order_type CHECK (production_type IN ('CUSTOM', 'STOCK')),
    CONSTRAINT chk_production_order_source CHECK (
        (production_type = 'CUSTOM' AND order_id IS NOT NULL)
        OR
        (production_type = 'STOCK' AND order_id IS NULL)
    ),
    CONSTRAINT fk_production_order_order
        FOREIGN KEY (order_id) REFERENCES customer_order (order_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_production_order_assigned
        FOREIGN KEY (assigned_to) REFERENCES user_account (user_account_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;


-- =========================================================
-- 24. production_order_item  (món cần gia công trong lệnh)
--     CUSTOM -> order_item_id (món trong đơn đặt riêng)
--     STOCK  -> product_id (sản phẩm trong danh mục sẽ nhập kho)
--     Mỗi dòng chỉ trỏ tới đúng 1 trong 2.
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
--     status: DRAFT -> CONFIRMED (trừ tồn kho) | CANCELLED
-- =========================================================
CREATE TABLE IF NOT EXISTS material_issue (
    issue_id       BIGINT        NOT NULL AUTO_INCREMENT,
    issue_code     VARCHAR(30)   NOT NULL,
    production_id  BIGINT        NOT NULL,
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
        ON UPDATE RESTRICT ON DELETE RESTRICT,
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
--     Chỉ dành cho lệnh gia công STOCK (service kiểm tra).
--     status: DRAFT -> CONFIRMED (cộng product.stock_quantity) | CANCELLED
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


-- =========================================================
-- 29. Initial Data - user_role
-- =========================================================
INSERT INTO user_role (
    role_code,
    role_name,
    description
)
VALUES
    ('OWNER', 'Owner', 'Store owner'),
    ('SALES', 'Sales', 'Sales employee'),
    ('LEADERSTAFF', 'LeaderStaff', 'Team leader'),
    ('CUSTOMER', 'Customer', 'Customer account')
ON DUPLICATE KEY UPDATE
    role_name = VALUES(role_name),
    description = VALUES(description);


-- =========================================================
-- 30. Initial Data - product_category
-- =========================================================
INSERT INTO product_category (category_code, category_name, description)
VALUES
    ('TABLE',   'Bàn',        'Bàn ăn, bàn làm việc, bàn trà...'),
    ('CHAIR',   'Ghế',        'Ghế ăn, ghế sofa gỗ, ghế bar...'),
    ('CABINET', 'Tủ',         'Tủ quần áo, tủ bếp, tủ giày, tủ tivi...'),
    ('BED',     'Giường',     'Giường ngủ'),
    ('SHELF',   'Kệ',         'Kệ sách, kệ trang trí'),
    ('SET',     'Bộ bàn ghế', 'Bộ gồm nhiều món (bàn + ghế ...)')
ON DUPLICATE KEY UPDATE
    category_name = VALUES(category_name),
    description   = VALUES(description);


-- =========================================================
-- 31. Initial Data - product_room
-- =========================================================
INSERT INTO product_room (room_code, room_name, description)
VALUES
    ('LIVING',  'Phòng khách',    NULL),
    ('BEDROOM', 'Phòng ngủ',      NULL),
    ('KITCHEN', 'Phòng bếp',      NULL),
    ('DINING',  'Phòng ăn',       NULL),
    ('OFFICE',  'Phòng làm việc', NULL)
ON DUPLICATE KEY UPDATE
    room_name   = VALUES(room_name),
    description = VALUES(description);


-- =========================================================
-- 32. Initial Data - product_material
-- =========================================================
INSERT INTO product_material (material_code, material_name, description)
VALUES
    ('OAK',    'Gỗ sồi',    'Vân đẹp, cứng, bền'),
    ('WALNUT', 'Gỗ óc chó', 'Màu nâu sẫm, cao cấp'),
    ('PINE',   'Gỗ thông',  'Nhẹ, giá mềm'),
    ('MANGO',  'Gỗ xoài',   NULL),
    ('RUBBER', 'Gỗ cao su', 'Phổ biến, giá hợp lý'),
    ('TEAK',   'Gỗ tếch',   'Chịu nước tốt')
ON DUPLICATE KEY UPDATE
    material_name = VALUES(material_name),
    description   = VALUES(description);


-- =========================================================
-- 33. Initial Data - product_color
-- =========================================================
INSERT INTO product_color (color_code, color_name, hex_value)
VALUES
    ('NATURAL', 'Màu gỗ tự nhiên', '#D2B48C'),
    ('WALNUT',  'Nâu óc chó',      '#5C4033'),
    ('WHITE',   'Trắng',           '#FFFFFF'),
    ('BLACK',   'Đen',             '#000000'),
    ('GRAY',    'Xám',             '#808080'),
    ('HONEY',   'Vàng mật ong',    '#C68E17')
ON DUPLICATE KEY UPDATE
    color_name = VALUES(color_name),
    hex_value  = VALUES(hex_value);


-- =========================================================
-- 34. Initial Data - raw_material
--     (phải đặt sau product_material vì dùng material_id của loại gỗ)
-- =========================================================
INSERT INTO raw_material (raw_code, raw_name, material_id, unit, min_quantity, description)
VALUES
    ('WOOD-OAK',    'Gỗ sồi xẻ',    (SELECT material_id FROM product_material WHERE material_code = 'OAK'),    'BOARD', 20, NULL),
    ('WOOD-WALNUT', 'Gỗ óc chó xẻ', (SELECT material_id FROM product_material WHERE material_code = 'WALNUT'), 'BOARD', 20, NULL),
    ('WOOD-PINE',   'Gỗ thông xẻ',  (SELECT material_id FROM product_material WHERE material_code = 'PINE'),   'BOARD', 20, NULL),
    ('WOOD-RUBBER', 'Gỗ cao su xẻ', (SELECT material_id FROM product_material WHERE material_code = 'RUBBER'), 'BOARD', 20, NULL),
    ('WOOD-TEAK',   'Gỗ tếch xẻ',   (SELECT material_id FROM product_material WHERE material_code = 'TEAK'),   'BOARD', 20, NULL),
    ('PLYWOOD',     'Ván ép',       NULL, 'M2', 20, NULL),
    ('MDF',         'Ván MDF',      NULL, 'M2', 20, NULL),
    ('PAINT-PU',    'Sơn PU',       NULL, 'L',  10, 'Sơn hoàn thiện'),
    ('GLUE',        'Keo dán gỗ',   NULL, 'KG', 10, NULL),
    ('SCREW',       'Ốc vít',       NULL, 'BOX', 5, NULL)
ON DUPLICATE KEY UPDATE
    raw_name    = VALUES(raw_name),
    material_id = VALUES(material_id),
    unit        = VALUES(unit),
    description = VALUES(description);


-- #########################################################
-- DỮ LIỆU MẪU CHO TẤT CẢ CÁC BẢNG (để dễ hiểu luồng nghiệp vụ)
--
--  Chỉ chạy 1 lần khi khởi tạo DB. Khi lên production có thể xóa phần này.
--  Mật khẩu của các tài khoản mẫu là chuỗi giữ chỗ, KHÔNG đăng nhập được,
--  hãy thay bằng hash thật (vd: bcrypt) nếu muốn dùng.
--
--  Các tình huống mẫu:
--   A. ONLINE + hàng sẵn : customer1 mua tủ + kệ sách -> yêu cầu -> hợp đồng -> order READY (đã giao)
--   B. ONLINE + đặt riêng: customer2 đặt tủ giày      -> yêu cầu -> hợp đồng -> order CUSTOM -> đang gia công
--   C. OFFLINE + hàng sẵn: khách vãng lai mua bàn + 4 ghế -> hợp đồng -> order READY (đã giao)
--   D. Yêu cầu đặt riêng dạng BỘ (nhiều món) vừa gửi, đang chờ sale xử lý (NEW)
--   E. Giỏ hàng của customer2 đang có sản phẩm, chưa gửi yêu cầu
--   F. Kho: nhập nguyên vật liệu -> xuất cho gia công -> làm hàng nhập kho (ghế ăn)
-- #########################################################


-- =========================================================
-- 35. Sample - user_account  (mỗi role 1 tài khoản, 2 khách hàng)
-- =========================================================
INSERT INTO user_account (role_id, email, password_hash, status, full_name, phone_number, dob, gender, address, note)
VALUES
    ((SELECT role_id FROM user_role WHERE role_code = 'OWNER'),       'owner@fssims.local',     '$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'ACTIVE', 'Nguyễn Văn Chủ',      '0900000001', '1980-05-10', 'MALE',   '12 Nguyễn Huệ, Quận 1, TP.HCM',       'Chủ xưởng'),
    ((SELECT role_id FROM user_role WHERE role_code = 'SALES'),       'sales@fssims.local',     '$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'ACTIVE', 'Trần Thị Bán Hàng',  '0900000002', '1995-03-20', 'FEMALE', '25 Lê Lợi, Quận 1, TP.HCM',           'Nhân viên bán hàng'),
    ((SELECT role_id FROM user_role WHERE role_code = 'LEADERSTAFF'), 'leader@fssims.local',    '$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'ACTIVE', 'Lê Văn Tổ Trưởng',   '0900000003', '1988-11-02', 'MALE',   'KCN Tân Bình, TP.HCM',                'Tổ trưởng xưởng, phụ trách kho và gia công'),
    ((SELECT role_id FROM user_role WHERE role_code = 'CUSTOMER'),    'customer1@fssims.local', '$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'ACTIVE', 'Phạm Minh Khách',    '0900000011', '1990-07-15', 'MALE',   '45 Lê Lợi, Quận 1, TP.HCM',           'Khách hàng mẫu 1'),
    ((SELECT role_id FROM user_role WHERE role_code = 'CUSTOMER'),    'customer2@fssims.local', '$2a$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'ACTIVE', 'Võ Thị Hoa',         '0900000012', '1992-09-30', 'FEMALE', '88 Cách Mạng Tháng 8, Quận 10, TP.HCM', 'Khách hàng mẫu 2')
ON DUPLICATE KEY UPDATE
    full_name    = VALUES(full_name),
    phone_number = VALUES(phone_number);

SET @owner  = (SELECT user_account_id FROM user_account WHERE email = 'owner@fssims.local'),
    @sales  = (SELECT user_account_id FROM user_account WHERE email = 'sales@fssims.local'),
    @leader = (SELECT user_account_id FROM user_account WHERE email = 'leader@fssims.local'),
    @cus1   = (SELECT user_account_id FROM user_account WHERE email = 'customer1@fssims.local'),
    @cus2   = (SELECT user_account_id FROM user_account WHERE email = 'customer2@fssims.local');


-- =========================================================
-- 36. Sample - refresh_token
-- =========================================================
INSERT INTO refresh_token (user_account_id, token, expires_at)
VALUES
    (@cus1, 'sample-refresh-token-customer1', '2030-01-01 00:00:00')
ON DUPLICATE KEY UPDATE
    expires_at = VALUES(expires_at);


-- =========================================================
-- 37. Sample - product  (hàng sẵn)
--     Tồn kho (stock_quantity) chỉ là số mẫu.
-- =========================================================
SET @c_table   = (SELECT category_id FROM product_category WHERE category_code = 'TABLE'),
    @c_chair   = (SELECT category_id FROM product_category WHERE category_code = 'CHAIR'),
    @c_cabinet = (SELECT category_id FROM product_category WHERE category_code = 'CABINET'),
    @c_bed     = (SELECT category_id FROM product_category WHERE category_code = 'BED'),
    @c_shelf   = (SELECT category_id FROM product_category WHERE category_code = 'SHELF'),
    @c_set     = (SELECT category_id FROM product_category WHERE category_code = 'SET'),
    @r_living  = (SELECT room_id FROM product_room WHERE room_code = 'LIVING'),
    @r_bedroom = (SELECT room_id FROM product_room WHERE room_code = 'BEDROOM'),
    @r_dining  = (SELECT room_id FROM product_room WHERE room_code = 'DINING'),
    @r_office  = (SELECT room_id FROM product_room WHERE room_code = 'OFFICE'),
    @m_oak     = (SELECT material_id FROM product_material WHERE material_code = 'OAK'),
    @m_walnut  = (SELECT material_id FROM product_material WHERE material_code = 'WALNUT'),
    @m_pine    = (SELECT material_id FROM product_material WHERE material_code = 'PINE'),
    @m_rubber  = (SELECT material_id FROM product_material WHERE material_code = 'RUBBER'),
    @col_natural = (SELECT color_id FROM product_color WHERE color_code = 'NATURAL'),
    @col_walnut  = (SELECT color_id FROM product_color WHERE color_code = 'WALNUT'),
    @col_white   = (SELECT color_id FROM product_color WHERE color_code = 'WHITE'),
    @col_honey   = (SELECT color_id FROM product_color WHERE color_code = 'HONEY');

INSERT INTO product (category_id, room_id, material_id, color_id, product_code, product_name, product_type, description, length_cm, width_cm, height_cm, price, stock_quantity, status)
VALUES
    (@c_table,   @r_dining,  @m_oak,    @col_natural, 'TB-001',  'Bàn ăn gỗ sồi 6 người',     'SINGLE', 'Bàn ăn mặt chữ nhật, chân vuông',      160, 80,  75,  4500000,  5,  'ACTIVE'),
    (@c_chair,   @r_dining,  @m_oak,    @col_natural, 'GH-001',  'Ghế ăn gỗ sồi',             'SINGLE', 'Ghế ăn lưng cong, ngồi thoải mái',      45,  50,  90,  900000,   20, 'ACTIVE'),
    (@c_cabinet, @r_bedroom, @m_pine,   @col_white,   'TU-001',  'Tủ quần áo gỗ thông 2 cánh', 'SINGLE', 'Tủ 2 cánh, 1 ngăn kéo, sơn trắng',      120, 55,  200, 6800000,  3,  'ACTIVE'),
    (@c_bed,     @r_bedroom, @m_walnut, @col_walnut,  'GI-001',  'Giường ngủ gỗ óc chó 1m6',  'SINGLE', 'Giường đôi 1m6, đầu giường bọc nệm',    200, 160, 100, 12500000, 2,  'ACTIVE'),
    (@c_shelf,   @r_office,  @m_rubber, @col_honey,   'KE-001',  'Kệ sách gỗ cao su',         'SINGLE', 'Kệ 5 tầng, màu vàng mật ong',           80,  30,  180, 2200000,  8,  'ACTIVE'),
    (@c_table,   @r_office,  @m_rubber, @col_natural, 'TB-002',  'Bàn làm việc gỗ cao su',    'SINGLE', 'Bàn làm việc 1 ngăn kéo',               140, 60,  75,  2800000,  6,  'ACTIVE'),
    (@c_set,     @r_dining,  @m_oak,    @col_natural, 'SET-001', 'Bộ bàn ăn gỗ sồi 6 ghế',   'SET',    'Gồm 1 bàn ăn 6 người và 6 ghế ăn',      160, 80,  75,  9500000,  0,  'ACTIVE')
ON DUPLICATE KEY UPDATE
    product_name = VALUES(product_name),
    price        = VALUES(price);

SET @p_table    = (SELECT product_id FROM product WHERE product_code = 'TB-001'),
    @p_chair    = (SELECT product_id FROM product WHERE product_code = 'GH-001'),
    @p_wardrobe = (SELECT product_id FROM product WHERE product_code = 'TU-001'),
    @p_bed      = (SELECT product_id FROM product WHERE product_code = 'GI-001'),
    @p_shelf    = (SELECT product_id FROM product WHERE product_code = 'KE-001'),
    @p_desk     = (SELECT product_id FROM product WHERE product_code = 'TB-002'),
    @p_set      = (SELECT product_id FROM product WHERE product_code = 'SET-001');


-- =========================================================
-- 38. Sample - product_set_item  (Bộ SET-001 = 1 bàn + 6 ghế)
-- =========================================================
INSERT INTO product_set_item (set_product_id, item_product_id, quantity)
VALUES
    (@p_set, @p_table, 1),
    (@p_set, @p_chair, 6)
ON DUPLICATE KEY UPDATE
    quantity = VALUES(quantity);


-- =========================================================
-- 39. Sample - cart & cart_item  (tình huống E)
--     customer1 đã gửi yêu cầu nên giỏ trống, customer2 đang có 2 sản phẩm
-- =========================================================
INSERT INTO cart (customer_account_id)
VALUES (@cus1), (@cus2)
ON DUPLICATE KEY UPDATE
    customer_account_id = VALUES(customer_account_id);

SET @cart2 = (SELECT cart_id FROM cart WHERE customer_account_id = @cus2);

INSERT INTO cart_item (cart_id, product_id, quantity)
VALUES
    (@cart2, @p_bed,  1),
    (@cart2, @p_desk, 1)
ON DUPLICATE KEY UPDATE
    quantity = VALUES(quantity);


-- =========================================================
-- 40. Sample - order_request  (yêu cầu khách ONLINE gửi cho sale)
--     RQ-...-0001: READY,  đã chuyển thành order   (tình huống A)
--     RQ-...-0002: CUSTOM, đã chuyển thành order   (tình huống B)
--     RQ-...-0003: CUSTOM dạng BỘ, mới gửi         (tình huống D)
-- =========================================================
INSERT INTO order_request (request_code, order_type, request_type, customer_account_id, contact_name, contact_phone, contact_email, delivery_address, title, description, budget_min, budget_max, expected_date, status, assigned_to, quoted_price, quoted_at, approved_at, staff_note)
VALUES
    ('RQ-20261015-0001', 'READY',  'SINGLE', @cus1, 'Phạm Minh Khách', '0900000011', 'customer1@fssims.local', '45 Lê Lợi, Quận 1, TP.HCM',
     'Mua tủ quần áo và kệ sách', NULL, NULL, NULL, '2026-10-25',
     'CONVERTED', @sales, NULL, NULL, '2026-10-16 09:30:00', 'Khách đồng ý giá niêm yết, hẹn ký tại cửa hàng'),
    ('RQ-20261018-0002', 'CUSTOM', 'SINGLE', @cus2, 'Võ Thị Hoa', '0900000012', 'customer2@fssims.local', '88 Cách Mạng Tháng 8, Quận 10, TP.HCM',
     'Đặt làm tủ giày 3 tầng', 'Tủ giày đặt theo kích thước lối vào nhà, màu trắng', 3000000, 4000000, '2026-11-20',
     'CONVERTED', @sales, 3500000, '2026-10-19 10:00:00', '2026-10-19 15:00:00', 'Đã báo giá 3.5 triệu, khách đồng ý'),
    ('RQ-20261021-0003', 'CUSTOM', 'SET',    @cus1, 'Phạm Minh Khách', '0900000011', 'customer1@fssims.local', '45 Lê Lợi, Quận 1, TP.HCM',
     'Bộ bàn ghế phòng khách đặt riêng', 'Muốn bộ bàn trà và ghế sofa gỗ óc chó cùng phong cách', 20000000, 30000000, '2026-12-15',
     'NEW', NULL, NULL, NULL, NULL, NULL);

SET @rq1 = (SELECT request_id FROM order_request WHERE request_code = 'RQ-20261015-0001'),
    @rq2 = (SELECT request_id FROM order_request WHERE request_code = 'RQ-20261018-0002'),
    @rq3 = (SELECT request_id FROM order_request WHERE request_code = 'RQ-20261021-0003');


-- =========================================================
-- 41. Sample - order_request_item
--     READY : product_id + unit_price (lấy từ giỏ hàng)
--     CUSTOM: mô tả món (loại, phòng, chất liệu, màu, kích thước)
-- =========================================================
INSERT INTO order_request_item (request_id, product_id, item_name, category_id, room_id, material_id, color_id, length_cm, width_cm, height_cm, quantity, unit_price, description)
VALUES
    (@rq1, @p_wardrobe, 'Tủ quần áo gỗ thông 2 cánh', @c_cabinet, @r_bedroom, @m_pine,   @col_white,  120, 55, 200, 1, 6800000, NULL),
    (@rq1, @p_shelf,    'Kệ sách gỗ cao su',          @c_shelf,   @r_office,  @m_rubber, @col_honey,  80,  30, 180, 2, 2200000, NULL),
    (@rq2, NULL,        'Tủ giày 3 tầng',             @c_cabinet, @r_living,  @m_oak,    @col_white,  100, 35, 110, 1, NULL,    'Có 3 ngăn kéo, tay nắm màu đen'),
    (@rq3, NULL,        'Bàn trà',                    @c_table,   @r_living,  @m_walnut, @col_walnut, 100, 60, 45,  1, NULL,    'Mặt bàn bo góc'),
    (@rq3, NULL,        'Ghế sofa gỗ 3 chỗ',          @c_chair,   @r_living,  @m_walnut, @col_walnut, 180, 80, 85,  1, NULL,    'Đệm nỉ màu xám'),
    (@rq3, NULL,        'Ghế đơn',                    @c_chair,   @r_living,  @m_walnut, @col_walnut, 70,  70, 85,  2, NULL,    NULL);

SET @rqi1a = (SELECT request_item_id FROM order_request_item WHERE request_id = @rq1 AND item_name = 'Tủ quần áo gỗ thông 2 cánh'),
    @rqi1b = (SELECT request_item_id FROM order_request_item WHERE request_id = @rq1 AND item_name = 'Kệ sách gỗ cao su'),
    @rqi2  = (SELECT request_item_id FROM order_request_item WHERE request_id = @rq2 AND item_name = 'Tủ giày 3 tầng');


-- =========================================================
-- 42. Sample - order_request_image
-- =========================================================
INSERT INTO order_request_image (request_id, request_item_id, image_url, sort_order)
VALUES
    (@rq2, @rqi2, '/uploads/requests/tu-giay-tham-khao-1.jpg', 0),
    (@rq3, NULL,  '/uploads/requests/phong-khach-ban-ve.png',  0);


-- =========================================================
-- 43. Sample - contract  (biên bản ký hợp đồng tại cửa hàng)
--     CT-...-0001: ONLINE + READY  (từ RQ-0001)  tình huống A
--     CT-...-0002: ONLINE + CUSTOM (từ RQ-0002)  tình huống B
--     CT-...-0003: OFFLINE + READY (không có request, khách vãng lai) tình huống C
-- =========================================================
INSERT INTO contract (contract_code, source, contract_type, request_id, customer_account_id, customer_name, customer_phone, customer_address, total_amount, deposit_amount, status, signed_date, signed_place, delivery_date, terms, signed_by, note)
VALUES
    ('CT-20261016-0001', 'ONLINE',  'READY',  @rq1, @cus1, 'Phạm Minh Khách', '0900000011', '45 Lê Lợi, Quận 1, TP.HCM',
     11200000, 5000000, 'SIGNED', '2026-10-17', 'Cửa hàng FSSIMS - 12 Nguyễn Huệ, Quận 1', '2026-10-25',
     'Giao hàng trong 7 ngày. Bảo hành 12 tháng.', @sales, NULL),
    ('CT-20261020-0002', 'ONLINE',  'CUSTOM', @rq2, @cus2, 'Võ Thị Hoa', '0900000012', '88 Cách Mạng Tháng 8, Quận 10, TP.HCM',
     3500000, 1500000, 'SIGNED', '2026-10-20', 'Cửa hàng FSSIMS - 12 Nguyễn Huệ, Quận 1', '2026-11-20',
     'Đặt cọc 1.500.000đ, thanh toán phần còn lại khi nhận hàng.', @sales, 'Hàng đặt riêng, không đổi trả'),
    ('CT-20261012-0003', 'OFFLINE', 'READY',  NULL, NULL,  'Nguyễn Văn A', '0911222333', '99 Điện Biên Phủ, Quận 3, TP.HCM',
     8100000, 8100000, 'SIGNED', '2026-10-12', 'Cửa hàng FSSIMS - 12 Nguyễn Huệ, Quận 1', '2026-10-13',
     'Thanh toán đủ khi ký. Bảo hành 12 tháng.', @sales, 'Khách mua trực tiếp tại cửa hàng');

SET @ct1 = (SELECT contract_id FROM contract WHERE contract_code = 'CT-20261016-0001'),
    @ct2 = (SELECT contract_id FROM contract WHERE contract_code = 'CT-20261020-0002'),
    @ct3 = (SELECT contract_id FROM contract WHERE contract_code = 'CT-20261012-0003');


-- =========================================================
-- 44. Sample - contract_item
--     ONLINE : copy từ order_request_item (request_item_id)
--     OFFLINE: sale nhập trực tiếp (product_id)
-- =========================================================
INSERT INTO contract_item (contract_id, product_id, request_item_id, item_name, description, category_id, room_id, material_id, color_id, length_cm, width_cm, height_cm, quantity, unit_price)
VALUES
    (@ct1, NULL,     @rqi1a, 'Tủ quần áo gỗ thông 2 cánh', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 6800000),
    (@ct1, NULL,     @rqi1b, 'Kệ sách gỗ cao su',          NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, 2200000),
    (@ct2, NULL,     @rqi2,  'Tủ giày 3 tầng', 'Có 3 ngăn kéo, tay nắm màu đen', @c_cabinet, @r_living, @m_oak, @col_white, 100, 35, 110, 1, 3500000),
    (@ct3, @p_table, NULL,   'Bàn ăn gỗ sồi 6 người',      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 4500000),
    (@ct3, @p_chair, NULL,   'Ghế ăn gỗ sồi',              NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, 900000);


-- =========================================================
-- 45. Sample - customer_order  (đơn hàng, tạo từ hợp đồng đã ký)
--     ORD-...-0001: READY,  đã giao
--     ORD-...-0002: CUSTOM, đang gia công
--     ORD-...-0003: READY,  đã giao (khách vãng lai)
-- =========================================================
INSERT INTO customer_order (order_code, order_type, contract_id, customer_account_id, contact_name, contact_phone, delivery_address, total_amount, deposit_amount, paid_amount, status, expected_date, delivered_date, assigned_to, note)
VALUES
    ('ORD-20261017-0001', 'READY',  @ct1, @cus1, 'Phạm Minh Khách', '0900000011', '45 Lê Lợi, Quận 1, TP.HCM',
     11200000, 5000000, 11200000, 'COMPLETED',     '2026-10-25', '2026-10-24', @sales, NULL),
    ('ORD-20261020-0002', 'CUSTOM', @ct2, @cus2, 'Võ Thị Hoa', '0900000012', '88 Cách Mạng Tháng 8, Quận 10, TP.HCM',
     3500000, 1500000, 1500000,  'IN_PRODUCTION', '2026-11-20', NULL,         @sales, 'Đang gia công, còn thu 2.000.000đ khi giao'),
    ('ORD-20261012-0003', 'READY',  @ct3, NULL,  'Nguyễn Văn A', '0911222333', '99 Điện Biên Phủ, Quận 3, TP.HCM',
     8100000, 8100000, 8100000,  'COMPLETED',     '2026-10-13', '2026-10-13', @sales, NULL);

SET @od1 = (SELECT order_id FROM customer_order WHERE order_code = 'ORD-20261017-0001'),
    @od2 = (SELECT order_id FROM customer_order WHERE order_code = 'ORD-20261020-0002'),
    @od3 = (SELECT order_id FROM customer_order WHERE order_code = 'ORD-20261012-0003');


-- =========================================================
-- 46. Sample - customer_order_item  (copy từ contract_item)
-- =========================================================
INSERT INTO customer_order_item (order_id, contract_item_id, product_id, item_name, description, category_id, room_id, material_id, color_id, length_cm, width_cm, height_cm, quantity, unit_price)
VALUES
    (@od1, (SELECT contract_item_id FROM contract_item WHERE contract_id = @ct1 AND item_name = 'Tủ quần áo gỗ thông 2 cánh'),
           @p_wardrobe, 'Tủ quần áo gỗ thông 2 cánh', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 6800000),
    (@od1, (SELECT contract_item_id FROM contract_item WHERE contract_id = @ct1 AND item_name = 'Kệ sách gỗ cao su'),
           @p_shelf,    'Kệ sách gỗ cao su',          NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, 2200000),
    (@od2, (SELECT contract_item_id FROM contract_item WHERE contract_id = @ct2 AND item_name = 'Tủ giày 3 tầng'),
           NULL,        'Tủ giày 3 tầng', 'Có 3 ngăn kéo, tay nắm màu đen', @c_cabinet, @r_living, @m_oak, @col_white, 100, 35, 110, 1, 3500000),
    (@od3, (SELECT contract_item_id FROM contract_item WHERE contract_id = @ct3 AND item_name = 'Bàn ăn gỗ sồi 6 người'),
           @p_table,    'Bàn ăn gỗ sồi 6 người',      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 4500000),
    (@od3, (SELECT contract_item_id FROM contract_item WHERE contract_id = @ct3 AND item_name = 'Ghế ăn gỗ sồi'),
           @p_chair,    'Ghế ăn gỗ sồi',              NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, 900000);


-- =========================================================
-- 47. Sample - supplier
-- =========================================================
INSERT INTO supplier (supplier_code, supplier_name, phone_number, address, note)
VALUES
    ('SUP-001', 'Công ty Vật tư Gỗ Sài Gòn',  '0281234567', 'KCN Tân Bình, TP.HCM',    'Cung cấp gỗ, ván, sơn, keo, ốc vít'),
    ('SUP-002', 'Xưởng Gỗ Thông Bình Dương',  '0274987654', 'Thuận An, Bình Dương',    'Chuyên gỗ thông')
ON DUPLICATE KEY UPDATE
    supplier_name = VALUES(supplier_name),
    phone_number  = VALUES(phone_number);

SET @sup1 = (SELECT supplier_id FROM supplier WHERE supplier_code = 'SUP-001'),
    @sup2 = (SELECT supplier_id FROM supplier WHERE supplier_code = 'SUP-002');

SET @rm_oak     = (SELECT raw_material_id FROM raw_material WHERE raw_code = 'WOOD-OAK'),
    @rm_pine    = (SELECT raw_material_id FROM raw_material WHERE raw_code = 'WOOD-PINE'),
    @rm_rubber  = (SELECT raw_material_id FROM raw_material WHERE raw_code = 'WOOD-RUBBER'),
    @rm_plywood = (SELECT raw_material_id FROM raw_material WHERE raw_code = 'PLYWOOD'),
    @rm_paint   = (SELECT raw_material_id FROM raw_material WHERE raw_code = 'PAINT-PU'),
    @rm_glue    = (SELECT raw_material_id FROM raw_material WHERE raw_code = 'GLUE'),
    @rm_screw   = (SELECT raw_material_id FROM raw_material WHERE raw_code = 'SCREW');


-- =========================================================
-- 48. Sample - material_receipt & material_receipt_item  (nhập nguyên vật liệu)
--     RCP-...-0001: đã CONFIRMED -> đã cộng vào tồn kho
--     RCP-...-0002: còn DRAFT    -> chưa cộng vào tồn kho
-- =========================================================
INSERT INTO material_receipt (receipt_code, supplier_id, receipt_date, total_amount, status, received_by, note)
VALUES
    ('RCP-20261001-0001', @sup1, '2026-10-01', 59950000, 'CONFIRMED', @leader, 'Nhập đầu tháng 10'),
    ('RCP-20261022-0002', @sup2, '2026-10-22', 10800000, 'DRAFT',     @leader, 'Phiếu nháp, chờ hàng về');

SET @rcp1 = (SELECT receipt_id FROM material_receipt WHERE receipt_code = 'RCP-20261001-0001'),
    @rcp2 = (SELECT receipt_id FROM material_receipt WHERE receipt_code = 'RCP-20261022-0002');

INSERT INTO material_receipt_item (receipt_id, raw_material_id, quantity, unit_price, note)
VALUES
    (@rcp1, @rm_oak,     100, 350000, 'Gỗ sồi xẻ (tấm)'),
    (@rcp1, @rm_rubber,  50,  250000, 'Gỗ cao su xẻ (tấm)'),
    (@rcp1, @rm_plywood, 40,  180000, 'Ván ép (m2)'),
    (@rcp1, @rm_paint,   30,  120000, 'Sơn PU (lít)'),
    (@rcp1, @rm_glue,    20,  60000,  'Keo dán gỗ (kg)'),
    (@rcp1, @rm_screw,   10,  45000,  'Ốc vít (hộp)'),
    (@rcp2, @rm_pine,    60,  180000, 'Gỗ thông xẻ (tấm)');


-- =========================================================
-- 49. Sample - production_order & production_order_item  (gia công)
--     PRD-...-0001: CUSTOM, làm tủ giày cho đơn ORD-0002, đang làm
--     PRD-...-0002: STOCK,  làm 20 ghế ăn để nhập kho, đã xong
-- =========================================================
INSERT INTO production_order (production_code, production_type, order_id, status, planned_start, planned_end, completed_date, assigned_to, note)
VALUES
    ('PRD-20261021-0001', 'CUSTOM', @od2, 'IN_PROGRESS', '2026-10-21', '2026-11-15', NULL,         @leader, 'Tủ giày đặt riêng cho khách Võ Thị Hoa'),
    ('PRD-20261005-0002', 'STOCK',  NULL, 'COMPLETED',   '2026-10-05', '2026-10-10', '2026-10-10', @leader, 'Làm ghế ăn bổ sung kho');

SET @prd1 = (SELECT production_id FROM production_order WHERE production_code = 'PRD-20261021-0001'),
    @prd2 = (SELECT production_id FROM production_order WHERE production_code = 'PRD-20261005-0002');

INSERT INTO production_order_item (production_id, product_id, order_item_id, quantity_planned, quantity_done, note)
VALUES
    (@prd1, NULL,     (SELECT order_item_id FROM customer_order_item WHERE order_id = @od2 AND item_name = 'Tủ giày 3 tầng'), 1,  0,  'Món trong đơn đặt riêng'),
    (@prd2, @p_chair, NULL,                                                                                                  20, 20, 'Hàng sẵn nhập kho');


-- =========================================================
-- 50. Sample - material_issue & material_issue_item  (xuất nguyên vật liệu cho gia công)
-- =========================================================
INSERT INTO material_issue (issue_code, production_id, issue_date, status, issued_by, note)
VALUES
    ('ISS-20261021-0001', @prd1, '2026-10-21', 'CONFIRMED', @leader, 'Xuất vật tư làm tủ giày'),
    ('ISS-20261005-0002', @prd2, '2026-10-05', 'CONFIRMED', @leader, 'Xuất vật tư làm 20 ghế ăn');

SET @iss1 = (SELECT issue_id FROM material_issue WHERE issue_code = 'ISS-20261021-0001'),
    @iss2 = (SELECT issue_id FROM material_issue WHERE issue_code = 'ISS-20261005-0002');

INSERT INTO material_issue_item (issue_id, raw_material_id, quantity, note)
VALUES
    (@iss1, @rm_oak,   10, NULL),
    (@iss1, @rm_paint, 3,  NULL),
    (@iss1, @rm_glue,  1,  NULL),
    (@iss1, @rm_screw, 1,  NULL),
    (@iss2, @rm_oak,   30, NULL),
    (@iss2, @rm_paint, 5,  NULL),
    (@iss2, @rm_glue,  2,  NULL),
    (@iss2, @rm_screw, 2,  NULL);


-- =========================================================
-- 51. Sample - finished_goods_receipt & item  (nhập kho thành phẩm sau gia công)
-- =========================================================
INSERT INTO finished_goods_receipt (receipt_code, production_id, receipt_date, status, received_by, note)
VALUES
    ('FGR-20261010-0001', @prd2, '2026-10-10', 'CONFIRMED', @leader, 'Nhập 20 ghế ăn vào kho');

SET @fgr1 = (SELECT fg_receipt_id FROM finished_goods_receipt WHERE receipt_code = 'FGR-20261010-0001');

INSERT INTO finished_goods_receipt_item (fg_receipt_id, product_id, quantity, note)
VALUES
    (@fgr1, @p_chair, 20, NULL);


-- =========================================================
-- 52. Sample - cập nhật tồn kho nguyên vật liệu cho khớp phiếu đã CONFIRMED
--     Tồn = nhập (RCP-0001) - xuất (ISS-0001 + ISS-0002)
--       WOOD-OAK    : 100 - 10 - 30 = 60
--       WOOD-RUBBER : 50
--       PLYWOOD     : 40
--       PAINT-PU    : 30 - 3 - 5    = 22
--       GLUE        : 20 - 1 - 2    = 17
--       SCREW       : 10 - 1 - 2    = 7
--     (RCP-0002 còn DRAFT nên WOOD-PINE vẫn = 0)
-- =========================================================
UPDATE raw_material SET quantity_on_hand = 60 WHERE raw_code = 'WOOD-OAK';
UPDATE raw_material SET quantity_on_hand = 50 WHERE raw_code = 'WOOD-RUBBER';
UPDATE raw_material SET quantity_on_hand = 40 WHERE raw_code = 'PLYWOOD';
UPDATE raw_material SET quantity_on_hand = 22 WHERE raw_code = 'PAINT-PU';
UPDATE raw_material SET quantity_on_hand = 17 WHERE raw_code = 'GLUE';
UPDATE raw_material SET quantity_on_hand = 7  WHERE raw_code = 'SCREW';
