---
title: 'Story 7.1: Gợi ý tìm kiếm khi gõ'
type: 'feature'
created: '2026-10-23'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context: ['{project-root}/AGENTS.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Khách phải gõ đủ từ khóa rồi bấm "Tìm kiếm" mới biết shop có sản phẩm hay không; gõ thiếu hoặc
sai dấu thì ra trang trống và bỏ đi.

**Approach:** Khi khách gõ từ 2 ký tự vào ô tìm kiếm ở trang Sản phẩm, hiện ngay tối đa 5 sản phẩm khớp (tên
và giá) lấy từ một API mới; chọn một gợi ý là mở trang chi tiết sản phẩm đó.

## Boundaries & Constraints

**Always:**

- Khớp theo **tên và thương hiệu**, không phân biệt hoa thường, **không dấu**, dùng `normalizeText` có sẵn
  (gõ "ban phim" ra "Bàn phím cơ KeyPro 75%").
- **Còn hàng xếp trước, hết hàng xếp sau.** Trong mỗi nhóm: điểm đánh giá cao trước; bằng điểm thì nhiều lượt
  đánh giá trước.
- Gợi ý của sản phẩm hết hàng có nhãn **"Hết hàng"**.
- Từ khóa là dữ liệu của khách: mọi ký tự (kể cả `(` `*` `+` `.`) được hiểu là chữ bình thường, **không bao
  giờ** làm API lỗi 500 hay chạy chậm.
- Server tự kiểm độ dài từ khóa (2 đến 50 ký tự), không dựa vào giao diện.
- Logic là hàm thuần trong `src/features/catalog/`; route chỉ đọc tham số và gọi hàm đó.

**Never:**

- Không thêm thư viện mới.
- Không đổi hành vi nút "Tìm kiếm" và trang kết quả `/products?q=`.
- Không gọi API khi từ khóa dưới 2 ký tự.

## I/O & Edge-Case Matrix

| Scenario                 | Input / State                 | Expected Output / Behavior                                                                                       | Error Handling       |
| ------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------- |
| Khớp không dấu           | `q=ban phim`                  | 1 gợi ý: Bàn phím cơ KeyPro 75% · 1.890.000 ₫                                                                    | N/A                  |
| Còn hàng trước           | `q=usb`                       | 1) Cáp USB-C bện dù 2m · 150.000 ₫ · 2) Micro thu âm PodCast USB · 1.150.000 ₫ · **Hết hàng**                    | N/A                  |
| Cùng điểm, khác tồn kho  | `q=po`                        | 1) Pin dự phòng PowerGo 20.000mAh · 2) Micro thu âm PodCast USB · **Hết hàng** (cả hai 4,5 điểm)                 | N/A                  |
| Nhiều hơn 5 sản phẩm     | `q=on` (8 sản phẩm khớp)      | Đúng 5 gợi ý: StudioOne, FitWatch S2, SoundMax Pro, PowerGo, SwiftClick                                          | N/A                  |
| Không có kết quả         | `q=xyz`                       | `{"suggestions": []}`; giao diện ghi "Không tìm thấy sản phẩm phù hợp"                                          | N/A                  |
| Ký tự đặc biệt           | `q=tai(` hoặc `q=(.*.*)*!`    | 200 và `{"suggestions": []}`, trả về ngay (dưới 100 ms)                                                         | Không bao giờ 500    |
| Quá ngắn                 | `q=a`                         | 400 `VALIDATION_ERROR`                                                                                           | Giao diện không gọi  |
| Quá dài                  | `q` 51 ký tự                  | 400 `VALIDATION_ERROR`                                                                                           | N/A                  |

</frozen-after-approval>

## Code Map

- `src/features/catalog/catalog-service.ts` -- tìm kiếm của trang danh mục; cách so khớp không dấu và thứ tự "Đánh giá cao" để làm theo
- `src/lib/format.ts` -- `normalizeText` (bỏ dấu, chữ thường, gộp khoảng trắng)
- `src/features/catalog/components/catalog-filters.tsx` -- ô "Từ khóa tìm kiếm" và nút "Tìm kiếm" hiện có
- `src/app/api/products/route.ts` -- mẫu route mỏng của API sản phẩm
- `src/lib/http.ts` -- `jsonError` cho lỗi `VALIDATION_ERROR`

## Tasks & Acceptance

**Execution:**

- [ ] `src/features/catalog/suggest-service.ts` -- hàm thuần `getSuggestions(q, source)` theo bảng trên -- tách khỏi route để unit test được
- [ ] `src/features/catalog/suggest-service.test.ts` -- một test cho mỗi dòng của I/O Matrix -- dùng đúng dữ liệu mẫu để lộ lỗi sắp xếp
- [ ] `src/app/api/products/suggest/route.ts` -- `GET /api/products/suggest?q=` trả `{ suggestions: [{ slug, name, price, inStock }] }` -- route mỏng
- [ ] `src/app/api/products/suggest/route.test.ts` -- 200, 400 (ngắn, dài), ký tự đặc biệt -- hợp đồng của API
- [ ] `src/features/catalog/components/search-suggestions.tsx` -- combobox: gõ từ 2 ký tự, chờ 300 ms, danh sách `listbox`, ↑ ↓ Enter, Esc -- thay ô input trong `catalog-filters.tsx`

**Acceptance Criteria:**

- AC-1: Given trang /products, when khách gõ "ban phim" và chờ khoảng 0,3 giây, then hiện danh sách gợi ý có tên và giá.
- AC-2: Given danh sách gợi ý đang mở, when khách bấm vào một gợi ý hoặc dùng ↓ rồi Enter, then mở trang chi tiết của sản phẩm đó; Esc đóng danh sách.
- AC-3: Given ô tìm kiếm có dưới 2 ký tự, then không có request nào tới `/api/products/suggest` và không hiện danh sách.
- AC-4: Given từ khóa có ký tự đặc biệt, then API trả 200 ngay lập tức, không 500, không treo.
- AC-5: Given gợi ý có cả sản phẩm còn và hết hàng, then sản phẩm còn hàng đứng trước và sản phẩm hết hàng có nhãn "Hết hàng".
- AC-6: Given khách bấm "Tìm kiếm", then trang `/products?q=` vẫn như cũ; 2 test E2E có sẵn của `e2e/shopping-flow.spec.ts` vẫn xanh.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**

- `node scripts/ci/gate.mjs all` -- expected: 4 gate xanh
- `npx vitest run src/features/catalog src/app/api/products` -- expected: có test cho từng dòng của I/O Matrix

**Manual checks (if no CLI):**

- `curl "http://localhost:3000/api/products/suggest?q=usb"` -- Cáp USB-C đứng trước Micro, Micro có `"inStock": false`
- `curl "http://localhost:3000/api/products/suggest?q=tai("` -- 200, danh sách rỗng
