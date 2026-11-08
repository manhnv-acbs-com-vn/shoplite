# AGENTS.md - ShopLite

Hướng dẫn cho Codex và mọi AI coding agent làm việc trong repository này.

ShopLite là cửa hàng đồ công nghệ mini, dùng Next.js 16 App Router, React 19,
TypeScript strict, Tailwind CSS v4 và Zod 4. Giao diện dùng tiếng Việt và tiền tệ VND;
không có database: sản phẩm là dữ liệu tĩnh trong `src/data/`, đơn hàng lưu ở
`storage/orders.json` (gitignored). Khi chưa chắc về API Next.js 16, đọc tài liệu trong
`node_modules/next/dist/docs/` trước khi triển khai.

## 0. Quy tắc làm việc với Codex

- Đọc file này trước khi sửa mã; ưu tiên các quy tắc trong phạm vi thư mục hiện tại.
- Trước khi thay đổi, xác định đúng feature và giữ route trong `src/app/` thật mỏng.
- Không tự ý commit, push, cài package, đổi schema dữ liệu hoặc sửa file ngoài phạm vi yêu cầu.
- Sau mỗi thay đổi, chạy kiểm tra phù hợp (tối thiểu test liên quan; trước khi báo hoàn tất chạy `npm run check`).
- Báo rõ các file đã sửa, lệnh đã chạy và phần kiểm tra chưa thể thực hiện được.
- Không đưa secret, token, dữ liệu trong `storage/` hoặc nội dung từ `.env*` vào mã nguồn hay diff.

## 1. Tổng quan

ShopLite dùng Next.js 16.4.2 App Router, React 19.3, TypeScript strict, Tailwind CSS v4 và Zod 4.
Sản phẩm là dữ liệu tĩnh trong `src/data/`; đơn hàng lưu ở `storage/orders.json` qua
`createJsonFileOrderRepository()` (không commit). Giỏ hàng lưu trong
`localStorage["shoplite:cart"]` qua `cartStore`.

## 2. Lệnh thường dùng

```bash
npm run dev                         # Next dev server
npm run check                       # lint + typecheck + unit test
npx vitest run src/features/cart   # test một thư mục
npm run test:e2e                    # Playwright e2e
npm run format                     # Prettier format
npm run format:check               # kiểm tra format
```

## 3. Codemap và luồng chính

| Capability | Thư mục                  | File quan trọng                                                    |
| ---------- | ------------------------ | ------------------------------------------------------------------ |
| Catalog    | `src/features/catalog/`  | `catalog-service.ts`, `components/catalog-filters.tsx`             |
| Product detail | `src/app/products/[slug]/` | `page.tsx`, `features/cart/components/product-purchase-panel.tsx` |
| Cart       | `src/features/cart/`     | `cart-reducer.ts`, `cart-store.ts`, `use-cart.ts`                  |
| Checkout   | `src/features/checkout/` | `pricing.ts`, `checkout-schema.ts`, `components/checkout-form.tsx` |
| Orders     | `src/features/orders/`   | `order-service.ts`, `order-repository.ts`, `server.ts`             |
| API        | `src/app/api/`           | `products/route.ts`, `orders/route.ts`, `orders/[id]/route.ts`     |
| Shared UI   | `src/components/`       | `ui/button.tsx`, `layout/header.tsx`                                |
| Product data | `src/data/`             | `products.ts`, `categories.ts`                                     |

Luồng thêm vào giỏ: `AddToCartButton` hoặc `ProductPurchasePanel` →
`useCart().addItem()` → `cartStore.dispatch()` → `cartReducer()` →
`localStorage["shoplite:cart"]`; UI đọc lại qua `useCart()`.

Luồng đặt hàng: `CheckoutForm` → `POST /api/orders` → `readJsonBody()` →
`orderService.placeOrder()` → `placeOrderSchema.safeParse()` → lấy giá bằng
`getProductById()` và tính tiền bằng `calculateOrderTotals()` →
`orderRepository.save()` → `storage/orders.json`.

## 4. Quy ước code

- Đặt code theo feature trong `src/features/<feature>/`; route trong `src/app/` chỉ điều phối.
- File dùng kebab-case; component dùng PascalCase; import nội bộ qua alias `@/`.
- Server Component là mặc định; chỉ dùng `"use client"` cho state, effect hoặc event.
- Validate input bằng `placeOrderSchema`/Zod; nghiệp vụ nên là hàm thuần để dễ test.
- Route dùng `readJsonBody()`, gọi service, và chuyển lỗi bằng `handleRouteError()`.
- API lỗi có dạng `{ error: { code, message, details? } }` qua `jsonError()`.
- Text giao diện bằng tiếng Việt; tiền dùng `formatCurrency()`; class dùng Tailwind và `cn()`.
- Link dạng nút dùng `buttonStyles()`; không thêm dependency mới nếu chưa có lý do.

## 5. Quy tắc nghiệp vụ không được phá vỡ

- `MAX_QUANTITY_PER_ITEM = 10`; số lượng cũng không được vượt `product.stock`.
- `calculateShippingFee()`: standard 30.000đ, miễn phí từ `FREE_SHIPPING_THRESHOLD = 500_000`;
  express 60.000đ theo `SHIPPING_OPTIONS`.
- Server luôn lấy giá catalog bằng `getProductById()` và tính lại bằng `calculateOrderTotals()`;
  không tin giá client gửi lên.
- `cancelOrder()` chỉ chuyển đơn từ trạng thái `pending` sang `cancelled`.

## 6. Testing

- Test `*.test.ts(x)` đặt cạnh file nguồn; test file system thêm `// @vitest-environment node`.
- Test đơn hàng dùng `createInMemoryOrderRepository()` và dependency cố định khi cần.
- Nghiệp vụ mới phải có test biên; component test ưu tiên `getByRole`/`getByLabelText`.
- Không gọi mạng thật; mock `fetch` khi cần.

## 7. Không được làm

- Không sửa tay `package-lock.json`, không commit `storage/` hoặc `.env*`.
- Không đổi format dữ liệu `localStorage` nếu chưa hỗ trợ dữ liệu cũ.
- Không dùng `any`, không tắt ESLint để bỏ qua lỗi, không thêm dependency nếu chưa có lý do.
- Không tự ý commit, push, cài hoặc gỡ package khi người dùng chưa yêu cầu.

## 8. Definition of Done

- Có test cho hành vi mới và `npm run check` pass.
- Diff không chứa file bí mật, dữ liệu runtime hoặc thay đổi ngoài phạm vi.
- Nếu thêm/sửa route hoặc API, cập nhật README và test route tương ứng.
- Nếu đổi UI, kiểm tra desktop và mobile 390px khi có thể.
