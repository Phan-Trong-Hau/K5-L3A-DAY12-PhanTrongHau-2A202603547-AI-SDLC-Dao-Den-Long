# Đảo Đèn Lồng

- Đọc ticket của phase hiện tại. Phase 4 dùng `Phase4.md` và Test Contract v1.3.
- Cài bằng `npm ci`, mở bản web bằng `npm run dev`, dựng bằng `npm run build`, chạy hồi quy bằng `npm test`.
- Dùng skill `verify-night` khi sửa mô phỏng, bản đồ, manifest hoặc CLI.
- Mô phỏng 60 Hz tại `src/` là nguồn dùng chung cho CLI và bản web. Giữ thứ tự tick trong ticket. Đồ họa và âm thanh chỉ đọc trạng thái, không quyết định kết quả.
- Vị trí và tuning trong ticket có ưu tiên cao hơn giả định trước. Cập nhật kiểm thử bị thay thế và ghi lý do trong ghi chú phase.
- Khi test đỏ, xác định nguyên nhân trước khi đánh dấu đạt. Lưu lệnh, mã thoát và đầu ra thật cho bằng chứng. Chỉ ghi test ẩn là đã chạy khi có kết quả từ hệ chấm.
- Dùng lệnh benchmark và soak trong README để tạo số liệu thật. Không sửa tay JSON đo và không cho hiệu ứng sáng tạo tham gia benchmark.
