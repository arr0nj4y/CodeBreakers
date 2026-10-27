---
name: CodeBreakers
description: An offline coding adventure played on a starship's holo war table.
colors:
  ground: "#07090c"
  hull: "#0d1116"
  hull-2: "#131920"
  hull-3: "#1b232c"
  hull-4: "#232d38"
  line: "#26303a"
  line-2: "#36424f"
  text: "#eceff1"
  text-2: "#b4bec6"
  text-3: "#8d99a3"
  ink: "#0b0b09"
  hazard: "#ffd21f"
  hazard-2: "#ffe066"
  amber: "#ff9f45"
  lilac: "#c9a0e6"
  coral: "#ff7a63"
  steel: "#8db4dc"
  holo: "#7fd8ff"
  holo-2: "#3d8fb4"
  holo-3: "#173a4c"
  ok: "#63e2a3"
  danger: "#ff5c4d"
  danger-ink: "#ffd2cc"
  code-well: "#06080b"
  code-ink: "#d7f1ff"
typography:
  display:
    fontFamily: "Antonio, Barlow, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Antonio, Barlow, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0.01em"
  title:
    fontFamily: "Antonio, Barlow, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0.04em"
  console:
    fontFamily: "Antonio, Barlow, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.06em"
  action:
    fontFamily: "Antonio, Barlow, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.06em"
  numeral:
    fontFamily: "Antonio, Barlow, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.02em"
    fontFeature: "tnum"
  body:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  control:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.01em"
  label:
    fontFamily: "Barlow, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.09em"
  code:
    fontFamily: "JetBrains Mono, ui-monospace, Consolas, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  tile: "3px"
  machined: "4px"
  field: "6px"
  elbow: "34px"
  pill: "999px"
spacing:
  join: "2px"
  tight: "4px"
  row: "6px"
  group: "8px"
  cluster: "12px"
  stack: "14px"
  panel: "20px"
  section: "24px"
  gutter: "28px"
  gutter-phone: "16px"
components:
  button-console:
    backgroundColor: "{colors.hull-3}"
    textColor: "{colors.text}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  button-console-hover:
    backgroundColor: "{colors.hull-4}"
  button-hazard:
    backgroundColor: "{colors.hazard}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  button-hazard-hover:
    backgroundColor: "{colors.hazard-2}"
  button-hazard-disabled:
    backgroundColor: "{colors.hull-3}"
    textColor: "{colors.text-3}"
  button-deploy:
    backgroundColor: "{colors.hazard}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.machined}"
    padding: "0 22px"
    height: "64px"
    width: "100%"
  button-warn:
    backgroundColor: "transparent"
    textColor: "#ffb2a8"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    height: "40px"
  rail-item:
    backgroundColor: "{colors.hull-2}"
    textColor: "{colors.text-2}"
    typography: "{typography.console}"
    rounded: "999px 6px 6px 999px"
    padding: "0 16px"
    height: "48px"
  rail-item-active:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink}"
  field:
    backgroundColor: "{colors.hull}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "0 12px"
    height: "44px"
  readout-cell:
    backgroundColor: "{colors.hull}"
    textColor: "{colors.text}"
    typography: "{typography.numeral}"
    padding: "10px 16px"
    width: "104px"
  mission-row:
    backgroundColor: "{colors.hull-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.machined}"
    padding: "10px 14px"
    height: "56px"
  mission-row-selected:
    backgroundColor: "color-mix(in srgb, #ff9f45 12%, #131920)"
  filter-segment-active:
    backgroundColor: "{colors.lilac}"
    textColor: "{colors.ink}"
    height: "40px"
  area-tag:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
  tactical-plate:
    backgroundColor: "{colors.hull}"
    padding: "22px 20px 20px"
  panel:
    backgroundColor: "{colors.hull}"
    padding: "{spacing.panel}"
  dialog:
    backgroundColor: "{colors.hull-2}"
    textColor: "{colors.text}"
    padding: "30px 30px 28px"
    width: "560px"
  code-well:
    backgroundColor: "{colors.code-well}"
    textColor: "{colors.code-ink}"
    typography: "{typography.code}"
    rounded: "{rounded.machined}"
    padding: "14px 16px"
  status-line:
    backgroundColor: "color-mix(in srgb, #7fd8ff 6%, #0d1116)"
    textColor: "{colors.text}"
    padding: "12px 16px"
---

# Design System: CodeBreakers

## Overview

**Creative North Star: "The Galactic War Table"**

The whole game is one console on a starship bridge. A hull off-black room, gunmetal plates and a console rail of warm colour-block elbows frame a single lit object: the holo war table, a real-time WebGL disc carrying five Blender-rendered planets. The mission grid is that same table zoomed in, so the board, the route trace and the status line share its hologram blue, and nothing else in the room glows. Chrome stays flat, dark and quiet so the student's code and the board are always the brightest things on screen.

Density is a working console, not a poster: 40 to 64px controls, real numbers in fixed readout cells, list rows instead of card grids, and every panel either squared or chamfered against the dark. Colour does three separate jobs and never trades them: the area colour says where you are, hazard yellow says what to press, hologram blue says this is the table. Motion is short and mechanical; the one long move is the table turning a world forward, and reduced motion makes all of it instant.

The world takes its cues from bridge consoles and drop-pod tactical screens but borrows no franchise logos, names, fonts or assets. It rejects the stacked glowing-button space menu, grids of identical mode cards, and glass panels.

**Key Characteristics:**
- Hull off-black ground with four tonal hull steps and 1px inset hairlines; no decorative gradients in chrome.
- One lit object: the holo war table and the mission board that is its zoomed-in view.
- Colour jobs split three ways: area colour for wayfinding, hazard yellow for pressing, hologram blue for the table.
- Three geometries: 45-degree chamfered plates, pill and elbow console controls, 4px machined slabs.
- Antonio condensed caps for the console's voice, Barlow for reading, JetBrains Mono for code, tabular numerals in fixed cells.
- Blender renders for every planet, piece, mode emblem and fighter; Tabler outline icons at 2px stroke; no emoji.
- Short mechanical motion that goes instant under reduced motion.

## Colors

A dark hull palette carrying three signal families that never share a job.

### Primary
- **Hazard Yellow** (#ffd21f, hover **Hazard Light** #ffe066): the colour of pressing. It fills only the pressable primary action of a region (Deploy, Compile and run, Next mission, Export, profile save), always with Ink text (13.6:1). The Deploy slab adds a faint 45-degree stripe of 9% black. A disabled primary drops to Hull Control with Caption Grey text and loses the yellow entirely.

### Secondary
Area colours are wayfinding. Each screen sets one as its area, and the rail item, head cap, head underline, rail spine and the selected or current item inside that area inherit it. All take Ink text when they fill.
- **Campaign Amber** (#ff9f45): command deck, world map and mission screens. Brand elbow, active rail item, selected mission row and table pin, current level chip, current queue token, executing trace line, XP and result tags, world index on the sector plate.
- **Arcade Lilac** (#c9a0e6): challenge arcade. Pressed filter segment, roster group dividers, mode count meters, selected options, active stage.
- **Combat Coral** (#ff7a63): combat arena. The versus mark, the opponent's health and the battle log rim.
- **Teacher Steel** (#8db4dc): teacher dashboard. Active section tab, chart bars, mode progress bars.

### Tertiary
- **Hologram Blue** (#7fd8ff): the table's own light. Table rings, ticks and sweep, planet pin numerals and lit meter segments, the board's faint tile grid (4.5% fill, 13% edge), the agent tile ring, the route trace, and the status line's tint and rim. It is also the keyboard focus ring and the focused field border, the one place it touches chrome.
- **Hologram Mid** (#3d8fb4): hover edge on table pins.
- **Hologram Deep** (#173a4c): the rim of the mission board frame.

### Neutral
- **Ground** (#07090c): page, screen and rail background; the end of the table vignette.
- **Hull** (#0d1116): standard panel and plate fill, field fill.
- **Hull Raised** (#131920): rows and disclosures inside a panel, dialogs, the phone overflow sheet.
- **Hull Control** (#1b232c): default button fill, queue tokens, empty health track.
- **Hull Hover** (#232d38): button hover, pressed toggles.
- **Hairline** (#26303a): inset panel edges, dividers, table rules.
- **Hairline Strong** (#36424f): control and field borders, unlit meter segments, header rules in tables.
- **Console White** (#eceff1): headings, values and primary text.
- **Readout Grey** (#b4bec6): secondary text, descriptions, inactive rail labels.
- **Caption Grey** (#8d99a3): captions, state words at rest, placeholders, inactive icons. It holds 5.45:1 on Hull Control and better on every darker hull.
- **Ink** (#0b0b09): text on any hazard or area fill; at least 7.7:1 on all five.
- **Code Well** (#06080b) with **Code Ink** (#d7f1ff): the editor, syntax reference and arcade code blocks.

### Status
- **Signal Green** (#63e2a3): solved state, success feedback, switch tiles.
- **Alarm Red** (#ff5c4d) with **Alarm Ink** (#ffd2cc): error rims and text on the status line and compiler feedback, hazard tiles, the trace stop mark and the destructive ghost button's edge. Status colour always arrives with a word.

### Named Rules
**The Hazard Means Press Rule.** Hazard yellow fills only something you can press that moves you forward, one per region. It never decorates, never marks a secondary action and never survives on a disabled control.

**The Table Owns the Blue Rule.** Hologram blue belongs to the war table, the planets, the mission board, the route trace and the status line, plus the focus ring. The rail, panels, headings and resting buttons never take it.

**The Wayfinding Only Rule.** An area colour tells you where you are and what is selected inside that area. It never fills a primary action and never appears in another area's chrome.

## Typography

**Display Font:** Antonio, weights 500 to 700 (with Barlow, system-ui)
**Body Font:** Barlow, weights 400, 500 and 600 (with system-ui, Segoe UI)
**Label/Mono Font:** JetBrains Mono, weights 400 to 600 (with ui-monospace, Consolas)

**Character:** Tall condensed caps that read like stencilled console legends, set against a sturdy grotesque for anything a student has to actually read. Mono marks everything that is code.

### Hierarchy
- **Display** (600, 2.5rem, 2rem on phones; mission and arcade titles 2.25rem, 1.75rem on phones; 1.05; uppercase): the screen title in the head.
- **Headline** (600, 1.875rem, 1.05, uppercase): the world name on the sector plate and dialog titles.
- **Title** (600, 1.25rem, 0.04em, uppercase): panel titles such as Program and the current skill, roster mode names, arcade task names (1.375rem), teacher section heads (1rem).
- **Console** (600, 1rem, 0.06em, uppercase): rail items; teacher tabs at 0.9375rem; briefing summaries at 1.0625rem.
- **Action** (700, 1.375rem on Deploy, 1.125rem on Next mission, 0.06em, uppercase): the hazard slabs.
- **Numeral** (600, 1.375rem, 0.02em, tabular): every count, score and index; mission row index 1.5rem, teacher stats 1.75rem.
- **Body** (400, 1rem, 1.5): descriptions, instructions, coach text, capped at 62 to 70ch; secondary copy at 0.875 to 0.9375rem.
- **Control** (600, 0.9375rem, 0.01em, sentence case): button labels.
- **Label** (600, 0.6875 to 0.75rem, 0.07 to 0.09em, uppercase): readout cell captions, table column headers, form field names and row state words.
- **Code** (JetBrains Mono 400, 0.9375rem, 1.7): the editor; trace at 0.8125rem, compiler feedback 500 at 0.875rem, queue tokens 600 at 1rem.

### Named Rules
**The Console Voice Rule.** Antonio is always uppercase and only for what the console names: titles, rail items, action words and numerals. Sentences are Barlow in sentence case.

**The Fixed Cell Rule.** Every number that changes sets in tabular numerals in a fixed cell or row slot, so a ticking score never shifts its neighbours.

**The Code Is Mono Rule.** Code, the move queue, the trace, compiler feedback and combat answer options set in JetBrains Mono; nothing else does.

## Layout

The frame is a console rail plus one working area. On desktop a fixed 232px rail runs down the left edge and every screen fills the rest at full height, scrolling inside itself. Content sits in a 1360px column (1480px on the command deck) with a 28px gutter.

Every screen opens with the same head: an area cap, the title with one line of Barlow, and a readout strip on the right, closed by a hairline carrying a 120 by 3px area underline. The deck's war table fills the stage at clamp(560px, 100dvh minus 210px, 780px) high; the sector plate overlays its lower left at min(372px, 40%) wide and the camera lens-shifts the disc into the free space to its right. The mission screen splits into the board (1.05fr, board capped at 620px) and the console (0.95fr, at least 420px) with a 24px gap; the briefing drawer and checkpoint question follow beneath. The teacher dashboard uses a 200px tab column beside one panel. The arcade roster runs as two list columns with a 28px gap.

Spacing steps in a tight rhythm: 2px joins between cells and segments, 4 to 8px inside groups, 12 to 14px between items stacked in a plate, 18 to 24px between plates, 28px to the edge. Controls are 40px tall, fields 44px, mission rows 56px, primary slabs 52 to 64px.

Responsive changes:
- At 1279px and below the rail collapses to an 84px icon rail and the gutter drops to 24px.
- At 1180px and below the mission screen becomes one column, the board caps at 560px, and the sector plate leaves the table to sit beneath it as a plain plate.
- At 899px and below the rail becomes a 68px bottom bar with four area tabs and a More sheet, the gutter is 16px, the table takes a 4:3 frame, Deploy moves above the mission list, the deck hides its readout strip, and the mission screen flows as one stack with the checkpoint and briefing last.
- At 420px and below the combat health header stacks.

## Elevation & Depth

The chrome is flat. Depth comes from tonal steps (Ground, Hull, Hull Raised, Hull Control, Hull Hover) and from 1px inset hairlines drawn as inset box-shadows, which survive the chamfer clip where a border would not. Real volume lives only where the world is physical: the WebGL table and the Blender renders. Buttons carry no shadow, glow, filter or text-shadow and never lift on hover. Only two things cast a shadow, the dialog and the phone overflow sheet, and the only glow in the system is on the mission board's goal and agent tiles.

### Shadow Vocabulary
- **Hairline** (`box-shadow: inset 0 0 0 1px var(--line)`): the edge of every panel, plate and readout cell.
- **Hairline Strong** (`box-shadow: inset 0 0 0 1px var(--line-2)`): dialogs and compiler feedback.
- **Board Rim** (`box-shadow: inset 0 0 0 1px var(--holo-3)`): the mission board frame.
- **Dialog Lift** (`box-shadow: inset 0 0 0 1px var(--line-2), 0 30px 80px rgba(0,0,0,.55)`): dialogs over an 80% near-black scrim with no blur.
- **Sheet Lift** (`box-shadow: inset 0 0 0 1px var(--line-2), 0 20px 50px rgba(0,0,0,.5)`): the phone More sheet.
- **Agent Glow** (`box-shadow: 0 0 0 1px var(--holo), 0 0 22px rgba(127,216,255,.25)`): the agent's tile.
- **Goal Glow** (`box-shadow: inset 0 0 18px rgba(127,216,255,.18)`): the goal tile.

### Named Rules
**The Hairline Edge Rule.** Panels separate by a tonal step and a 1px inset hairline, never by a cast shadow. Shadows belong to things that float over the deck: dialogs and the overflow sheet.

**The Board Glows Alone Rule.** Glow exists only on the mission board's goal and agent tiles. Chrome never glows.

## Shapes

Three geometries, each tied to a kind of object. Tactical plates (the table well, sector plate, mission board frame, arcade roster, arena stage, dialogs) take a 14px 45-degree chamfer cut with clip-path: top-left and bottom-right on most plates, mirrored on the sector plate, all four corners on the board frame. Console controls take pill geometry (999px): buttons, toolbar selects, the search field, tags, and the ends of joined readout strips and filter segments. The rail takes elbows: the brand block curves 34px into its bottom-right corner and flows into the rail spine, and rail items are half-pills, 999px on the left and 6px on the right. Slabs and rows that sit inside a plate (mission rows, Deploy and Next mission, answer options, level chips, the queue, the editor, table pins) take a 4px machined corner; text fields take 6px and board tiles 3px. Ordinary panels such as the console cards, checkpoint question and teacher panel stay square.

Progress meters for discrete counts are skewed parallelogram segments (skewX of minus 30 degrees), one per mission or challenge; continuous ratios use flat 4px bars with square ends. Health tracks are cut into ten segments by a mask.

### Named Rules
**The Three Geometries Rule.** Plates chamfer, console controls pill or elbow, slabs inside a plate take the 4px machined corner. Panels are never softly rounded; there is no 8 to 24px card radius anywhere in the system.

**The Counted Progress Rule.** A count of missions or challenges is drawn as lit skewed segments with the number printed beside it ("0 / 3 solved"), never as an unlabelled smooth bar.

## Components

### Buttons
Firm, flat and quiet until one is the move to make.
- **Shape:** pill (999px), 40px minimum height, 18px side padding, Tabler icon at 1.15em before the label with an 8px gap. Action slabs (Deploy, Next mission, combat actions) take the 4px corner at 52 to 64px.
- **Primary:** Hazard Yellow with Ink text; hover lightens to Hazard Light. No glow, no lift.
- **Console (default):** Hull Control fill, Hairline Strong border, Console White text; hover moves to Hull Hover with a Caption Grey border.
- **Press / Focus:** press drops the button 1px for 0.12s; focus draws a 2px Hologram Blue ring at a 3px offset.
- **Disabled:** 38% opacity; a disabled primary also drops to Hull Control with Caption Grey text.
- **Warn ghost:** transparent with a 55% Alarm Red border and pink text (#ffb2a8); hover adds a 14% red wash. Used for Reset and destructive actions.
- **Ghost:** transparent with a Hairline Strong border, for dialog close, help and example presets.
- **Deploy slab:** full width, 64px, Antonio 700 at 1.375rem, rocket icon left, target mission in Barlow 600 at 0.8125rem on the right, over the 45-degree stripe.

### Chips
- **Segmented filter:** pill segments joined at 2px with only the outer ends rounded; Hull fill with a Hairline border at rest; the pressed segment fills its area colour with Ink text.
- **Level chips:** 32px tall, 4px corner, Antonio 600 at 0.875rem on Hull; solved chips turn Signal Green, the current chip fills Campaign Amber.
- **Area tags:** small pills (XP reward, mission result) in the area colour with Ink caps at 0.75rem.

### Cards / Containers
- **Corner Style:** tactical plates chamfer at 14px; ordinary panels stay square.
- **Background:** Hull for panels and plates; Hull Raised for rows and disclosures inside them and for dialogs.
- **Shadow Strategy:** hairline only (see Elevation & Depth); dialogs alone add Dialog Lift.
- **Border:** none; the 1px inset hairline does the work.
- **Internal Padding:** 20px for panels, 22px by 20px for the sector plate, 30px for dialogs (24px by 20px on phones).

### Inputs / Fields
- **Style:** 44px tall, Hull fill, Hairline Strong border, 6px corner, Barlow 500 at 1rem; placeholder in Caption Grey. Selects draw their own chevron and go pill inside toolbars. Checkboxes are 20px squares with a 4px corner that fill Console White with an Ink tick. Range sliders run a 4px track with an 18px white thumb ringed in Hull.
- **Focus:** the border turns Hologram Blue under the global focus ring.
- **Code editor:** Code Well fill, Hairline Strong border, 4px corner, JetBrains Mono at 0.9375rem and 1.7 line height in Code Ink, vertical resize only; focus turns the border Hologram Blue.
- **Error:** compiler feedback and the status line switch to a 55% Alarm Red rim, an 8 to 9% red wash and Alarm Ink text, always with a plain-language message.

### Navigation
- **Console rail:** a 232px fixed column on Ground. The brand elbow block (96px tall, area fill, 34px curve) holds the logo on a Ground disc, the wordmark in Antonio 700 and the pilot's name. Area items are 48px half-pills in Hull Raised with Readout Grey Antonio caps and a 20px Caption Grey icon; hover moves to Hull Control; the current item fills its own area colour with Ink text and icon. A 10px spine on the rail's right edge shows the area colour for its top 38%, then Hull Hover and Hull Control segments split by 6px gaps. Area colour changes ease over 0.3s. Utility tools (Profile, How to play, Music with an Off/On word, Sound settings) sit transparent at the foot.
- **Compact (1279px and below):** an 84px icon rail with visually hidden labels and fully round items.
- **Phone (899px and below):** a 68px bottom bar in Hull with a top hairline; four area tabs stack icon over a 0.6875rem caps label as pills; More opens an overflow sheet in Hull Raised with Sheet Lift that holds the utilities.

### Screen Head
The same head opens every screen. A 12px area cap (round on the left) stands beside the Display title and one Barlow line of at most 62ch; the readout strip sits at the right; a hairline closes it with the 120 by 3px area underline. On the mission screen the cap is replaced by the mission number pill in Campaign Amber and a Deck back button.

### Readout Cells
A strip of cells joined with 2px gaps, the outer ends pill-rounded, each in Hull with a hairline, at least 104px wide. The value sets in Numeral; a Label caption names the quantity. On phones the cells flex to fill the row.

### War Table and Sector Plate
The deck's signature. A WebGL disc sits in a chamfered well with a radial vignette from #0f1a22 to Ground; its rings, ticks and slow sweep are Hologram Blue, and five Blender planets orbit it. Choosing a world scales it forward and turns the table over 720ms with a cubic ease-out; the table can also be dragged, paused from a pill control at its lower right, and falls back to static planet renders when needed. Table pins are small 4px plates on 82% Ground with a Hologram Blue numeral, the world name and a three-segment meter; the selected pin switches to a Campaign Amber edge, numeral and 14% wash. The sector plate carries the planet thumb, the world name in Headline, the world index in amber caps beneath it, a one-line note, the liberation meter with its count, the mission rows, and Deploy.

### Mission Row
A 56px grid row in Hull Raised with a 4px corner: index numeral (Antonio 1.5rem, Caption Grey), the mission name in Barlow 600 with its topic beneath in Caption Grey, and a state word at the right (Solved in Signal Green, Next up in Campaign Amber, Open or Code required in Caption Grey). Hover lifts the fill to Hull Control with a Hairline Strong edge; the selected row takes an amber edge, a 12% amber wash and an amber index.

### Mission Board
The table zoomed in: a 7 by 7 grid inside a four-corner chamfered frame with the Board Rim and a faint blue radial. Tiles have 3px corners and a faint Hologram Blue grid; piece types tint their tile faintly (goal blue with Goal Glow, hazard red, gate and door amber, switch green, portal lilac). Blender piece renders overflow their tile by 14%. The agent's tile takes the Agent Glow and its render arrives with a 0.16s scale. The route trace draws in Hologram Blue at 3px, a secondary path in Campaign Amber at 2.5px, and stops in Alarm Red.

### Arcade Roster
A two-column list inside a chamfered plate, grouped under Arcade Lilac Antonio dividers with a Hairline Strong rule. Each row: a 64px Blender mode emblem, the mode name in Title with a Barlow description beneath, and on the right a count numeral over lilac skewed meter segments. Rows separate by hairlines; hover moves to Hull Raised and turns the name lilac. A pill search field, the segmented filter and a result count sit above.

### Briefing Drawer
A collapsible panel on the mission screen holding the board legend, mission coach, lesson and manual controls. Its summary reads in Antonio caps with an amber clipboard icon and an Open or Close word at the right; sections inside divide with hairlines; the legend shows each Blender piece at 34px with its name.

### Arcade Briefing
The first thing inside an open arcade challenge, before its controls. The challenge name sits in Antonio 1.75rem caps, followed by a dossier grid: row labels in Arcade Lilac Antonio caps sit in a 132px left column (stacked above their content on phones), and the rows are Scenario (one or two sentences of story in Text Secondary), Your task (Barlow 600 at 1.125rem in Text) and How to solve (three numbered steps with lilac markers). An optional hint sits in a closed Hull Raised drawer below. A hairline closes the briefing off from the interactive area.

### Player Profiles and Sign-up
Players are pilot helmets: eight Blender renders shown in a circular Hull Control well (40px in lists, 84px in headers, 18px in the rail). The "Who's playing?" gate is a full-screen chamfered Hull Raised plate on the table vignette, listing players as 4px-cornered rows (helmet, name, class line, a Teacher Steel "Demo" badge for sample students), with New player in Hazard Yellow and Play as guest beside it. Sign-up runs three steps shown as a pill step strip (current step Campaign Amber, done steps with a Signal Green number): name and helmet, PIN, then Join your class. PIN and class code fields use JetBrains Mono with wide tracking; errors appear as plain-language lines in Alarm Red text. On the deck, an account strip under the screen head says who is playing and offers the one next step (create a player, or join your class).

### Class Panel
The teacher's first plate, above the dashboard layout: the class code in JetBrains Mono 2.25rem Teacher Steel inside a Ground well, the class name and teacher, linked, on-this-device and live counts in tabular numerals, then Show code, New class and Remove demo class. One line tells students where to type the code; a status line (Signal Green edge when the classroom server is live) explains how updates arrive. Show code fills the screen with the code for a projector. Roster rows carry small pill badges for their source: Demo (Teacher Steel), This device, Live (green tint), File, and Other class (outlined).

## Do's and Don'ts

### Do:
- **Do** open every screen with the screen head: area cap, uppercase Antonio title, one Barlow line, and real numbers in a readout strip.
- **Do** set one area per screen (Campaign Amber, Arcade Lilac, Combat Coral, Teacher Steel) and let the rail, cap, underline and selection inherit it.
- **Do** give the one pressable primary action in a region Hazard Yellow (#ffd21f) with Ink text, and drop it to Hull Control with Caption Grey when disabled.
- **Do** separate panels with a tonal step and a 1px inset hairline (`box-shadow: inset 0 0 0 1px var(--line)`).
- **Do** chamfer tactical plates at 14px, pill the console controls, and give slabs inside a plate the 4px corner.
- **Do** count progress in lit skewed segments with the count printed beside them.
- **Do** pair every status colour with a word: Solved, Next up, Code required, or a plain-language error.
- **Do** use Blender renders for planets, pieces, mode emblems, fighters and player helmets, each shipped with its provenance record, and Tabler outline icons at 2px stroke for everything else.
- **Do** keep motion at 0.3s or less on the cubic-bezier(.2,.8,.2,1) ease, with the 720ms table turn as the one long move, and make all of it instant under reduced motion from the system or the in-game toggle.
- **Do** hold every text pair at WCAG AA; Caption Grey (#8d99a3) is the lowest text tone allowed on any hull.

### Don't:
- **Don't** fill or tint the rail, panels, headings or resting buttons with Hologram Blue; it belongs to the table, planets, board, trace, status line and focus ring.
- **Don't** use an area colour for a primary action, or one area's colour in another area's chrome.
- **Don't** put Hazard Yellow on anything that cannot be pressed, on secondary buttons, or on disabled controls.
- **Don't** round panels softly; there is no 8 to 24px card radius.
- **Don't** add glows, text-shadows, filters or hover lift to chrome; glow belongs to the goal and agent tiles alone.
- **Don't** use backdrop blur or translucent glass panels; dialogs sit on a flat 80% scrim.
- **Don't** put kickers or eyebrows above headings; the shell hides them outright.
- **Don't** use emoji or text glyphs as icons or game pieces; they become Blender sprites or Tabler icons.
- **Don't** lay modes out as a grid of identical glowing cards; use the roster row.
- **Don't** set paragraphs in Antonio or in uppercase.
- **Don't** use franchise logos, names, fonts or copied assets; Star Trek and Helldivers are inspiration only.
