# Phase 4 làm lại — v1.0.1

[Báo cáo rà soát bản trước](submission-audit.md) · [Retro](../../notes/retro.md) · [Changelog](../../../CHANGELOG.md)

Ở tag `phase-4` gốc, sáu lượt soak chạy đủ 10 đêm và 0 crash, nhưng RSS tăng 26,4–43,9%. Bản làm lại chạy soak bằng trình thông dịch Node.js với `--jitless --expose-gc`. Runtime thông dịch tránh tạo mã JIT giữa hai mốc RSS. Không có lượt warm-up trước mốc đo đầu, không làm tròn trước khi so ngưỡng và không đổi mô phỏng, seed hay số đêm.

| Kiểm chứng | Kết quả |
|---|---|
| Test và build | 27/27 test đạt. Build thành công. Vite còn cảnh báo bundle Three.js vượt 500 kB sau nén. |
| Soak chuẩn | 10 đêm, 0 crash, RSS tăng 9,25%. Năm lượt bổ sung cùng lệnh đều 0 crash và RSS tăng 8,96–9,37%, dưới 20%. [Kết quả chuẩn](../../../soak.json) · [Năm lượt đo](soak-repeats.json) |
| Benchmark chuẩn | Ba giây khởi động rồi đo 30 giây, seed 42, 200 Bóng Mực, 100 đom đóm và ba đèn sáng. 415 FPS trung bình, 101,82 FPS 1% low, p95 5,5 ms, tải 887 ms. [JSON gốc](../../../bench.json) |
| Headless | Lặp fixture bình minh bằng Contract v1.3. JSONL giống từng byte với bằng chứng v1.2. Bản chơi và benchmark không bật chế độ thông dịch. |
| Kiểm chứng tự động | `npm run verify` chạy test, build và kiểm ngưỡng soak. GitHub Actions gọi cùng lệnh khi push hoặc mở PR. |
| Demo | Video mới quay bản v1.0.1, có luồng chọn màn, chơi trực tiếp và kết quả chạy lệnh, kèm harness và lịch sử Git. [Video](https://github.com/Phan-Trong-Hau/K5-L3A-DAY12-PhanTrongHau-2A202603547-AI-SDLC-Dao-Den-Long/releases/download/v1.0.1/demo.mp4) |

Máy đo cục bộ dùng Linux x86_64, Node 22.14.0 và Intel Iris Xe với Mesa. Chưa có kết quả trên máy chấm, test ẩn, reviewer độc lập hoặc xác nhận hạn LMS.

```bash
npm run verify
node scripts/bench.js --seed 42 --duration 30 --out /tmp/dao-bench.json
node --jitless --expose-gc scripts/soak.js --seed 7 --nights 10 --out /tmp/dao-soak.json
node scripts/check-soak.js /tmp/dao-soak.json
```

Bản làm lại phát hành ở tag `phase-4-rerun` và `v1.0.1`. Hai tag đã nộp `phase-4` và `v1.0.0` giữ commit cũ để bằng chứng và gói tải xuống trước đó còn đối chiếu được.
