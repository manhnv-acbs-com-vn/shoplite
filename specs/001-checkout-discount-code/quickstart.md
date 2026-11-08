# Quickstart: kiểm chứng tính năng mã giảm giá

Tham chiếu: [data-model.md](./data-model.md) · [contracts/](./contracts/)

## Chuẩn bị

```bash
npm install
npx playwright install chromium   # lần đầu chạy E2E
```

## 1. Kiểm tra tự động

```bash
npx vitest run src/features/coupons      # giá trị biên: tối thiểu, mức tối đa, hết hạn, làm tròn
npx vitest run src/features/checkout     # pricing: phí ship xét trước giảm giá, total có discount
npx vitest run src/features/orders       # server tính lại, lỗi COUPON_*, đơn cũ không có discount
npx vitest run src/app/api               # contract hai route
npm run check                            # MUST pass
npm run test:e2e                         # luồng mua hàng có mã
```

## 2. Kiểm tra API bằng tay (`npm run dev`)

| #   | Request                                                                                                    | Kết quả mong đợi                                       |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1   | `POST /api/coupons/validate` `{ "code": "shoplite10", "items": [{ "productId": "p001", "quantity": 1 }] }` | 200, `discount: 100000` (1.290.000 × 10% bị giới hạn)  |
| 2   | Như trên với `"code": "KHONGCO"`                                                                           | 422 `COUPON_NOT_FOUND`                                 |
| 3   | `"code": "TET2026"`                                                                                        | 422 `COUPON_EXPIRED`, `details.expiresOn = 2026-02-28` |
| 4   | `"code": "GIAM50K"` với giỏ có tạm tính < 500.000đ                                                         | 422 `COUPON_MIN_SUBTOTAL_NOT_MET`, có `shortfall`      |
| 5   | `POST /api/orders` kèm `"couponCode": "GIAM50K"` và `"discount": 999999`                                   | 201, `discount: 50000`, `total` do server tính         |
| 6   | `POST /api/orders` kèm `"couponCode": "TET2026"`                                                           | 422 `COUPON_EXPIRED`, không có đơn mới                 |

## 3. Kiểm tra giao diện (desktop và mobile 390px)

1. Thêm sản phẩm cho tạm tính ≥ 300.000đ → `/checkout` → nhập `shoplite10` → "Áp dụng":
   dòng "Giảm giá (SHOPLITE10)" và tổng mới xuất hiện ngay.
2. Bấm "Gỡ mã" → tổng trở về như cũ; ô nhập mã dùng lại được.
3. Nhập `TET2026` → thông báo hết hạn ngay dưới ô nhập, tổng không đổi.
4. Áp dụng `GIAM50K`, sang tab khác giảm giỏ dưới 500.000đ, quay lại → mã tự gỡ, hiện "cần mua thêm".
5. Đặt hàng với mã → trang `/orders/[id]` có dòng giảm giá; mở một đơn cũ (tạo trước tính năng) →
   hiển thị bình thường, không có dòng giảm giá.
