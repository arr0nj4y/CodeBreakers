# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Primary: senior high school students (Grades 11-12) who are new to programming. They play during class or at home to learn sequencing, loops, conditions and debugging.
- Secondary: their teachers, who collect exported progress files and review a class roster in the teacher dashboard.
- Desktop/laptop browsers and phones get equal care.

## Product Purpose
CodeBreakers is an offline coding puzzle adventure. Players write short programs in a restricted, JavaScript-style teaching language to steer an agent across a 7x7 mission grid. Success means a learner can predict, run, trace and fix a small program without help, and a teacher can see that evidence.

## Positioning
The program *is* the controller: every move on the board comes from code the student wrote, with a visible execution trace, step/replay and actionable failure feedback, wrapped in a space-campaign story. It runs offline from an HTML page and its companion CSS file, with optional local player profiles and classroom networking.

## Operating Context
- Campaign: 15 missions across 5 worlds (Logic Labyrinth, Firewall Fortress, Encryption Vault, Network Nexus, NULL's Core), each with a cybersecurity checkpoint question.
- Challenge Arcade: 10 modes, 29 challenges (bug hunter, network architect, cipher vault, automation factory, database, forensics, circuit, bot, API, sprint).
- Combat Arena: a highlighted logic question opens immediately; players choose attack/defend tactics or use limited repairs. Correct attacks animate a Guardian strike followed by a Sentinel counterattack; incorrect answers trigger a Sentinel strike. Health changes at impact, with shield, repair and damage effects. Inline answer feedback and next/abort controls sit below the visible arena. The arena stays visible on phones, reduced-motion settings are respected, and restarting or leaving cancels pending animations. Wins persist in existing reports.
- Teacher dashboard: create a class and share its code; the roster updates automatically for players on the same device and, through the classroom server, for students on the same Wi-Fi; export/import of `codebreakers-progress-v1` JSON reports remains the fallback. A labeled demo class (8 sample students, PIN 1234) can be loaded and removed.
- Players: local profiles with a name, a Blender helmet avatar and a 4-digit PIN; sign-up ends with a "Join your class" step (class code); guests can play without a profile.
- Learning layer: guided path for missions 0, 1, 3; progressive hints, prediction, trace, transfer and retention checks; focus/text-size controls.

## Capabilities and Constraints
- Delivered as an offline HTML page and a companion CSS file in the same directory. Assets (3D models, textures, audio, fonts) stay embedded and lean. No internet requests are needed.
- Progress lives in localStorage; existing save keys and the v1 export format must not change (2026-10-24: profiles keep per-player snapshots of those same keys; reports gain optional classCode/accountId fields).
- Optional classroom server (2026-10-24, user asked for automatic updates): `node .qa/serve.cjs` serves the same file on the school network and stores class rosters in `classroom-data/` on the teacher's computer. The game only talks to the server it was opened from; opened as a file it makes no network requests. PINs are a shared-device convenience, not real security.
- User code is compiled by the restricted teaching language, never evaluated.
- The teacher interface, campaign, saved progress and import/export must keep working.
- Built through `.qa/build.cjs`, which generates `codebreakers_tripleA_cinematic_polish_v3.html` and its companion CSS stylesheet; Playwright checks live in `.qa/`.
- Approved declutter scope (2026-10-23): decorative flavor text and HUD labels may be removed; secondary main-menu panels may be simplified; mission-screen extras (lesson notes, learning paragraph, keyboard tips) and the manual arrow controls may move behind a collapsible briefing/help.

## Brand Commitments
- Name: CodeBreakers. Season name in copy: NULL Protocol. Existing logo artwork is embedded in the file.
- Binding visual constraint from the user (2026-10-23): a Star Trek / Helldivers theme for the whole UI/UX, futuristic music, and 3D models for planets and game pieces produced with Blender. This is inspiration only: no franchise logos, names, fonts or copied assets.

## Evidence on Hand
- No learner playtest results exist. Learning reports are local, self-reported activity records, not verified assessments. Do not claim measured learning gains.
- No testimonials, school partners or usage numbers exist; none may be invented.

## Product Principles
1. The student's code is the hero; chrome never competes with the board and the editor.
2. Every failure explains itself in plain language and points to the next step.
3. Works anywhere: offline, desktop and phone.
4. Honest records: progress and evidence are labeled for what they are.

## Accessibility & Inclusion
- Keep reduced-motion support (system preference plus the in-game toggle), focus/text-size controls, keyboard play, and non-color status labels.
- Text contrast at WCAG AA minimum; audio is always optional and starts only after user interaction.
