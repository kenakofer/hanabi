<!-- /lib/components/ClueModal.svelte -->
<script lang="ts">
  import type { CardInformation } from "../models/card";
  import { NumberEnum } from "../models/numberEnums";
  import { SuitEnum, getSuits, suitProperties } from "../models/variantEnums";
  import Number from "./Number.svelte";
  import Colour from "./Colour.svelte";
  import { cardsSelectedStore } from "../stores/cardsSelectedStore";
  import { cardsInHandStore } from "../stores/cardsInHandStore";
  import { informationOnCardsStore } from "../stores/informationOnCardsStore";
  import { gameConfigStore } from "../stores/gameConfigStore";
  import { contextOnCardsStore } from "../stores/contextOnCardsStore";
  import type { ColourClue, NumberClue } from "../models/gameActions";
  import { actionStore } from "../stores/actionStore";

  export let isOpen = false;

  $: variant = $gameConfigStore.variant;

  interface SelectedClue {
    type: "colour" | "number" | null;
    colourValue: SuitEnum | null;
    numberValue: NumberEnum | null;
  }

  let selectedClue: SelectedClue = {
    type: null,
    colourValue: null,
    numberValue: null,
  };

  let availableColourCluesEnums: SuitEnum[] = [];
  let availableNumberCluesStrings: (string | null)[] = [
    "1",
    "2",
    "3",
    "4",
    "5",
  ];
  let availableNumberCluesEnums: NumberEnum[] = [
    NumberEnum.One,
    NumberEnum.Two,
    NumberEnum.Three,
    NumberEnum.Four,
    NumberEnum.Five,
  ];
  $: {
    availableColourCluesEnums = getSuits(variant).filter(
      (suit) => suitProperties[suit].stringClue != null
    );
  } // this should return matching arrays of all suit Enums with a stringClue property (i.e. all clueable suits)

  function getPositiveColourClueModifier(
    colourInformation: SuitEnum
  ): SuitEnum {
    return getSuits(colourInformation) // checks for any positive clue modifiers from suits (such as rainbow taking all colour clues)
      .map((value) => {
        return suitProperties[value].positiveColourClueModifier;
      })
      .filter((value) => {
        return value !== null;
      })
      .reduce((result, num) => {
        return (result as number) | (num as number);
      }, 0) as SuitEnum;
  }

  function getPositiveNumberClueModifier(
    numberInformation: NumberEnum
  ): NumberEnum {
    return getSuits(numberInformation) // checks for any positive clue modifiers from suits (such as pink taking all number clues)
      .map((value) => {
        return suitProperties[value].positiveNumberClueModifier;
      })
      .filter((value) => {
        return value !== null;
      })
      .reduce((result, num) => {
        return (result as number) | (num as number);
      }, 0) as NumberEnum;
  }

  function getNegativeColourClueModifier(
    colourInformation: SuitEnum
  ): SuitEnum {
    return getSuits(colourInformation) // checks for any negative clue modifiers from suits (such as black taking no colour clues)
      .map((value) => {
        return suitProperties[value].negativeColourClueModifier;
      })
      .filter((value) => {
        return value !== null;
      })
      .reduce((result, num) => {
        return (result as number) | (num as number);
      }, 0) as SuitEnum;
  }

  function getNegativeNumberClueModifier(
    numberInformation: NumberEnum
  ): NumberEnum {
    return getSuits(numberInformation) // checks for any negative clue modifiers from suits (such as brown taking no number clues)
      .map((value) => {
        return suitProperties[value].negativeNumberClueModifier;
      })
      .filter((value) => {
        return value !== null;
      })
      .reduce((result, num) => {
        return (result as number) | (num as number);
      }, 0) as NumberEnum;
  }

  function saveClue(): void {
    if (!selectedClue.type) return;

    if (selectedClue.type == "colour" && selectedClue.colourValue !== null) {
      saveColourClue(selectedClue.colourValue);
    } else if (
      selectedClue.type == "number" &&
      selectedClue.numberValue !== null
    ) {
      saveNumberClue(selectedClue.numberValue);
    }
    cardsSelectedStore.update((selected) => {
      // reset cards selected
      selected = new Set<number>();
      return selected;
    });
    closePanel();
  }

  function saveColourClue(colourClue: SuitEnum): void {
    const selectedCardIds = Array.from($cardsSelectedStore);
    const currentCards = Array.from($cardsInHandStore);

    let action: ColourClue = {
      actionType: "ColourClue",
      ids: currentCards,
      clueString: suitProperties[colourClue].string,
      affectedIds: [...selectedCardIds],
      previousClued: getPreviousClued(currentCards),
      previousKnownColourInformation:
        getPreviousKnownColourInformation(currentCards),
      previousColourInformation: getPreviousColourInformation(currentCards),
      newKnownColourInformation: [],
      newColourInformation: [],
      newClued: [],
    };

    currentCards.forEach((card) => {
      let cardInformation = { ...informationOnCardsStore.get(card) };
      let cardContext = { ...contextOnCardsStore.get(card) };
      let isSelected = selectedCardIds.includes(card);

      if (isSelected) {
        cardInformation.colourInformation = calculatePositiveColourClue(
          cardInformation.colourInformation,
          colourClue
        );
        cardInformation.knownColourInformation |= colourClue;
        updateClueFlag(card, true);
        action.newClued.push(true); // it is always clued if selected
      } else {
        cardInformation.colourInformation = calculateNegativeColourClue(
          cardInformation.colourInformation,
          colourClue
        );
        action.newClued.push(cardContext.isClued); // here we must use the pre-existing value, since it may have been clued before
      }

      action.newColourInformation.push(cardInformation.colourInformation);
      action.newKnownColourInformation.push(
        cardInformation.knownColourInformation
      );

      informationOnCardsStore.set(card, cardInformation);
    });

    actionStore.push(action); // store the action
  }

  function getPreviousKnownColourInformation(cards: number[]): SuitEnum[] {
    return cards.map(
      (id) => informationOnCardsStore.get(id).knownColourInformation
    );
  }

  function getPreviousColourInformation(cards: number[]): SuitEnum[] {
    return cards.map((id) => informationOnCardsStore.get(id).colourInformation);
  }

  function calculatePositiveColourClue(
    colourInformation: SuitEnum,
    colourClue: SuitEnum
  ): SuitEnum {
    const clueModifier = getPositiveColourClueModifier(colourInformation);
    // Intersect as normal (this preserves modifier suits like rainbow), but
    // OR the directly-clued colour back in so a positive clue always wins
    // over a contradictory manual cross-off and never blanks the card.
    return (colourInformation & (colourClue | clueModifier)) | colourClue;
  }

  function calculateNegativeColourClue(
    colourInformation: SuitEnum,
    colourClue: SuitEnum
  ): SuitEnum {
    const clueModifier = getNegativeColourClueModifier(colourInformation);
    return colourInformation & ~(colourClue | clueModifier);
  }

  function updateClueFlag(card: number, isClued: boolean): void {
    const oldContext = contextOnCardsStore.get(card);
    contextOnCardsStore.set(card, { ...oldContext, isClued });
  }

  function numberEnumToString(number: NumberEnum): string {
    switch (number) {
      case NumberEnum.One:
        return "one"
      case NumberEnum.Two:
        return "two"
      case NumberEnum.Three:
        return "three"
      case NumberEnum.Four:
        return "four"
      case NumberEnum.Five:
        return "five"
      default:
        return "unkown"
    }
  }

  function saveNumberClue(numberClue: NumberEnum): void {
    const selectedCardIds = Array.from($cardsSelectedStore);
    const currentCards = Array.from($cardsInHandStore);

    let action: NumberClue = {
      actionType: "NumberClue",
      ids: currentCards,
      clueString: numberEnumToString(numberClue),
      affectedIds: [...selectedCardIds],
      previousClued: getPreviousClued(currentCards),
      previousKnownNumberInformation:
        getPreviousKnownNumberInformation(currentCards),
      previousNumberInformation: getPreviousNumberInformation(currentCards),
      newKnownNumberInformation: [],
      newNumberInformation: [],
      newClued: [],
    };

    currentCards.forEach((card) => {
      let cardInformation = { ...informationOnCardsStore.get(card) };
      let cardContext = { ...contextOnCardsStore.get(card) };
      let isSelected = selectedCardIds.includes(card);

      if (isSelected) {
        cardInformation.numberInformation = calculatePositiveNumberClue(
          cardInformation.numberInformation,
          numberClue
        );
        cardInformation.knownNumberInformation |= numberClue;
        updateClueFlag(card, true);
        action.newClued.push(true); // it is always clued if selected
      } else {
        cardInformation.numberInformation = calculateNegativeNumberClue(
          cardInformation.numberInformation,
          numberClue
        );
        action.newClued.push(cardContext.isClued); // here we must use the pre-existing value, since it may have been clued before
      }

      action.newNumberInformation.push(cardInformation.numberInformation);
      action.newKnownNumberInformation.push(
        cardInformation.knownNumberInformation
      );

      informationOnCardsStore.set(card, cardInformation);
    });

    actionStore.push(action); // store the action
  }

  function getPreviousKnownNumberInformation(cards: number[]): NumberEnum[] {
    return cards.map(
      (id) => informationOnCardsStore.get(id).knownNumberInformation
    );
  }

  function getPreviousNumberInformation(cards: number[]): NumberEnum[] {
    return cards.map((id) => informationOnCardsStore.get(id).numberInformation);
  }

  function calculatePositiveNumberClue(
    numberInformation: NumberEnum,
    numberClue: NumberEnum
  ): NumberEnum {
    const clueModifier = getPositiveNumberClueModifier(numberInformation);
    // OR the clued number back in so a positive clue always wins over a
    // contradictory manual cross-off and never blanks the card.
    return (numberInformation & (numberClue | clueModifier)) | numberClue;
  }

  function calculateNegativeNumberClue(
    numberInformation: NumberEnum,
    numberClue: NumberEnum
  ): NumberEnum {
    const clueModifier = getNegativeNumberClueModifier(numberInformation);
    return numberInformation & ~(numberClue | clueModifier);
  }

  function getPreviousClued(cards: number[]): boolean[] {
    return cards.map(card => {
      const cardContext = contextOnCardsStore.get(card);
      return cardContext.isClued;
    })
  }

  function selectColourClue(colourClue: SuitEnum): void {
    selectedClue = {
      type: "colour",
      colourValue: colourClue,
      numberValue: null,
    };
    saveClue();
  }

  function selectNumberClue(numberClue: NumberEnum): void {
    selectedClue = {
      type: "number",
      colourValue: null,
      numberValue: numberClue,
    };
    saveClue();
  }

  function closePanel() {
    isOpen = false;
    selectedClue = {
      type: null,
      colourValue: null,
      numberValue: null,
    }; // Reset selected clue
  }
</script>

{#if isOpen}
  <div class="modal-overlay" on:click={closePanel}>
    <div class="clue-modal" on:click|stopPropagation>
      <div class="numbers-clues">
        {#each [0, 1, 2, 3, 4] as index}
          <button
            type="button"
            class="icon-btn"
            title={availableNumberCluesStrings[index]}
            aria-label="Clue {availableNumberCluesStrings[index]}"
            on:click={() => selectNumberClue(availableNumberCluesEnums[index])}
          >
            <Number
              backgroundColour="white"
              strokeColour="black"
              numberEnum={availableNumberCluesEnums[index]}
            />
          </button>
        {/each}
      </div>
      <div class="colours-clues">
        {#each availableColourCluesEnums as colour}
          <button
            type="button"
            class="icon-btn"
            title={suitProperties[colour].stringClue}
            aria-label="Clue {suitProperties[colour].stringClue}"
            on:click={() => selectColourClue(colour)}
          >
            <Colour strokeColour="white" {colour} />
          </button>
        {/each}
      </div>
      <div class="actions">
        <button on:click={closePanel}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    z-index: 1000;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .clue-modal {
    background-color: dimgray;
    padding: 20px;
    border-radius: 5px;
    border: 2px solid lightgray;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  .numbers-clues,
  .colours-clues {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    padding: 12px 8px;
  }

  /* Clue choices rendered with the same number/colour icons the cards use. */
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    padding: 4px;
    background: none;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
  }

  .icon-btn:hover {
    border-color: lightgray;
    background-color: rgba(255, 255, 255, 0.1);
  }

  .icon-btn :global(svg) {
    width: 100%;
    height: 100%;
  }

  .actions {
    text-align: center;
    margin-top: 8px;
  }
</style>
