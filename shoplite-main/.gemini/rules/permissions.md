# Quy tắc thực thi lệnh và bảo mật (Permissions & Security)

Tuân thủ nghiêm ngặt cấu hình phân quyền từ `.gemini/settings.json`:

## 1. Lệnh được phép tự động chạy (Allow)
Được phép thực thi trực tiếp không cần hỏi người dùng đối với các lệnh kiểm tra, phát triển, chạy test và tra cứu trạng thái Git:
- **Phát triển & Kiểm tra mã nguồn:** `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run check`, `npm run format`.
- **Kiểm thử (Testing):** `npm test *`, `npm run test:coverage`, `npm run test:e2e`, `npx vitest run *`.
- **Git (Chỉ đọc):** `git status`, `git diff *`, `git log *`, `git branch *`.

## 2. Thao tác phải hỏi xác nhận từ người dùng (Ask)
Bắt buộc phải thông báo và xin xác nhận rõ ràng từ người dùng trước khi thực thi:
- **Ghi hoặc đẩy commit Git:** `git commit *`, `git push *`.
- **Cài đặt hoặc gỡ bỏ thư viện:** `npm install *`, `npm uninstall *`.

## 3. Hành vi bị cấm tuyệt đối (Deny)
Tuyệt đối không được thực thi dưới bất kỳ hình thức nào:
- **Đọc file cấu hình môi trường / bí mật:** Cấm đọc nội dung các file `./.env`, `./.env.*` (như `.env.local`, `.env.example`, v.v.).
- **Tải dữ liệu từ mạng ngoài qua CLI:** Cấm chạy các lệnh `curl *`, `wget *`.
- **Leo thang đặc quyền hệ thống:** Cấm chạy lệnh `sudo *`.
