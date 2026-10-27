---
version: 1
slug: "codebreakers-triplea-cinematic-polish-v3-html"
primary_target: "codebreakers_tripleA_cinematic_polish_v3.html"
related_targets: []
---

# Surface brief: CodeBreakers game shell (all screens)

Scope: every screen in the single-file game (boot, command deck/menu, world map, mission select, mission board + code console, arcade, combat, teacher dashboard, dialogs). Visitor mode: Operate (players complete coding tasks; the shell must never obscure the board, the editor or state).

Audience and job: senior high beginners write short programs to move an agent; teachers import/export progress. Desktop and phone equally. One offline HTML file.

Constraints: keep all IDs/functions the tests and engine use; keep save keys and export format; no network; Blender-made 3D assets embedded and lean.

Unresolved: none blocking. Arcade mode internals keep their own layouts and inherit tokens only.

## Direction contract

THESIS: The game is played on a starship's holo war table. Worlds are sectors you liberate with code, and the mission grid is that same table zoomed in. It refuses the stacked glowing-button space menu, identical mode cards, and the three-column dashboard mission screen.

OWN-WORLD: Hull off-black ground and gunmetal panels. Console chrome uses warm color-block elbows and pill controls (amber for campaign, lilac for arcade, coral for combat, steel blue for teacher) for wayfinding only. Hologram blue lives only on the table, planets, grid and trace. Hazard yellow marks only pressable primary actions; disabled loses it. Tactical panels take 45-degree chamfers; console controls take pill/elbow geometry; nothing else rounds. Tall condensed caps for console labels, a sturdy sans for reading, mono for code, tabular numerals in fixed cells.

STORY: The player boards the deck, sees which sectors are liberated, turns the table to a world, deploys, codes on the grid, and watches the sector update in place.

FIRST VIEWPORT: Desktop: a console rail at left (wordmark elbow, Campaign, Worlds, Arcade, Combat, Teacher, sound). The war table fills the rest: a real-time 3D disc with five Blender planets; the selected world sits forward with its name plate, skill note and 3-segment liberation meter; the next mission and a hazard-yellow Deploy sit at the table's lower left. Phone: table on top, deploy block below, rail becomes a bottom bar.

FORM: Galactic War Table, position 3 of 7 on the ordered list, seed key 4fb2ba23. Signature interaction: choosing a world turns the table in 3D to bring it forward; Deploy zooms into the grid. Motion is mechanical and short; reduced motion makes it instant.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
