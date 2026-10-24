import api from './api';

const windows1252Bytes = new Map([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85], ['†', 0x86],
  ['‡', 0x87], ['ˆ', 0x88], ['‰', 0x89], ['Š', 0x8a], ['‹', 0x8b], ['Œ', 0x8c],
  ['Ž', 0x8e], ['‘', 0x91], ['’', 0x92], ['“', 0x93], ['”', 0x94], ['•', 0x95],
  ['–', 0x96], ['—', 0x97], ['˜', 0x98], ['™', 0x99], ['š', 0x9a], ['›', 0x9b],
  ['œ', 0x9c], ['ž', 0x9e], ['Ÿ', 0x9f],
]);

function repairMojibake(value) {
  if (typeof value !== 'string' || !/[ÃÂÄÆá]/u.test(value)) return value ?? '';

  try {
    const bytes = [];
    for (const character of value) {
      const codePoint = character.codePointAt(0);
      const byte = windows1252Bytes.get(character) ?? codePoint;
      if (byte > 0xff) return value;
      bytes.push(byte);
    }
    const repaired = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
    return repaired;
  } catch {
    return value;
  }
}

export async function getProducts() {
  const response = await api.get('/products', {
    params: { _cacheBust: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });
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
    category: repairMojibake(row.category ?? row.category_name ?? row.categoryId ?? row.category_id),
    room: repairMojibake(row.room ?? row.room_name),
    material: repairMojibake(row.material ?? row.material_name),
    color: repairMojibake(row.color ?? row.color_name),
  }));
}
