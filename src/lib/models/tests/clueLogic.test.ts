import {
  calculatePositiveColourClue,
  calculateNegativeColourClue,
  calculatePositiveNumberClue,
  calculateNegativeNumberClue,
  isSingleFlag,
} from "../clueLogic";
import { NumberEnum, allNumbers } from "../numberEnums";
import { SuitEnum, Variant } from "../variantEnums";

// Variant is a distinct enum from SuitEnum, though both are suit bitfields; a
// card's colourInformation starts as the variant's suits.
const noVariant = Variant.NoVariant as unknown as SuitEnum;
const rainbows = Variant.Rainbows as unknown as SuitEnum;

// A clue is one atomic event over the whole hand: selected cards get positive
// information, every unselected card gets negative information. These tests
// pin down what happens when a player clues the same value twice because they
// marked the touched cards one at a time.

describe("isSingleFlag", () => {
  it("is true for exactly one possibility", () => {
    expect(isSingleFlag(SuitEnum.Blue)).toBe(true);
    expect(isSingleFlag(NumberEnum.Three)).toBe(true);
  });

  it("is false for several possibilities", () => {
    expect(isSingleFlag((SuitEnum.Blue | SuitEnum.Red) as SuitEnum)).toBe(false);
    expect(isSingleFlag(allNumbers)).toBe(false);
  });

  // The bare `x & (x - 1)` idiom reports 0 as a single flag. That made the card
  // UI treat an impossible card as fully known and crash on suitProperties[0].
  it("is false for zero possibilities, which is contradictory not known", () => {
    expect(isSingleFlag(0 as SuitEnum)).toBe(false);
    expect(isSingleFlag(0 as NumberEnum)).toBe(false);
  });
});

describe("colour clues", () => {
  it("narrows a selected card to the clued colour", () => {
    expect(calculatePositiveColourClue(noVariant, SuitEnum.Blue)).toBe(
      SuitEnum.Blue
    );
  });

  it("removes the clued colour from an unselected card", () => {
    const result = calculateNegativeColourClue(
      noVariant,
      SuitEnum.Blue,
      0 as SuitEnum
    );
    expect(result & SuitEnum.Blue).toBe(0);
    expect(result & SuitEnum.Red).toBe(SuitEnum.Red);
  });

  it("keeps a positively-clued colour when a later clue of it excludes the card", () => {
    // The card was clued Blue, so knownColourInformation records Blue.
    const afterFirstClue = calculatePositiveColourClue(
      noVariant,
      SuitEnum.Blue
    );
    const known = SuitEnum.Blue;

    // Second Blue clue, this card not selected this time.
    const afterSecondClue = calculateNegativeColourClue(
      afterFirstClue,
      SuitEnum.Blue,
      known
    );

    expect(afterSecondClue).toBe(SuitEnum.Blue);
    expect(isSingleFlag(afterSecondClue)).toBe(true);
  });

  // The exact sequence that used to brick the app: clue Blue with only card A
  // marked, then realise card B was touched too and clue Blue again with only B.
  it("never strips a card to zero possibilities across a split colour clue", () => {
    let cardA = noVariant;
    let cardB = noVariant;
    let knownA = 0 as SuitEnum;
    let knownB = 0 as SuitEnum;

    // Clue 1: only A selected.
    cardA = calculatePositiveColourClue(cardA, SuitEnum.Blue);
    knownA = (knownA | SuitEnum.Blue) as SuitEnum;
    cardB = calculateNegativeColourClue(cardB, SuitEnum.Blue, knownB);

    // Clue 2: only B selected. A is unselected, but was clued Blue already.
    cardB = calculatePositiveColourClue(cardB, SuitEnum.Blue);
    knownB = (knownB | SuitEnum.Blue) as SuitEnum;
    cardA = calculateNegativeColourClue(cardA, SuitEnum.Blue, knownA);

    expect(cardA).toBe(SuitEnum.Blue);
    expect(cardB).toBe(SuitEnum.Blue);
    expect(cardA).not.toBe(0);
  });

  it("still rules out a colour the card was never positively clued for", () => {
    // Card clued Blue, then a Red clue lands elsewhere: Red must go.
    const card = calculatePositiveColourClue(noVariant, SuitEnum.Blue);
    const result = calculateNegativeColourClue(card, SuitEnum.Red, SuitEnum.Blue);
    expect(result).toBe(SuitEnum.Blue);
  });
});

describe("rainbow interaction", () => {
  it("reads a positive colour clue as 'that colour or rainbow'", () => {
    const result = calculatePositiveColourClue(
      rainbows,
      SuitEnum.Blue
    );
    expect(result & SuitEnum.Blue).toBe(SuitEnum.Blue);
    expect(result & SuitEnum.Rainbow).toBe(SuitEnum.Rainbow);
  });

  it("rules out rainbow on a negative colour clue", () => {
    const result = calculateNegativeColourClue(
      rainbows,
      SuitEnum.Blue,
      0 as SuitEnum
    );
    expect(result & SuitEnum.Blue).toBe(0);
    expect(result & SuitEnum.Rainbow).toBe(0);
  });

  // A rainbow card is touched by every colour clue, so a player cluing each
  // touched card separately hits this constantly.
  it("keeps rainbow alive for a card positively clued that colour", () => {
    const afterFirst = calculatePositiveColourClue(
      rainbows,
      SuitEnum.Blue
    );
    const known = SuitEnum.Blue;
    const afterSecond = calculateNegativeColourClue(
      afterFirst,
      SuitEnum.Blue,
      known
    );
    expect(afterSecond & SuitEnum.Blue).toBe(SuitEnum.Blue);
    expect(afterSecond).not.toBe(0);
  });
});

describe("number clues", () => {
  it("narrows a selected card to the clued number", () => {
    expect(calculatePositiveNumberClue(allNumbers, NumberEnum.Three)).toBe(
      NumberEnum.Three
    );
  });

  it("removes the clued number from an unselected card", () => {
    const result = calculateNegativeNumberClue(
      allNumbers,
      NumberEnum.Three,
      0 as NumberEnum
    );
    expect(result & NumberEnum.Three).toBe(0);
    expect(result & NumberEnum.One).toBe(NumberEnum.One);
  });

  it("never strips a card to zero possibilities across a split number clue", () => {
    let cardA = allNumbers;
    let cardB = allNumbers;
    let knownA = 0 as NumberEnum;
    let knownB = 0 as NumberEnum;

    cardA = calculatePositiveNumberClue(cardA, NumberEnum.Three);
    knownA = (knownA | NumberEnum.Three) as NumberEnum;
    cardB = calculateNegativeNumberClue(cardB, NumberEnum.Three, knownB);

    cardB = calculatePositiveNumberClue(cardB, NumberEnum.Three);
    knownB = (knownB | NumberEnum.Three) as NumberEnum;
    cardA = calculateNegativeNumberClue(cardA, NumberEnum.Three, knownA);

    expect(cardA).toBe(NumberEnum.Three);
    expect(cardB).toBe(NumberEnum.Three);
  });
});
