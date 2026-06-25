// /lib/models/actions.ts

import type { NumberEnum } from "./numberEnums";
import type { SuitEnum } from "./variantEnums";

export type GameAction =
  | PlayDiscard
  | NumberHint
  | ColourHint
  | ManualEliminate;

export interface PlayDiscard {
  actionType: "PlayDiscard";
  id: number;
}

export interface NumberHint {
  actionType: "NumberHint";

  ids: number[];
  hintString: string;
  affectedIds: number[];

  previousHinted: boolean[];

  previousKnownNumberInformation: NumberEnum[];
  previousNumberInformation: NumberEnum[];
  newKnownNumberInformation: NumberEnum[];
  newNumberInformation: NumberEnum[];

  newHinted: boolean[];
}

export interface ColourHint {
  actionType: "ColourHint";

  ids: number[];
  hintString: string;
  affectedIds: number[];

  previousHinted: boolean[];

  previousKnownColourInformation: SuitEnum[];
  previousColourInformation: SuitEnum[];
  newKnownColourInformation: SuitEnum[];
  newColourInformation: SuitEnum[];

  newHinted: boolean[];
}

// Manually toggling a black X over a single possibility (suit or number) on one
// card, e.g. when the player infers a card is probably not a particular value.
// This does not remove the possibility (clues do that) — it only marks it.
export interface ManualEliminate {
  actionType: "ManualEliminate";

  id: number;
  trait: "colour" | "number";
  // human-readable description for toasts, e.g. "Red" or "3"
  hintString: string;

  // the previous and new manually-crossed bitfields for the affected trait
  previousInformation: number;
  newInformation: number;
}
