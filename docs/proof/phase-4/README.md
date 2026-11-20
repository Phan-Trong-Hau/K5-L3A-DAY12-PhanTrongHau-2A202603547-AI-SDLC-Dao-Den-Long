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

## Hiệu ứng Tỏa Sáng sau bản phát hành

Chromium 1280×720, fixture cấp 3 đom đóm và đặt một Bóng Mực trong tầm. Bấm Q, hai chân trước nhấc lên rồi xuất hiện dấu móng và vòng sáng lan ra. Từ khung đầu của động tác, túi đã trừ 3 và Bóng Mực đã choáng. `npm test` đạt 25/25. JSONL fixture bình minh khớp dữ liệu Phase 3.

## Vết lún khi dậm móng

Chromium 1280×720, fixture cấp đủ đom đóm. Bấm Q trên nền phẳng Đảo Bến, vết lún đạt hơn 0,20 m rồi nông dần và biến mất sau khoảng 1,75 s. Tọa độ Y của Mây trong mô phỏng vẫn bằng 0. `npm test` đạt 25/25 và JSONL fixture bình minh khớp từng byte.

## Vết nứt thay vòng sáng

Chromium 1280×720, fixture cấp đủ đom đóm. Bấm Q trên Đảo Bến và quan sát nền tách thành các nhánh nứt, vết lún bán kính 3,3 m trên mặt bằng rộng. Các nhánh mờ dần khi nền hồi lại sau khoảng 2,4 giây. Vòng tròn vàng đã được bỏ khỏi lớp hiển thị. Tọa độ Y trong mô phỏng không đổi và fixture bình minh vẫn cho JSONL khớp từng byte.

## Menu và màn giới thiệu mới

Chromium 1280×720 và 390×844. Menu có phối cảnh Mây và Đảo Bến, phím gợi ý theo cấu hình hiện tại và ba lối vào. Đã mở Cài đặt và Bảng xếp hạng, quay menu, bấm Bắt đầu, xác nhận giới thiệu Đêm 1 hiện 3/5 đèn và 4:00, rồi bấm Vào đảo và thấy HUD gameplay. Luồng bắt đầu cũng hoạt động ở 390×844.

## Va chạm cây và đá trên bản web

Chromium 1280×720, dùng fixture đặt Mây trước vật cản có sẵn trong cảnh Đảo Bến. Giữ D kết hợp Shift ở cây, rồi giữ D ở đá. Cả hai lần dừng bên ngoài vật cản. Test hồi quy kiểm tra thêm trượt dọc thân cây và đáp lên đá. Fixture headless bình minh vẫn khớp từng byte, vì chỉ bản web truyền va chạm vật trang trí vào mô phỏng.

## Chọn đảo luyện tập

Chromium 1280×720 mở được cả ba màn từ danh sách, thời gian lần lượt 4:00, 4:30, 5:00. Vào Đảo Chuông trực tiếp thấy HUD 0/7. Fixture rút thời gian xác nhận thua ở chế độ luyện tập cho chọn lại đảo và không hiện form lưu điểm. Quay về menu rồi dùng Bắt đầu sẽ trở về chiến dịch từ Đêm 1 và vẫn được lưu điểm khi thua.

## Sân cỏ trên ba đảo

Chromium 1280×720 mở từng màn và vào Đảo Chuông. Các cụm cỏ được dựng trên Đảo Bến, cả hai bờ Đảo Cau và các tầng Đảo Chuông, chừa khoảng quanh suối, cầu, đèn và bục nhảy. Cỏ và nền sân cỏ chỉ có trên bản chơi web, cảnh benchmark giữ nền đã công bố.

## Bắt và ném thú trong Chọn màn

Chromium 1280×720, fixture đặt Mây cạnh ếch rồi rắn có sẵn ở Đảo Bến, với Bóng Mực phía trước. Bấm F để bắt, bấm lần nữa để ném. Cả hai lần Bóng Mực choáng, điểm giữ nguyên, con vật đáp xuống rồi chạy đi. Quay về chiến dịch qua Bắt đầu và thử F cạnh ếch không kích hoạt hành động. So JSONL Tỏa Sáng từ nguồn đang phát triển với commit trên main đã push cho kết quả trùng từng byte.
