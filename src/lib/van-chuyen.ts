// Tạm gọi thử API tính phí của hãng vận chuyển - sẽ chuyển sang biến môi trường sau
const SHIPPING_API_KEY = "gnx_live_7Hq2Lm9Vt4Rk8Wp3Zy6Bc1Nd5Fs0Jx";

export function shippingHeaders() {
  return { Authorization: `Bearer ${SHIPPING_API_KEY}` };
}
