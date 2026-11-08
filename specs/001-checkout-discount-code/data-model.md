# Data Model: Mã giảm giá khi thanh toán

**Feature**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)

## Coupon (mới) - `src/features/coupons/types.ts`, dữ liệu ở `src/data/coupons.ts`

Union phân biệt theo `type`:

| Field         | Kiểu                     | Bắt buộc | Ràng buộc                                                      |
| ------------- | ------------------------ | -------- | -------------------------------------------------------------- |
| `code`        | `string`                 | ✔        | Viết hoa, `[A-Z0-9]`, 3-32 ký tự, duy nhất trong danh sách     |
| `type`        | `"percent" \| "fixed"`   | ✔        |                                                                |
| `percent`     | `number` (chỉ `percent`) | ✔        | Số nguyên 1-100                                                |
| `maxDiscount` | `number` (chỉ `percent`) | ✔        | Số nguyên VND > 0                                              |
| `amount`      | `number` (chỉ `fixed`)   | ✔        | Số nguyên VND > 0                                              |
| `minSubtotal` | `number`                 | -        | Số nguyên VND ≥ 0; không có = không yêu cầu                    |
| `expiresOn`   | `string` `"YYYY-MM-DD"`  | -        | Hết hạn sau 23:59:59.999 ngày đó, giờ UTC+7; không có = vô hạn |

Dữ liệu ban đầu (FR-019):

```text
SHOPLITE10  percent  percent=10  maxDiscount=100_000  minSubtotal=300_000
GIAM50K     fixed    amount=50_000                    minSubtotal=500_000
TET2026     percent  percent=15  maxDiscount=200_000                       expiresOn=2026-02-28
```

Một unit test MUST kiểm tra tính toàn vẹn của dữ liệu: mã duy nhất, đúng định dạng, đúng ràng buộc.

## CouponCheckResult (mới, giá trị trả về của hàm thuần)

```text
{ ok: true;  coupon: Coupon; discount: number }
{ ok: false; reason: "NOT_FOUND" }
{ ok: false; reason: "EXPIRED"; expiresOn: string }
{ ok: false; reason: "MIN_SUBTOTAL_NOT_MET"; minSubtotal: number; shortfall: number }
```

- `shortfall = minSubtotal - subtotal` (> 0).
- Thứ tự kiểm tra: tồn tại → còn hạn → đủ tối thiểu.

## OrderTotals (mở rộng) - `src/features/checkout/pricing.ts`

| Field         | Thay đổi | Công thức                                      |
| ------------- | -------- | ---------------------------------------------- |
| `subtotal`    | giữ      | Σ `unitPrice × quantity`                       |
| `discount`    | **mới**  | `0` nếu không có mã; xem quy tắc tính bên dưới |
| `shippingFee` | giữ      | Tính trên `subtotal` **trước** giảm (FR-010)   |
| `total`       | đổi      | `subtotal − discount + shippingFee`            |

Quy tắc tính `discount` (FR-007, FR-008):

- `percent`: `min(floor(subtotal × percent / 100), maxDiscount, subtotal)`
- `fixed`: `min(amount, subtotal)`

## Order (mở rộng) - `src/features/orders/types.ts`

| Field        | Kiểu     | Bắt buộc | Ghi chú                                                       |
| ------------ | -------- | -------- | ------------------------------------------------------------- |
| `couponCode` | `string` | -        | Mã đã chuẩn hóa (viết hoa). Không có = đơn không dùng mã      |
| `discount`   | `number` | -        | Số tiền giảm lúc đặt. Đơn cũ không có trường này → coi là `0` |
| `total`      | `number` | ✔        | Đã trừ `discount`                                             |

- Đơn mới không dùng mã: lưu `discount: 0`, không có `couponCode`.
- `couponCode` và `discount` không đổi sau khi tạo, kể cả khi đơn bị hủy (FR-017).
- Không đổi vòng đời trạng thái đơn hàng.

## PlaceOrderInput (mở rộng) - `src/features/checkout/checkout-schema.ts`

| Field        | Kiểu     | Bắt buộc | Validate (Zod)                                                      |
| ------------ | -------- | -------- | ------------------------------------------------------------------- |
| `couponCode` | `string` | -        | `trim()`, rỗng → coi như không có, tối đa 32 ký tự, `toUpperCase()` |

Các trường lạ (vd. `discount`, `total`) bị Zod loại bỏ và không bao giờ được đọc (FR-015). Chỉ một
`couponCode` dạng chuỗi được chấp nhận; mảng nhiều mã → `VALIDATION_ERROR`.

## Trạng thái mã ở trang thanh toán (client)

```text
          nhập mã + "Áp dụng" (API ok)
  [Chưa có mã] ─────────────────────────────▶ [Đã áp dụng]
       ▲   ▲                                      │
       │   └──── "Gỡ mã" ─────────────────────────┤
       │                                          │ tạm tính < tối thiểu (FR-006)
       │                                          │ hoặc POST /api/orders trả COUPON_* (FR-016)
       └──────── tự gỡ + hiện thông báo ◀─────────┘
```

Mã bị tự gỡ không tự áp dụng lại khi đủ điều kiện (Clarification Q2).
