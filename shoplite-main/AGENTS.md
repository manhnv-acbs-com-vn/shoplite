# ShopLite - Tài Liệu Kỹ Thuật Cho Agents

## 1. Tổng quan
- **Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Zod, Vitest, Playwright.
- **Lưu trữ dữ liệu:** Catalog tĩnh (`src/data/products.ts`), Giỏ hàng ở client qua `localStorage` (key `CART_STORAGE_KEY = "shoplite:cart"`), Đơn hàng lưu file JSON tại `storage/orders.json` (biến môi trường `ORDERS_FILE`, mặc định `DEFAULT_ORDERS_FILE`).

## 2. Lệnh thường dùng
- Dev: `npm run dev`
- Kiểm tra toàn diện (chạy trước khi commit/xong việc): `npm run check` (tổng hợp: `lint` + `typecheck` + `test`)
- Test theo file/thư mục: `npx vitest run src/features/cart` (hoặc `npm test -- src/features/orders`)
- Kiểm thử E2E: `npm run test:e2e`
- Định dạng code: `npm run format` (kiểm tra: `npm run format:check`)

## 3. Codemap & Luồng chính
| Capability | Thư mục | File quan trọng |
| :--- | :--- | :--- |
| **catalog** | `src/features/catalog/` | `catalog-service.ts`, `types.ts`, `components/product-card.tsx` |
| **cart** | `src/features/cart/` | `cart-reducer.ts`, `cart-store.ts`, `use-cart.ts`, `components/cart-view.tsx` |
| **checkout**| `src/features/checkout/`| `pricing.ts`, `checkout-schema.ts`, `components/checkout-form.tsx` |
| **orders** | `src/features/orders/` | `order-service.ts`, `order-repository.ts`, `server.ts`, `order-errors.ts` |
| **API** | `src/app/api/` | `orders/route.ts`, `orders/[id]/route.ts`, `products/route.ts`, `src/lib/http.ts` |

- **Luồng thêm vào giỏ hàng:** `ProductPurchasePanel` / `AddToCartButton` -> gọi `addItem()` qua hook `useCart` -> `cartStore.dispatch({ type: "add" })` -> `cartReducer` kiểm tra tồn kho bằng `getMaxQuantity(stock)` và chặn vượt `MAX_QUANTITY_PER_ITEM` -> cập nhật state & ghi vào `localStorage` (key `shoplite:cart`).
- **Luồng đặt hàng:** `CheckoutForm` validate form qua `checkoutFormSchema` -> gửi `POST /api/orders` -> `orderService.placeOrder()` validate qua `placeOrderSchema`, truy vấn giá gốc bằng `getProductById()`, kiểm tra tồn kho `stock`, tính phí bằng `calculateOrderTotals()` -> gọi `OrderRepository.save()` ghi file an toàn vào `storage/orders.json` -> client nhận đơn hàng, gọi `clear()` giỏ hàng và redirect về `/orders/[id]?placed=1`.

## 4. Quy ước code
- **Feature-based & Co-location:** Logic, types, components và test đặt trong cùng thư mục `src/features/<feature>/`. Thư mục `src/app/` chỉ làm routing và nhận request HTTP.
- **Đặt tên file:** Dùng kebab-case (`order-service.ts`, `product-card.tsx`). Component export tên PascalCase.
- **Server/Client Component:** Mặc định Server Component trong `src/app`. Chỉ khai báo `'use client'` khi có state/hook (`useState`, `useSyncExternalStore`), event handler hoặc truy cập API browser (`localStorage`).
- **Validation (Zod):** Validate mọi input qua schema Zod (`customerSchema`, `checkoutFormSchema`, `placeOrderSchema`), chuẩn hóa lỗi field qua `toFieldErrors()`.
- **Xử lý lỗi API:** Ném `OrderError` từ service; Route Handler bọc qua `handleRouteError()` trả về JSON chuẩn `{ error: { code, message, details? } }` theo HTTP status (`400`, `404`, `409`, `422`).
- **Ngôn ngữ:** Nhãn form, văn bản UI và thông báo lỗi hiển thị bằng tiếng Việt.

## 5. Quy tắc nghiệp vụ không được phá vỡ
- **Giới hạn giỏ hàng:** Mỗi sản phẩm tối đa `MAX_QUANTITY_PER_ITEM = 10` và không vượt quá `product.stock`. Sản phẩm có `stock === 0` không được phép thêm.
- **Phí vận chuyển:** Dựa theo `SHIPPING_OPTIONS`: `standard` = 30.000₫ (miễn phí khi `subtotal >= FREE_SHIPPING_THRESHOLD = 500_000`), `express` = 60.000₫ (không áp dụng miễn phí).
- **Giá do server tính:** Server tại `POST /api/orders` luôn tính lại toàn bộ đơn giá và tổng tiền qua `calculateOrderTotals()` từ `src/data/products.ts`, tuyệt đối không tin giá client gửi lên.
- **Hủy đơn hàng:** Hàm `cancelOrder()` chỉ chấp nhận đơn có `order.status === "pending"` chuyển sang `"cancelled"`. Nếu đơn ở trạng thái khác, ném `OrderError("INVALID_STATUS_TRANSITION")`.

## 6. Testing
- **Vị trí file test:** Co-located cạnh file nguồn (`*.test.ts`, `*.test.tsx`). E2E test đặt tại `e2e/*.spec.ts`.
- **Test dùng file hệ thống:** Khai báo `// @vitest-environment node`, khởi tạo thư mục tạm bằng `mkdtemp` trong `beforeEach()`, dọn dẹp sạch bằng `rm(dir, { recursive: true, force: true })` trong `afterEach()` (tham khảo `order-repository.test.ts`).
- **Repository in-memory:** Dùng `createInMemoryOrderRepository(seed)` inject vào `createOrderService({ repository, ... })` để cô lập kiểm thử nghiệp vụ không đụng I/O đĩa (tham khảo `order-service.test.ts`).

## 7. Không được làm
- Không import `server.ts` hoặc các module node (`fs`, `path`) vào Client Component (`'use client'`).
- Không nhồi business logic, tính giá tiền hoặc thao tác dữ liệu trực tiếp trong `src/app/`.
- Không tin tưởng giá tiền hoặc trạng thái đơn hàng do client gửi lên.
- Không cho phép hủy đơn nếu `order.status !== "pending"`.
- Không sử dụng `any` tùy tiện khi định nghĩa kiểu TypeScript.

## 8. Definition of Done
- Lệnh `npm run check` pass 100% (không lỗi lint, typecheck sạch, toàn bộ unit tests qua).
- Có unit test đi kèm nếu thay đổi hoặc bổ sung logic trong `features/`.
- Mã nguồn tuân thủ định dạng (`npm run format:check`).
- API route luôn trả đúng cấu trúc lỗi `{ error: { code, message } }`.
