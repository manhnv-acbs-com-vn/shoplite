@AGENTS.md

## Dành riêng cho Google Antigravity & Gemini CLI

- Tính năng chạm nhiều hơn 3 file: trình bày kế hoạch trước khi sửa.
- Sau khi sửa code, tự chạy `npm run check`; nếu fail thì sửa đến khi pass rồi mới báo cáo.
- Hook trong `.gemini/hooks/` sẽ tự format file sau khi sửa và chặn sửa file nhạy cảm - nếu bị hook chặn, đọc lý do và đổi cách làm, không tìm cách lách.
- Tuyệt đối không tự ý chạy `git push` lên origin. Mọi thay đổi chỉ commit ở local branch và đợi người dùng xác nhận.
- Khi trả lời bằng tiếng Việt, trích dẫn file theo dạng `src/features/cart/cart-reducer.ts:42`.
