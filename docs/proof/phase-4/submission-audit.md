# Rà soát bài nộp Đảo Đèn Lồng

Đối chiếu bản công khai trên GitHub, từng tag, bản Release và các thay đổi đang có trong workspace. Đã đọc các tài liệu kiểm tra và nộp bài, `GUIDE.md`, `RULES.md`, `README.md`, các ticket Phase 1–4, `AGENTS.md`, skill `verify-night`, `CREDITS.md`, `CHANGELOG.md`, ghi chú, ADR, retro và các trang bằng chứng.

## Checkpoint

| Mốc | Kết quả |
|---|---|
| CP0 | Repo cá nhân public đúng tên. Môi trường cài sạch và có ghi chú chuẩn bị trong Phase 1. Chưa xác nhận thao tác đăng nhập/hỏi thử trợ giảng Claude hoặc giờ nộp Coach thông báo. |
| CP1 | Tag `phase-1` có Contract v1.0, 5/5 test và build đạt. Đây là bản dựng lại trên nhánh riêng sau khi Phase 2 đã được gắn tag, có ghi rõ trong bằng chứng của Phase 1. |
| CP2 | Tag `phase-2` có Contract v1.1, 16/16 test và build đạt. Fixture bổ sung L6 Đêm 3 vẫn tái hiện Bóng Mực còn cách đèn khoảng 5,264 m sau 30 tick, dưới yêu cầu 6 m. |
| CP3 | Tag `phase-3` có Contract v1.2, 24/24 test và build đạt. Cùng fixture L6 ra khoảng 6,000 m. ADR, changelog và lý do đổi test có trong repo. |
| CP4 | Tag `phase-4` và `v1.0.0` cùng trỏ commit `757c5c6`. Contract v1.3, 25/25 test và build đạt. Có bản web tĩnh, dữ liệu benchmark/soak, giấy phép, nguồn asset và tài liệu chạy bằng hai lệnh. |
| CP5 | Có retro, video 34,17 giây và link video đầu README. Hai asset Release tải được qua HTTP công khai, không dùng xác thực; SHA-256 khớp GitHub. Chưa xác nhận đã gửi link qua LMS. |

Clone sạch công khai không dùng credential helper, checkout lần lượt từng tag. Cả bốn build chạy thành công. Chạy lại một fixture bằng chứng ở từng tag và so JSONL với file đã lưu, đều trùng từng byte. Quét link file tương đối trong Markdown trên bốn tag và main đã push, không thấy đích file bị thiếu. Kiểm tra lịch sử các ref thấy không có file `.env` hay mẫu khóa/token phổ biến. Đây là kiểm tra theo mẫu, không phải xác nhận tuyệt đối.

## Submission và rubric

| Hạng mục | Kết luận tự rà |
|---|---|
| Repo và Release | Có đủ bốn tag, repo public đúng tên và Release public. Bằng chứng Phase 1 nằm trên tag riêng. Bản trên `main` có thêm hiệu ứng dậm móng sau release. Các thay đổi menu, vết nứt, chọn màn, va chạm, cỏ và bắt/ném thú mới đang ở local. |
| A — Test ẩn | Chưa có kết quả chấm. Tái hiện lỗi Phase 2 ở L6 như trên, đã được sửa từ Phase 3. Không dùng test cục bộ để tự quy điểm test ẩn. |
| B — Kiểm chứng | Có test một lệnh, fixture, JSONL, video và kết quả đo thật. Chưa có CI tự chạy mỗi lần push hoặc reviewer độc lập được ghi nhận. |
| C — SDLC | Có giả định, tiêu chí nghiệm thu, test đã điều chỉnh lý do, ADR, changelog, `AGENTS.md` và skill trong Git. Lịch sử triển khai tập trung vào ít commit lớn; thời điểm các tag không theo thứ tự phase vì Phase 1 dựng lại. Giờ thi theo Coach chưa được xác nhận. |
| D — Evaluation | Có retro bốn phase, ghi lỗi đã phát hiện và cách giảm token. Ước tính token hiện chỉ tổng hợp, chưa có số riêng từng phase. |
| E — Hiệu năng | Có số đo cục bộ và lệnh tái lập. Chưa chạy trên cấu hình máy chấm. |
| F — Sản phẩm | Có game chạy được, mục Sáng tạo của tôi và bằng chứng headless. Các tính năng thử nghiệm mới của bản local nằm ngoài Release đã chốt. |
| G — Video | MP4 34,17 giây, tải ẩn danh được, có chơi trực tiếp và đầu ra kiểm thử. Đoạn lướt qua harness và lịch sử Git theo gợi ý Submission chưa có trong video. |

Chưa xác nhận mốc giờ buổi lab, hạn LMS hay việc đã nộp link. Không thay đổi tag, Release hay trạng thái nộp trong lần rà này.

## Phép đo lại từ tag phase-4

Chạy lại benchmark chuẩn seed 42, 30 giây, trên clone sạch công khai. Kết quả đạt cả ba ngưỡng cục bộ: **386,93 FPS trung bình, 103,04 FPS 1% low và 715 ms tải khung đầu**.

Chạy lại soak chuẩn seed 7, 10 đêm sáu lần, mỗi lần là một tiến trình Node mới. Cả sáu chạy đủ 10 đêm và đều 0 crash, nhưng **cả sáu vượt ngưỡng tăng RSS 20%**. Các mức tăng lần lượt là **26,38%, 27,23%, 34,49%, 32,33%, 43,87%, 38,46%**. Lượt đầu tăng từ 45,35 lên 57,32 MiB. `soak.json` trên tag là lần đo trước đó với mức tăng 14,9%. Kết quả RSS trên tag vì vậy không đạt ổn định trong lần rà; dữ liệu này chưa phân biệt được tăng do khởi động/JIT, bộ cấp phát hoặc do giữ đối tượng trong game.

Bản local hiện tại build thành công và đạt 27/27 test. Hai test thêm ở local kiểm tra va chạm cây và đá; chúng không thuộc bộ 25 test tại tag phát hành.
