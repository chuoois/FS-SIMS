import api from './api';

export async function getProducts() {
  const response = await api.get('/products');
  const rows = response.data?.products ?? response.data?.data ?? [];
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => ({
    id: row.id ?? row.product_id,
    code: row.code ?? row.product_code ?? '',
    name: row.name ?? row.product_name ?? 'Sản phẩm',
    description: row.description ?? '',
    price: Number(row.price ?? 0),
    stockQuantity: Number(row.stockQuantity ?? row.stock_quantity ?? 0),
    image: row.image ?? row.image_url ?? '',
    type: row.type ?? row.product_type ?? 'SINGLE',
    category: row.category ?? row.category_name ?? '',
    room: row.room ?? row.room_name ?? '',
    material: row.material ?? row.material_name ?? '',
    color: row.color ?? row.color_name ?? '',
  }));
}
