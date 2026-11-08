---
paths:
  - "src/**/*.test.{ts,tsx}"
  - "e2e/**/*.ts"
---

# Quy tắc viết test

- Tên test (`it(...)`) viết bằng tiếng Việt, mô tả hành vi: `it("miễn phí giao hàng khi đơn đạt ngưỡng")`.
- Mỗi quy tắc nghiệp vụ có ít nhất 1 test cho giá trị biên (ngay dưới / đúng bằng / ngay trên ngưỡng).
- Component test: ưu tiên `getByRole`, `getByLabelText`; `getByTestId` là lựa chọn cuối.
- Không gọi mạng thật: dùng `vi.stubGlobal("fetch", ...)`; mock `next/navigation` khi component dùng router.
- Test đơn hàng dùng `createInMemoryOrderRepository()` và truyền `now` / `generateId` cố định.
- Test đọc/ghi file: tạo thư mục tạm bằng `mkdtemp(path.join(tmpdir(), ...))`, xóa ở `afterEach`.
- E2E (Playwright): giới hạn locator trong một vùng cụ thể (vd. `getByTestId("purchase-panel")`) để tránh trùng nút.
- Chạy một thư mục: `npx vitest run src/features/<tên>`; trước khi báo xong: `npm run check`.
