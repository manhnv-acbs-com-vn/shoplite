# Research: Mã giảm giá khi thanh toán

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-11-08

Technical Context không có mục NEEDS CLARIFICATION (stack đã cố định theo constitution và yêu cầu
của người dùng). Các quyết định dưới đây giải quyết những điểm thiết kế còn mở.

## R1. Client kiểm tra mã bằng cách nào?

- **Decision**: Thêm route `POST /api/coupons/validate` nhận `{ code, items }`. Server tính tạm tính
  từ catalog, kiểm tra mã, trả về **quy tắc công khai của mã vừa áp dụng** và số tiền giảm. Sau đó
  client dùng chính hàm thuần `calculateDiscount` / `checkCouponEligibility` để tính lại ngay khi giỏ
  thay đổi (FR-006) mà không cần gọi lại API.
- **Rationale**:
  - Không đưa toàn bộ danh sách mã vào bundle JS của trình duyệt (marketing có thể có mã chưa công bố).
  - Tạm tính dùng để kiểm tra do server tính từ catalog (nguyên tắc III), không tin con số client gửi.
  - Tính lại khi đổi giỏ là tức thì vì logic thuần dùng chung client/server.
- **Alternatives considered**:
  - _Import thẳng `src/data/coupons.ts` vào client_: đơn giản nhất nhưng lộ toàn bộ mã; bị loại.
  - _Gọi API mỗi lần giỏ thay đổi_: nhiều request, giao diện nhấp nháy; bị loại.
  - _Server Action_: dự án chưa dùng Server Actions, mọi gọi server đang qua Route Handler; giữ một
    kiểu cho nhất quán (nguyên tắc IV).

## R2. Lỗi mã giảm giá đi qua cơ chế lỗi nào?

- **Decision**: Hàm thuần trong `features/coupons` trả về **kết quả dạng union** (không ném lỗi):
  `{ ok: true, coupon, discount } | { ok: false, reason: "NOT_FOUND" | "EXPIRED" | "MIN_SUBTOTAL_NOT_MET", ... }`.
  Ở tầng service/route, kết quả `ok: false` được chuyển thành `OrderError` với 3 mã mới:
  `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_SUBTOTAL_NOT_MET` (HTTP 422), `details` chứa
  `expiresOn` hoặc `minSubtotal` + `shortfall` (dạng chuỗi số vì `details` là `Record<string, string>`).
- **Rationale**: Tái sử dụng `handleRouteError` và định dạng `{ error: { code, message, details } }`
  sẵn có; không cần lớp lỗi mới. Hàm thuần không ném lỗi nên dễ test giá trị biên.
- **Alternatives considered**: Tạo `CouponError` riêng → phải sửa `handleRouteError` nhận nhiều lớp
  lỗi; thêm độ phức tạp không cần thiết.

## R3. Tích hợp vào `pricing.ts`

- **Decision**: `calculateOrderTotals(lines, method, coupon?)` nhận thêm quy tắc mã (tùy chọn) và trả
  về `{ subtotal, discount, shippingFee, total }`. Phí ship vẫn tính trên `subtotal` **trước** giảm
  (FR-010); `total = subtotal - discount + shippingFee`. Khi không có mã, `discount = 0` và mọi kết
  quả cũ giữ nguyên (SC-006).
- **Rationale**: Một hàm duy nhất cho cả `CheckoutSummary` (client) và `orderService` (server) - con
  số khách thấy và con số server lưu luôn cùng công thức.
- **Alternatives considered**: Truyền vào số tiền giảm đã tính sẵn → hai nơi gọi phải tự tính giảm
  giá, dễ lệch nhau.

## R4. Ngày hết hạn và múi giờ

- **Decision**: Lưu `expiresOn` dạng ngày `"YYYY-MM-DD"`. Mã hết hạn khi
  `now > Date.parse(`${expiresOn}T23:59:59.999+07:00`)`. Mọi hàm nhận `now: Date` làm tham số để test
  được chính xác các mốc 23:59:59 và 00:00:00.
- **Rationale**: Khớp FR-012 (hết ngày theo giờ Việt Nam) bất kể server chạy ở múi giờ nào; dự án đã
  dùng `Asia/Ho_Chi_Minh` trong `formatDateTime`.
- **Alternatives considered**: Lưu timestamp đầy đủ → dữ liệu khó đọc, dễ nhập sai múi giờ.

## R5. Làm tròn và giới hạn

- **Decision**: Phần trăm lưu dạng số nguyên (`10` = 10%). `discount = min(floor(subtotal * percent / 100), maxDiscount, subtotal)`;
  loại cố định: `min(amount, subtotal)`.
- **Rationale**: Tiền VND là số nguyên, phép nhân số nguyên rồi `Math.floor` tránh sai số dấu phẩy
  động (vd. `999_999 * 0.1`).

## R6. Đơn hàng cũ không có trường giảm giá

- **Decision**: Trường mới trên `Order` là **tùy chọn**: `couponCode?: string`, `discount?: number`.
  Hiển thị dùng `order.discount ?? 0`; chỉ hiện dòng giảm giá khi `discount > 0`. Không migrate file
  `storage/orders.json`.
- **Rationale**: `total` của đơn cũ đã đúng (không có giảm giá) nên không cần ghi lại dữ liệu; đọc an
  toàn là đủ.
- **Alternatives considered**: Script migrate thêm `discount: 0` → thêm bước vận hành không cần thiết.

## R7. Trạng thái mã ở client và tự gỡ mã

- **Decision**: State mã đã áp dụng nằm trong `CheckoutForm` (không lưu localStorage, theo giả định
  của spec). Hook `useAppliedCoupon(subtotal)` trong `features/coupons` giữ `{ coupon, notice }`:
  - khi `subtotal` đổi mà không còn đủ tối thiểu → gỡ mã + đặt `notice` "cần mua thêm X" (FR-006);
  - khi `POST /api/orders` trả về lỗi `COUPON_*` → gỡ mã + hiện thông báo; lần bấm "Đặt hàng" sau
    gửi đơn không kèm mã (FR-016, Clarification Q1).
- **Rationale**: Không đổi định dạng `localStorage["shoplite:cart"]` (constitution: đổi định dạng phải
  xử lý dữ liệu cũ); không mã nào tự áp dụng lại (Clarification Q2).

## R8. Chống dò mã (brute force)

- **Decision**: Không làm giới hạn tần suất trong phạm vi này; ghi nhận là rủi ro đã chấp nhận.
- **Rationale**: Dự án không có hạ tầng rate limit, mã khuyến mãi là mã công khai cho marketing; thêm
  rate limit cần dependency/kho trạng thái (vi phạm nguyên tắc IV nếu không có yêu cầu rõ).
