# Quy ước commit

Dùng Conventional Commits: `type: mô tả ngắn` hoặc `type(scope): mô tả ngắn`.

```text
feat: add product listing
fix: resolve login validation error
docs: update installation guide
chore: configure repository
refactor: reorganize shared utilities
test: add authentication tests
```

Đây chỉ là ví dụ cú pháp, không xác nhận chức năng thuộc BrewLite.

- Mỗi commit là một thay đổi có ý nghĩa.
- Mô tả ngắn gọn, dễ hiểu.
- Không gom các thay đổi không liên quan.
- Kiểm tra staged diff; không commit bí mật hoặc dữ liệu phát sinh.
- Mô tả rõ ảnh hưởng và hướng nâng cấp khi phá vỡ tương thích.
