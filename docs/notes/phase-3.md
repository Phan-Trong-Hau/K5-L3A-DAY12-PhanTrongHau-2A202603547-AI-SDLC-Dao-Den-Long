# ADR — Nhiên liệu đèn và bình minh

Nguồn: [Ticket-03](../../Phase3.md).

## Quyết định

- Lưu dầu nguyên theo đơn vị 1/60 trong mô phỏng. Hao tự nhiên và số Bóng Mực đang hút được trừ ở đầu mỗi tick gameplay. Sau đó xử lý đèn cạn, di chuyển Mây, nhặt, nạp/châm, tỏa sáng, di chuyển và va chạm. Làm tròn dầu một chữ số ở snapshot và sự kiện. Đo mức đầy sau hao dầu của tick, vào thời điểm đổi đom đóm.
- Đèn giữ riêng tiến độ nạp, trạng thái sáng, dầu và lịch sử từng sáng. Scenario chỉ thiết lập trạng thái, không tự cộng điểm hay sức chứa. Mỗi lần hoàn tất nạp tăng sức chứa, còn châm dầu giữ nguyên. Khi thắng, lấy phần nguyên dầu thật ở tick cuối, trước khi làm tròn ở JSONL.
- Bóng Mực đang đuổi tiếp tục theo Mây. Bóng đi lang thang ưu tiên đèn yếu khi không chuyển sang đuổi. Trong trạng thái hút, thời gian báo sự kiện tính theo từng đợt hút liên tục. Nếu đèn tắt hay hồi vùng an toàn, thoát hút trước khi xét đuổi. Khi vùng an toàn chặn Bóng Mực sát bờ, chọn đường thẳng tới một điểm mép hợp lệ trên nền thay vì cố đẩy thẳng ra mép đảo.
- Tính kết thúc một lần sau mọi cập nhật. Ưu tiên hết lửa trước thế trận lúc bình minh. Tổng điểm chiến dịch vẫn chỉ cộng các đêm thắng. Pause đóng băng dầu, trạng thái hút và thời gian.
- Bảng màu dễ phân biệt là cài đặt web. Bản web và CLI dùng cùng mô phỏng cho dầu, điểm và luật thắng.

## Hồi quy và ghi chú

- Sửa test thắng ngay sau đủ năm đèn để khẳng định game tiếp tục, rồi thắng ở bình minh. Sửa test điểm tick cuối dùng điểm dầu thật, điểm nạp 5 và lý do `dawn_survived`. Giữ test bản đồ, nhảy, lướt, té hồi sinh, Gió Lạc, Bùa Gió, gió, pause, định dạng input và tính tất định.
- Thêm hồi quy ca đèn L6 Đảo Chuông ở gần bờ được ghi nhận khi rà Phase 2.
- Dùng Codex để triển khai, chạy suite và kiểm tra trình duyệt. Fixture trình duyệt ban đầu trả CSS sai khi proxy thiếu header Accept; phép đo kiểm lại với header của trình duyệt và chờ app khôi phục cài đặt sau reload. Chưa có số token hoặc chi phí được xác nhận.

[Bằng chứng Phase 3](../proof/phase-3/README.md)
