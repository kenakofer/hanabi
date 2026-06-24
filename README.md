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
- **Tap a number or colour on a card to cross that possibility off** as you
  deduce it. Tapping the last remaining possibility selects the card instead.
- Play or discard cards; newly drawn cards appear on the left by default.
- Mark cards as critical (red border), chop-moved, or finessed, and add notes.
- Clued cards get a gold border; the selected card gets a white glow.
- Undo any action, including manual cross-offs, and review past turns.

## Development

Built with Vite + Svelte + TypeScript.

```bash
npm install
npm run dev      # local dev server (served under /dev/)
npm run build    # production build
npm run check    # type-check
npm run test     # unit tests
```

Pushing to `main` builds the site and deploys it to GitHub Pages via the
workflow in `.github/workflows/deploy-pages.yml`.

## Licence

GPL-3.0 (inherited from the upstream project and the hanab.live card art it
adapts). See [LICENSE](./LICENSE).
