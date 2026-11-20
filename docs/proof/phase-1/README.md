# Bằng chứng Phase 1

Bản Phase 1 được dựng lại từ PRD-0 và các quyết định tuning trong [Phase1.md](../../../Phase1.md). Lịch sử trước khi làm Phase 2 chưa có commit hoặc tag của bản Phase 1.

- Clone/worktree sạch cài được bằng `npm ci`; `npm test` đạt 5/5 và `npm run build` thành công.
- Các test bao phủ nhảy, nhặt ở biên bán kính, nạp năm đèn, tỏa sáng, vùng an toàn, thắng/thua, JSONL và lỗi input.
- Trên Chromium, bản mặc định hiện HUD 0/5 đèn và sáu ô đom đóm. Fixture đặt đèn cuối cạnh Mây, bấm E xác nhận thắng rồi bấm Chơi lại để trở về giới thiệu Đảo Bến.
- Fixture CLI [scenario](scenario-win.json) và [input](inputs-win.json) ra `won` ở tick 1 với 354 điểm. Hai lần chạy cho [JSONL](win.jsonl) giống từng byte. Bộ test ẩn chưa được chạy.

```bash
node src/headless.js --seed 7 --night 1 --scenario docs/proof/phase-1/scenario-win.json --inputs docs/proof/phase-1/inputs-win.json --ticks 60 --snapshot-every 1 --out /tmp/dao-phase1-win.jsonl
cmp docs/proof/phase-1/win.jsonl /tmp/dao-phase1-win.jsonl
```
