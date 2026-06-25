import { getNumbers, NumberEnum, allNumbers } from "../numberEnums";
import { getSuits, SuitEnum, Variant } from "../variantEnums";

// The whole app represents a card's remaining possibilities as a bitfield (an
// OR of every still-possible value). getNumbers / getSuits expand such a
// bitfield back into an ordered array for rendering, so they underpin every
// card. These are the two most-relied-on pure functions in the codebase.

describe("getNumbers", () => {
  it("returns an empty array for no possibilities", () => {
    expect(getNumbers(0 as NumberEnum)).toEqual([]);
  });

  it("returns a single number for a single flag", () => {
    expect(getNumbers(NumberEnum.One)).toEqual([NumberEnum.One]);
    expect(getNumbers(NumberEnum.Five)).toEqual([NumberEnum.Five]);
  });

  it("expands all five numbers, in ascending order", () => {
    expect(getNumbers(allNumbers)).toEqual([
      NumberEnum.One,
      NumberEnum.Two,
      NumberEnum.Three,
      NumberEnum.Four,
      NumberEnum.Five,
    ]);
  });

  it("returns only the set flags, skipping gaps", () => {
    const oneThreeFive = (NumberEnum.One |
      NumberEnum.Three |
      NumberEnum.Five) as NumberEnum;
    expect(getNumbers(oneThreeFive)).toEqual([
      NumberEnum.One,
      NumberEnum.Three,
      NumberEnum.Five,
    ]);
  });

  it("round-trips through bitwise removal (simulating a clue)", () => {
    // Remove Two from the full set, the way a clue narrows possibilities.
    const afterClue = (allNumbers & ~NumberEnum.Two) as NumberEnum;
    expect(getNumbers(afterClue)).toEqual([
      NumberEnum.One,
      NumberEnum.Three,
      NumberEnum.Four,
      NumberEnum.Five,
    ]);
  });
});

describe("getSuits", () => {
  it("returns an empty array for no possibilities", () => {
    expect(getSuits(0)).toEqual([]);
  });

  it("expands the five standard suits (NoVariant), in order", () => {
    expect(getSuits(Variant.NoVariant)).toEqual([
      SuitEnum.Red,
      SuitEnum.Yellow,
      SuitEnum.Blue,
      SuitEnum.White,
      SuitEnum.Green,
    ]);
  });

  it("includes Teal for the six-suit variant", () => {
    expect(getSuits(Variant.SixSuits)).toEqual([
      SuitEnum.Red,
      SuitEnum.Yellow,
      SuitEnum.Blue,
      SuitEnum.White,
      SuitEnum.Green,
      SuitEnum.Teal,
    ]);
  });

  it("includes the high-bit special suits (Rainbow, Black)", () => {
    expect(getSuits(Variant.RainbowsAndBlacks)).toEqual([
      SuitEnum.Red,
      SuitEnum.Yellow,
      SuitEnum.Blue,
      SuitEnum.White,
      SuitEnum.Green,
      SuitEnum.Rainbow,
      SuitEnum.Black,
    ]);
  });

  it("returns a single suit for a single flag", () => {
    expect(getSuits(SuitEnum.Black)).toEqual([SuitEnum.Black]);
  });
});
