# Bằng chứng Phase 3

[Ticket-03](../../../Phase3.md) · [ADR và ghi chú hồi quy](../../notes/phase-3.md) · [Changelog](../../../CHANGELOG.md)

| Kiểm chứng | Kết quả |
|---|---|
| `npm test` | 24/24 đạt. Có nhiên liệu, châm dầu, tắt/thắp lại, sức chứa, hút cộng dồn, Tỏa Sáng ngắt hút, ba ngưỡng bình minh và ca đẩy Bóng Mực sát bờ L6. [TAP](tests.tap) |
| `npm run build` | Thành công. Vite vẫn cảnh báo gói JavaScript vượt 500 kB sau minify. |
| Headless v1.2, fixture bình minh | Dầu cạn và đèn thắp lại ở tick 1, châm dầu ở tick 3. Thắng `dawn_survived` ở tick 5 với 667 điểm. Hai lần chạy cùng seed và fixture cho JSONL giống từng byte. [Scenario](scenario-dawn.json) · [Input](inputs-dawn.json) · [JSONL](dawn.jsonl) |
| Headless v1.2, fixture hút dầu | Hai Bóng Mực cùng hút L1 từ 25 dầu. Tick 60 còn 14 dầu, tick 120 còn 3. Mỗi mốc có một sự kiện cho từng Bóng. [Scenario](scenario-drain.json) · [JSONL](drain.jsonl) |
| Toàn đêm | Ba đêm mặc định seed 7 đều cho JSONL lặp lại giống nhau. Đêm 3 mặc định hết lửa trước giờ. Fixture Đêm 3 dùng `{"player":{"invuln_ticks":18001},"wind_enabled":false}` chạy đủ 18000 tick trong 0,23–0,24 giây. |
| Chromium 1280×720 | Bản mặc định hiện túi 0/10 và ngưỡng 3 đèn. Fixture châm dầu thấy thanh dầu, viền/mắt xanh và số dầu tăng sau E, đồng thời túi đổi từ 2/14 sang 0/14. Bảng màu lưu qua reload và cảnh báo trắng có ⚠. Fixture ba đêm rút thời gian: nạp đèn đủ ngưỡng vẫn tiếp tục, bình minh mới chuyển đêm, thắng Đêm 3 hiện Bình Minh. [Ảnh fixture](fuel-accessible-chromium.png) |

Máy chạy Linux x86_64 với Intel Core i5-11300H và Node v22.14.0. Các test trình duyệt dùng GPU Intel Iris Xe. Chưa chạy test ẩn hoặc chơi tay trọn vẹn ba đêm với thời lượng mặc định.

Tái hiện fixture bình minh:

```bash
node src/headless.js --seed 17 --night 1 --ticks 7 --snapshot-every 1 --scenario docs/proof/phase-3/scenario-dawn.json --inputs docs/proof/phase-3/inputs-dawn.json --out /tmp/dao-phase3-dawn.jsonl
cmp docs/proof/phase-3/dawn.jsonl /tmp/dao-phase3-dawn.jsonl
```

## Bản xem trước sau tag phase-3

- Chromium 1280×720 trên bản Đảo Bến mặc định. Shift tạo cụm khói sau đuôi rồi tan. Bấm lần nữa trong hồi chiêu không tạo thêm khói. HUD Shift chuyển qua hồi rồi sẵn sàng. Fixture cấp 3 đom đóm xác nhận Q hiện sẵn sàng, sau khi dùng hiện hồi chiêu và thiếu 3. Đom đóm có hai cánh chuyển động và quầng sáng.
- Fixture rút thời gian trên Chromium chuyển qua ba Đêm. Cảnh có một khu suối ở Đảo Bến, hai khu ở hai bờ của Đảo Cau và một khu ở tầng thấp Đảo Chuông. Cả ba cảnh tải các nhóm chuyển động và đá.
- `npm test` đạt 24/24. Chạy lại hai fixture bình minh và hút dầu, JSONL khớp từng byte với bằng chứng tại tag `phase-3`.
- Kiểm tra HUD thanh hồi chiêu ở 1280×720. Shift làm thanh đầy dần, pause giữ nguyên tiến độ và tiếp tục thì đầy đến trạng thái sẵn sàng. Với fixture có ba đom đóm, Q chuyển từ sẵn sàng sang hồi chiêu, thanh tăng dần rồi báo thiếu đom đóm khi đã hồi xong.
- Kiểm tra lội suối ở Đảo Bến trên Chromium 1280×720. Giữ D đến giữa suối và dừng. Mây hạ dần khoảng 0,56 m ở lớp hiển thị trong khi tọa độ Y mô phỏng vẫn bằng 0. Tiếp tục đi sang bờ, Mây nổi dần lên lại. Fixture JSONL bình minh vẫn khớp từng byte với tag.
