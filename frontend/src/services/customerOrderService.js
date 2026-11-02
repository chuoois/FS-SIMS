import api from './api';

export async function getMyOrders(params = {}) {
  const response = await api.get('/customer-orders', { params });
  return response.data;
}

export async function getMyOrderById(orderId) {
  const response = await api.get(`/customer-orders/${orderId}`);
  return response.data;
}
