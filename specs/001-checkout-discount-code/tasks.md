---
description: "Task list - Mã giảm giá khi thanh toán"
---

# Tasks: Mã giảm giá khi thanh toán

**Input**: Design documents from `specs/001-checkout-discount-code/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: BẮT BUỘC theo TDD (constitution nguyên tắc II + yêu cầu người dùng). Trong mỗi phase, task
test đứng TRƯỚC task cài đặt; test MUST chạy và **fail** trước khi viết code. Tên test (`it(...)`)
viết bằng tiếng Việt; test đơn hàng dùng `createInMemoryOrderRepository()` với `now`/`generateId`
cố định; không gọi mạng thật (`vi.stubGlobal("fetch", ...)`); test chạm file hệ thống thêm dòng
`// @vitest-environment node`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1…US5 trong spec.md)
- Đường dẫn tính từ thư mục gốc repo (Next.js một project: `src/`, `e2e/`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Xác nhận nền xanh và tạo khung thư mục

- [ ] T001 Chạy `npm run check` trên nhánh hiện tại để xác nhận baseline pass trước khi sửa (ghi lại nếu có test đỏ sẵn)
- [ ] T002 Tạo thư mục `src/features/coupons/` và `src/features/coupons/components/`, `src/app/api/coupons/validate/` theo cấu trúc trong plan.md
- [ ] T003 Chạy `npm run check` - checkpoint Phase 1

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Kiểu dữ liệu, dữ liệu mã, logic thuần và quy tắc tính tiền mà MỌI user story dùng

**⚠️ CRITICAL**: Không bắt đầu user story nào trước khi phase này xong

### Tests (viết trước, phải fail)

- [ ] T004 [P] Viết test toàn vẹn dữ liệu trong `src/features/coupons/coupon-data.test.ts`: mã duy nhất; `code` "Viết hoa, `[A-Z0-9]`, 3-32 ký tự, duy nhất trong danh sách"; `percent` "Số nguyên 1-100"; `maxDiscount` "Số nguyên VND > 0"; `amount` "Số nguyên VND > 0"; `minSubtotal` "Số nguyên VND ≥ 0"; `expiresOn` đúng dạng `"YYYY-MM-DD"`; có đúng 3 mã SHOPLITE10, GIAM50K, TET2026 với giá trị như FR-019
- [ ] T005 [P] Viết test `src/features/coupons/coupon-service.test.ts` cho `normalizeCouponCode` (`" shoplite10 "` → `"SHOPLITE10"`), `findCoupon` (có/không có), `isCouponExpired(expiresOn, now)` (mốc `2026-02-28T23:59:59.999+07:00` → chưa hết hạn, `2026-03-01T00:00:00+07:00` → hết hạn, không có `expiresOn` → không bao giờ hết hạn), `calculateDiscount` (SHOPLITE10: 300.000→30.000, 999.999→99.999, 1.000.000→100.000, 1.000.001→100.000, 2.000.000→100.000; GIAM50K: 600.000→50.000; fixed lớn hơn tạm tính → bằng tạm tính; luôn là số nguyên)
- [ ] T006 [P] Viết test `checkCoupon(code, subtotal, now)` trong `src/features/coupons/coupon-service.test.ts`: thứ tự kiểm tra tồn tại → còn hạn → đủ tối thiểu; trả `{ ok: false, reason: "NOT_FOUND" }`, `{ ok: false, reason: "EXPIRED", expiresOn }`, `{ ok: false, reason: "MIN_SUBTOTAL_NOT_MET", minSubtotal, shortfall }` (GIAM50K 499.999 → shortfall 1; SHOPLITE10 299.999 → shortfall 1; đúng 300.000/500.000 → ok); và `checkCouponEligibility(coupon, subtotal, now)` cho quy tắc đã có trong tay
- [ ] T007 [P] Mở rộng `src/features/checkout/pricing.test.ts`: `calculateOrderTotals(lines, method)` không mã → `discount: 0`, các con số cũ không đổi; có SHOPLITE10 với tạm tính 1.000.000 → `discount 100.000`, `shippingFee 0`, `total 900.000`; GIAM50K với tạm tính 500.000 tiêu chuẩn → `shippingFee 0` (phí ship xét trên tạm tính **trước** giảm - FR-010), `total 450.000`; tạm tính 499.999 giao nhanh không mã → `total = subtotal + 60.000`
- [ ] T008 [P] Mở rộng `src/features/checkout/checkout-schema.test.ts`: `placeOrderSchema` chấp nhận thiếu `couponCode`; `couponCode` "`trim()`, rỗng → coi như không có, tối đa 32 ký tự, `toUpperCase()`"; mảng/số → lỗi; trường lạ `discount`, `total` bị loại khỏi kết quả parse. `validateCouponSchema`: `code` trim 1-32 ký tự (rỗng → "Vui lòng nhập mã giảm giá"), `items` giống `placeOrderSchema`

### Implementation

- [ ] T009 [P] Tạo `src/features/coupons/types.ts`: union `Coupon` phân biệt theo `type: "percent" | "fixed"` (`percent` + `maxDiscount` cho percent, `amount` cho fixed, `minSubtotal?`, `expiresOn?`) và `CouponCheckResult` đúng data-model.md
- [ ] T010 [P] Tạo `src/data/coupons.ts` với 3 mã: SHOPLITE10 (percent 10, maxDiscount 100_000, minSubtotal 300_000), GIAM50K (fixed 50_000, minSubtotal 500_000), TET2026 (percent 15, maxDiscount 200_000, expiresOn "2026-02-28") - làm T004 xanh
- [ ] T011 Cài đặt `src/features/coupons/coupon-service.ts`: `normalizeCouponCode`, `findCoupon`, `isCouponExpired` (hết hạn khi `now > Date.parse(`${expiresOn}T23:59:59.999+07:00`)`), `calculateDiscount` (`min(floor(subtotal * percent / 100), maxDiscount, subtotal)` / `min(amount, subtotal)`), `checkCoupon`, `checkCouponEligibility`; hàm thuần, nhận `now: Date` - làm T005, T006 xanh
- [ ] T012 Sửa `src/features/checkout/pricing.ts`: `OrderTotals` thêm `discount`; `calculateOrderTotals(lines, method, coupon?: Coupon)` dùng `calculateDiscount`, phí ship tính trên `subtotal` trước giảm, `total = subtotal - discount + shippingFee` - làm T007 xanh (các nơi gọi cũ không phải sửa)
- [ ] T013 Sửa `src/features/checkout/checkout-schema.ts`: thêm `couponCode` tùy chọn vào `placeOrderSchema` và export `validateCouponSchema` - làm T008 xanh
- [ ] T014 [P] Sửa `src/features/orders/types.ts`: `Order` thêm `couponCode?: string` ("Mã đã chuẩn hóa (viết hoa). Không có = đơn không dùng mã") và `discount?: number` ("Đơn cũ không có trường này → coi là `0`")
- [ ] T015 [P] Sửa `src/features/orders/order-errors.ts`: thêm `COUPON_NOT_FOUND`, `COUPON_EXPIRED`, `COUPON_MIN_SUBTOTAL_NOT_MET` vào `OrderErrorCode`, HTTP 422
- [ ] T016 Chạy `npm run check` - checkpoint Phase 2

**Checkpoint**: Logic thuần + tính tiền sẵn sàng; các user story có thể bắt đầu

---

## Phase 3: User Story 1 - Áp dụng mã hợp lệ và đặt hàng với giá đã giảm (Priority: P1) 🎯 MVP

**Goal**: Khách nhập mã hợp lệ, thấy ngay số tiền giảm và tổng mới; đơn được tạo với giá đã giảm

**Independent Test**: Giỏ tạm tính ≥ 300.000đ → `/checkout` → nhập `shoplite10` → "Áp dụng" → tóm tắt
có "Giảm giá (SHOPLITE10)", tổng mới; đặt hàng → đơn có `couponCode`, `discount` đúng

### Tests for User Story 1 (viết trước, phải fail)

- [ ] T017 [P] [US1] Viết test `validateCoupon` và `placeOrder` (luồng hợp lệ) trong `src/features/orders/order-service.test.ts`: validate SHOPLITE10 với `p001` x1 → `{ coupon.code: "SHOPLITE10", subtotal: 1_290_000, discount: 100_000 }`; placeOrder kèm `couponCode: "giam50k"` với tạm tính ≥ 500.000 → đơn lưu `couponCode: "GIAM50K"`, `discount: 50_000`, `total` đã trừ; placeOrder không mã → `discount: 0`, không có `couponCode`
- [ ] T018 [P] [US1] Viết route test `src/app/api/coupons/validate/route.test.ts` (`// @vitest-environment node`, mock `@/features/orders/server` bằng repository trong bộ nhớ như `src/app/api/orders/route.test.ts`): 200 với body `{ coupon, subtotal, discount }` đúng [contracts/coupons-validate.md](./contracts/coupons-validate.md); `coupon` chỉ chứa quy tắc của mã vừa nhập; body không phải JSON → 400 `VALIDATION_ERROR`
- [ ] T019 [P] [US1] Mở rộng `src/app/api/orders/route.test.ts`: 201 khi gửi `couponCode` hợp lệ, response có `couponCode`, `discount`, `total` đã trừ
- [ ] T020 [P] [US1] Viết component test `src/features/coupons/components/coupon-field.test.tsx`: có `<label>` "Mã giảm giá" (tìm bằng `getByLabelText`) và nút "Áp dụng" (`getByRole`); nhập mã + bấm "Áp dụng" gọi `fetch("/api/coupons/validate")` với `{ code, items }` và gọi `onApplied(coupon)` khi 200
- [ ] T021 [P] [US1] Mở rộng `src/features/checkout/components/checkout-form.test.tsx`: sau khi áp dụng mã (stub fetch), tóm tắt hiện dòng "Giảm giá (SHOPLITE10)" với `formatCurrency`, `checkout-total` hiển thị tổng đã trừ; bấm "Đặt hàng" gửi `couponCode: "SHOPLITE10"` trong body `POST /api/orders`

### Implementation for User Story 1

- [ ] T022 [US1] Thêm `validateCoupon(input)` và nhánh mã trong `placeOrder` ở `src/features/orders/order-service.ts`: tách hàm dựng dòng hàng từ catalog (dùng chung, không lặp code); gọi `checkCoupon(code, subtotal, now())`; truyền coupon vào `calculateOrderTotals`; lưu `couponCode`, `discount`. Khi `checkCoupon` trả `ok: false` (cả trong `validateCoupon` lẫn `placeOrder`): ném ngay `OrderError` với mã `COUPON_*` tương ứng (NOT_FOUND → `COUPON_NOT_FOUND`, EXPIRED → `COUPON_EXPIRED`, MIN_SUBTOTAL_NOT_MET → `COUPON_MIN_SUBTOTAL_NOT_MET`) và **không** gọi `repository.save` - không bao giờ bỏ qua mã lặng lẽ (FR-016); message chi tiết được hoàn thiện ở T033/T039 - làm T017 xanh
- [ ] T023 [US1] Tạo route mỏng `src/app/api/coupons/validate/route.ts` (`POST`): `readJsonBody` → `orderService.validateCoupon` → `NextResponse.json`; lỗi qua `handleRouteError` - làm T018, T019 xanh
- [ ] T024 [US1] Tạo hook `src/features/coupons/use-applied-coupon.ts`: state `{ coupon, notice }`, `apply(coupon)`, `remove(notice?)` (chưa cần tự gỡ - để US3)
- [ ] T025 [US1] Tạo component client `src/features/coupons/components/coupon-field.tsx`: ô nhập có nhãn, nút "Áp dụng", trạng thái đang kiểm tra, gọi API, hiện mã đã áp dụng - làm T020 xanh
- [ ] T026 [US1] Sửa `src/features/checkout/components/checkout-summary.tsx`: nhận prop `coupon?: Coupon`, gọi `calculateOrderTotals(lines, method, coupon)`, hiện dòng "Giảm giá (MÃ)" `-formatCurrency(discount)` khi `discount > 0` (`data-testid="discount-amount"`)
- [ ] T027 [US1] Sửa `src/features/checkout/components/checkout-form.tsx`: dùng `useAppliedCoupon`, đặt `CouponField` trong cột tóm tắt, truyền `coupon` cho `CheckoutSummary`, gửi `couponCode` khi đặt hàng - làm T021 xanh
- [ ] T028 [US1] Chạy `npm run check` - checkpoint US1

**Checkpoint**: MVP - áp dụng mã hợp lệ và đặt đơn có giảm giá hoạt động độc lập

---

## Phase 4: User Story 2 - Thông báo rõ lý do khi mã không hợp lệ (Priority: P1)

**Goal**: Mã không dùng được → thông báo tiếng Việt đúng 1 trong 3 lý do ngay dưới ô nhập, tổng không đổi

**Independent Test**: Lần lượt nhập `KHONGCO`, `TET2026`, `GIAM50K` (giỏ < 500.000đ) và ô trống, kiểm tra
từng thông báo

**Phụ thuộc**: dùng `CouponField` và route validate từ US1

### Tests for User Story 2 (viết trước, phải fail)

- [ ] T029 [P] [US2] Viết test `src/features/coupons/coupon-messages.test.ts`: `toCouponError(result, code)` trả `OrderError` đúng mã và message - NOT_FOUND → "Mã giảm giá không tồn tại" (không lặp lại chuỗi khách nhập); EXPIRED → "Mã giảm giá TET2026 đã hết hạn ngày 28/02/2026", `details.expiresOn`; MIN_SUBTOTAL_NOT_MET → message có `formatCurrency(minSubtotal)` và "Cần mua thêm" `formatCurrency(shortfall)`, `details: { minSubtotal: "500000", shortfall: "1" }`
- [ ] T030 [P] [US2] Mở rộng `src/app/api/coupons/validate/route.test.ts`: 422 `COUPON_NOT_FOUND`, `COUPON_EXPIRED` (`now` sau 28/02/2026), `COUPON_MIN_SUBTOTAL_NOT_MET` có `details.shortfall`; 400 `VALIDATION_ERROR` khi `code` rỗng hoặc dài hơn 32 ký tự; 422 `PRODUCT_NOT_FOUND`
- [ ] T031 [P] [US2] Mở rộng `src/features/coupons/components/coupon-field.test.tsx`: khi API trả 422, hiện `error.message` ngay dưới ô (gắn `aria-describedby`, `aria-invalid`), không gọi `onApplied`; bấm "Áp dụng" khi ô trống → hiện "Vui lòng nhập mã giảm giá" và **không** gọi `fetch`; lỗi mạng → "Không kết nối được máy chủ, vui lòng thử lại."

### Implementation for User Story 2

- [ ] T032 [US2] Tạo `src/features/coupons/coupon-messages.ts` (`toCouponError`) - làm T029 xanh
- [ ] T033 [US2] Dùng `toCouponError` trong `validateCoupon` ở `src/features/orders/order-service.ts` để ném lỗi `COUPON_*` - làm T030 xanh
- [ ] T034 [US2] Hiển thị lỗi theo trường trong `src/features/coupons/components/coupon-field.tsx` - làm T031 xanh
- [ ] T035 [US2] Chạy `npm run check` - checkpoint US2

---

## Phase 5: User Story 5 - Chống gian lận khi đặt hàng (Priority: P1)

**Goal**: Server tự kiểm tra lại mã và tự tính lại tiền khi đặt; đơn không hợp lệ bị từ chối, client
tự gỡ mã và yêu cầu khách xác nhận lại (Clarification Q1)

**Independent Test**: Gửi `POST /api/orders` trực tiếp với số tiền giả mạo / mã hết hạn / tạm tính dưới
tối thiểu và kiểm tra kết quả

### Tests for User Story 5 (viết trước, phải fail)

- [ ] T036 [P] [US5] Mở rộng `src/features/orders/order-service.test.ts`: body kèm `couponCode: "SHOPLITE10"`, `discount: 500000`, `total: 1`, `unitPrice` giả → đơn lưu số do server tính (discount tối đa 100.000); `couponCode: "TET2026"` với `now` = `2026-03-01T00:00:00+07:00` → `COUPON_EXPIRED`, repository không có đơn mới; mã còn hạn lúc `now` = `2026-02-28T23:59:59+07:00` → được giảm; tạm tính dưới tối thiểu → `COUPON_MIN_SUBTOTAL_NOT_MET`, không lưu đơn; `couponCode: ["A","B"]` → `VALIDATION_ERROR`; giới hạn 10 sản phẩm/loại và tồn kho vẫn được kiểm tra khi có mã
- [ ] T037 [P] [US5] Mở rộng `src/app/api/orders/route.test.ts`: 422 `COUPON_EXPIRED` / `COUPON_MIN_SUBTOTAL_NOT_MET` / `COUPON_NOT_FOUND` theo [contracts/orders.md](./contracts/orders.md); sau lỗi `GET /api/orders` không có đơn mới
- [ ] T038 [P] [US5] Mở rộng `src/features/checkout/components/checkout-form.test.tsx`: dùng `it.each` cho cả 3 mã `COUPON_EXPIRED`, `COUPON_MIN_SUBTOTAL_NOT_MET`, `COUPON_NOT_FOUND` (FR-016 áp dụng cho mọi lý do): khi `POST /api/orders` trả 422 với mã đó → mã tự gỡ khỏi tóm tắt, hiện `message`, `checkout-total` về tổng chưa giảm, không chuyển trang; bấm "Đặt hàng" lần 2 → body **không** có `couponCode`

### Implementation for User Story 5

- [ ] T039 [US5] Dùng `toCouponError` trong `placeOrder` ở `src/features/orders/order-service.ts`: kiểm tra mã với `now()` trước khi lưu, ném lỗi và không gọi `repository.save` khi mã không hợp lệ - làm T036, T037 xanh
- [ ] T040 [US5] Xử lý lỗi `COUPON_*` trong `handleSubmit` của `src/features/checkout/components/checkout-form.tsx`: gọi `remove(message)` của `useAppliedCoupon`, giữ `status = "idle"` để khách bấm lại - làm T038 xanh
- [ ] T041 [US5] Chạy `npm run check` - checkpoint US5

---

## Phase 6: User Story 3 - Gỡ hoặc đổi mã đã áp dụng (Priority: P2)

**Goal**: Khách gỡ mã để quay về tổng ban đầu; mỗi đơn tối đa một mã; mã tự gỡ khi tạm tính xuống dưới
tối thiểu (FR-006, Clarification Q2)

**Independent Test**: Áp dụng SHOPLITE10 → "Gỡ mã" → tổng như cũ → áp dụng GIAM50K → chỉ còn một dòng
giảm giá; giảm giỏ dưới tối thiểu → mã tự gỡ kèm "cần mua thêm"

### Tests for User Story 3 (viết trước, phải fail)

- [ ] T042 [P] [US3] Mở rộng `src/features/coupons/components/coupon-field.test.tsx`: khi đã áp dụng, ô nhập bị vô hiệu và có nút "Gỡ mã"; bấm "Gỡ mã" gọi `onRemoved`, ô nhập dùng lại được
- [ ] T043 [P] [US3] Viết test hook `src/features/coupons/use-applied-coupon.test.ts` (`renderHook`): `subtotal` giảm vẫn đủ tối thiểu → giữ mã (SHOPLITE10 1.200.000 → 800.000: discount 100.000 → 80.000 qua `calculateOrderTotals`); `subtotal` xuống dưới tối thiểu → `coupon` = null, `notice` có "cần mua thêm" + số tiền; `subtotal` tăng lại đủ mức → mã **không** tự áp dụng lại
- [ ] T044 [P] [US3] Mở rộng `src/features/checkout/components/checkout-form.test.tsx`: áp dụng → gỡ → `checkout-total` về giá trị ban đầu và không còn `discount-amount`

### Implementation for User Story 3

- [ ] T045 [US3] Thêm nút "Gỡ mã" và vô hiệu ô nhập khi đã áp dụng trong `src/features/coupons/components/coupon-field.tsx` - làm T042 xanh
- [ ] T046 [US3] Thêm tự gỡ theo `subtotal` vào `src/features/coupons/use-applied-coupon.ts` bằng `checkCouponEligibility` (điều chỉnh state khi prop đổi, không dùng effect gây render thừa) - làm T043 xanh
- [ ] T047 [US3] Nối `onRemoved` và hiển thị `notice` trong `src/features/checkout/components/checkout-form.tsx` - làm T044 xanh
- [ ] T048 [US3] Chạy `npm run check` - checkpoint US3

---

## Phase 7: User Story 4 - Xem mã đã dùng trong chi tiết đơn hàng (Priority: P2)

**Goal**: Trang chi tiết đơn hiển thị mã và số tiền giảm; đơn cũ không có trường giảm giá hiển thị đúng

**Independent Test**: Mở đơn có GIAM50K → có "Giảm giá (GIAM50K): -50.000 ₫"; mở đơn cũ → không có dòng
giảm giá, không lỗi

### Tests for User Story 4 (viết trước, phải fail)

- [ ] T049 [P] [US4] Viết component test `src/features/orders/components/order-totals.test.tsx`: đơn có `couponCode: "GIAM50K"`, `discount: 50000` → hiện dòng giảm giá với `formatCurrency`; đơn `discount: 0` → không có dòng; đơn cũ không có `couponCode`/`discount` → không lỗi, không có dòng, tổng đúng `order.total`; đơn `cancelled` có mã → vẫn hiện dòng giảm giá
- [ ] T050 [P] [US4] Mở rộng `src/features/orders/order-service.test.ts`: `getOrder`/`listOrders` với repository seed một đơn cũ thiếu `couponCode`/`discount` trả về nguyên vẹn; `cancelOrder` giữ nguyên `couponCode` và `discount` (FR-017)

### Implementation for User Story 4

- [ ] T051 [US4] Tạo `src/features/orders/components/order-totals.tsx` (Server Component): tạm tính, "Giảm giá (MÃ)" khi `(order.discount ?? 0) > 0`, phí giao hàng, tổng cộng - làm T049 xanh
- [ ] T052 [US4] Sửa `src/app/orders/[id]/page.tsx` dùng `OrderTotals` thay khối `<dl>` hiện tại (giữ nguyên giao diện cũ cho đơn không có mã)
- [ ] T053 [US4] Chạy `npm run check` - checkpoint US4

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T054 Thêm kịch bản Playwright vào `e2e/shopping-flow.spec.ts`: thêm sản phẩm vào giỏ cho tạm tính ≥ 300.000đ → `/checkout` → nhập `SHOPLITE10` vào ô "Mã giảm giá" → "Áp dụng" → thấy dòng "Giảm giá (SHOPLITE10)" và `checkout-total` đã trừ → điền thông tin nhận hàng → "Đặt hàng" → trang `/orders/[id]` có dòng giảm giá SHOPLITE10 và tổng khớp
- [ ] T055 [P] Cập nhật `README.md`: bảng API thêm `POST /api/coupons/validate`, `POST /api/orders` có `couponCode`; mục "Quy tắc nghiệp vụ chính" thêm quy tắc mã giảm giá (một mã/đơn, giảm trên tạm tính, phí ship xét trước giảm, 3 mã ban đầu)
- [ ] T056 [P] Cập nhật codemap trong `AGENTS.md`: thêm dòng capability "Mã giảm giá" → `src/features/coupons/`, `src/data/coupons.ts`
- [ ] T057 Chạy các bước kiểm tra API và giao diện trong [quickstart.md](./quickstart.md) mục 2 và 3 (desktop + mobile 390px)
- [ ] T058 Chạy `npm run check` và `npm run test:e2e` - checkpoint cuối, cả hai MUST pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → các user story → **Polish (Phase 8)**
- Foundational chặn MỌI user story

### User Story Dependencies

```text
Phase 2 ──▶ US1 (P1, MVP) ──▶ US2 (P1)  [mở rộng CouponField + route validate]
               │           └─▶ US5 (P1)  [mở rộng placeOrder + CheckoutForm]
               └─────────────▶ US3 (P2)  [mở rộng CouponField + useAppliedCoupon]
Phase 2 ──────────────────────▶ US4 (P2)  [độc lập: chỉ cần Order type + OrderError]
```

- US2, US5, US3 cùng sửa vài file của US1 (`coupon-field.tsx`, `checkout-form.tsx`, `order-service.ts`)
  → làm tuần tự theo thứ tự phase để tránh xung đột.
- US4 chỉ phụ thuộc Phase 2 → có thể làm song song với US1 bởi người khác.

### Within Each User Story

- Test (fail) → logic thuần/service → route → hook/component → nối vào trang → `npm run check`

### Parallel Opportunities

- Phase 2: T004–T008 (5 file test khác nhau) song song; T009, T010, T014, T015 song song
- Mỗi story: tất cả task test [P] song song vì nằm ở file khác nhau
- US4 (T049–T053) song song với US1–US3

---

## Parallel Example: User Story 1

```bash
# Viết test US1 cùng lúc (5 file khác nhau):
Task: "T017 test validateCoupon/placeOrder trong src/features/orders/order-service.test.ts"
Task: "T018 route test src/app/api/coupons/validate/route.test.ts"
Task: "T019 mở rộng src/app/api/orders/route.test.ts"
Task: "T020 component test src/features/coupons/components/coupon-field.test.tsx"
Task: "T021 mở rộng src/features/checkout/components/checkout-form.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 + Phase 2
2. Phase 3 (US1) → dừng lại, kiểm tra độc lập theo "Independent Test"
3. Lưu ý: MVP chỉ an toàn để ra mắt khi có thêm US5 (chống gian lận) - server đã tính lại tiền ở
   US1 nhưng chưa từ chối mã hết hạn/thiếu tối thiểu một cách đầy đủ

### Incremental Delivery

1. US1 → US2 → US5 (đủ các story P1, có thể demo/ra mắt)
2. US3 → US4 (P2)
3. Polish: e2e, README, AGENTS.md

### Ghi chú mở

- Các điểm ưu tiên của `checklists/security.md` đã được phản ánh vào spec (2026-11-08): CHK005 và
  CHK021 → Assumptions; CHK014 và CHK018 → Edge Cases (mã > 32 ký tự → `VALIDATION_ERROR`, xử lý mã
  rỗng theo từng ngữ cảnh); CHK023 → Assumptions, **còn chờ marketing xác nhận**. Reviewer tự đánh
  dấu các mục checklist.
- Câu hỏi làm rõ số 3 đã chốt: không lưu mã khi rời trang thanh toán (spec §Clarifications).
