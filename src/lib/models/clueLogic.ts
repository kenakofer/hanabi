// /lib/models/clueLogic.ts
//
// The pure bitfield maths behind applying a clue to one card. Extracted from
// ClueModal.svelte so it can be unit-tested: a clue is the only thing that
// removes possibilities, so an error here silently corrupts a whole game.

import { NumberEnum } from "./numberEnums";
import { SuitEnum, getSuits, suitProperties } from "./variantEnums";

type ClueModifierKey =
  | "positiveColourClueModifier"
  | "negativeColourClueModifier"
  | "positiveNumberClueModifier"
  | "negativeNumberClueModifier";

// Suits can modify how a clue lands: e.g. rainbow is touched by every colour
// clue, so a positive red clue means "red or rainbow", and a negative red clue
// rules out rainbow too.
function getClueModifier(information: number, key: ClueModifierKey): number {
  return getSuits(information)
    .map((suit) => suitProperties[suit]?.[key] ?? null)
    .filter((value): value is number => value !== null)
    .reduce((result, value) => result | value, 0);
}

export function calculatePositiveColourClue(
  colourInformation: SuitEnum,
  colourClue: SuitEnum
): SuitEnum {
  const clueModifier = getClueModifier(
    colourInformation,
    "positiveColourClueModifier"
  );
  // Intersect as normal (this preserves modifier suits like rainbow), but OR
  // the directly-clued colour back in so a positive clue always wins over a
  // contradictory manual cross-off and never blanks the card.
  return (colourInformation & (colourClue | clueModifier)) | colourClue;
}

// A card positively clued for a colour keeps it, even when a later clue of that
// same colour leaves it unselected. That happens when the player clues touched
// cards one at a time instead of marking them all before cluing. Without this,
// the card would record both "is blue" and "is not blue", and could be stripped
// to zero possibilities — a card that cannot exist.
export function calculateNegativeColourClue(
  colourInformation: SuitEnum,
  colourClue: SuitEnum,
  knownColourInformation: SuitEnum = 0 as SuitEnum
): SuitEnum {
  const clueModifier = getClueModifier(
    colourInformation,
    "negativeColourClueModifier"
  );
  const removed = (colourClue | clueModifier) & ~knownColourInformation;
  return colourInformation & ~removed;
}

export function calculatePositiveNumberClue(
  numberInformation: NumberEnum,
  numberClue: NumberEnum
): NumberEnum {
  const clueModifier = getClueModifier(
    numberInformation,
    "positiveNumberClueModifier"
  );
  return (numberInformation & (numberClue | clueModifier)) | numberClue;
}

// Mirrors calculateNegativeColourClue.
export function calculateNegativeNumberClue(
  numberInformation: NumberEnum,
  numberClue: NumberEnum,
  knownNumberInformation: NumberEnum = 0 as NumberEnum
): NumberEnum {
  const clueModifier = getClueModifier(
    numberInformation,
    "negativeNumberClueModifier"
  );
  const removed = (numberClue | clueModifier) & ~knownNumberInformation;
  return numberInformation & ~removed;
}

// Exactly one possibility left. Zero is deliberately not a single flag: a card
// with no possibilities is contradictory, not fully known. The plain
// `x & (x - 1)` idiom reports 0 as a single flag, which previously made the UI
// treat an impossible card as fully known and crash looking up suit 0.
export function isSingleFlag(bitflag: SuitEnum | NumberEnum): boolean {
  return (bitflag as number) !== 0 && (bitflag & (bitflag - 1)) === 0;
}

// One card's worth of the state a clue reads.
export interface ClueTarget {
  information: number;
  knownInformation: number;
  isSelected: boolean;
}

// Would this clue leave some card with no possibilities left? A clue applies to
// the whole hand at once — positive to the selected cards, negative to the rest
// — so validity is a question about the hand, not any single card.
//
// This asks the real calculate* functions what they would write rather than
// re-deriving the maths, so the dialog can never offer a clue that the save
// path would then refuse to represent.
//
// Only clue-derived information is consulted. A player's manual cross-off lives
// in crossed*Information and is deliberately ignored: it is a guess, and a
// guess must never hide a clue that really happened at the table.
function isClueValid(
  hand: ClueTarget[],
  clue: number,
  positive: (information: number, clue: number) => number,
  negative: (information: number, clue: number, known: number) => number
): boolean {
  return hand.every((card) =>
    card.isSelected
      ? positive(card.information, clue) !== 0
      : negative(card.information, clue, card.knownInformation) !== 0
  );
}

export function isColourClueValid(
  hand: ClueTarget[],
  colourClue: SuitEnum
): boolean {
  return isClueValid(
    hand,
    colourClue,
    calculatePositiveColourClue as (i: number, c: number) => number,
    calculateNegativeColourClue as (i: number, c: number, k: number) => number
  );
}

export function isNumberClueValid(
  hand: ClueTarget[],
  numberClue: NumberEnum
): boolean {
  return isClueValid(
    hand,
    numberClue,
    calculatePositiveNumberClue as (i: number, c: number) => number,
    calculateNegativeNumberClue as (i: number, c: number, k: number) => number
  );
}
