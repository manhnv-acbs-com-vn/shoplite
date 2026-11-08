# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này. Tên hằng số, hàm, đường dẫn dưới đây lấy từ code hiện tại; khi chúng đổi thì cập nhật file này.

## 1. Tổng quan

- Cửa hàng ShopLite (đồ công nghệ): Next.js 16.4.2 App Router, React 19.3.0, TypeScript, Zod 4, Tailwind CSS 4.
- Node.js >= 22.12.0 (`engines` trong `package.json`).
- Test: Vitest 5 + jsdom + Testing Library; E2E: Playwright (chromium).
- Không có database. Nơi lưu dữ liệu:
  - Sản phẩm, danh mục: mảng tĩnh trong `src/data/products.ts`, `src/data/categories.ts`.
  - Giỏ hàng: localStorage, key `CART_STORAGE_KEY` = `"shoplite:cart"` (`src/features/cart/cart-store.ts`).
  - Đơn hàng: file JSON, đường dẫn `process.env.ORDERS_FILE`, mặc định `DEFAULT_ORDERS_FILE` = `storage/orders.json` (`src/features/orders/order-repository.ts`).

## 2. Lệnh thường dùng

```bash
npm install
npm run dev                  # Next dev (Turbopack), http://localhost:3000
npm run check                # lint + typecheck + test; chạy trước khi commit
npm run lint
npm run typecheck            # chạy next typegen trước tsc
npm run format:check         # npm run format để tự sửa
npm test                     # vitest run, một lần
npm run test:watch
npx vitest run src/features/orders                         # test một thư mục
npx vitest run src/features/orders/order-service.test.ts   # một file
npx vitest run src/features/orders -t "<tên test>"         # một test theo tên
npx playwright install chromium   # chỉ cần chạy lần đầu
npm run test:e2e                  # Playwright, tự chạy npm run dev
npx playwright test e2e/shopping-flow.spec.ts
```

## 3. Codemap

| Capability                              | Thư mục                              | File và symbol quan trọng                                                                                                                                                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog (tìm, lọc, sắp xếp, phân trang) | `src/features/catalog/`, `src/data/` | `catalog-service.ts`: `queryProducts`, `parseCatalogQuery`, `getProductById`, `PAGE_SIZE`; `types.ts`: `SORT_OPTIONS`, `CATEGORY_SLUGS`                                                                                                                                                                                     |
| Giỏ hàng (client)                       | `src/features/cart/`                 | `cart-reducer.ts`: `MAX_QUANTITY_PER_ITEM`, `getMaxQuantity`, `cartReducer`; `cart-store.ts`: `cartStore`; `use-cart.ts`: `useCart`; `components/add-to-cart-button.tsx`, `product-purchase-panel.tsx`, `cart-view.tsx`                                                                                                     |
| Thanh toán (form, phí ship)             | `src/features/checkout/`             | `pricing.ts`: `SHIPPING_OPTIONS`, `FREE_SHIPPING_THRESHOLD`, `calculateShippingFee`, `calculateOrderTotals`; `checkout-schema.ts`: `customerSchema`, `checkoutFormSchema`, `placeOrderSchema`, `VN_PHONE_REGEX`; `components/checkout-form.tsx`                                                                             |
| Đơn hàng (đặt, xem, hủy)                | `src/features/orders/`               | `order-service.ts`: `createOrderService`, `generateOrderId`; `order-repository.ts`: `OrderRepository`, `createJsonFileOrderRepository`, `createInMemoryOrderRepository`; `order-errors.ts`: `OrderError`, `OrderErrorCode`; `server.ts`: `orderService`; `types.ts`: `ORDER_STATUSES`; `components/cancel-order-button.tsx` |
| API                                     | `src/app/api/`                       | `products/route.ts` (GET); `orders/route.ts` (GET, POST); `orders/[id]/route.ts` (GET, PATCH); `src/lib/http.ts`: `handleRouteError`, `jsonError`, `readJsonBody`                                                                                                                                                           |
| Trang                                   | `src/app/`                           | `products/`, `cart/`, `checkout/`, `orders/`, `orders/[id]/`                                                                                                                                                                                                                                                                |

**Luồng 1 - thêm vào giỏ**
`AddToCartButton` / `ProductPurchasePanel` (click) → `useCart().addItem(product, qty)` (`use-cart.ts`) → `cartStore.dispatch({ type: "add" })` (`cart-store.ts`) → `cartReducer` (`cart-reducer.ts`, kẹp số lượng bằng `getMaxQuantity`) → ghi `localStorage["shoplite:cart"]` → `emit()` → `useSyncExternalStore` render lại (`cart-count`). Các tab khác đồng bộ qua sự kiện `storage`.

**Luồng 2 - đặt hàng**
`checkout-form.tsx` `handleSubmit` → `checkoutFormSchema.safeParse` (client) → `fetch POST /api/orders` với `customer`, `shippingMethod`, `paymentMethod`, `items: [{ productId, quantity }]` (không gửi giá) → `app/api/orders/route.ts` `POST` → `readJsonBody` → `orderService.placeOrder` (`server.ts`) → `placeOrderSchema.safeParse` → `mergeItems` → `getProductById` lấy giá và tồn kho → `INSUFFICIENT_STOCK` nếu thiếu → `calculateOrderTotals` → `repository.save` (ghi `<file>.tmp` rồi `rename`) → 201 JSON. Client gọi `clear()` và `router.push("/orders/{id}?placed=1")`. Lỗi `OrderError` → `handleRouteError` → `{ error: { code, message, details } }`; client hiển thị `error.message`.

**Hủy đơn:** `CancelOrderButton` → `PATCH /api/orders/[id]` với body `{"status":"cancelled"}` → `orderService.cancelOrder`.

## 4. Quy ước code

- Feature-based: logic nằm trong `src/features/<feature>/` (service, rule thuần, repository, components, test). `src/app/` chỉ có page và Route Handler; Route Handler mỏng: parse → gọi service → map lỗi.
- Tên file kebab-case (`order-service.ts`, `checkout-form.tsx`). Test đặt cạnh file nguồn: `<tên>.test.ts` hoặc `.test.tsx`.
- Import dùng alias `@/` (ví dụ `@/features/cart/cart-reducer`).
- Server/Client: component dùng hook, state hoặc event handler phải có `"use client"` ở dòng đầu (ví dụ `checkout-form.tsx`, `add-to-cart-button.tsx`). Không có directive thì là Server Component.
- Validation: Zod 4 với `safeParse`. Lỗi theo field đi qua `toFieldErrors`.
- Lỗi API: service ném `OrderError(code, message, details?)` với `code` thuộc `OrderErrorCode`. Mã mới thêm vào `OrderErrorCode` và `HTTP_STATUS_BY_CODE` (`order-errors.ts`). Route trả lỗi qua `handleRouteError` hoặc `jsonError`. Lỗi không phải `OrderError` → 500 `INTERNAL_ERROR`.
- Text người dùng thấy và message lỗi viết tiếng Việt có dấu, theo mẫu trong `order-service.ts`.

## 5. Quy tắc nghiệp vụ (không được phá)

- **Giới hạn giỏ:** `MAX_QUANTITY_PER_ITEM = 10` (`cart-reducer.ts`). Số lượng tối đa thực tế là `getMaxQuantity(stock)` = min(tồn kho, 10). Thêm sản phẩm có tồn kho 0 là no-op. `placeOrderSchema` cũng ràng buộc `.max(MAX_QUANTITY_PER_ITEM)` cho từng dòng.
- **Phí ship:** chỉ đổi trong `pricing.ts`: `SHIPPING_OPTIONS` (standard 30_000, express 60_000) và `FREE_SHIPPING_THRESHOLD = 500_000`. Miễn phí chỉ áp dụng cho `"standard"` khi subtotal >= ngưỡng. Subtotal <= 0 → phí 0. UI không hard-code phí.
- **Giá do server tính:** `placeOrderSchema` không khai báo trường giá nên giá client gửi không được dùng. Giá và tồn kho lấy từ `getProductById` (qua `findProduct`). Tổng lưu vào đơn là kết quả `calculateOrderTotals` phía server.
- **Tồn kho:** `quantity > product.stock` → `INSUFFICIENT_STOCK` (409).
- **Hủy đơn:** `cancelOrder` chỉ cho khi `status === "pending"` (nhãn "Chờ xác nhận"). Trạng thái khác → `INVALID_STATUS_TRANSITION` (409).
- **Thông tin khách:** `VN_PHONE_REGEX`; họ tên 2–50 ký tự; địa chỉ 10–200; ghi chú tối đa 200 (`customerSchema`).
- **Sau đặt hàng thành công** giỏ bị xóa (`clear()` trong `checkout-form.tsx`).
- **Đã biết, chưa xử lý:** `mergeItems` gộp dòng trùng `productId` _sau_ khi `placeOrderSchema` đã kiểm `max(10)` từng dòng, nên tổng có thể vượt 10 khi tồn kho đủ. Khi sửa luồng này, kiểm lại số lượng sau khi gộp.

## 6. Testing

- Vitest chỉ nhận `src/**/*.test.{ts,tsx}`; môi trường mặc định `jsdom`. `vitest.setup.ts` chạy RTL `cleanup` và `localStorage.clear()` sau mỗi test.
- Test chạm file hệ thống (`order-repository.test.ts`, `route.test.ts`): khai báo `// @vitest-environment node` ở dòng đầu. Tạo thư mục tạm bằng `mkdtemp(path.join(tmpdir(), ...))` trong `beforeEach`, xóa bằng `rm(..., { recursive: true, force: true })` trong `afterEach`. Không ghi vào `storage/`.
- Repository in-memory: `createInMemoryOrderRepository(seed?)`, dùng cho unit test của service.
- Service test bằng DI: `createOrderService({ repository, now, generateId })` với ngày cố định (ví dụ `FIXED_DATE`) và ID đếm tăng. Không gọi `new Date()` hay `crypto.randomUUID` trong test.
- Route Handler test: `vi.mock("@/features/orders/server", ...)` thay `orderService` bằng bản in-memory.
- Rule thuần (`cartReducer`, `calculateOrderTotals`, `queryProducts`) test trực tiếp, không cần React. `cartStore.reset()` chỉ dùng trong test.
- E2E `e2e/shopping-flow.spec.ts` dùng text tiếng Việt (`"Mua sắm ngay"`, `"Thêm vào giỏ"`, `"Mua ngay"`, `"Đặt hàng"`) và `data-testid`: `product-card`, `purchase-panel`, `cart-count`, `cart-total`, `order-row`, `checkout-total`, `shipping-fee`, `error-<field>`. Đổi UI phải giữ các giá trị này hoặc sửa spec.

## 7. Không được làm

- Import `node:fs`, `features/orders/server.ts` hoặc `order-repository.ts` trong code `"use client"`.
- Tin giá, tổng tiền hay tồn kho do client gửi; thêm trường giá vào `placeOrderSchema`.
- Gọi `createJsonFileOrderRepository` từ service hoặc route. Chỉ `server.ts` được wiring repository cho production.
- Commit `storage/orders.json`. `.gitignore` hiện chưa có `storage/`; thêm trước khi commit dữ liệu đơn.
- Đưa giá trị trong `.env.local` (đang được git theo dõi) vào code, docs hay commit.
- Đổi `agentRules: false` trong `next.config.ts`.
- Đổi key `CART_STORAGE_KEY` hoặc shape `CartState` mà không xử lý dữ liệu cũ: `readFromStorage` trả giỏ rỗng khi dữ liệu không hợp lệ, khách sẽ mất giỏ.
- Viết text người dùng thấy bằng tiếng Anh.

## 8. Definition of Done

- `npm run check` pass (lint, typecheck, test).
- `npm run format:check` pass khi có sửa file.
- Logic nghiệp vụ mới có unit test; test ghi file dùng thư mục tạm.
- Lỗi nghiệp vụ mới: thêm vào `OrderErrorCode` và `HTTP_STATUS_BY_CODE`, có test.
- Đổi luồng mua hàng hoặc `data-testid`: chạy `npm run test:e2e`.
- Đổi quy tắc ở mục 5: cập nhật file này.
