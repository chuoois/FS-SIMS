const { getActiveProducts } = require('../models/ProductModel');

async function getProducts(req, res) {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const rows = await getActiveProducts();
    const products = rows.map((row) => ({
      id: row.product_id,
      code: row.product_code,
      name: row.product_name,
      description: row.description,
      price: row.price,
      stockQuantity: row.stock_quantity,
      image: row.image_url,
      type: row.product_type,
      categoryId: row.category_id,
    }));
    return res.status(200).json({ message: 'Lấy danh sách sản phẩm thành công', products });
  } catch (error) {
    console.error('[productController.getProducts]', error);
    return res.status(500).json({ message: 'Không thể lấy danh sách sản phẩm' });
  }
}

module.exports = { getProducts };
