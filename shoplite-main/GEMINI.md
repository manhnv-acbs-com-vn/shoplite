@AGENTS.md

## Dành riêng cho Gemini Code

- Tính năng chạm nhiều hơn 3 file: dùng plan mode (Shift+Tab) và trình bày kế hoạch trước khi sửa.
- Sau khi sửa code, tự chạy `npm run check`; nếu fail thì sửa đến khi pass rồi mới báo cáo.

### Phân quyền & Bảo mật (theo `.gemini/settings.json`)
- **Tự động cho phép (Allow):**
  - Chạy dev, lint, format, typecheck, check: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run check`, `npm run format`.
  - Chạy test: `npm test *`, `npm run test:coverage`, `npm run test:e2e`, `npx vitest run *`.
  - Tra cứu git (chỉ đọc): `git status`, `git diff *`, `git log *`, `git branch *`.
- **Phải hỏi người dùng trước khi chạy (Ask):**
  - Thao tác git ghi / đẩy code: `git commit *`, `git push *`.
  - Thao tác cài đặt / gỡ gói: `npm install *`, `npm uninstall *`.
- **Bị cấm tuyệt đối (Deny):**
  - Đọc file bí mật / môi trường: `.env`, `.env.*`.
  - Tải ngoại vi hoặc leo quyền: `curl *`, `wget *`, `sudo *`.
