-- Additional ready-to-sell furniture examples for the public catalog.
INSERT INTO product (
  category_id, room_id, material_id, color_id, product_code, product_name,
  product_type, description, length_cm, width_cm, height_cm, price, stock_quantity, status
)
SELECT c.category_id, r.room_id, m.material_id, co.color_id, seed.product_code, seed.product_name,
       'SINGLE', seed.description, seed.length_cm, seed.width_cm, seed.height_cm,
       seed.price, seed.stock_quantity, 'ACTIVE'
FROM (
  SELECT 'CABINET' category_code, 'BEDROOM' room_code, 'OAK' material_code, 'WALNUT' color_code,
         'TU-002' product_code, 'Tủ quần áo gỗ sồi 3 cánh' product_name,
         'Tủ 3 cánh, thanh treo đồ và ngăn kéo tiện dụng' description,
         180 length_cm, 60 width_cm, 210 height_cm, 15800000 price, 4 stock_quantity
  UNION ALL SELECT 'CABINET','LIVING','RUBBER','NATURAL','TU-003','Tủ tivi gỗ cao su',
         'Tủ tivi hai ngăn kéo, kiểu dáng tối giản',160,40,55,5200000,5
  UNION ALL SELECT 'CABINET','LIVING','OAK','NATURAL','TU-004','Tủ giày gỗ sồi 3 tầng',
         'Tủ giày nhỏ gọn cho lối vào',100,35,110,3900000,7
  UNION ALL SELECT 'BED','BEDROOM','OAK','NATURAL','GI-002','Giường ngủ gỗ sồi 1m8',
         'Giường đôi kích thước 1m8, khung gỗ chắc chắn',200,180,100,14900000,3
  UNION ALL SELECT 'BED','BEDROOM','PINE','WHITE','GI-003','Giường ngủ gỗ thông 1m6',
         'Giường đôi gỗ thông sơn trắng',200,160,95,8900000,5
  UNION ALL SELECT 'CHAIR','DINING','RUBBER','HONEY','GH-002','Ghế ăn gỗ cao su',
         'Ghế ăn tựa lưng cong, hoàn thiện màu mật ong',45,50,90,1250000,16
  UNION ALL SELECT 'CHAIR','LIVING','WALNUT','WALNUT','GH-003','Ghế bành gỗ óc chó',
         'Ghế bành phòng khách có tay vịn',75,80,95,6800000,2
  UNION ALL SELECT 'TABLE','LIVING','WALNUT','WALNUT','TB-003','Bàn trà gỗ óc chó',
         'Bàn trà mặt chữ nhật, bo góc an toàn',110,60,45,6200000,4
) AS seed
JOIN product_category c ON c.category_code = seed.category_code
JOIN product_room r ON r.room_code = seed.room_code
JOIN product_material m ON m.material_code = seed.material_code
JOIN product_color co ON co.color_code = seed.color_code
ON DUPLICATE KEY UPDATE
  product_name = VALUES(product_name), description = VALUES(description),
  price = VALUES(price), stock_quantity = VALUES(stock_quantity), status = VALUES(status);
