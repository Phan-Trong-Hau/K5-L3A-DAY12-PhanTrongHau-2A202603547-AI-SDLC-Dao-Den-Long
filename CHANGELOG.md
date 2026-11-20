# Changelog

## Phase 4 — Phát hành v1.0.0

- Contract v1.3 thêm lệnh benchmark và soak. Vòng chơi, bản đồ và snapshot giữ tương thích với v1.2.
- Bảng xếp hạng cục bộ có top 10, màn hình xem điểm và xuất JSON. Thêm cấu hình phím, cảnh báo trực quan, giảm chuyển động và chữ lớn.
- Thêm bản web tĩnh, video demo và kết quả đo.

## Phase 3 — Test Contract v1.2

### Thay đổi phá vỡ tương thích

- Đêm 1–3 kéo dài 240, 270 và 300 giây. Thắng khi tới bình minh với ít nhất 60% đèn sáng và còn Ngọn Lửa. `dawn_survived` thay `all_lit`; thắp đủ đèn vẫn tiếp tục chơi.
- Đèn sáng hao dầu và nhận thêm đom đóm. Đèn cạn tắt, xoá tiến độ nạp và có thể thắp lại bằng 5 đom đóm. Vùng an toàn mất khi dầu dưới 30. Bóng Mực chuyển sang `drain` khi tiếp cận đèn yếu.
- Công thức điểm thay đổi theo số đom đóm nạp, lần thắp đầu/thắp lại, Tỏa Sáng và số đèn, dầu, lửa còn lại ở bình minh. Thưởng thời gian được bỏ. Sức chứa tăng theo số lần thắp.
- Snapshot thêm `player.capacity`, `fuel`, `ever_lit` và `relit_count`. Sự kiện `lantern_lit` thêm `relight`. Thêm `refuel`, `lantern_out` và `fuel_drain`. Scenario nhận thêm trạng thái dầu, số lần thắp và đèn mục tiêu của Bóng Mực.

Bản web có thanh dầu, hình dáng riêng cho đèn tắt và cài đặt Bảng màu dễ phân biệt. Xem [ADR Phase 3](docs/notes/phase-3.md).

## Phase 2 — Ba hòn đảo

- Contract v1.1 chuẩn hóa ba bản đồ, luật di chuyển, Bóng Mực, lướt, Bùa Gió và Gió Lạc.
- Thêm chuỗi ba đêm, âm thanh, pause và cài đặt.

## Phase 1 — Đảo Bến

- Một đêm với năm đèn, đom đóm và Bóng Mực. Thắng khi thắp hết đèn. Contract v1.0 có CLI headless.
