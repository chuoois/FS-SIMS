const { sequelize } = require('../src/config/sequelize');
const cloudinary = require('../src/config/cloudinary');

const photos = {
  cabinet: 'https://d2kz53n3bzvihv.cloudfront.net/resized/490_490_1_255_255_255/media/gbu0/prodxl/romsey-natural-solid-oak-triple-wardrobe-6823718506773.jpg.jpeg',
  bed: 'https://images.unsplash.com/photo-1718894071402-fb944e2a1849?auto=format&fit=crop&w=1200&q=85',
  chair: 'https://www.ifurniture.ca/images/thumbs/0069306_newland-solid-oak-slat-back-dining-chair_800.png',
  table: 'https://images.pickawood.com/users_upload/configurations/2025/04/06/8e80a683838b34b3a8bb1dad416a7f03_1743907586052_front.png',
  shelf: 'https://gamar-furniture.com/cdn/shop/files/IMG_2076_1800x2250.jpg?v=1697957824',
};

async function main() {
  const correctedNames = [
    ['TB-001', 'Bàn ăn gỗ sồi 6 người', 'Bàn ăn mặt chữ nhật, chân vuông'],
    ['GH-001', 'Ghế ăn gỗ sồi', 'Ghế ăn lưng cong, ngồi thoải mái'],
    ['TU-001', 'Tủ quần áo gỗ thông 2 cánh', 'Tủ 2 cánh, 1 ngăn kéo, sơn trắng'],
    ['GI-001', 'Giường ngủ gỗ óc chó 1m6', 'Giường đôi 1m6, đầu giường bọc nệm'],
    ['KE-001', 'Kệ sách gỗ cao su', 'Kệ 5 tầng, màu vàng mật ong'],
    ['TB-002', 'Bàn làm việc gỗ cao su', 'Bàn làm việc 1 ngăn kéo'],
    ['SET-001', 'Bộ bàn ăn gỗ sồi 6 ghế', 'Gồm 1 bàn ăn 6 người và 6 ghế ăn'],
  ];
  for (const [code, name, description] of correctedNames) {
    await sequelize.query(
      'UPDATE product SET product_name = :name, description = :description WHERE product_code = :code',
      { replacements: { code, name, description } },
    );
  }

  await sequelize.query(`
    INSERT INTO product (category_id, room_id, material_id, color_id, product_code, product_name,
      product_type, description, length_cm, width_cm, height_cm, price, stock_quantity, status)
    SELECT c.category_id, r.room_id, m.material_id, co.color_id, s.code, s.name,
      IF(s.category = 'SET', 'SET', 'SINGLE'),
      s.description, s.length_cm, s.width_cm, s.height_cm, s.price, s.stock, 'ACTIVE'
    FROM (
      SELECT 'TABLE' category, 'LIVING' room, 'OAK' material, 'NATURAL' color, 'TB-004' code,
        'Bàn trà gỗ sồi chân thấp' name, 'Bàn trà dáng chữ nhật, phù hợp phòng khách' description,
        100 length_cm, 55 width_cm, 42 height_cm, 4200000 price, 5 stock
      UNION ALL SELECT 'TABLE','DINING','WALNUT','WALNUT','TB-005','Bàn ăn gỗ óc chó 4 người',
        'Bàn ăn nhỏ gọn dành cho gia đình 4 người',120,75,75,8900000,3
      UNION ALL SELECT 'TABLE','OFFICE','OAK','NATURAL','TB-006','Bàn làm việc gỗ sồi',
        'Bàn làm việc mặt rộng, thiết kế tối giản',140,65,75,7600000,4
      UNION ALL SELECT 'CHAIR','LIVING','OAK','NATURAL','GH-004','Ghế thư giãn gỗ sồi',
        'Ghế tựa lưng ngả nhẹ dùng trong phòng khách',70,78,96,5900000,3
      UNION ALL SELECT 'CHAIR','DINING','PINE','WHITE','GH-005','Ghế ăn gỗ thông sơn trắng',
        'Ghế ăn lưng tựa thanh gỗ, sơn trắng',44,48,88,1150000,12
      UNION ALL SELECT 'CHAIR','OFFICE','RUBBER','BLACK','GH-006','Ghế làm việc gỗ cao su',
        'Ghế làm việc khung gỗ chắc chắn',55,55,92,2450000,6
      UNION ALL SELECT 'CABINET','BEDROOM','OAK','NATURAL','TU-005','Tủ đầu giường gỗ sồi',
        'Tủ đầu giường hai ngăn kéo',50,42,55,2800000,8
      UNION ALL SELECT 'CABINET','KITCHEN','RUBBER','NATURAL','TU-006','Tủ bếp dưới gỗ cao su',
        'Tủ bếp dưới có ngăn kéo và khoang chứa đồ',160,60,82,9800000,2
      UNION ALL SELECT 'CABINET','LIVING','WALNUT','WALNUT','TU-007','Kệ tivi gỗ óc chó',
        'Kệ tivi thấp với hai hộc tủ',180,42,52,11200000,3
      UNION ALL SELECT 'BED','BEDROOM','OAK','NATURAL','GI-004','Giường ngủ gỗ sồi 1m4',
        'Giường đơn rộng 1m4, khung gỗ sồi',200,140,95,11800000,3
      UNION ALL SELECT 'BED','BEDROOM','RUBBER','HONEY','GI-005','Giường ngủ gỗ cao su 1m8',
        'Giường đôi gỗ cao su màu mật ong',200,180,95,10500000,4
      UNION ALL SELECT 'SHELF','LIVING','OAK','NATURAL','KE-002','Kệ trang trí gỗ sồi',
        'Kệ trang trí 4 tầng cho phòng khách',80,32,160,3600000,5
      UNION ALL SELECT 'SHELF','OFFICE','PINE','WHITE','KE-003','Kệ sách gỗ thông 5 tầng',
        'Kệ sách cao 5 tầng sơn trắng',75,30,170,2500000,7
      UNION ALL SELECT 'SET','DINING','OAK','NATURAL','SET-002','Bộ bàn ăn gỗ sồi 4 ghế',
        'Bộ gồm 1 bàn ăn và 4 ghế gỗ sồi',120,75,75,8200000,0
      UNION ALL SELECT 'SET','LIVING','RUBBER','HONEY','SET-003','Bộ bàn trà và ghế phòng khách',
        'Bộ bàn trà nhỏ và hai ghế thư giãn',100,55,45,7900000,0
      UNION ALL SELECT 'TABLE','DINING','PINE','WHITE','TB-007','Bàn ăn gỗ thông 4 người',
        'Bàn ăn gỗ thông sơn trắng cho gia đình nhỏ',120,75,75,3900000,4
    ) s
    JOIN product_category c ON c.category_code = s.category
    JOIN product_room r ON r.room_code = s.room
    JOIN product_material m ON m.material_code = s.material
    JOIN product_color co ON co.color_code = s.color
    ON DUPLICATE KEY UPDATE product_type = VALUES(product_type),
      product_name = VALUES(product_name), description = VALUES(description),
      price = VALUES(price), stock_quantity = VALUES(stock_quantity), status = VALUES(status)
  `);

  const urls = {};
  for (const [category, source] of Object.entries(photos)) {
    const uploaded = await cloudinary.uploader.upload(source, {
      folder: 'fssims/products',
      public_id: `catalog-${category}`,
      overwrite: true,
      resource_type: 'image',
    });
    urls[category] = uploaded.secure_url;
  }

  const images = [
    ['TB-001', 'table'], ['TB-002', 'table'], ['TB-003', 'table'],
    ['TB-004', 'table'], ['TB-005', 'table'], ['TB-006', 'table'], ['TB-007', 'table'],
    ['GH-001', 'chair'], ['GH-002', 'chair'], ['GH-003', 'chair'], ['GH-004', 'chair'], ['GH-005', 'chair'], ['GH-006', 'chair'],
    ['TU-001', 'cabinet'], ['TU-002', 'cabinet'], ['TU-003', 'cabinet'], ['TU-004', 'cabinet'], ['TU-005', 'cabinet'], ['TU-006', 'cabinet'], ['TU-007', 'cabinet'],
    ['GI-001', 'bed'], ['GI-002', 'bed'], ['GI-003', 'bed'], ['GI-004', 'bed'], ['GI-005', 'bed'],
    ['KE-001', 'shelf'], ['KE-002', 'shelf'], ['KE-003', 'shelf'],
    ['SET-001', 'table'], ['SET-002', 'table'], ['SET-003', 'table'],
  ];
  for (const [code, category] of images) {
    await sequelize.query('UPDATE product SET image_url = :url WHERE product_code = :code', {
      replacements: { url: urls[category], code },
    });
  }
  console.log(`Uploaded ${Object.keys(urls).length} catalog images and linked ${images.length} products.`);
}

main().catch((error) => {
  console.error('Catalog sync failed:', error.message);
  process.exitCode = 1;
}).finally(async () => {
  await sequelize.close();
});
