# Contract: thay đổi `POST /api/orders`, `GET /api/orders[/:id]`

## `POST /api/orders` - request (thêm trường tùy chọn)

```json
{
  "customer": {
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "address": "12 Nguyễn Huệ, Quận 1"
  },
  "shippingMethod": "standard",
  "paymentMethod": "cod",
  "items": [{ "productId": "p006", "quantity": 2 }],
  "couponCode": "GIAM50K"
}
```

- `couponCode` tùy chọn; thiếu hoặc chuỗi rỗng = không dùng mã. Không gửi → hành vi y như hiện tại.
- Mọi trường khác về tiền (`discount`, `total`, `unitPrice`...) bị bỏ qua.
- Server kiểm tra lại mã theo đúng quy tắc của `POST /api/coupons/validate` với `now` tại thời điểm
  đặt và tạm tính tính từ catalog.

## `201 Created` - response (thêm trường)

```json
{
  "id": "SL-20261108-4F9A2C",
  "status": "pending",
  "subtotal": 600000,
  "couponCode": "GIAM50K",
  "discount": 50000,
  "shippingFee": 0,
  "total": 550000,
  "...": "các trường hiện có giữ nguyên"
}
```

Đơn không dùng mã: `discount: 0`, không có `couponCode`.

## Lỗi mới (ngoài các lỗi hiện có)

| HTTP | `code`                        | Khi nào                                   |
| ---- | ----------------------------- | ----------------------------------------- |
| 422  | `COUPON_NOT_FOUND`            | Mã không tồn tại                          |
| 422  | `COUPON_EXPIRED`              | Mã hết hạn tại thời điểm đặt (FR-016)     |
| 422  | `COUPON_MIN_SUBTOTAL_NOT_MET` | Tạm tính tại thời điểm đặt dưới tối thiểu |

`message` và `details` giống [coupons-validate.md](./coupons-validate.md). Đơn **không** được tạo.
Client khi nhận lỗi `COUPON_*`: gỡ mã, hiển thị `message`, hiển thị lại tổng chưa giảm; khách bấm
"Đặt hàng" lần nữa → gửi request không có `couponCode`.

## `GET /api/orders`, `GET /api/orders/:id`

Trả về `Order` có thêm `couponCode?` và `discount?`. Đơn tạo trước tính năng này không có hai trường
đó; client MUST coi `discount` thiếu là `0`.
