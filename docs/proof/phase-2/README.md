# Bằng chứng Phase 2

[Tiêu chí nghiệm thu và giả định](../../notes/phase-2.md)

| Kiểm chứng | Kết quả cục bộ |
|---|---|
| `npm test` | 16/16 đạt. Bao gồm hồi quy Đêm 1 theo số mới, fixture JSON cho lướt, pause, Bùa Gió và Gió Lạc, cùng các kiểm tra bản đồ, độ cao, gió, hồi sinh, thứ tự hit và điểm. [TAP](tests.tap) |
| `npm run build` | Thành công. Vite cảnh báo một gói JavaScript vượt 500 kB sau minify. |
| Ba đêm headless với seed 7 | Đêm 1 chạy 18000 tick trong 0,19 s, Đêm 2 chạy 19800 tick trong 0,26 s, Đêm 3 chạy 21600 tick trong 0,30 s. Ba lượt đứng yên để chạy đến sáng. Hai lần Đêm 3 cho JSONL trùng từng byte. [JSONL nguyên bản Đêm 3](night-3-seed-7.jsonl) |
| Chromium, bản chơi mặc định | Mở menu, vào Đảo Bến, dừng bằng Esc và kiểm tra đồng hồ giữ nguyên. Chỉnh âm lượng và đọc lại từ localStorage, rồi tiếp tục. Khi giữ W ở Đêm 1, đo trung bình 60 FPS trong khoảng 3,5 s ở canvas 1280×720 với GPU Intel. [Ảnh thật khi chạy](night1-chromium.png) |
| Chromium, fixture thắng/thua | Fixture chỉ thay trạng thái đầu vào để mỗi đêm còn một lần nạp, xác nhận chuyển đêm và màn Bình Minh hiện tổng 2754. Fixture hết giờ xác nhận nút Chơi lại Đêm dẫn về giới thiệu đúng đêm. Không có lỗi JavaScript trong hai lượt. |

Máy kiểm tra chạy Linux x86_64, Intel Core i5-11300H, Node v22.14.0. Đo web dùng Chromium Headless và ANGLE OpenGL trên Mesa Intel Iris Xe. Kết quả thấp hơn trên SwiftShader dựng phần mềm, 17,7 FPS sau tối ưu. Mẫu GPU chỉ đo Đêm 1. Game chưa được chạy trên máy chấm. Chưa xác nhận toàn bộ âm thanh bằng tai, đối chiếu màu bằng đo mẫu hoặc chạy bộ test ẩn.

Để tái lập file JSONL:

```bash
node src/headless.js --seed 7 --night 3 --ticks 21600 --snapshot-every 21600 --out /tmp/dao-night3.jsonl
cmp docs/proof/phase-2/night-3-seed-7.jsonl /tmp/dao-night3.jsonl
```
