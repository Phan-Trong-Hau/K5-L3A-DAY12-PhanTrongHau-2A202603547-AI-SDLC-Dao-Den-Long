# Phase 0 — Chuẩn bị lab Đảo Đèn Lồng

**Phan Trọng Hậu · 2A202603547 · L3A**

CP0 nằm trong 10 phút đầu của Phase 1. Tài liệu này chốt hướng triển khai và cách kiểm chứng cho Đêm 1. Kết quả chạy thực tế sẽ được ghi theo từng tag. PRD-0 và Test Contract v1.0 được giữ ở cuối tài liệu.

## 1. Trạng thái chuẩn bị

| Việc CP0 | Trạng thái |
|---|---|
| Repo cá nhân đúng tên | Thư mục và remote `origin` cùng tên `K5-L3A-DAY12-PhanTrongHau-2A202603547-AI-SDLC-Dao-Den-Long`. Còn kiểm tra quyền xem công khai và clone sạch. |
| Chọn AI, engine và ngôn ngữ | Codex, JavaScript ES modules, Three.js và Vite cho bản web, Node.js cho CLI headless. Máy hiện tại có Node v22.14.0 và npm 10.9.2. |
| Chạy chương trình thử | Đã chạy demo 3D trong Chromium và chạy CLI Node dùng chung mô phỏng. Kết quả và lệnh tái lập ở dưới. Còn kiểm tra clone sạch từ GitHub. |
| Lab board và trợ giảng | Có bản PRD-0 trong file này. Còn đăng nhập Claude, mở tab Phase 1 và hỏi thử “Đèn đã sáng có nhận thêm ánh sáng không?”. Nếu tài liệu chưa quy định, áp dụng giả định ở mục 3. |
| Chuẩn bị ghi chép | Mục 5 có mẫu dùng khi bắt đầu Phase 1. Dự kiến lưu ghi chép tại `docs/notes/` và bằng chứng tại `docs/proof/phase-N/`. |
| Hạn nộp | Đã ghi các mốc tương đối ở mục 6. Giờ bắt đầu thực tế và hạn LMS cần đối chiếu thông báo Coach. |

### Demo CP0 và kết quả chạy

- Chạy `npm ci` rồi `npm run dev` và mở địa chỉ Vite in ra. Bản web dùng WASD để đi, Space để nhảy, E để nạp đèn và Q để tỏa sáng. Mã hiển thị ở [main.js](demo/phase0/main.js), logic Đêm 1 ở [game.js](src/game.js).
- `npm run demo:headless` kiểm tra 60 bước ở tốc độ 6 m/s và in `{"ticks":60,"pos":[0,0,6]}`.
- `npm run build` dựng thành công. Vite cảnh báo một gói JavaScript vượt 500 kB sau khi minify.
- Phạm vi gameplay hiện tại theo PRD-0 Đêm 1. Mây có tạo hình heo đen hồng, đội nón lá và mang đèn lồng nhỏ.


## 2. Brainstorm và quyết định

| Phương án | Cân nhắc |
|---|---|
| Three.js + Node.js | Bản web mở trên macOS/Linux, dùng chung mô phỏng JavaScript với CLI không cần cửa sổ hoặc GPU. Cần tự xử lý địa hình, nhảy và camera ở mức đơn giản. |
| Godot | Editor và công cụ dựng cảnh thuận tiện. Cần thêm thời gian quen quy trình dự án và xác nhận luồng headless trên môi trường chấm. |
| WebGL thuần | Ít phụ thuộc, nhưng phải tự dựng camera, ánh sáng và hình học trong khung thời gian Phase 1. |

Chọn **Three.js + Node.js**. Mô phỏng chạy bước cố định 1/60 giây và nhận trạng thái input chuẩn hóa. CLI đọc scenario và ghi JSONL từ mô phỏng. Bản web chuyển phím và camera thành input rồi vẽ trạng thái đầu ra. Cấu hình game và tuning công bố trong `game.contract.json` dùng cùng nguồn hoặc có test đối chiếu. Dùng bộ sinh số giả ngẫu nhiên có seed và ID theo thứ tự tạo để tái lập kết quả. Giữ dữ liệu màn chơi tách khỏi luật chơi để có thể sửa theo ticket sau.

**Ý tưởng sáng tạo được chọn: hoa đèn.** Khi một Đèn Lồng Lớn vừa sáng, những cánh hoa giấy vàng cam bung lên quanh đèn rồi tan. Tạo bằng hình học đơn giản, chỉ chạy ở lớp hiển thị khi nhận sự kiện `lantern_lit`. Ý này được ưu tiên hơn thêm NPC hoặc loại đom đóm vì không cần luật chơi mới. Chỉ làm sau khi lõi qua kiểm chứng. Nếu thực hiện, ghi ở mục “Sáng tạo của tôi” trong README, kèm clip ngắn và kết quả chạy lại headless với fixture cũ.

## 3. Đêm 1 — Giả định và tuning ban đầu

**Phạm vi bắt buộc.** Mây đội nón lá có đèn treo, di chuyển và nhảy với camera góc nhìn thứ ba trên đảo tròn có năm đèn L1–L5. Mây nhặt đom đóm, nạp đèn, dùng xung sáng xua Bóng Mực và mất lửa khi bị chạm. HUD hiển thị lửa, ánh sáng đang mang, số đèn, thời gian và điểm. Người chơi có thể chơi lại sau thắng hoặc thua. Dùng vàng cam cho vùng sáng và tím đen cho nguy hiểm, không có hình ảnh máu me.

| Chỗ PRD để mở | Quyết định đề xuất |
|---|---|
| Bố trí và tài nguyên | Đảo bán kính 30 m, Mây ở tâm, năm đèn chia quanh đảo. Bố trí mặc định 30 đom đóm và 3 Bóng Mực, với vùng trống quanh điểm xuất phát. Cần 20 đom đóm để thắp đủ đèn. |
| Di chuyển và mép đảo | WASD theo hướng camera, chuột xoay camera, Space nhảy, E nạp, Q tỏa sáng. Giới hạn di chuyển ngang ở mép đảo trong màn mặc định, `fall_enabled = false`. Chân Mây có độ cao khi nhảy, khoảng cách tương tác vẫn tính theo XZ. |
| Nhặt và nạp | Tự nhặt trong bán kính nếu túi còn chỗ. Mỗi lần bấm E, chọn đèn chưa sáng gần nhất trong tầm, hòa thì theo ID. Nạp tối đa phần còn thiếu, giữ lại ánh sáng dư. Đèn sáng tăng ánh sáng cảnh và tạo vùng an toàn. |
| Bóng Mực | Tiến về Mây và tránh vùng an toàn của đèn đã thắp. Chạm trong tầm gây mất một lửa và bật miễn nhiễm tạm thời. Xung hợp lệ trừ ánh sáng ngay cả khi trượt. Bóng trong tầm bị đẩy và choáng. |
| Kết thúc | Thắp đủ đèn thì thắng. Hết lửa hoặc hết giờ thì thua. Nếu nhiều điều kiện xảy ra cùng bước, ưu tiên hết lửa, đủ đèn, rồi hết giờ. Khi thắng cộng điểm theo số giây nguyên còn lại và số lửa còn lại. Nút chơi lại dựng lại trạng thái ban đầu. |

| Tuning dự kiến | Giá trị |
|---|---|
| `player_speed`, `carry_capacity`, `lantern_cost`, `lantern_count_night1` | 6 m/s, 6, 4, 5 |
| `pickup_radius`, `interact_radius` | 1 m, 2 m |
| `pulse_cost`, `pulse_radius`, `pulse_stun_s`, `pulse_push_m`, `pulse_cooldown_s` | 2, 4 m, 1,5 s, 2 m, 1 s |
| `night1_duration_s`, `flames`, `invuln_s`, `hit_drop_ratio` | 180 s, 3, 1 s, 0 |
| `safe_radius`, `shade_speed`, `shade_hit_radius`, `fall_enabled` | 3 m, 2,5 m/s, 0,8 m, false |
| `score.per_mote`, `per_lantern`, `per_stun`, `per_second_left`, `per_flame_left` | 10, 100, 20, 1, 25 |

Điều chỉnh các số sau khi chơi thử nếu cần. Cập nhật tuning công bố, fixture và README cùng thay đổi luật thực tế.

## 4. Nghiệm thu Phase 1

Các hàng dưới đây là kế hoạch ban đầu. Manifest đã có ở [game.contract.json](game.contract.json). Xem [README](README.md) để chạy bản web và CLI, cùng kết quả kiểm tra nhanh đã thực hiện.

| Yêu cầu | Kiểm chứng và kết quả mong đợi |
|---|---|
| CLI theo contract | Chạy trực tiếp lệnh trong `game.contract.json` với `--seed`, `--night 1`, `--ticks`, `--out` và các cờ tùy chọn. Kiểm tra snapshot tick 0, khoảng snapshot mặc định 10 hoặc theo cờ, schema từng dòng, tọa độ làm tròn, `sim_tick = tick` và đúng một dòng `end` cuối. Input/scenario sai định dạng trả mã 2 và ghi stderr. |
| Tick, input và chuyển động | Scenario trống, giữ move tiến 60 bước thì đi 6 m theo +Z và đồng hồ giảm 1 s. Quay camera 90° thì tiến theo +X. Kiểm tra move chéo được chuẩn hóa, frame thiếu trường giữ giá trị trước, giữ nút chỉ kích hoạt một lần và jump thay đổi Y. |
| Nhặt, nạp và thắng | Đặt đom đóm ở đúng biên bán kính để kiểm tra `≤`, thêm ca ngay ngoài biên và ca túi đầy. Dựng bốn đèn sáng và L5 còn thiếu một đơn vị. Bấm E cạnh L5, kiểm tra lượng nạp, phần dư, điểm và chuỗi `deposit`, `lantern_lit`, `game_over/all_lit`. Snapshot 0 có điểm 0 dù bốn đèn đã sáng. |
| Bóng Mực, tỏa sáng và thua | Đặt Bóng trong và ngoài tầm xung. Kiểm tra ánh sáng đã trừ, ID choáng, độ đẩy, cooldown và trường hợp thiếu ánh sáng. Kiểm tra Bóng đuổi, tránh vùng đèn sáng và không trừ lửa lần nữa trong lúc miễn nhiễm. Dựng riêng ca mất lửa cuối và ca hết giờ, đối chiếu `no_flames` và `dawn`. |
| Scenario và tính tất định | Kiểm tra cờ tắt sinh ngẫu nhiên, mảng rỗng, đèn ghi đè theo ID và trường bỏ trống giữ mặc định. Chạy hai lần cùng seed, scenario, inputs, rồi so JSONL bằng `cmp`, gồm cả ID sinh tự động. Kiểm tra sự kiện do input tick k được ghi ở k+1 và CLI dừng sớm khi kết thúc. |
| Bản chơi được | Clone sạch, chạy theo README trong tối đa ba lệnh. Chơi một lượt thắng và một lượt thua, kiểm tra chơi lại, camera, HUD, cảm giác nhảy, ánh sáng tăng theo số đèn. Lưu ảnh hoặc clip ngắn. |

Dự kiến `npm test` chạy test đơn vị và scenario CLI bằng một lệnh. Lưu fixture, lệnh chạy, output nguyên bản và kết quả đối chiếu. Kiểm tra lại bằng checkout tag tương ứng. Khi ticket mới thay luật, ghi rõ tiêu chí, giả định và test bị ảnh hưởng, sửa hoặc bỏ test có lý do rồi chạy lại các test còn hiệu lực.

Kết quả kiểm tra cục bộ:

- `npm test` chạy 5 bài kiểm tra và đều đạt. Phạm vi gồm bố trí mặc định, nhảy, nhặt và nạp, xung sáng, vùng an toàn, thắng/thua, hợp đồng JSONL và input sai định dạng.
- Trong mô phỏng mặc định, thử điều khiển bằng kịch bản đi tới đom đóm và đèn với seed 1, 7, 42. Cả ba lượt thắp đủ năm đèn, kết thúc ở tick 1466, 1390 và 1217.
- Trên Chromium, bấm Space và HUD ghi Y = 1,1 m. Để Bóng Mực đuổi đến khi thua, rồi bấm Chơi lại. HUD trở về 3 lửa, 0/5 đèn và 180 giây.

## 5. Harness, nhật ký và đánh giá

- Thêm `AGENTS.md` ngắn khi bắt đầu triển khai, ghi lệnh build/test, nguồn yêu cầu, quy ước tick và cách tạo bằng chứng. Giao Codex từng việc nhỏ kèm tiêu chí nghiệm thu, đọc diff rồi chạy kiểm chứng.
- Dùng CI chạy `npm test` khi push và gửi kết quả vào lịch sử kiểm chứng. Dùng kết quả suite làm điều kiện kết luận đạt. Nếu tới hạn khi còn lỗi, ghi mục chưa đạt và vẫn tag theo lịch. Người nộp trực tiếp đối chiếu output và chơi thử để có đánh giá riêng với agent viết mã.
- Mẫu ghi mỗi phase gồm **yêu cầu → cách kiểm chứng → đường dẫn bằng chứng → đạt/chưa đạt và lý do**, cùng commit/tag cần đối chiếu. Ghi ngắn lỗi AI thực sự gặp, cách phát hiện, chỉnh harness và hồi quy.
- Nhật ký CP0 ghi nhận Codex hỗ trợ đọc tài liệu, brainstorm, soạn kế hoạch và chạy đoạn Node thử. Phiên này chưa có số liệu token hoặc chi phí đã xác nhận. Với mỗi phase, ghi số liệu từ công cụ nếu có, hoặc ghi ước tính kèm căn cứ. Tiết kiệm bằng cách chỉ đưa phần ticket và fixture liên quan vào prompt, giữ harness ngắn và chạy test sớm.
- Dùng hình học tự tạo trước. Ghi nguồn và giấy phép asset, âm thanh, công cụ AI tạo nội dung trong `CREDITS.md`, kèm `LICENSE`. Đưa `.env` vào ignore trước khi dùng, rà khóa và token trước khi công khai. Giữ các file harness đã dùng trong lịch sử, không force push làm mất commit đã tag.

## 6. Lịch và bàn giao

| Mốc | Việc phải hoàn thành |
|---|---|
| 0h đến 1h | 00–10 chuẩn bị, 10–20 chốt giả định và fixture, 20–43 làm mô phỏng/CLI và giao diện, 43–55 chạy kiểm chứng, 55–60 ghi trạng thái và tag/push `phase-1` trước mốc 1h. |
| 1h đến 2h | Đọc Ticket-02, triển khai theo tiêu chí mới, chạy hồi quy, tag/push `phase-2` trước mốc 2h. |
| 2h đến 2h30 | Đọc Ticket-03, xử lý luật và test bị thay thế, lưu lý do, tag/push `phase-3` trước mốc 2h30. |
| 2h30 đến 4h | Đọc Ticket-04, đo theo lệnh và ngưỡng của ticket, lưu cấu hình máy và kết quả thật. Dành 15 phút cuối cho video và rà bàn giao. Tag/push `phase-4`, tạo Release `v1.0.0` kèm bản chạy và đăng video trước mốc 4h. |

README sản phẩm cần link video ở đầu, mô tả game, cách cài/chạy trong tối đa ba lệnh, điều khiển, cách tính điểm, lệnh test và headless. Video MP4 dưới 5 phút gồm chơi thử, chạy kiểm chứng, đo nếu ticket yêu cầu và lướt qua harness/lịch sử git. Đính kèm Release hoặc đặt ở `docs/demo/demo.mp4` nếu dưới 100 MB. Rà repo public, bốn tag, Release và video mở được khi chưa đăng nhập, cùng ghi chép và retro tổng hợp. Sau giờ lab chỉ nộp link theo Coach. Hạn LMS mặc định là 23h59 cùng ngày cho ca sáng hoặc 11h59 hôm sau cho ca chiều, giờ ICT.

Tài liệu đối chiếu: [README](README.md) · [Checkpoint](CHECKPOINTS.md) · [Guide](GUIDE.md) · [Rubric](RUBRIC.md) · [Rules](RULES.md) · [Submission](SUBMISSION.md)

---

## Phụ lục — PRD-0 và Test Contract v1.0

Day 12 · AI SDLC Lab · Phase 1
PRD-0 · Đảo Đèn Lồng
Bản mô tả đầu tiên từ khách hàng. Phần yêu cầu cố ý ở mức tổng quát. Phần Test Contract v1.0 ở cuối là bắt buộc và chính xác, vì bài của các bạn sẽ được chạy và chấm tự động.

Tag nộp: phase-1
Contract v1.0
Khoảng 60 phút
Đúng yêu cầu > phức tạp
1Chúng tôi muốn gì
Chúng tôi muốn một game 3D tên là Đảo Đèn Lồng.

Người chơi điều khiển Mây, người giữ đèn nhỏ tuổi của một hòn đảo giữa biển mây. Đêm nay sương đen đã nuốt hết ánh sáng của đảo. Mây phải chạy khắp đảo thu thập những đốm sáng (đom đóm) rồi mang về thắp lại các Đèn Lồng Lớn.

Trong bóng tối có Bóng Mực, những sinh vật bằng mực đen sống trong sương. Chúng đuổi theo Mây; bị chúng chạm vào thì mất máu. Mây có thể tỏa sáng để xua chúng đi, nhưng việc đó tốn ánh sáng. Bóng Mực sợ những chiếc đèn.

Thắp hết đèn thì thắng. Mất hết máu thì thua. Có điểm số.

2Phạm vi Phase 1
Một màn chơi: Đêm 1 – Đảo Bến, một hòn đảo tròn có 5 Đèn Lồng Lớn.
Nhân vật đi lại, nhảy, camera 3D.
Đom đóm xuất hiện rải rác trên đảo, nhặt được.
Nạp ánh sáng vào đèn để thắp đèn.
Bóng Mực xuất hiện và đuổi người chơi.
Tỏa sáng để xua Bóng Mực.
Thắng, thua, điểm số, giao diện hiển thị thông tin cần thiết (HUD).
Có thể chơi lại sau khi thắng hoặc thua.
3Cảm giác & phong cách
Không khí đêm, ấm áp, cổ tích
Đảo sáng dần lên khi thắp đèn
Ánh sáng vàng cam ấm là thứ tốt
Màu tím đen là nguy hiểm
Phong cách đồ họa đơn giản nhưng đẹp. Không cần đồ họa chân thực.
Mây đội nón lá có treo một chiếc đèn lồng nhỏ.
Không bạo lực, không máu me.
Tự do sáng tạo (khuyến khích)
PRD-0 chỉ là khung. Ngoài những gì đã nêu, bạn được tự do sáng tạo thêm: nhân vật phụ, loại Bóng Mực hay đom đóm khác nhau, cơ chế nhỏ, sự kiện bất ngờ, câu chuyện, hiệu ứng, âm thanh, cách thể hiện ánh sáng, chi tiết trên đảo. Hãy làm cho game mang dấu ấn của bạn.

Không phá những gì PRD-0 và Test Contract đã yêu cầu. Phần thêm không được làm đổi đầu ra headless theo contract (ví dụ thực thể thêm nên tắt khi chạy headless).
Nói rõ trong README (một mục ngắn "Sáng tạo của tôi") bạn đã thêm gì, và có bằng chứng ngắn rằng phần cũ vẫn đúng.
Làm lõi đúng trước, sáng tạo sau, và cân nhắc token: một ý sáng tạo nhỏ, gọn, chạy đúng hơn nhiều ý dở dang.
4Không bắt buộc công nghệ
Bạn được tự chọn engine, ngôn ngữ và framework. Game phải chạy được trên laptop (macOS hoặc Linux; nếu bạn dùng Windows thì phải có cách chạy trên macOS/Linux cho giảng viên, ví dụ Docker hoặc bản web).

5Bàn giao Phase 1
Nộp bằng tag git phase-1 trên repo public.

Game chơi được Đêm 1 từ đầu tới thắng/thua.
README.md: cách cài đặt và chạy (tối đa 3 lệnh), điều khiển, cách tính điểm của bạn.
game.contract.json và chế độ headless theo Test Contract v1.0 dưới đây.
Bằng chứng game chạy đúng yêu cầu, cùng ghi chép ngắn (giả định, nhật ký dùng AI). Định dạng tự chọn.
Harness AI bạn đã dùng (AGENTS.md hoặc tương đương, skills, hooks…).
6Lưu ý
Game tốt là game đúng yêu cầu của khách hàng, không phải game phức tạp hay đẹp nhất.
Cân nhắc kỹ quota token. Đốt nhiều token không làm bài tốt hơn.
Không có bằng chứng thì chưa xong. "Agent bảo chạy rồi" không phải bằng chứng.
Chỗ PRD-0 còn mơ hồ: tự giả định hợp lý và ghi lại.
Sáng tạo thêm được khuyến khích, nhưng không được làm hỏng phần lõi và Test Contract.
Bắt buộc
Test Contract v1.0
Mọi bài nộp phải có một chế độ chạy không giao diện (headless) để giảng viên chạy kiểm thử tự động, bất kể công nghệ.

A. File game.contract.json ở gốc repo
{
  "contract_version": "1.0",
  "team": "mssv-ho-ten",
  "build_cmd": "lệnh cài đặt/biên dịch",
  "run_cmd": "lệnh mở game có giao diện",
  "headless_cmd": "lệnh chạy headless (sẽ được nối thêm tham số)",
  "tuning": {
    "player_speed": 0,
    "carry_capacity": 0,
    "lantern_cost": 0,
    "lantern_count_night1": 5,
    "pickup_radius": 0,
    "interact_radius": 0,
    "pulse_cost": 0,
    "pulse_radius": 0,
    "night1_duration_s": 0,
    "flames": 0,
    "invuln_s": 0,
    "hit_drop_ratio": 0,
    "pulse_stun_s": 0,
    "pulse_push_m": 0,
    "pulse_cooldown_s": 0,
    "safe_radius": 0,
    "shade_speed": 0,
    "shade_hit_radius": 0,
    "fall_enabled": false,
    "score": { "per_mote": 0, "per_lantern": 0, "per_stun": 0,
               "per_second_left": 0, "per_flame_left": 0 }
  }
}
tuning: bạn điền đúng các số mà game của bạn đang dùng. Nếu game không có khái niệm đó, điền null (hoặc false) và giải thích trong README. Bài test Phase 1 sinh tình huống dựa trên các số này, nên khai sai sẽ làm trượt test.
Ý nghĩa: hit_drop_ratio là tỉ lệ đom đóm đánh rơi khi bị chạm (0 nếu không rơi); safe_radius là bán kính quanh đèn mà Bóng Mực không vào được; fall_enabled cho biết rơi khỏi đảo có bị phạt hay không; score.* là điểm cho mỗi sự kiện.
Lệnh phải chạy được trên macOS/Linux sau build_cmd. Docker được phép.
B. Tham số headless
<headless_cmd> --seed <int> --night 1 [--scenario <file.json>] [--inputs <file.json>]
               --ticks <int> --out <file.jsonl> [--snapshot-every <int, mặc định 10>]
Logic game chạy ở 60 tick/giây cố định (1 tick = 1/60 giây), không cần cửa sổ, không cần GPU, nhanh nhất có thể.
Dừng khi chạy đủ --ticks hoặc khi game kết thúc (thắng/thua). Thoát với mã 0.
Lỗi → mã thoát khác 0, thông báo lỗi ra stderr. File inputs/scenario sai định dạng → mã thoát 2.
Đơn vị độ dài là mét; trục Y hướng lên; mặt đất đảo ở Y = 0; người chơi xuất phát tại (0, 0, 0).
Mô hình tick (để mọi bài đếm giống nhau)
Snapshot tick 0 là trạng thái sau khi dựng scenario, trước khi áp dụng input.
Bước thứ k (k = 0 … N−1) đọc input của tick k và tạo ra trạng thái k+1. Sự kiện xảy ra trong bước đó ghi tick = k+1. --ticks N thực hiện đúng N bước.
time_left_s = thời lượng Đêm − (số bước đã chạy) / 60.
Quy ước vị trí
player.pos là chân nhân vật; shade.pos là tâm Bóng Mực; lantern.pos là chân cột đèn; vị trí đom đóm là điểm trên mặt đất (độ cao lơ lửng chỉ là hiển thị).
Mọi khoảng cách trong tuning đo giữa các điểm này, theo mặt phẳng ngang XZ, không cộng thêm kích thước nhân vật. "Trong bán kính r" nghĩa là khoảng cách ≤ r.
C. File inputs
{
  "frames": [
    { "tick": 0,   "move": [0, 1], "cam_yaw_deg": 0 },
    { "tick": 120, "move": [0, 0], "interact": true },
    { "tick": 121, "interact": false },
    { "tick": 200, "pulse": true },
    { "tick": 201, "pulse": false }
  ]
}
Giá trị mặc định trước frame đầu tiên: move [0,0], cam_yaw_deg 0, mọi nút false.
Mỗi frame chỉ đổi các trường có mặt trong frame đó; trường vắng mặt giữ giá trị cũ.
tick của các frame phải tăng nghiêm ngặt (không trùng, không giảm).
move: [x, z], mỗi thành phần trong [−1, 1]. Với θ = cam_yaw_deg đổi sang radian, hướng di chuyển trong thế giới là x' = x·cosθ + z·sinθ, z' = −x·sinθ + z·cosθ (khi θ = 0 thì x là +X, z là +Z). Vector dài hơn 1 phải được chuẩn hóa về độ dài 1.
jump, interact, pulse (và dash nếu có): boolean, hành động kích hoạt khi giá trị chuyển từ false sang true.
Không có file inputs nghĩa là người chơi đứng yên.
D. File scenario (dựng tình huống cho test)
{
  "player": { "pos": [0, 0, 0], "carried": 0, "flames": 3 },
  "random_motes": false,
  "random_shades": false,
  "motes": [[0, 0, 5]],
  "shades": [{ "pos": [10, 0, 0] }],
  "lanterns": [{ "id": "L1", "pos": [0, 0, 25], "deposited": 0 }],
  "time_left_s": 300
}
random_motes: false: không tự sinh đom đóm, chỉ có những con được liệt kê.
random_shades: false: không tự sinh Bóng Mực, chỉ có những con được liệt kê (ở trạng thái hoạt động bình thường ngay lập tức).
lanterns: cập nhật theo id các đèn của màn (L1…L5). Đèn không được nhắc tới giữ nguyên; có pos thì đổi vị trí; có thể đặt lit: true.
motes, shades: thay thế danh sách ban đầu tương ứng; mảng rỗng nghĩa là không có con nào. shades[] có thể kèm id để test tham chiếu.
Trường nào không có thì dùng mặc định của game.
Dựng scenario không phát sự kiện và không cộng điểm (ví dụ đèn đặt sẵn lit: true không được cộng điểm thắp đèn).
E. Output JSONL
Mỗi dòng là một đối tượng JSON, gồm ba loại.

Snapshot, mỗi --snapshot-every tick, bắt đầu từ tick 0:

{"type":"snapshot","tick":120,"sim_tick":120,"state":"playing","time_left_s":298.0,"score":20,
 "player":{"pos":[0.0,0.0,12.0],"flames":3,"carried":2},
 "lanterns":[{"id":"L1","pos":[0,0,25],"lit":false,"deposited":0}],
 "shades":[{"id":"S1","pos":[30.1,1.0,2.0],"state":"chase"}],
 "motes_active":19}
Event, ghi ngay khi sự kiện xảy ra. Ví dụ: {"type":"event","tick":131,"name":"mote_picked","data":{"carried":3}}

name	data
mote_picked	{"carried": n}
deposit	{"lantern_id": "L1", "amount": n, "deposited": n}
lantern_lit	{"lantern_id": "L1"}
pulse	{"stunned_ids": ["S1"]}
player_hit	{"by": "shade" | "fall", "flames": n, "dropped": n}
shade_spawned	{"id": "S3"}
game_over	{"result": "won" | "lost", "reason": "all_lit" | "dawn" | "no_flames"}
End, dòng cuối cùng và bắt buộc: {"type":"end","ticks":4800,"state":"won","score":1730}

state thuộc playing, won, lost. Trạng thái Bóng Mực tối thiểu phải có stunned; các trạng thái khác do bạn đặt tên.
Tọa độ làm tròn 3 chữ số thập phân.
Tính tất định: cùng --seed, cùng scenario và cùng inputs phải cho output giống hệt nhau giữa hai lần chạy, kể cả các id tự sinh. Các bạn không cần sinh cùng chuỗi ngẫu nhiên với nhau.
sim_tick là số bước gameplay đã chạy (ở Phase 1 bằng tick).
Mảng motes (mỗi phần tử id, pos) trong snapshot là khuyến nghị ở v1.0.
Nếu một sự kiện không xảy ra trong game của bạn (ví dụ không có rơi khỏi đảo) thì không ghi sự kiện đó.