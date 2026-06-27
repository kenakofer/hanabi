export enum SuitEnum {
  Red = 1,
  Yellow = 1 << 1,
  Blue = 1 << 2,
  White = 1 << 3,
  Green = 1 << 4,
  Teal = 1 << 5, // sixth standard suit
  Rainbow = 1 << 6,
  Black = 1 << 7,
}

export const enum Variant {
  NoVariant = SuitEnum.Red | SuitEnum.Yellow | SuitEnum.Blue | SuitEnum.White | SuitEnum.Green,
  SixSuits = NoVariant | SuitEnum.Teal,
  Rainbows = NoVariant | SuitEnum.Rainbow,
  Blacks = NoVariant | SuitEnum.Black,
  RainbowsAndBlacks = NoVariant | SuitEnum.Rainbow | SuitEnum.Black,
}

interface SuitProperties {
  string: string, // string for repr
  stringClue: string | null; // if this suit has an associated clue, string for the UI display, else null
  colourClue: number | null; // if this colour has an associated clue, the binary clue to be applied
  positiveColourClueModifier: number | null; // if this suit has any modifier for colour clues given - assume | with the colourClue
  negativeColourClueModifier: number | null; // if this suit has any modifier for negative colour clues given
  // assume !(colourClue | negativeColourClueModifier)
  positiveNumberClueModifier: number | null; // if this suit has any modifier for number clues given (for future development) - assume | with the numberClue
  negativeNumberClueModifier: number | null; // if this suit has any modifier for number clues given (for future development)
  // assume !(numberClue | negativeNumberClueModifier)
}

export const suitProperties: Record<SuitEnum, SuitProperties> = {
  [SuitEnum.Red]: {
    string: 'Red',
    stringClue: "Red",
    colourClue: SuitEnum.Red,
    positiveColourClueModifier: null,
    negativeColourClueModifier: null,
    positiveNumberClueModifier: null,
    negativeNumberClueModifier: null,
  },
  [SuitEnum.Yellow]: {
    string: 'Yellow',
    stringClue: "Yellow",
    colourClue: SuitEnum.Yellow,
    positiveColourClueModifier: null,
    negativeColourClueModifier: null,
    positiveNumberClueModifier: null,
    negativeNumberClueModifier: null,
  },
  [SuitEnum.Blue]: {
    string: 'Blue',
    stringClue: "Blue",
    colourClue: SuitEnum.Blue,
    positiveColourClueModifier: null,
    negativeColourClueModifier: null,
    positiveNumberClueModifier: null,
    negativeNumberClueModifier: null,
  },
  [SuitEnum.White]: {
    string: 'White',
    stringClue: "White",
    colourClue: SuitEnum.White,
    positiveColourClueModifier: null,
    negativeColourClueModifier: null,
    positiveNumberClueModifier: null,
    negativeNumberClueModifier: null,
  },
  [SuitEnum.Green]: {
    string: 'Green',
    stringClue: "Green",
    colourClue: SuitEnum.Green,
    positiveColourClueModifier: null,
    negativeColourClueModifier: null,
    positiveNumberClueModifier: null,
    negativeNumberClueModifier: null,
  },
  [SuitEnum.Teal]: {
    string: 'Teal',
    stringClue: "Teal",
    colourClue: SuitEnum.Teal,
    positiveColourClueModifier: null,
    negativeColourClueModifier: null,
    positiveNumberClueModifier: null,
    negativeNumberClueModifier: null,
  },
  [SuitEnum.Rainbow]: {
    string: 'Rainbow',
    stringClue: null,
    colourClue: null,
    positiveColourClueModifier: SuitEnum.Rainbow, // apply rainbow on for any positive clues
    negativeColourClueModifier: SuitEnum.Rainbow, // a negative clue for colour implies not rainbow
    positiveNumberClueModifier: null,
    negativeNumberClueModifier: null,
  },
  [SuitEnum.Black]: {
    string: 'Black',
    stringClue: null,
    colourClue: null,
    positiveColourClueModifier: null,
    negativeColourClueModifier: null,
    positiveNumberClueModifier: null,
    negativeNumberClueModifier: null,
  },
};

export function getSuits(suits: number): SuitEnum[] { // a helper function to take a number and return the suits
    let power = 0;
    let output: number[] = [];
    while ((1 << power) <= suits) {
        if (((1 << power) & suits) == (1 << power)) { // 00001(red) & 11111 (no variant) = 00001 (red) 
            output.push(1 << power);
        }
        power = power + 1;
    }
    return output // an array of the suits, in order
}

// export function getEnumFromString(input: string): Suits | null {
//     const keys = Object.values(Suits);
//     keys.filter(value => {suitProperties[value].stringClue === input})
// }