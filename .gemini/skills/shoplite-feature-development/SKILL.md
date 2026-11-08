---
name: shoplite-feature-development
description: Hướng dẫn kiến trúc, quy chuẩn mã nguồn và quy trình phát triển tính năng mới cho dự án ShopLite (Next.js 16 App Router, Feature-Driven Architecture, Vitest, Zod, Tailwind CSS v4). Kích hoạt khi cần tạo thêm feature mới, component mới, API endpoint mới, hoặc mở rộng nghiệp vụ trong ShopLite.
---

# Hướng Dẫn Phát Triển Tính Năng Dự Án ShopLite

Tài liệu hướng dẫn chuẩn hoá kiến trúc và quy trình triển khai tính năng mới trong dự án **ShopLite**. Mọi AI Agent và lập trình viên khi tham gia phát triển dự án bắt buộc phải tuân thủ nghiêm ngặt các nguyên tắc dưới đây.

---

## 1. Triết Lý Kiến Trúc (Feature-Driven Architecture)

Dự án ShopLite áp dụng mô hình kiến trúc hướng tính năng (**Feature-Driven Architecture**). Nguyên tắc cốt lõi:
1. **Thin App Router (`src/app/`):** Chỉ đóng vai trò định tuyến (routing), cấu hình `metadata`, nhận request và bọc layout. **Tuyệt đối không viết business logic, validate phức tạp hoặc gọi trực tiếp database/file hệ thống tại `src/app/`**.
2. **Fat Features (`src/features/<feature-name>/`):** Mọi logic nghiệp vụ, state management, schema validation, UI components chuyên biệt và unit test đều phải quy tụ tại module feature tương ứng.
3. **Server-Side Security First:** Không tin tưởng dữ liệu giá tiền hoặc trạng thái gửi từ client. Mọi phép tính toán tiền, giảm giá hoặc trừ tồn kho phải được tính toán lại tại server (`pricing.ts` / `<feature>-service.ts`).
4. **Zero-Database Persistence:** Mọi dữ liệu cần lưu trữ đều sử dụng file JSON cục bộ (`storage/*.json`), phân tách qua tầng Repository để dễ dàng thay thế sang database thật sau này.

---

## 2. Cấu Trúc Thư Mục Chuẩn Của Một Feature

Khi phát triển một tính năng mới (ví dụ: `promotions`, `reviews`, `wishlist`, `notifications`), thư mục tính năng phải tuân thủ cấu trúc sau:

```text
src/features/<feature-name>/
├── types.ts                    # Chứa toàn bộ TypeScript interfaces, types, DTOs
├── <feature>-schema.ts         # Zod schemas để validate form client & API payload
├── <feature>-service.ts        # Pure business logic (tính toán, điều kiện nghiệp vụ)
├── <feature>-service.test.ts   # Unit tests bằng Vitest cho service logic
├── <feature>-repository.ts     # Data access layer (đọc/ghi file storage/*.json)
├── <feature>-repository.test.ts# Unit tests cho repository
├── <feature>-errors.ts         # Custom domain errors (nếu có lỗi đặc thù)
├── server.ts                   # Khởi tạo singleton instance cho server-side execution
└── components/                 # Các React components độc quyền của tính năng này
    ├── <feature>-view.tsx      # Main view component kết nối toàn bộ feature
    ├── <feature>-view.test.tsx # Component test bằng Vitest + React Testing Library
    └── <sub-component>.tsx     # Các component con nhỏ hơn
```

---

## 3. Quy Trình 5 Bước Phát Triển Tính Năng Mới

### Bước 1: Khai báo Data Models & Types (`src/features/<feature>/types.ts`)
- Định nghĩa kiểu dữ liệu cho thực thể (entity), trạng thái và payload yêu cầu.
```typescript
// src/features/<feature>/types.ts
export interface ExampleItem {
  id: string;
  name: string;
  createdAt: string;
}
```

### Bước 2: Tạo Schema Validation bằng Zod (`src/features/<feature>/<feature>-schema.ts`)
- Mọi dữ liệu người dùng nhập hoặc client gửi lên API bắt buộc phải validate bằng Zod:
```typescript
// src/features/<feature>/<feature>-schema.ts
import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự").max(100),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
```

### Bước 3: Hiện thực Service & Repository kèm Unit Test (TDD)
- Viết hàm xử lý logic nghiệp vụ và file test tương ứng:
```typescript
// src/features/<feature>/<feature>-service.ts
import type { CreateItemInput } from "./<feature>-schema";
import type { ExampleItem } from "./types";

export function createItem(input: CreateItemInput): ExampleItem {
  return {
    id: `item_${Date.now()}`,
    name: input.name,
    createdAt: new Date().toISOString(),
  };
}
```
- Viết test Vitest:
```typescript
// src/features/<feature>/<feature>-service.test.ts
import { describe, expect, it } from "vitest";
import { createItem } from "./<feature>-service";

describe("createItem", () => {
  it("tạo item hợp lệ với id và thời gian", () => {
    const item = createItem({ name: "Mã giảm giá 20%" });
    expect(item.id).toMatch(/^item_/);
    expect(item.name).toBe("Mã giảm giá 20%");
  });
});
```

### Bước 4: Xây dựng UI Component (`src/features/<feature>/components/`)
- Tái sử dụng các UI primitives từ `@/components/ui/` (`button.tsx`, `price-tag.tsx`, `empty-state.tsx`...).
- Dùng utility hàm `cn(...)` từ `@/lib/cn` và `formatCurrency(...)` từ `@/lib/format`.

### Bước 5: Tạo Route & API Endpoint
- **Giao diện người dùng (`src/app/<feature>/page.tsx`):**
```typescript
import type { Metadata } from "next";
import { FeatureView } from "@/features/<feature>/components/<feature>-view";

export const metadata: Metadata = { title: "Tiêu Đề Trang" };

export default function FeaturePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Tiêu Đề Trang</h1>
      <FeatureView />
    </div>
  );
}
```
- **API Handler (`src/app/api/<feature>/route.ts`):**
```typescript
import { NextResponse } from "next/server";
import { featureService } from "@/features/<feature>/server";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

export async function GET() {
  try {
    const data = await featureService.list();
    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === undefined) {
    return jsonError(400, "VALIDATION_ERROR", "Body phải là JSON hợp lệ");
  }
  try {
    const result = await featureService.create(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
```

---

## 4. Bảng Tra Cứu Tiện Ích Dùng Chung (`src/lib/` & `src/components/ui/`)

| File / Component | Chức năng | Cách sử dụng |
| :--- | :--- | :--- |
| `@/lib/cn` | Ghép class Tailwind CSS an toàn | `cn("base-class", isActive && "active-class", className)` |
| `@/lib/format` | Định dạng tiền VND & ngày tháng | `formatCurrency(500000)` → `500.000 ₫`<br>`formatDate("2026-11-08")` → `08/11/2026` |
| `@/lib/http` | Xử lý body & format lỗi chuẩn API | `readJsonBody(request)`, `jsonError(status, code, message)`, `handleRouteError(err)` |
| `@/lib/use-hydrated` | Tránh lỗi hydration mismatch | `const isHydrated = useHydrated();` |
| `@/components/ui/button` | Nút bấm chuẩn với variant | `<Button variant="primary" size="md">Bấm</Button>` |
| `@/components/ui/price-tag` | Hiển thị giá tiền kèm giá gốc | `<PriceTag price={product.price} originalPrice={product.originalPrice} />` |
| `@/components/ui/empty-state`| Hiển thị màn hình trống dữ liệu | `<EmptyState title="Chưa có dữ liệu" description="..." />` |

---

## 5. Quy Chuẩn Kiểm Thử & Kiểm Soát Chất Lượng (Quality Gate)

Trước khi coi một tính năng là hoàn thành và trước khi commit:
1. **Chạy kiểm tra tổng hợp:**
   ```bash
   npm run check
   ```
   *(Bắt buộc pass 100% cả 3 khâu: ESLint, TypeScript TypeCheck, và Vitest)*.
2. **Quy tắc Git:**
   - Commit tại local branch: `git commit -m "<type>: <mô tả>"`
   - **Tuyệt đối không tự ý `git push` lên origin** trừ khi người dùng xác nhận và yêu cầu rõ ràng.

