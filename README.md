# Hanabi hand tracker

A frontend-only helper for tracking what *you* know about *your own hand* in an
in-person game of [Hanabi](https://en.wikipedia.org/wiki/Hanabi_%28card_game%29),
following the [H-group](https://hanabi.github.io/) conventions. It records the
positive and negative information you get from clues, and lets you mark up cards
as you deduce more. It never sees the full game state — it only tracks your hand.

Live site: **https://kenakofer.github.io/hanabi/**

This is a fork of [jparkhouse/hanabi-tracker](https://github.com/jparkhouse/hanabi-tracker).

## Features

- Choose your hand size and the number of suits (up to 6 standard suits, plus
  optional Rainbow and Black special suits).
- Record the clues you receive (colour or number) and the cards they touch;
  positive and negative information is applied across the hand automatically.
- **Tap a number or colour on a card to toggle a black X over it** as you
  deduce it's unlikely. This is your own annotation — it doesn't remove the
  possibility (only negative information from clues does that). Tapping the last
  remaining possibility selects the card instead of marking it.
- Play or discard cards; newly drawn cards appear on the left by default.
- Mark cards as critical (red border), chop-moved, or finessed, and add notes.
- Clued cards get a gold border; the selected card is marked with a large
  yellow arrow.
- Undo any action, including manual cross-offs, and review past turns.

## Development

Built with Vite + Svelte + TypeScript.

```bash
npm install
npm run dev                    # local dev server (base path /dev/)
npm run build                  # production build (base path /dev/)
npm run build -- --mode release  # build for GitHub Pages (base path /hanabi/)
npm run check                  # type-check
npm run test                   # unit tests (vitest)
```

The Vite `base` path depends on the `--mode`: `release` → `/hanabi/`,
`testing` → `/hanabi-tracker/test`, anything else (incl. `dev`) → `/dev`. The
app reads this `BASE_URL` at runtime to pick the version label and to namespace
its `localStorage` keys, so different modes keep separate saved state.

Pushing to `main` runs `npm run build -- --mode release` and deploys to GitHub
Pages via `.github/workflows/deploy-pages.yml`.

## Licence

GPL-3.0 (inherited from the upstream project and the hanab.live card art it
adapts). See [LICENSE](./LICENSE).
