# Phase 2 — Ba hòn đảo

Nguồn yêu cầu: [Ticket-02](../../Phase2.md). Bản khai báo: [Test Contract v1.1](../../game.contract.json).

## Tiêu chí nghiệm thu

| Yêu cầu | Dấu hiệu đạt và cách kiểm tra |
|---|---|
| Gió Lạc | Ở Đêm 2 và 3, tối đa hai con xuất hiện theo lịch 1200 tick. Khi Mây mang ít nhất năm đom đóm và trong tầm, Gió Lạc đuổi. Khi chạm, nó cướp tối đa ba trước Bóng Mực và không trừ lửa. Xung làm con đang đuổi chạy đi. Con đang chạy và có đồ phát sự kiện thả đồ khi trúng xung. Đối chiếu bằng fixture CLI Đêm 3. |
| Bùa Gió | Mây nhặt được khi tới đúng tầm. Trong 600 tick, tốc độ đạt 7,2 m/s và lướt tiếp được ngay khi lần cũ đã hết. Sau 2700 tick, bùa có thể nhặt lại. Kiểm tra qua fixture CLI Đêm 2 và vòng đời bùa. |
| Chuỗi ba đêm | Ba màn giới thiệu có tên đảo và lời Ông Đăng. Thắng mở đêm kế tiếp. Thua cho chơi lại đêm đó. Thắng Đêm 3 hiện Bình Minh với tổng điểm ba đêm. Kiểm tra bằng fixture đặt đèn cuối ở gần điểm xuất phát. |
| Tạm dừng | Esc/P mở menu có Tiếp tục, Chơi lại Đêm, Cài đặt, Về menu. Đồng hồ và bộ đếm giữ nguyên. CLI vẫn tăng tick, giữ sim_tick. Kiểm tra Chromium và fixture JSON. |
| Cài đặt | Chỉnh được âm lượng và độ nhạy chuột ở menu và khi pause. Giá trị lưu trong localStorage và đọc lại khi mở game. |
| Âm thanh | Có nhạc nền. Các tín hiệu nhặt, thắp, tỏa sáng, hit, nhảy, lướt, thắng/thua, Bóng Mực xuất hiện, từng giây trong 10 giây cuối và báo gió được tạo bằng Web Audio sau tương tác đầu tiên. |
| HUD | Hiện ba lửa, đồng hồ mm:ss, đèn, điểm, túi 10 ô và hồi chiêu. Đồng hồ đỏ và nhấp nháy ở 30 giây cuối. Đứng gần đèn thấy tiến độ nạp. Đèn chưa sáng gần nhất ngoài khung có mũi tên. |
| Màu và môi trường | Màu chuẩn khai báo ở lớp hiển thị. Ánh sáng môi trường đạt 0,15 khi chưa thắp đèn và 0,7 khi thắp đủ. |
| Bản đồ và gió | Đêm 1 có đảo bán kính 40 m. Cầu tre và bục dẫn qua hai đảo Đêm 2. Đêm 3 có hai dốc, ba tầng và bục. Gió báo trước 120 tick và thổi 300 tick mỗi chu kỳ 1800 tick. |
| Hiệu năng | CLI hoàn tất 21600 tick dưới 30 giây. Bản web đạt trung bình từ 30 FPS ở 1280×720. Ghi kết quả cùng cấu hình đo. |

## Quyết định và hồi quy

- Giữ heo đen hồng, dấu chân, rừng, suối và động vật cảnh quan ở Đảo Bến. Bản web và headless dùng cùng bản đồ và logic chuẩn.
- Dùng tọa độ mặc định (0, 0, 0) ở các đêm. Đêm 3 bắt đầu ở tầng nền. Góc XZ tăng về phía +Z để điểm tầng giữa nằm ở nửa z dương.
- Phát `night_start` tại tick 0 sau snapshot đầu. Tick resume tiếp tục gameplay. Đom đóm ngẫu nhiên có `ttl_s: null`. Hồi chiêu xuất bằng giây và bộ đếm nội bộ dùng tick.
- Tính 0 điểm khi nhặt, thêm `score.per_deposit: 10` cho mỗi đom đóm nạp. Test cũ về 30 đom đóm ban đầu, Bóng Mực ngay tick 0, chi phí pulse 2 và đẩy ngay đã được sửa theo luật mới.
- Tách bản đồ, chuyển động và tác nhân khỏi bộ điều phối tick. Mô phỏng dùng chung, còn màu, âm thanh, hiệu ứng và chuỗi màn hình thuộc bản web.

## Nhật ký và retro

Codex đọc ticket, triển khai và kiểm chứng. Một fixture làm lộ việc Gió Lạc nhảy lên tầng cao nhất khi đi qua tọa độ chồng tầng. Sửa bằng giữ cao độ tác nhân và khóa hồi quy bằng fixture CLI. Phiên chưa có số liệu token hay chi phí xác nhận. Giảm ngữ cảnh bằng cách kiểm tra từng nhóm hành vi với fixture ngắn. [AGENTS.md](../../AGENTS.md) và skill `verify-night` ghi lệnh và quy trình kiểm tra.

[Bằng chứng Phase 2](../proof/phase-2/README.md)
