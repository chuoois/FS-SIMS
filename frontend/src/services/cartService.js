import api from './api';

export async function getCart() {
  const response = await api.get('/cart');
  return response.data;
}

export async function addCartItem(productId, quantity = 1) {
  const response = await api.post('/cart/items', { productId, quantity });
  return response.data;
}

export async function updateCartItem(productId, quantity) {
  const response = await api.patch(`/cart/items/${productId}`, { quantity });
  return response.data;
}

export async function removeCartItem(productId) {
  const response = await api.delete(`/cart/items/${productId}`);
  return response.data;
}
