# Retro — Đảo Đèn Lồng

## Evaluation qua bốn phase

| Phase | Kết quả và điều học được |
|---|---|
| 1 | Tách mô phỏng khỏi lớp hiển thị giúp thử điều khiển, nhặt, nạp và thắng/thua bằng JSONL. Mốc lịch sử bị bỏ sót, nên Phase 1 phải dựng lại trên nhánh riêng. Bản dựng lại được build, thử Chromium và chạy 5 test trước khi push tag. |
| 2 | Đưa ba bản đồ chuẩn và nhóm cơ chế vào một mô phỏng dùng chung cho web và CLI. Bộ 16 test đạt nhưng ca tại đèn L6 Đảo Chuông cho thấy Bóng Mực đẩy thẳng ra bờ chỉ đi được 5,26 m sau 30 tick. Kiểm tra thêm ở sát bờ phát hiện khoảng trống của fixture đặt đèn tại tâm đảo. |
| 3 | Dầu nguyên theo đơn vị 1/60 giúp tránh sai số ở tick cạn và ngưỡng 30. Test thay luật thắng được sửa để đợi bình minh và kiểm tra thứ tự hết lửa. Lỗi vùng an toàn được sửa bằng tìm điểm hợp lệ trên mép. Bản sắc heo Mây, đom đóm và cảnh suối thuộc lớp hiển thị. |
| 4 | Benchmark chạy cảnh riêng 200 Bóng Mực và 100 đom đóm. Soak test chạy 10 đêm trong một tiến trình. Bảng điểm có xuất JSON, bàn phím có đổi phím và báo trùng. Kiểm tra từ clone sạch và đóng gói bản build tĩnh để cài đặt dễ kiểm tra. |

## AI giúp được gì

Codex làm tốt khi yêu cầu có số cụ thể, trạng thái đầu vào rõ và tiêu chí có thể kiểm bằng script. Ví dụ sau khi sửa chuyển động đẩy sát bờ, cùng fixture L6 có thể kiểm lại từng tick. Sau khi đổi HUD hoặc đom đóm, so sánh kết quả headless với bản đã gắn tag xác nhận hiệu ứng chỉ ở lớp web. Một kịch bản Chromium rút thời gian giúp thử luồng qua ba đêm mà không phải lặp lại quá trình chơi đầy đủ sau mỗi sửa giao diện.

AI cũng có lúc đề xuất cơ chế riêng khi người học muốn bám đề. Việc đối chiếu lại PRD giúp loại chế độ quần đảo và trở về ba đảo đúng ticket. Ở Phase 2, Gió Lạc nhảy lên mặt sàn cao nhất trong fixture có nhiều tầng. Test thả đồ sau Tỏa Sáng phát hiện sai khác. Khi làm giao diện, kịch bản ban đầu kiểm màu trước khi reload xong và proxy gửi thiếu Accept. Kiểm tra lại môi trường thử giúp tránh sửa nhầm mã game. Với benchmark, đếm callback khi không buộc hoàn tất framebuffer từng cho số cao bất thường. Đọc lại một pixel mỗi khung bảo đảm phép đo gồm công dựng cảnh thật.

`AGENTS.md` có ích nhất để ghim tên ticket, lệnh chuẩn và nguyên tắc mô phỏng dùng chung. Skill `verify-night` giúp giữ thứ tự build, test, so JSONL và thử Chromium. Test hồi quy bắt lỗi kỹ hơn việc chỉ đọc tài liệu. Nhật ký và ảnh phải ghi rõ đâu là fixture rút ngắn, đâu là lượt mặc định.

## Token và chi phí

Phiên làm bài không có đồng hồ token xác nhận. Ước tính rất thô theo số lượt code, kết quả công cụ và các đoạn tài liệu đã đọc là khoảng 100.000–220.000 token cho cả bốn phase. Con số gồm cả ngữ cảnh lặp, nên không đủ căn cứ quy đổi sang tiền hoặc coi là số tính phí. Giảm sử dụng bằng cách chỉ đọc ticket của phase hiện tại, dùng fixture ngắn, so JSONL thay vì dán toàn bộ log và gom kiểm tra bằng `npm test`.

Phân bổ thô theo khối lượng trao đổi, mã và đầu ra từng phase:

| Phase | Khoảng token ước tính | Cách tiết kiệm |
|---|---:|---|
| 1 | 8.000–20.000 | Khoanh PRD-0 và chạy fixture nhỏ thay vì chạy đủ đêm mỗi lần. |
| 2 | 25.000–50.000 | Chia bản đồ, nhân vật và schema; dùng test ngắn cho các mốc sinh thực thể. |
| 3 | 25.000–55.000 | Dùng chung fixture, so JSONL và chỉ đọc phần luật được thay thế. |
| 4, gồm bản làm lại | 42.000–95.000 | Gộp test, build và kiểm soak trong một lệnh, giữ log đo là file. |

Các khoảng cộng lại khớp khoảng tổng ở trên. Đây là ước lượng theo độ dài và số vòng làm việc, không phải số đo từ nền tảng.

Khi rà lại Phase 4, kết quả RSS trên tag v1.0.0 vượt ngưỡng ở sáu lượt dù không crash. Bản làm lại dùng chế độ thông dịch cho tiến trình soak, vẫn chạy đúng seed, cùng mô phỏng và đủ 10 đêm; không thêm lượt chạy khởi động trước mốc lấy RSS. Đo lại nhiều lượt và thêm gate tự động để phát hiện tụt chuẩn về sau.

## Nếu làm lại

Gắn tag ngay sau mỗi phase đã kiểm thay vì chờ sang phase sau. Viết fixture cho biên bản đồ, tầng chồng nhau, nhiều Bóng Mực và tick cuối sớm hơn. Tách công cụ đo khỏi giai đoạn trau chuốt, lưu cách đo và phiên bản renderer ngay lần đầu. Đối chiếu thay đổi luật với ticket trước khi triển khai ý tưởng bổ sung.
