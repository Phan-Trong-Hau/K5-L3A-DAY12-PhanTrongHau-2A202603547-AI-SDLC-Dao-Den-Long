# Bằng chứng Phase 4

[Ticket-04](../../../Phase4.md) · [Retro](../../notes/retro.md) · [Changelog](../../../CHANGELOG.md)

| Kiểm chứng | Kết quả |
|---|---|
| `npm test` | 25/25 đạt, gồm luật Phase 1–3 còn hiệu lực và top 10, tên hợp lệ, thứ tự hòa điểm. [TAP](tests.tap) |
| `npm run build` | Build thành công, có cảnh báo bundle Three.js lớn hơn 500 kB sau minify. |
| Headless v1.3 | Chạy fixture bình minh với cùng seed và input. JSONL khớp từng byte với Phase 3. |
| Benchmark | Seed 42, warm-up 3 s, đo 30 s ở 1280×720. 200 Bóng Mực wander, 100 đom đóm và ba đèn sáng. 220,9 FPS trung bình, 95,51 FPS 1% low, p95 7,4 ms và load 603 ms. [bench.json](../../../bench.json) |
| Soak | Seed 7, mười đêm, không crash. RSS từ 51,44 lên 59,12 MiB, tăng 14,9% và dưới ngưỡng 20%. [soak.json](../../../soak.json) |
| Bảng điểm | Chromium chạy fixture thua, nhập tên hợp lệ rồi quay menu để xem điểm. CLI `--export-leaderboard` đọc được đúng mục do trình duyệt lưu trên đĩa. |
| Trợ năng | Đổi Nhảy từ Space sang J, phát hiện Q trùng, khôi phục mặc định. Chữ lớn đo được 22,5 px, giảm chuyển động và phím mới còn sau reload. Lượt mặc định quan sát cảnh báo Bóng Mực sinh và mũi tên ở mép. [Ảnh gameplay](gameplay.png) |
| Video | Bấm chơi trực tiếp, đi, nhảy, lướt, tạm dừng. Phần sau hiển thị đầu ra lệnh test, headless, benchmark và soak đã chạy. Video gắn vào Release v1.0.0. |

Máy kiểm tra chạy Linux x86_64, Intel Core i5-11300H, Intel Iris Xe với Mesa, Node v22.14.0. Benchmark dùng Chrome/Chromium với cờ bỏ giới hạn tần số, đọc framebuffer từng khung để tính dựng hình đã hoàn thành. Benchmark tắt động vật, hiệu ứng xì hơi và chi tiết lạ của nhân vật. Số đo web chỉ xác nhận trên máy này. Bộ test ẩn và máy chấm chưa được chạy.
