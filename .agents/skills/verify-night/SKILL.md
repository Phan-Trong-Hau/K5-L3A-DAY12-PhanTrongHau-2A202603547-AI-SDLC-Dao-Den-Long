---
name: verify-night
description: Verify the Đảo Đèn Lồng browser build and deterministic headless simulation after changes to contracts, maps, or gameplay.
---

1. Run `npm test` and `npm run build`.
2. Read `game.contract.json` and run its headless command with a temporary output path and the night/scenario affected by the change. Check the first snapshot, expected events, and the final end record.
3. Run the same inputs a second time and compare raw JSONL with `cmp`. For timing changes, record elapsed time and the actual tick count.
4. Test visual or input changes in the browser. Record the viewport, input sequence, and observed result. Keep test-scenario browser runs distinct from default gameplay captures.
5. Record verified and outstanding acceptance criteria in `docs/proof/phase-2/` and link the relevant test.
