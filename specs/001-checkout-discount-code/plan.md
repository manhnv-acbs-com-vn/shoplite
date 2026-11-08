# Implementation Plan: Mã giảm giá khi thanh toán

**Branch**: `lab2-speckit` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-checkout-discount-code/spec.md`

## Summary

Khách nhập mã ở trang thanh toán, thấy ngay số tiền giảm và tổng mới, có thể gỡ mã; đơn hàng lưu mã
và số tiền giảm. Cách làm: thêm feature `src/features/coupons/` chứa logic thuần (tra mã, kiểm tra
hạn/tối thiểu, tính giảm giá) và danh sách mã tĩnh `src/data/coupons.ts`; mở rộng
`calculateOrderTotals` trong `pricing.ts` để nhận mã; thêm `POST /api/coupons/validate` cho client
kiểm tra mã; `POST /api/orders` nhận `couponCode` và server tự kiểm tra, tính lại. Không thêm
dependency, không thêm database (xem [research.md](./research.md)).

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js ≥ 22.12

**Primary Dependencies**: Next.js 16.4 (App Router, Route Handlers), React 19.3, Zod 4, Tailwind CSS v4,
lucide-react - không thêm dependency mới

**Storage**: Mã giảm giá: dữ liệu tĩnh `src/data/coupons.ts`. Đơn hàng: `storage/orders.json` qua
`order-repository` (chỉ thêm 2 trường tùy chọn, không migrate)

**Testing**: Vitest 5 + Testing Library (unit/component, test cạnh file nguồn), Playwright (E2E)

**Target Platform**: Web (trình duyệt desktop và mobile 390px), server Node.js của Next.js

**Project Type**: Web application full-stack một project (Next.js App Router)

**Performance Goals**: Hiển thị kết quả áp dụng mã < 1 giây (SC-001); tính lại khi đổi giỏ tức thì,
không gọi mạng

**Constraints**: Server là nguồn sự thật về tiền; tiền là số nguyên VND; hết hạn xét theo giờ UTC+7;
đơn cũ không có trường giảm giá phải hiển thị đúng; không đổi định dạng `localStorage["shoplite:cart"]`

**Scale/Scope**: 3 mã ban đầu, ~16 sản phẩm; 1 route mới, 1 route sửa, 2 trang sửa
(`/checkout`, `/orders/[id]`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Nguyên tắc                               | Đánh giá trước Phase 0                                                                                                                                                                             | Sau Phase 1                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **I. Kiến trúc theo tính năng**          | Logic mã trong `src/features/coupons/`; route `src/app/api/coupons/validate/route.ts` chỉ parse body → gọi feature → trả JSON                                                                      | ✅ PASS - xem cấu trúc bên dưới; `CheckoutForm` chỉ gọi hook/component của feature          |
| **II. Test trước (NON-NEGOTIABLE)**      | Mọi quy tắc tiền/hạn/tối thiểu có test biên viết trước: 299.999/300.000, 499.999/500.000, 999.999/1.000.000/1.000.001, 23:59:59 vs 00:00:00 ngày 28→01/03                                          | ✅ PASS - liệt kê trong [quickstart.md](./quickstart.md); tasks MUST đặt test trước cài đặt |
| **III. Server là nguồn sự thật về tiền** | Server tính tạm tính từ catalog cho cả validate lẫn đặt hàng; bỏ qua mọi số tiền client gửi; Zod cho `couponCode` và body validate; lỗi qua `OrderError` → `{ error: { code, message, details } }` | ✅ PASS - [contracts/](./contracts/)                                                        |
| **IV. Đơn giản trước**                   | Không dependency/database mới; dữ liệu tĩnh giống `products.ts`; tái dùng `OrderError`/`handleRouteError`; không migrate dữ liệu                                                                   | ✅ PASS - 1 route mới được giải thích ở research R1 (tránh lộ danh sách mã)                 |
| **V. Tiếng Việt & dễ tiếp cận**          | Thông báo tiếng Việt, tiền qua `formatCurrency`; ô mã có `<label>`, lỗi hiển thị ngay dưới ô (`aria-describedby`), nút là `<button>`                                                               | ✅ PASS                                                                                     |

**Ràng buộc kỹ thuật**: giữ nguyên quy tắc phí ship (xét trên tạm tính trước giảm - FR-010), giới hạn
10 sản phẩm/loại, hủy đơn chỉ khi `pending`. ✅

Không có vi phạm → bỏ trống Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-checkout-discount-code/
├── spec.md
├── plan.md              # File này
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── coupons-validate.md
│   └── orders.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks - chưa tạo)
```

### Source Code (repository root)

```text
src/
├── data/
│   └── coupons.ts                        # MỚI - SHOPLITE10, GIAM50K, TET2026
├── features/
│   ├── coupons/                          # MỚI
│   │   ├── types.ts                      # Coupon, CouponCheckResult
│   │   ├── coupon-service.ts             # normalizeCouponCode, findCoupon, isCouponExpired,
│   │   │                                 # calculateDiscount, checkCoupon(code, subtotal, now)
│   │   ├── coupon-service.test.ts        # giá trị biên + toàn vẹn dữ liệu coupons.ts
│   │   ├── coupon-messages.ts            # CouponCheckResult → message tiếng Việt + OrderError
│   │   ├── coupon-messages.test.ts
│   │   ├── use-applied-coupon.ts         # state mã ở client, tự gỡ khi dưới tối thiểu
│   │   └── components/
│   │       ├── coupon-field.tsx          # ô nhập + "Áp dụng" / "Gỡ mã" + thông báo
│   │       └── coupon-field.test.tsx
│   ├── checkout/
│   │   ├── pricing.ts                    # SỬA - calculateOrderTotals(lines, method, coupon?)
│   │   ├── pricing.test.ts               # SỬA - discount, total, phí ship trước giảm
│   │   ├── checkout-schema.ts            # SỬA - couponCode (placeOrder), validateCouponSchema
│   │   ├── checkout-schema.test.ts       # SỬA
│   │   └── components/
│   │       ├── checkout-form.tsx         # SỬA - gắn CouponField, gửi couponCode, xử lý COUPON_*
│   │       ├── checkout-form.test.tsx    # SỬA
│   │       └── checkout-summary.tsx      # SỬA - dòng "Giảm giá (MÃ)"
│   └── orders/
│       ├── types.ts                      # SỬA - couponCode?, discount?
│       ├── order-errors.ts               # SỬA - 3 mã COUPON_* (422)
│       ├── order-service.ts              # SỬA - kiểm tra mã + lưu discount; validateCoupon()
│       ├── order-service.test.ts         # SỬA - giả mạo số tiền, hết hạn lúc đặt, đơn cũ
│       └── components/
│           ├── order-totals.tsx          # MỚI - tách khối tạm tính/giảm giá/ship/tổng
│           └── order-totals.test.tsx     # MỚI - có/không discount, đơn cũ thiếu trường
├── app/
│   ├── api/
│   │   ├── coupons/validate/route.ts     # MỚI - route mỏng
│   │   ├── coupons/validate/route.test.ts
│   │   └── orders/route.test.ts          # SỬA - couponCode
│   └── orders/[id]/page.tsx              # SỬA - dùng OrderTotals
e2e/
└── shopping-flow.spec.ts                 # SỬA - thêm luồng áp dụng mã
README.md                                 # SỬA - API mới, quy tắc mã giảm giá
```

**Structure Decision**: Giữ cấu trúc feature-based hiện tại. `coupons` là feature độc lập không phụ
thuộc `orders`/`checkout`; `checkout/pricing.ts` import `calculateDiscount` từ `coupons`;
`orders/order-service.ts` dùng `checkCoupon` để kiểm tra mã lúc đặt hàng. Logic kiểm tra mã cho
route validate đặt trong `orderService.validateCoupon(input)` vì cần tra catalog để tính tạm tính
giống `placeOrder` (dùng chung hàm tính dòng hàng, không lặp code).

## Luồng chính

**Áp dụng mã**: `CouponField` → `POST /api/coupons/validate { code, items }` →
`orderService.validateCoupon` (Zod → giá từ catalog → `checkCoupon(code, subtotal, now)`) →
200 `{ coupon, subtotal, discount }` → `useAppliedCoupon` lưu `coupon` →
`CheckoutSummary` gọi `calculateOrderTotals(lines, method, coupon)`.

**Đổi giỏ**: `useCart().subtotal` đổi → `useAppliedCoupon` gọi `checkCouponEligibility(coupon, subtotal, now)`;
dưới tối thiểu → gỡ mã + `notice` "cần mua thêm X" (FR-006).

**Đặt hàng**: `CheckoutForm` gửi `couponCode` → `orderService.placeOrder` → `checkCoupon` với `now`
hiện tại → không hợp lệ: ném `OrderError("COUPON_*")`, không lưu đơn → client gỡ mã, hiện thông
báo, khách bấm lại (FR-016); hợp lệ: `calculateOrderTotals(..., coupon)` → lưu `couponCode`,
`discount`.

## Rủi ro & lưu ý

- **Hydration**: `CheckoutForm` đã chờ `hydrated`; `now` cho kiểm tra hạn ở client chỉ dùng để hiển
  thị - server luôn kiểm tra lại.
- **Đổi chữ ký `calculateOrderTotals`**: tham số mới là tùy chọn, các nơi gọi cũ (cart summary) không
  phải sửa; `OrderTotals` có thêm `discount` nên `Order` mới luôn có `discount`.
- **Dò mã**: không có rate limit (research R8) - rủi ro đã chấp nhận.
- **Giữ mã khi rời trang**: đã chốt là không giữ (spec §Clarifications Q3) nên không đổi định dạng
  `localStorage`.

## Complexity Tracking

Không có vi phạm constitution cần giải trình.
