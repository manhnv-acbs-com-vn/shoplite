# AGENTS.md - ShopLite

Hướng dẫn ngữ cảnh cho AI coding agent làm việc trên dự án ShopLite.

## 1. Tổng quan
ShopLite là cửa hàng đồ công nghệ mini viết bằng Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Zod 4.
Không dùng database ngoài: sản phẩm là dữ liệu tĩnh trong `src/data/`, đơn hàng lưu file JSON `storage/orders.json` (gitignored).
Giao diện tiếng Việt, tiền tệ VND. Tài liệu Next.js 16 đúng phiên bản đặt tại `node_modules/next/dist/docs/`.

## 2. Lệnh thường dùng
```bash
npm run dev          # Chạy local tại http://localhost:3000
npm run check        # lint + typecheck + unit test (BẮT BUỘC pass trước khi báo xong)
npm test             # Chạy toàn bộ unit & component test (Vitest)
npx vitest run src/features/cart   # Chạy riêng test của một thư mục
npm run test:e2e     # Chạy Playwright E2E test (cần dev server đang chạy)
npm run format       # Format code bằng Prettier (tự sắp xếp class Tailwind)
```

## 3. Codemap

| Capability | Thư mục chính | File quan trọng |
| :--- | :--- | :--- |
| Catalog: tìm kiếm, lọc, phân trang, sort | `src/features/catalog/` | `catalog-service.ts` (hàm thuần), `components/catalog-filters.tsx` |
| Chi tiết sản phẩm | `src/app/products/[slug]/page.tsx` | `features/cart/components/product-purchase-panel.tsx` |
| Giỏ hàng (client, localStorage) | `src/features/cart/` | `cart-reducer.ts` (quy tắc), `cart-store.ts` (store), `use-cart.ts` (hook) |
| Tính tiền & thanh toán | `src/features/checkout/` | `pricing.ts` (phí ship, tổng tiền), `checkout-schema.ts` (Zod), `components/checkout-form.tsx` |
| Đơn hàng (server) | `src/features/orders/` | `order-service.ts` (nghiệp vụ), `order-repository.ts` (lưu JSON), `server.ts` (instance) |
| API Handlers | `src/app/api/` | `products/route.ts`, `orders/route.ts`, `orders/[id]/route.ts` |
| UI dùng chung | `src/components/` | `ui/button.tsx` (`buttonStyles` cho Link), `layout/header.tsx` |
| Dữ liệu mẫu | `src/data/` | `products.ts` (16 sản phẩm), `categories.ts` |

- **Luồng giỏ hàng:** `AddToCartButton` → `useCart().addItem` → `cartStore.dispatch` → `cartReducer` → ghi `localStorage["shoplite:cart"]` → các component dùng `useCart()` render lại qua `useSyncExternalStore`.
- **Luồng đặt hàng:** `CheckoutForm` → `POST /api/orders` → `orderService.placeOrder()` (validate Zod → tra cứu giá catalog → kiểm tra `stock` → `calculateOrderTotals`) → `orderRepository.save()` → redirect `/orders/[id]?placed=1`.

## 4. Quy ước code
- **Feature-based:** Code mới bắt buộc đặt trong `src/features/<feature>/` (logic thuần + `components/` + test cạnh file). `src/app/` chỉ chứa route mỏng, gọi sang features.
- Tên file kebab-case (`cart-summary.tsx`), component PascalCase, import dùng alias `@/`.
- Server Component là mặc định; chỉ thêm `"use client"` khi cần state, effect hoặc event handler.
- Logic nghiệp vụ viết thành hàm thuần (pure function) để dễ test, không viết dính trong UI component.
- Validate input bằng Zod; schema dùng chung giữa client & server đặt ở feature tương ứng.
- Lỗi nghiệp vụ dùng `OrderError(code, message)`; API trả về `{ error: { code, message, details? } }` qua `handleRouteError` (`src/lib/http.ts`).
- Toàn bộ text hiển thị tiếng Việt; định dạng tiền tệ qua `formatCurrency` (`src/lib/format.ts`).
- Style bằng Tailwind utility; ghép class bằng `cn()`; Link dạng nút dùng `buttonStyles()`.

## 5. Quy tắc nghiệp vụ (không được phá vỡ)
- Tối đa 10 sản phẩm mỗi loại trong giỏ (`MAX_QUANTITY_PER_ITEM`) và không vượt quá số lượng tồn kho (`stock`).
- Phí ship: Tiêu chuẩn 30.000 ₫, **miễn phí khi tạm tính ≥ 500.000 ₫** (`FREE_SHIPPING_THRESHOLD`); giao nhanh 60.000 ₫.
- Server luôn tính lại giá từ catalog (`calculateOrderTotals`) — không bao giờ tin giá client gửi lên.
- Chỉ cho phép hủy đơn hàng khi trạng thái là `pending` ("Chờ xác nhận").

## 6. Testing
- Vitest + Testing Library, file test `*.test.ts(x)` đặt cạnh file nguồn cần test.
- Test cần chạm file hệ thống thêm chú thích dòng đầu: `// @vitest-environment node`.
- Sử dụng `createInMemoryOrderRepository()` thay cho file JSON thật khi chạy test.
- Thêm/sửa nghiệp vụ bắt buộc có unit test cho các trường hợp biên (dưới / bằng / trên ngưỡng 500.000 ₫).

## 7. Không được làm
- Không sửa `package-lock.json` bằng tay, không commit thư mục `storage/` hay file `.env*`.
- Không đổi cấu trúc dữ liệu `localStorage` mà không có cơ chế migration dữ liệu cũ.
- Không dùng kiểu `any`; không tắt rule ESLint để né lỗi.
- Tuyệt đối không tự ý chạy `git push` lên origin khi chưa có xác nhận từ người dùng.

## 8. Definition of Done
1. `npm run check` pass 100% (lint + typecheck + unit test), có test cho hành vi mới.
2. Giao diện đã kiểm tra hiển thị tốt trên trình duyệt (cả Desktop và Mobile 390px).
3. Cập nhật README nếu có thêm route, API endpoint hoặc lệnh mới.

