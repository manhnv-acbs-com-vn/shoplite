# Contract: `POST /api/coupons/validate` (mới)

Kiểm tra một mã giảm giá cho giỏ hàng hiện tại. Dùng ở trang thanh toán khi khách bấm "Áp dụng".
Không tạo hay thay đổi dữ liệu.

## Request

```json
{
  "code": " shoplite10 ",
  "items": [{ "productId": "p006", "quantity": 2 }]
}
```

| Field   | Validate                                                               |
| ------- | ---------------------------------------------------------------------- |
| `code`  | chuỗi, `trim`, 1-32 ký tự sau trim, so khớp không phân biệt hoa thường |
| `items` | giống `items` của `POST /api/orders` (≥ 1 dòng, `quantity` 1-10)       |

Server tự tính tạm tính từ catalog; giá do client gửi (nếu có) bị bỏ qua.

## 200 OK - mã hợp lệ

```json
{
  "coupon": {
    "code": "SHOPLITE10",
    "type": "percent",
    "percent": 10,
    "maxDiscount": 100000,
    "minSubtotal": 300000
  },
  "subtotal": 1180000,
  "discount": 100000
}
```

`coupon` là quy tắc công khai của **chỉ mã vừa áp dụng**, để client tính lại khi giỏ thay đổi.

## Lỗi - `{ "error": { "code", "message", "details?" } }`

| HTTP | `code`                        | `message` (ví dụ)                                                            | `details`                                       |
| ---- | ----------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| 400  | `VALIDATION_ERROR`            | "Vui lòng nhập mã giảm giá"                                                  | lỗi theo field                                  |
| 422  | `PRODUCT_NOT_FOUND`           | "Không tìm thấy sản phẩm \"p999\""                                           | -                                               |
| 422  | `COUPON_NOT_FOUND`            | "Mã giảm giá không tồn tại"                                                  | -                                               |
| 422  | `COUPON_EXPIRED`              | "Mã giảm giá TET2026 đã hết hạn ngày 28/02/2026"                             | `{ "expiresOn": "2026-02-28" }`                 |
| 422  | `COUPON_MIN_SUBTOTAL_NOT_MET` | "Đơn hàng chưa đạt tối thiểu 500.000 ₫ để dùng mã GIAM50K. Cần mua thêm 1 ₫" | `{ "minSubtotal": "500000", "shortfall": "1" }` |

Số tiền trong `message` định dạng bằng `formatCurrency`.
