// =========================================================
// formatters.js
// Bộ tiện ích format tiền tệ (VND), ngày tháng, số lượng dùng chung cho frontend
// Tuân thủ 100% quy ước trong AGENTS.md:
// - Tiền hiển thị theo VND (ví dụ: '8.500.000 ₫')
// - Xử lý an toàn cho null, undefined, chuỗi không hợp lệ
// =========================================================

/**
 * Format số tiền sang định dạng VND chuẩn tiếng Việt: '8.500.000 ₫'
 * Theo quy ước AGENTS.md: hiển thị VND dạng '8.500.000 ₫'
 *
 * @param {number|string} amount Số tiền cần format
 * @param {string} [fallback='0 ₫'] Giá trị dự phòng khi dữ liệu rỗng hoặc không hợp lệ
 * @returns {string} Chuỗi tiền tệ VND đã format
 */
export function formatVND(amount, fallback = '0 ₫') {
  if (amount === null || amount === undefined || amount === '') {
    return fallback;
  }

  const num = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(num)) {
    return fallback;
  }

  return `${num.toLocaleString('vi-VN')} ₫`;
}

/**
 * Format ngày tháng sang chuẩn Việt Nam: 'DD/MM/YYYY' (ví dụ: '24/11/2026')
 *
 * @param {string|number|Date} dateInput Chuỗi ngày, timestamp hoặc đối tượng Date
 * @param {string} [fallback='—'] Giá trị dự phòng khi ngày không hợp lệ
 * @returns {string} Chuỗi ngày định dạng DD/MM/YYYY
 */
export function formatDateVN(dateInput, fallback = '—') {
  if (!dateInput) return fallback;

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format giờ phút sang chuẩn: 'HH:mm' (ví dụ: '14:30')
 *
 * @param {string|number|Date} dateInput Chuỗi ngày giờ, timestamp hoặc đối tượng Date
 * @param {string} [fallback='—'] Giá trị dự phòng
 * @returns {string} Chuỗi giờ phút định dạng HH:mm
 */
export function formatTime(dateInput, fallback = '—') {
  if (!dateInput) return fallback;

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

/**
 * Format ngày giờ sang chuẩn Việt Nam: 'HH:mm DD/MM/YYYY' (ví dụ: '14:30 24/11/2026')
 *
 * @param {string|number|Date} dateInput Chuỗi ngày giờ, timestamp hoặc đối tượng Date
 * @param {string} [fallback='—'] Giá trị dự phòng
 * @returns {string} Chuỗi ngày giờ định dạng HH:mm DD/MM/YYYY
 */
export function formatDateTimeVN(dateInput, fallback = '—') {
  if (!dateInput) return fallback;

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

/**
 * Format số lượng hoặc giá trị số thông thường theo chuẩn vi-VN (ví dụ: '1.250')
 *
 * @param {number|string} value Giá trị số cần format
 * @param {string} [fallback='0'] Giá trị dự phòng
 * @returns {string} Chuỗi số đã định dạng
 */
export function formatNumber(value, fallback = '0') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) {
    return fallback;
  }

  return num.toLocaleString('vi-VN');
}

/**
 * Format số điện thoại Việt Nam (ví dụ: '090 123 4567')
 *
 * @param {string} phone Số điện thoại cần format
 * @returns {string} Chuỗi số điện thoại đẹp mắt
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '—';
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

// ─── Alias để tương thích linh hoạt với các code import khác nhau ─────
export const formatCurrency = formatVND;
export const formatVnd = formatVND;
export const formatDate = formatDateVN;
export const formatDateTime = formatDateTimeVN;
export const formatTimeVN = formatTime;

export default {
  formatVND,
  formatDateVN,
  formatTime,
  formatTimeVN,
  formatDateTimeVN,
  formatNumber,
  formatPhoneNumber,
  formatCurrency,
  formatVnd,
  formatDate,
  formatDateTime,
};
