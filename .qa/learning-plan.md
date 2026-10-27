# Learning experience implementation plan

Goal: apply the approved learning recommendations to the existing offline game while retaining its teacher interface, campaign, saved progress and single-file distribution.

Architecture: embed a restricted-language compiler with source locations and a learning controller alongside the existing game. Hook existing engine functions for tracing and evidence; extend the existing v1 export/import format with an optional validated learning field. Do not evaluate user code or change existing save keys.

Approved brief: the recommendations in chat and the user's instruction to apply them, explicitly preserving the teacher interface. Audience assumption: beginner programmers. Existing flow expansion; implement inline without another permission checkpoint.

- [x] Instrument the teaching-language parser: source lines, loop iteration, branch results; validate bounded execution with unit tests.
- [x] Add a guided path for missions 0 (sequence), 1 (loops), 3 (conditions): worked example, scaffold, independent attempt. Keep the other twelve missions accessible.
- [x] Add progressive hints, prediction, code execution trace, pause/step/replay, and actionable failure feedback across missions.
- [x] Add mirrored transfer variants for the three focus skills and later retention checks; classify supported vs independent evidence conservatively. Do not infer mastery from XP or speed.
- [x] Add focus/text-size controls and non-color status labels.
- [x] Retain the existing teacher dashboard and import/export. Add local and imported skill evidence, hints, common errors and suggested follow-up activities. Validate untrusted imports and preserve old reports.
- [x] Verify compiler, engine integration, completion, pause/reset/replay, export/import round trip, persistence, teacher navigation, mobile layout and existing modes.
- [x] Independent review and fix material issues.

Limits: a real learner playtest requires learners; provide a short protocol rather than claim measured learning gains. Learning reports are local, self-reported activity records, not verified assessments. Independent means no in-game hints/examples were used in that recorded attempt; it cannot detect external assistance.

Validation: compiler/evidence unit tests, browser learning journey and legacy report import/persistence, recovery/trace regressions, responsive and scenery suites passed. Focused independent review found no remaining material issues. Classroom playtesting remains a documented follow-up, not a claimed result.
