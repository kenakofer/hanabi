// /lib/stores/informationOnCardsStore.ts

import { type GameConfig } from "./gameConfigStore";
import type { CardInformation } from "../models/card";
import { allNumbers, NumberEnum } from "../models/numberEnums";
import type { SuitEnum } from "../models/variantEnums";
import { createManagedStore } from "./persistentDictionaryStore";

const defaultData = (config: GameConfig) => {
  return {
    numberInformation: allNumbers,
    knownNumberInformation: 0 as NumberEnum,
    crossedNumberInformation: 0 as NumberEnum,
    colourInformation: config.variant,
    knownColourInformation: 0 as SuitEnum,
    crossedColourInformation: 0 as SuitEnum,
  } as CardInformation;
};

// Saves written before contradictory clues were prevented can contain a card
// with no possible suits or numbers left — an impossible card that the UI used
// to read as "fully known" and crash on. The lost information can't be
// recovered, so widen the dead field back to every value: the player sees a
// card they must re-deduce rather than an app that won't load.
const repair = (
  data: CardInformation,
  config: GameConfig
): CardInformation => {
  const repaired = { ...data };
  if (!repaired.colourInformation) {
    repaired.colourInformation = config.variant;
    repaired.knownColourInformation = 0 as SuitEnum;
  }
  if (!repaired.numberInformation) {
    repaired.numberInformation = allNumbers;
    repaired.knownNumberInformation = 0 as NumberEnum;
  }
  return repaired;
};

export const informationOnCardsStore = createManagedStore<CardInformation>(
  "cardInformation",
  defaultData,
  repair
);
