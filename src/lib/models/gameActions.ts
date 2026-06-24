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

// Manually crossing off a single possibility (suit or number) on one card,
// e.g. when the player infers a card cannot be a particular value.
export interface ManualEliminate {
  actionType: "ManualEliminate";

  id: number;
  trait: "colour" | "number";
  // human-readable description for toasts, e.g. "Red" or "3"
  hintString: string;

  // the previous and new possibility bitfields for the affected trait
  previousInformation: number;
  newInformation: number;
}
