# AGENTS.md

Notes for AI agents (and humans) working in this repo. Things that aren't
obvious from a quick read but will save you time.

## What this app is

A frontend-only Svelte app that tracks **only the user's own Hanabi hand** — it
never models the full game. State lives entirely in the browser (Svelte stores
backed by `localStorage`). There is no server.

Stack: **Vite + Svelte 4 + TypeScript** (not SvelteKit). Tests: **vitest** +
jsdom. Entry: `src/main.ts` → `src/App.svelte` → `GameControls` + `Hand`.

## Build / check / test

```bash
npm run dev                      # dev server, Vite base = /dev
npm run build                    # build, base = /dev
npm run build -- --mode release  # build for Pages, base = /hanabi/
npm run check                    # svelte-check (run this before committing UI/TS work)
npm run test                     # vitest
```

`npm run check` is the fastest correctness gate — it type-checks all `.svelte`
and `.ts`. It currently reports ~17 pre-existing warnings and **0 errors**; keep
errors at 0.

## Commits are linted — this will bite you

A husky `commit-msg` hook runs **commitlint** (`@commitlint/config-conventional`).
Commit messages MUST start with a valid type: `build, chore, ci, docs, feat,
fix, perf, refactor, revert, style, test`. `tweak:`, `update:`, etc. are
rejected and the commit fails. Use `style:` for visual tweaks, `feat:` for
features, `fix:` for bugfixes, `chore:` for version bumps.

## State model (the important part)

State is split across single-purpose Svelte stores in `src/lib/stores/`. The
ones you'll touch most:

- `informationOnCardsStore` — per-card *deduced information*: `CardInformation`
  (`src/lib/models/card.ts`). This is where possibilities live.
- `contextOnCardsStore` — per-card *context*: note, isClued, isCritical,
  isChopMoved, isFinessed.
- `cardsInHandStore`, `cardsSelectedStore`, `actionStore` (undo stack),
  `gameOrReviewStore`, `reviewTurnStore`, `gameConfigStore`.

### Possibilities are bitflags

Suits (`SuitEnum`) and numbers (`NumberEnum`) are **bitfields**, not arrays. A
card's `colourInformation` / `numberInformation` is an OR of every still-possible
value. Helpers `getSuits()` / `getNumbers()` expand a bitfield to an array for
rendering. `isSingleFlag(x)` (== `x & (x-1)) === 0`) checks "exactly one
possibility left". Clearing a possibility = `info & ~flag`; toggling = `info ^ flag`.

### Two *different* kinds of "negative info" — don't conflate them

1. **From clues** → actually *removes* the possibility bit from
   `colourInformation` / `numberInformation`. This is real game information.
2. **Manual cross-off (the black X)** → the user tapping a trait toggles a bit
   in the separate `crossedColourInformation` / `crossedNumberInformation`
   fields. It's a soft annotation and does NOT remove the possibility. Rendered
   as a black X overlay; the trait still shows.

Tapping the **last remaining** possibility (`isSingleFlag`) falls through to
selecting the card instead of crossing off.

## Actions, undo, and review are handled in THREE places

When you add or change a `GameAction` type (`src/lib/models/gameActions.ts`),
you almost always need to update three code paths, or undo/review will silently
break:

1. **Apply** — wherever the action is created (e.g. `Card.svelte` for
   `ManualEliminate`, `ClueModal.svelte` for clues).
2. **Undo** — `handleRollback()` in `GameControls.svelte` (pops `actionStore`).
3. **Review replay** — the big reactive block in `Hand.svelte` handles BOTH
   forward (apply) and backward (undo) stepping through `reviewTurnStore` on a
   *local copy* of card state. There are two switch statements there.

Each action stores `previous*` and `new*` snapshots so it can be reversed.

## Persistence gotchas

- Stores persist via `createManagedStore` (`persistentDictionaryStore.ts`),
  keyed by `import.meta.env.BASE_URL + "/" + key`. So `/dev`, `/hanabi/`, and
  `testing` builds have **separate saved state** — a bug you only see in one
  mode may be stale localStorage from another.
- `Dictionary.getValueOrDefault` returns the raw stored object if present. Old
  saved cards won't have newly-added fields → they read as `undefined`. Bitwise
  ops coerce `undefined` to 0, so `undefined & flag === 0` (safe to render) and
  `undefined ^ flag === flag` (first toggle works). New fields are generally
  backwards-compatible without migration, but verify this when you add one, and
  remember to add the field to the default object in `informationOnCardsStore.ts`
  (and any inline default-card object, e.g. the draw branch in `Hand.svelte`).

## Card rendering quirks (`Card.svelte`)

- Trait icons are flex items with `flex: 1 1 0; min-width: 0`, each getting an
  equal slice of the row and shrinking to fit. **Adding `position: relative` to
  one of these flex-item buttons shifts the layout** and can push a card onto a
  second row. If you need a positioning context for an overlay, scope it to a
  class that's only present when needed, or give the overlay a zero-size box.
- The number SVGs (`number-icons/*.svelte`) are all normalized to a shared
  `234×265` viewBox with the glyph centred, so every digit renders at the same
  height despite "1" being intrinsically narrow. Don't reintroduce
  per-digit viewBoxes.
- The card uses `overflow: visible` so the selection arrow can poke above the
  top edge. Don't set it back to `hidden` without checking the arrow.
- Card/menu has both a long-press (mobile) and right-click (desktop) path to
  open the per-card menu — see `handleInteractionStart` / `handleRightClick`.

## Verifying UI changes without a human

A headless Chrome is available (`google-chrome-stable`). For visual checks you
can build a small standalone HTML mock that mirrors the relevant CSS and
screenshot it:

```bash
google-chrome-stable --headless=new --disable-gpu --no-sandbox \
  --window-size=W,H --screenshot=out.png "file:///path/to/mock.html"
```

`--dump-dom` snapshots before scripts run / before layout, so it's unreliable
for reading `getBBox()` results — render the value into the DOM and screenshot
instead. The dev server (`npm run dev`, port 5173) has HMR; edits hot-reload.

## Misc

- There are leftover `*.txt` / `*OLD*` files in `components/` and `stores/`
  (e.g. `ClueModal-old.txt`). They're dead; don't treat them as source.
- This repo is a fork of `jparkhouse/hanabi-tracker`; the upstream `CHANGELOG.md`
  links point at the original repo. Version bumps here just edit `package.json` +
  `package-lock.json` (root entries only) and tag `vX.Y.Z`; they don't update
  the changelog.
- Card art and conventions follow the [H-group](https://hanabi.github.io/);
  licence is GPL-3.0.
