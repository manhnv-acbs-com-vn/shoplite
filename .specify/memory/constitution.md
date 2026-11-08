<!--
Sync Impact Report
==================
Version change: (template) → 1.0.0
Bump rationale: Ban hành lần đầu - thay toàn bộ placeholder của template bằng nội dung thực tế.

Modified principles (placeholder → tên mới):
- [PRINCIPLE_1_NAME] → I. Kiến trúc theo tính năng
- [PRINCIPLE_2_NAME] → II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)
- [PRINCIPLE_3_NAME] → III. Server là nguồn sự thật về tiền
- [PRINCIPLE_4_NAME] → IV. Đơn giản trước
- [PRINCIPLE_5_NAME] → V. Trải nghiệm tiếng Việt và dễ tiếp cận

Added sections:
- Ràng buộc kỹ thuật (thay [SECTION_2_NAME])
- Quy trình phát triển (thay [SECTION_3_NAME])
- Governance (điền [GOVERNANCE_RULES])

Removed sections: không có

Templates (đọc constitution lúc chạy, không sửa ở bước này):
- .specify/templates/plan-template.md     ✅ mục "Constitution Check" sẽ đọc 5 nguyên tắc này
- .specify/templates/spec-template.md     ✅ không cần chỉnh
- .specify/templates/tasks-template.md    ✅ không cần chỉnh (nguyên tắc II yêu cầu task test trước)
- .specify/templates/checklist-template.md ✅ không cần chỉnh

Follow-up TODOs: không có. Ngày ratified = ngày ban hành đầu tiên (2026-11-08).
-->

# ShopLite Constitution

## Core Principles

### I. Kiến trúc theo tính năng

- Code mới MUST đặt trong `src/features/<feature>/`: logic thuần, `components/`, `types.ts`
  và test đặt cạnh file nguồn.
- `src/app/` (page và Route Handler) MUST chỉ là lớp mỏng: đọc params/request, gọi sang feature,
  trả về UI/JSON. Không đặt quy tắc nghiệp vụ trong route hay component.
- Logic nghiệp vụ MUST viết thành hàm thuần (vd. `pricing.ts`, `cart-reducer.ts`,
  `catalog-service.ts`); I/O (localStorage, file JSON) tách riêng sau store/repository.
- UI dùng chung đặt ở `src/components/`, tiện ích ở `src/lib/`. Import MUST qua alias `@/`;
  tên file kebab-case, component PascalCase.
- Server Component là mặc định; chỉ thêm `"use client"` khi cần state, effect hoặc event.

**Lý do:** Mỗi tính năng tự chứa, dễ đọc, dễ test; route mỏng giúp thay đổi UI/API không kéo theo
nghiệp vụ.

### II. Test trước cho nghiệp vụ (NON-NEGOTIABLE)

- Mọi quy tắc về tính tiền, giới hạn (số lượng, tồn kho) và chuyển trạng thái đơn hàng MUST có
  unit test được viết **trước** phần cài đặt, và test MUST fail trước khi code được viết.
- Mỗi ngưỡng MUST có test giá trị biên: ngay dưới / đúng bằng / ngay trên
  (vd. tạm tính 499.999đ, 500.000đ, 500.001đ; số lượng 10 và 11).
- Test dùng Vitest + Testing Library, file `*.test.ts(x)` cạnh file nguồn; test đơn hàng MUST dùng
  `createInMemoryOrderRepository()` với `now`/`generateId` cố định; không gọi mạng thật.
- `npm run check` (lint + typecheck + test) MUST pass trước khi một thay đổi được coi là xong.
  Luồng mua hàng chính SHOULD được phủ bằng E2E Playwright khi thay đổi hành vi người dùng.

**Lý do:** Sai một con số về tiền hay trạng thái đơn là lỗi nghiêm trọng nhất của cửa hàng;
test biên viết trước bắt được lỗi off-by-one trước khi lên production.

### III. Server là nguồn sự thật về tiền

- Giá sản phẩm, phí ship, giảm giá và tổng tiền MUST được server tính lại từ catalog và
  `pricing.ts`; server MUST NOT tin bất kỳ giá/tổng nào client gửi lên.
- Tồn kho và giới hạn số lượng MUST được kiểm tra lại ở server khi đặt hàng, kể cả khi client
  đã kiểm tra.
- Mọi input từ bên ngoài (body API, query, form) MUST được validate bằng Zod; schema dùng chung
  client/server đặt trong feature tương ứng (vd. `checkout-schema.ts`).
- Lỗi nghiệp vụ MUST dùng lỗi có `code` (vd. `OrderError`) và API MUST trả về dạng
  `{ error: { code, message, details? } }`.
- Client MAY tính tạm để hiển thị, nhưng con số được lưu vào đơn hàng luôn là con số của server.

**Lý do:** Client có thể bị sửa tùy ý; chỉ server mới đảm bảo khách trả đúng số tiền.

### IV. Đơn giản trước

- Tính năng mới MUST dùng stack hiện có: Next.js 16 App Router, React 19, TypeScript strict,
  Tailwind CSS v4, Zod 4, Vitest, Playwright.
- MUST NOT thêm dependency, database, dịch vụ ngoài hay lớp trừu tượng mới nếu plan không ghi rõ
  lý do và phương án đơn giản hơn đã bị loại vì sao (mục Complexity Tracking).
- Dữ liệu sản phẩm giữ dạng tĩnh trong `src/data/`; đơn hàng lưu file JSON qua `order-repository`.
- MUST NOT dùng `any`, MUST NOT tắt rule ESLint để "cho qua".
- Ưu tiên YAGNI: chỉ làm những gì spec yêu cầu.

**Lý do:** ShopLite là dự án mẫu cần đọc hiểu trong một buổi; mỗi thứ thêm vào là chi phí vĩnh viễn.

### V. Trải nghiệm tiếng Việt và dễ tiếp cận

- Mọi text hiển thị cho người dùng (UI, thông báo lỗi API) MUST bằng tiếng Việt.
- Tiền MUST định dạng bằng `formatCurrency` (`src/lib/format.ts`); MUST NOT tự ghép chuỗi "đ"/"₫".
- Form MUST có `label` gắn với từng input và hiển thị lỗi theo từng trường, ngay cạnh trường đó.
- Phần tử tương tác MUST dùng thẻ ngữ nghĩa (`button`, `a`, `label`) để truy cập được bằng bàn phím
  và test được bằng `getByRole`/`getByLabelText`.
- Giao diện SHOULD được kiểm tra trên desktop và mobile 390px trước khi báo xong.

**Lý do:** Khách hàng là người Việt; form rõ ràng và dễ tiếp cận giảm đơn bị bỏ dở.

## Ràng buộc kỹ thuật

- Runtime: Node.js ≥ 22.12, npm 10+. Next.js 16: `params` là Promise; khi chưa chắc về API,
  MUST đọc tài liệu đúng phiên bản trong `node_modules/next/dist/docs/`.
- Quy tắc nghiệp vụ hiện hành MUST được giữ nguyên trừ khi spec thay đổi rõ ràng:
  - Tối đa 10 sản phẩm mỗi loại trong giỏ (`MAX_QUANTITY_PER_ITEM`) và không vượt tồn kho.
  - Phí ship tiêu chuẩn 30.000đ, miễn phí khi tạm tính ≥ 500.000đ (`FREE_SHIPPING_THRESHOLD`);
    giao nhanh 60.000đ.
  - Chỉ hủy được đơn ở trạng thái `pending`.
- Giỏ hàng lưu ở `localStorage["shoplite:cart"]`; thay đổi định dạng MUST xử lý dữ liệu cũ.
- MUST NOT commit `storage/`, file `.env*` hay sửa `package-lock.json` bằng tay.
- Style bằng Tailwind utility, ghép class bằng `cn()`, Link dạng nút dùng `buttonStyles()`.

## Quy trình phát triển

- Mỗi tính năng MUST làm trên nhánh riêng, đi theo luồng Spec Kit:
  `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
- MUST NOT bắt đầu code khi spec còn mục `[NEEDS CLARIFICATION]` hoặc câu hỏi mở chưa được trả lời.
- Plan MUST có mục "Constitution Check" đối chiếu với 5 nguyên tắc trên; mọi vi phạm MUST được ghi
  vào Complexity Tracking kèm lý do.
- Trong tasks, task viết test MUST đứng trước task cài đặt tương ứng (nguyên tắc II).
- Definition of Done: `npm run check` pass, có test cho hành vi mới, UI đã kiểm tra trên trình duyệt,
  README được cập nhật nếu thêm route, API hoặc lệnh mới.

## Governance

- Constitution này có hiệu lực cao hơn mọi quy ước khác; khi mâu thuẫn với AGENTS.md hay tài liệu
  khác, constitution được ưu tiên và tài liệu kia MUST được sửa cho khớp.
- Mọi sửa đổi MUST qua pull request, ghi rõ lý do và cập nhật Sync Impact Report.
- Mỗi lần sửa MUST tăng version theo semver:
  - MAJOR: bỏ hoặc định nghĩa lại một nguyên tắc theo cách không tương thích.
  - MINOR: thêm nguyên tắc/mục mới hoặc mở rộng đáng kể hướng dẫn.
  - PATCH: làm rõ câu chữ, sửa lỗi chính tả, không đổi ý nghĩa.
- Mọi review (spec, plan, PR) MUST kiểm tra tuân thủ constitution; độ phức tạp thêm vào MUST được
  giải thích. Hướng dẫn làm việc hằng ngày cho agent nằm ở `AGENTS.md`.

**Version**: 1.0.0 | **Ratified**: 2026-11-08 | **Last Amended**: 2026-11-08
