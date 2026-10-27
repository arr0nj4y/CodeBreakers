# CodeBreakers

Open `codebreakers_tripleA_cinematic_polish_v3.html` in a browser to play. Keep `codebreakers_tripleA_cinematic_polish_v3.css` beside it; both files are needed for offline play. Fonts and artwork are embedded, so no internet connection is required.

- HTML: page structure and existing game scripts.
- CSS: presentation, responsive layouts, fonts and visual assets, grouped in their original cascade order.
- `.qa/`: build sources, the optional classroom server and verification scripts.
- `.qa/combat.html`, `.qa/combat.css`, `.qa/combat.js`: combat screen structure, styles and turn handling. Rebuild after editing these sources.
- `.qa/teacher-dashboard.css`: teacher dashboard styling, scoped to preserve the other game screens. Rebuild after editing this source.
- `.qa/arcade.css`: arcade catalog, challenge typography, progress and result styling. Rebuild after editing this source.
- `.qa/command-deck-modern.css`: Command Deck typography, mission panels and planet-table layout. Rebuild after editing this source.
- `.qa/navigation.css`: shared sidebar and mobile navigation, using each page's accent color. Rebuild after editing this source.
- `.qa/loading.html`, `.qa/loading.css`, `.qa/loading.js`: neon startup screen and progress based on interface, font and artwork readiness. Rebuild after editing these sources.

Rebuild the HTML and CSS after editing the sources in `.qa/helm/` or `.qa/learning*.js`:

```sh
node .qa/build.cjs
```

Verify combat questions, animated attacks, inline feedback, battle outcomes, saved wins, keyboard controls and mobile layouts:

```sh
node .qa/combat.test.cjs
```

The browser checks use the Playwright installation in `.qa/`. Set `CHROME_PATH` if Chrome is installed outside its default Windows location.

Verify the 3D planet table, world selection, responsive Command Deck, motion controls and static fallback:

```sh
node .qa/command-deck.test.cjs
```

Verify loading progress, completion, responsive layouts and slow or failed startup assets:

```sh
node .qa/loading.test.cjs
```

Verify Windows line endings, generated files, classroom request handling and mobile navigation:

```sh
node .qa/preflight.test.cjs
```

For a shared classroom roster, run `node .qa/serve.cjs` and open `http://localhost:3000/`. Students on the same Wi-Fi can use the network address printed by the server.
